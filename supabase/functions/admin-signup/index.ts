// Secure admin signup: validates ADMIN_INVITE_CODE server-side, creates the auth user
// with the role claim stored in raw_app_meta_data (user-immutable). The invite code is
// NEVER returned to the client or exposed in bundles. First signup becomes 'founder'.

import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SignupBody {
  email: string;
  password: string;
  fullName: string;
  inviteCode: string;
}

async function hashSecret(secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(secret + "::synf_login_secret_salt");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, password, fullName, inviteCode } = (await req.json()) as SignupBody;

    if (!email || !password || !inviteCode) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let expectedCode = Deno.env.get("ADMIN_INVITE_CODE");

    // Fallback: read from admin_config table (service role bypasses RLS)
    if (!expectedCode) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );
      const { data: cfg } = await supabase
        .from("admin_config")
        .select("value")
        .eq("key", "admin_invite_code")
        .maybeSingle();
      expectedCode = cfg?.value || undefined;
    }

    if (!expectedCode) {
      return new Response(
        JSON.stringify({ error: "Signup is not configured. Ask an administrator to set ADMIN_INVITE_CODE." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (inviteCode !== expectedCode) {
      return new Response(JSON.stringify({ error: "Invalid invitation code." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (password.length < 8) {
      return new Response(JSON.stringify({ error: "Password must be at least 8 characters." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Determine role: first user becomes founder, subsequent signups are viewers
    const { count } = await supabase
      .from("team_profiles")
      .select("id", { count: "exact", head: true });

    const isFirstUser = (count ?? 0) === 0;
    const role = isFirstUser ? "founder" : "viewer";

    // Try to create the auth user. If user already exists, try to update their metadata instead.
    let userId: string;
    let existingUser = false;

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
      app_metadata: { role },
    });

    if (error) {
      // If user already exists, try to look them up and update their app_metadata
      if (error.message.includes("already") || error.message.includes("registered") || error.message.includes("exists")) {
        const { data: listData, error: listErr } = await supabase.auth.admin.listUsers();
        if (listErr || !listData?.users) {
          return new Response(JSON.stringify({ error: "User already exists but could not be updated. Please contact support." }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const existing = listData.users.find((u) => u.email === email);
        if (!existing) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        userId = existing.id;
        existingUser = true;
        // Update the existing user's metadata and password
        await supabase.auth.admin.updateUserById(userId, {
          password,
          email_confirm: true,
          user_metadata: { full_name: fullName },
          app_metadata: { role },
        });
      } else {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      userId = data.user.id;
    }

    // 1. Create team_profiles row
    await supabase.from("team_profiles").upsert({
      id: userId,
      full_name: fullName,
      role,
      is_active: true,
    });

    // 2. Create team_member_profiles row (needed for is_staff / has_permission / admin access)
    await supabase.from("team_member_profiles").upsert({
      id: userId,
      user_id: userId,
      full_name: fullName,
      role_id: role,
      account_status: "active",
      is_founder: isFirstUser,
      is_founding_member: isFirstUser,
      join_classification_id: isFirstUser ? "founding_team" : "direct_appointment",
    });

    // 3. If this is the first user (founder), create founder_record and auto-configure login secret
    if (isFirstUser) {
      // Create founder record
      await supabase.from("founder_record").upsert({
        id: 1,
        user_id: userId,
      });

      // Auto-configure a default login secret so the founder can log in immediately
      // Default secret is "synf808" — founder should change this via Security settings
      const defaultSecret = "synf808";
      const secretHash = await hashSecret(defaultSecret);

      await supabase.from("login_secret_config").upsert({
        id: 1,
        secret_hash: secretHash,
        secret_version: 1,
        rotated_by: userId,
        rotated_at: new Date().toISOString(),
      });

      await supabase.from("secret_rotation_history").insert({
        rotated_by: userId,
        previous_version: 0,
        new_version: 1,
      });
    }

    await supabase.from("activity_log").insert({
      actor_id: userId,
      action: existingUser ? "signup_recovery" : "signup",
      target_type: "auth.users",
      target_id: userId,
      summary: `${existingUser ? "Recovered" : "New"} account ${existingUser ? "re-" : ""}created with role ${role}${isFirstUser ? " (Founder)" : ""}`,
    });

    return new Response(
      JSON.stringify({
        success: true,
        role,
        founder: isFirstUser,
        default_secret: isFirstUser ? "synf808" : undefined,
        message: isFirstUser
          ? "Founder account created. Use secret code 'synf808' to log in. Change it immediately in Security settings."
          : "Account created. Ask the founder for the login secret code.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message || "Server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
