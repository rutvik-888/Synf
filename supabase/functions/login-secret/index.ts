// Login Secret Code Validation & Management Edge Function
// Handles: validate_secret, rotate_secret, check_session, revoke_session
// The secret hash is NEVER returned to the client. Rate-limiting via security_events table.

import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      serviceKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const body = await req.json();
    const action = body.action;

    // ============================================================
    // VALIDATE SECRET
    // ============================================================
    if (action === "validate_secret") {
      const authHeader = req.headers.get("Authorization") || "";
      const token = authHeader.replace("Bearer ", "");
      if (!token) {
        return new Response(JSON.stringify({ error: "Authentication required" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: userData, error: authErr } = await supabase.auth.getUser(token);
      if (authErr || !userData.user) {
        return new Response(JSON.stringify({ error: "Invalid authentication" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const userId = userData.user.id;
      const { secret_code } = body;
      if (!secret_code) {
        return new Response(JSON.stringify({ error: "Secret code is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if user's account is active
      const { data: memberProfile } = await supabase
        .from("team_member_profiles")
        .select("account_status, full_name")
        .eq("id", userId)
        .maybeSingle();

      if (!memberProfile) {
        return new Response(JSON.stringify({ error: "You do not have a team account" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (memberProfile.account_status === "suspended") {
        return new Response(JSON.stringify({ error: "Your account has been suspended. Contact the founder." }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (memberProfile.account_status === "deactivated") {
        return new Response(JSON.stringify({ error: "Your account has been deactivated." }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Rate-limiting: check recent failed attempts
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: recentFails } = await supabase
        .from("security_events")
        .select("id, created_at")
        .eq("user_id", userId)
        .eq("event_type", "secret_attempt")
        .eq("success", false)
        .gte("created_at", fiveMinAgo)
        .order("created_at", { ascending: false });

      const failCount = recentFails?.length || 0;
      if (failCount >= 5) {
        const lockoutDuration = failCount >= 10 ? 30 * 60 * 1000 : 15 * 60 * 1000; // 30 min after 10, 15 min after 5
        const lastFail = recentFails?.[0]?.created_at;
        if (lastFail && Date.now() - new Date(lastFail).getTime() < lockoutDuration) {
          await supabase.from("security_events").insert({
            user_id: userId,
            event_type: "lockout",
            success: false,
            metadata: { reason: "too_many_attempts", fail_count: failCount },
          });
          const remaining = Math.ceil((lockoutDuration - (Date.now() - new Date(lastFail).getTime())) / 60000);
          return new Response(JSON.stringify({
            error: `Too many failed attempts. Account locked for ${remaining} more minute(s).`,
            locked: true,
          }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // Validate the secret against the stored hash
      const { data: config } = await supabase
        .from("login_secret_config")
        .select("secret_hash, secret_version")
        .eq("id", 1)
        .maybeSingle();

      if (!config) {
        return new Response(JSON.stringify({ error: "Login secret is not configured. Contact the founder." }), {
          status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Hash the provided secret and compare
      const providedHash = await hashSecret(secret_code);
      const isValid = constantTimeCompare(providedHash, config.secret_hash);

      // Log the attempt
      await supabase.from("security_events").insert({
        user_id: userId,
        event_type: "secret_attempt",
        success: isValid,
        metadata: { version: config.secret_version },
      });

      if (!isValid) {
        const remaining = 5 - (failCount + 1);
        return new Response(JSON.stringify({
          valid: false,
          error: `Invalid secret code. ${remaining > 0 ? remaining : 0} attempt(s) remaining before lockout.`,
        }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update last_login_at
      await supabase.from("team_member_profiles").update({
        last_login_at: new Date().toISOString(),
      }).eq("id", userId);

      return new Response(JSON.stringify({
        valid: true,
        message: "Secret code accepted.",
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============================================================
    // ROTATE SECRET (founder only)
    // ============================================================
    if (action === "rotate_secret") {
      const authHeader = req.headers.get("Authorization") || "";
      const token = authHeader.replace("Bearer ", "");
      if (!token) {
        return new Response(JSON.stringify({ error: "Authentication required" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: userData, error: authErr } = await supabase.auth.getUser(token);
      if (authErr || !userData.user) {
        return new Response(JSON.stringify({ error: "Invalid authentication" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const userId = userData.user.id;

      // Verify caller is founder
      const { data: founder } = await supabase
        .from("founder_record")
        .select("user_id")
        .eq("id", 1)
        .maybeSingle();

      if (!founder || founder.user_id !== userId) {
        return new Response(JSON.stringify({ error: "Only the founder can rotate the login secret" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { new_secret, confirm_password } = body;
      if (!new_secret || new_secret.length < 6) {
        return new Response(JSON.stringify({ error: "New secret must be at least 6 characters" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!confirm_password) {
        return new Response(JSON.stringify({ error: "Password confirmation is required to rotate the secret" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify password
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: userData.user.email || "",
        password: confirm_password,
      });
      if (signInErr) {
        await supabase.from("security_events").insert({
          user_id: userId,
          event_type: "secret_rotation",
          success: false,
          metadata: { reason: "password_confirmation_failed" },
        });
        return new Response(JSON.stringify({ error: "Password confirmation failed" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get current version
      const { data: current } = await supabase
        .from("login_secret_config")
        .select("secret_version")
        .eq("id", 1)
        .maybeSingle();
      const oldVersion = current?.secret_version || 0;
      const newVersion = oldVersion + 1;
      const newHash = await hashSecret(new_secret);

      await supabase.from("login_secret_config").upsert({
        id: 1,
        secret_hash: newHash,
        secret_version: newVersion,
        rotated_by: userId,
        rotated_at: new Date().toISOString(),
      });

      // Log to rotation history
      await supabase.from("secret_rotation_history").insert({
        rotated_by: userId,
        previous_version: oldVersion,
        new_version: newVersion,
      });

      // Security event
      await supabase.from("security_events").insert({
        user_id: userId,
        event_type: "secret_rotation",
        success: true,
        metadata: { new_version: newVersion },
      });

      // Activity log
      await supabase.from("activity_log").insert({
        actor_id: userId,
        action: "rotate_secret",
        target_type: "login_secret_config",
        target_id: "1",
        summary: `Rotated login secret to version ${newVersion}`,
      });

      return new Response(JSON.stringify({
        success: true,
        message: `Login secret rotated to version ${newVersion}. All members will need the new code for their next login.`,
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============================================================
    // CHECK SESSION (is secret still valid for this session?)
    // ============================================================
    if (action === "check_session") {
      const authHeader = req.headers.get("Authorization") || "";
      const token = authHeader.replace("Bearer ", "");
      if (!token) {
        return new Response(JSON.stringify({ error: "Authentication required" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: userData, error: authErr } = await supabase.auth.getUser(token);
      if (authErr || !userData.user) {
        return new Response(JSON.stringify({ error: "Invalid session" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const userId = userData.user.id;
      const { data: member } = await supabase
        .from("team_member_profiles")
        .select("account_status")
        .eq("id", userId)
        .maybeSingle();

      if (!member || member.account_status !== "active") {
        return new Response(JSON.stringify({ valid: false, reason: "account_inactive" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if session has been revoked (via session_revocations)
      const { data: revoked } = await supabase
        .from("session_revocations")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (revoked) {
        return new Response(JSON.stringify({ valid: false, reason: "session_revoked" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ valid: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============================================================
    // REVOKE SESSIONS (founder/admin — revoke all sessions for a user)
    // ============================================================
    if (action === "revoke_sessions") {
      const authHeader = req.headers.get("Authorization") || "";
      const token = authHeader.replace("Bearer ", "");
      if (!token) {
        return new Response(JSON.stringify({ error: "Authentication required" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: userData, error: authErr } = await supabase.auth.getUser(token);
      if (authErr || !userData.user) {
        return new Response(JSON.stringify({ error: "Invalid authentication" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const callerId = userData.user.id;
      const { target_user_id, reason } = body;

      if (!target_user_id) {
        return new Response(JSON.stringify({ error: "Target user ID is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check permission (founder or admin with security_settings)
      const { data: callerMember } = await supabase
        .from("team_member_profiles")
        .select("is_founder, role_id")
        .eq("id", callerId)
        .maybeSingle();

      if (!callerMember) {
        return new Response(JSON.stringify({ error: "Not authorized" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: perm } = await supabase.rpc("has_permission", {
        p_user_id: callerId, p_module: "security_settings", p_action: "manage_settings",
      });

      if (!callerMember.is_founder && perm !== true) {
        return new Response(JSON.stringify({ error: "You do not have permission to revoke sessions" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Record revocation
      await supabase.from("session_revocations").insert({
        user_id: target_user_id,
        revoked_by: callerId,
        reason: reason || "revoked_by_admin",
      });

      // Security event
      await supabase.from("security_events").insert({
        user_id: target_user_id,
        event_type: "session_revoked",
        success: true,
        metadata: { revoked_by: callerId, reason },
      });

      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============================================================
    // GET SECRET STATUS (does a secret exist? what version?)
    // ============================================================
    if (action === "get_status") {
      const authHeader = req.headers.get("Authorization") || "";
      const token = authHeader.replace("Bearer ", "");
      if (!token) {
        return new Response(JSON.stringify({ error: "Authentication required" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: userData, error: authErr } = await supabase.auth.getUser(token);
      if (authErr || !userData.user) {
        return new Response(JSON.stringify({ error: "Invalid authentication" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: config } = await supabase
        .from("login_secret_config")
        .select("secret_version, rotated_at")
        .eq("id", 1)
        .maybeSingle();

      return new Response(JSON.stringify({
        configured: !!config,
        version: config?.secret_version || 0,
        last_rotated: config?.rotated_at || null,
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============================================================
    // BOOTSTRAP SECRET (set initial secret — founder only, first-time setup)
    // ============================================================
    if (action === "bootstrap_secret") {
      const authHeader = req.headers.get("Authorization") || "";
      const token = authHeader.replace("Bearer ", "");
      if (!token) {
        return new Response(JSON.stringify({ error: "Authentication required" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: userData, error: authErr } = await supabase.auth.getUser(token);
      if (authErr || !userData.user) {
        return new Response(JSON.stringify({ error: "Invalid authentication" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const userId = userData.user.id;

      // Check if caller is founder
      const { data: founder } = await supabase
        .from("founder_record")
        .select("user_id")
        .eq("id", 1)
        .maybeSingle();

      if (!founder || founder.user_id !== userId) {
        return new Response(JSON.stringify({ error: "Only the founder can set the initial login secret" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if secret already exists
      const { data: existing } = await supabase
        .from("login_secret_config")
        .select("id")
        .eq("id", 1)
        .maybeSingle();

      if (existing) {
        return new Response(JSON.stringify({ error: "Login secret is already configured. Use rotate_secret to change it." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { secret } = body;
      if (!secret || secret.length < 6) {
        return new Response(JSON.stringify({ error: "Secret must be at least 6 characters" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const secretHash = await hashSecret(secret);
      await supabase.from("login_secret_config").insert({
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

      return new Response(JSON.stringify({
        success: true,
        message: "Login secret configured. Members will need this code to access the admin dashboard.",
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message || "Server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function hashSecret(secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(secret + "::synf_login_secret_salt");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

