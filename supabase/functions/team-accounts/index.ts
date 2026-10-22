// Team Accounts Management Edge Function
// Handles: create_account, invite_member, accept_invitation, change_role,
//          suspend, reactivate, deactivate, transfer_foundership, update_member, list_members
// All operations use the service role key server-side. Authorization is enforced
// by checking the caller's team_member_profile and role permissions.

import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AuthUser {
  id: string;
  email: string;
}

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

    // Authenticate caller via JWT
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

    const caller: AuthUser = { id: userData.user.id, email: userData.user.email || "" };

    // Load caller's member profile
    const { data: callerProfile } = await supabase
      .from("team_member_profiles")
      .select("*")
      .eq("id", caller.id)
      .maybeSingle();

    if (!callerProfile || callerProfile.account_status !== "active") {
      return new Response(JSON.stringify({ error: "Your account is not authorized for this action" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const action = body.action;

    // ============================================================
    // LIST MEMBERS
    // ============================================================
    if (action === "list_members") {
      const canView = await hasPermission(supabase, caller.id, "team_accounts", "view");
      if (!canView && !callerProfile.is_founder) {
        return new Response(JSON.stringify({ error: "You do not have permission to view team accounts" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: members } = await supabase
        .from("team_member_profiles")
        .select(`
          *,
          department:departments(id,name),
          role_definition:role_definitions(id,display_name,hierarchy_level),
          join_classification:join_classifications(id,display_name),
          manager:team_member_profiles!reporting_manager_id(id,full_name,display_name)
        `)
        .order("created_at", { ascending: false });
      return new Response(JSON.stringify({ members: members || [] }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============================================================
    // CREATE ACCOUNT (with temp password or invite)
    // ============================================================
    if (action === "create_account") {
      const canCreate = await hasPermission(supabase, caller.id, "team_accounts", "create");
      if (!canCreate && !callerProfile.is_founder) {
        return new Response(JSON.stringify({ error: "You do not have permission to create team accounts" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const {
        email, full_name, phone, department_id, role_id, custom_title,
        join_classification_id, reporting_manager_id, how_joined, setup_method,
        temp_password
      } = body;

      if (!email || !full_name || !role_id) {
        return new Response(JSON.stringify({ error: "Email, full name, and role are required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify the caller can assign this role
      const canAssign = await canAssignRole(supabase, caller.id, role_id);
      if (!canAssign) {
        return new Response(JSON.stringify({ error: `You cannot assign the role: ${role_id}` }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if user already exists in auth.users
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existing = existingUsers?.users?.find((u: { email?: string }) => u.email?.toLowerCase() === email.toLowerCase());

      let userId: string;

      if (existing) {
        // User already has an auth account — just create the team profile
        userId = existing.id;
        // Check if they already have a team_member_profile
        const { data: existingMember } = await supabase
          .from("team_member_profiles")
          .select("id")
          .eq("id", userId)
          .maybeSingle();
        if (existingMember) {
          return new Response(JSON.stringify({ error: "This user is already a team member" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } else {
        // Create new auth user
        const password = temp_password || generateTempPassword();
        const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name },
          app_metadata: { role: role_id },
        });
        if (createErr) {
          return new Response(JSON.stringify({ error: createErr.message }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        userId = newUser.user.id;
      }

      // Create team_profiles row (for backward compat with auth context)
      await supabase.from("team_profiles").upsert({
        id: userId,
        full_name,
        role: role_id === "founder" ? "founder" : role_id,
        is_active: true,
      });

      // Create team_member_profiles row
      const { error: memberErr } = await supabase.from("team_member_profiles").insert({
        id: userId,
        user_id: userId,
        department_id: department_id || null,
        role_id,
        custom_title: custom_title || null,
        phone: phone || null,
        join_classification_id: join_classification_id || "direct_appointment",
        reporting_manager_id: reporting_manager_id || null,
        account_status: "active",
        full_name,
        avatar_url: null,
        bio: null,
        instagram_url: null,
        display_name: custom_title || null,
        created_by: caller.id,
      });

      if (memberErr) {
        return new Response(JSON.stringify({ error: memberErr.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Log to activity_log
      await supabase.from("activity_log").insert({
        actor_id: caller.id,
        action: "create_team_account",
        target_type: "team_member_profiles",
        target_id: userId,
        summary: `Created team account for ${full_name} (${email}) with role ${role_id}`,
      });

      // Log security event
      await supabase.from("security_events").insert({
        user_id: userId,
        event_type: "account_created",
        success: true,
        metadata: { created_by: caller.id, role_id },
      });

      return new Response(JSON.stringify({
        success: true,
        user_id: userId,
        temp_password_provided: !!temp_password,
        message: existing ? "Team profile created for existing user" : "Account created. Member should set their password at first login."
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============================================================
    // INVITE MEMBER (send invitation with setup link)
    // ============================================================
    if (action === "invite_member") {
      const canCreate = await hasPermission(supabase, caller.id, "team_accounts", "create");
      if (!canCreate && !callerProfile.is_founder) {
        return new Response(JSON.stringify({ error: "You do not have permission to invite team members" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const {
        email, full_name, phone, department_id, role_id, custom_title,
        join_classification_id, reporting_manager_id, how_joined
      } = body;

      if (!email || !full_name || !role_id) {
        return new Response(JSON.stringify({ error: "Email, full name, and role are required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const canAssign = await canAssignRole(supabase, caller.id, role_id);
      if (!canAssign) {
        return new Response(JSON.stringify({ error: `You cannot assign the role: ${role_id}` }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check for existing pending invitation
      const { data: existingInv } = await supabase
        .from("invitations")
        .select("id, status")
        .eq("email", email.toLowerCase())
        .eq("status", "pending")
        .maybeSingle();

      if (existingInv) {
        return new Response(JSON.stringify({ error: "A pending invitation already exists for this email" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const token = crypto.randomUUID();
      const tokenHash = await hashToken(token);
      const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();

      const { data: inv, error: invErr } = await supabase.from("invitations").insert({
        email: email.toLowerCase(),
        full_name,
        role: role_id,
        role_id,
        department_id: department_id || null,
        join_classification_id: join_classification_id || "direct_appointment",
        reporting_manager_id: reporting_manager_id || null,
        custom_title: custom_title || null,
        phone: phone || null,
        how_joined: how_joined || join_classification_id || "direct_appointment",
        setup_method: "invite_link",
        status: "pending",
        token_hash: tokenHash,
        invited_by: caller.id,
        expires_at: expiresAt,
      }).select("*").single();

      if (invErr) {
        return new Response(JSON.stringify({ error: invErr.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Log
      await supabase.from("activity_log").insert({
        actor_id: caller.id,
        action: "invite_member",
        target_type: "invitations",
        target_id: inv.id,
        summary: `Invited ${email} as ${role_id}`,
      });

      // Return the setup token (the admin shares the link with the invitee)
      return new Response(JSON.stringify({
        success: true,
        invitation_id: inv.id,
        setup_token: token,
        expires_at: expiresAt,
        message: "Invitation created. Share the setup link with the invitee."
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============================================================
    // ACCEPT INVITATION (invitee sets password and activates)
    // ============================================================
    if (action === "accept_invitation") {
      const { setup_token, password, full_name } = body;
      if (!setup_token || !password) {
        return new Response(JSON.stringify({ error: "Setup token and password are required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (password.length < 8) {
        return new Response(JSON.stringify({ error: "Password must be at least 8 characters" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const tokenHash = await hashToken(setup_token);
      const { data: inv } = await supabase
        .from("invitations")
        .select("*")
        .eq("token_hash", tokenHash)
        .eq("status", "pending")
        .maybeSingle();

      if (!inv) {
        return new Response(JSON.stringify({ error: "Invalid or expired invitation token" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (new Date(inv.expires_at) < new Date()) {
        await supabase.from("invitations").update({ status: "expired" }).eq("id", inv.id);
        return new Response(JSON.stringify({ error: "This invitation has expired" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create auth user
      const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
        email: inv.email,
        password,
        email_confirm: true,
        user_metadata: { full_name: full_name || inv.full_name },
        app_metadata: { role: inv.role_id },
      });

      if (createErr) {
        // If user already exists, try to update password
        if (createErr.message.includes("already")) {
          const { data: list } = await supabase.auth.admin.listUsers();
          const existing = list?.users?.find((u: { email?: string }) => u.email?.toLowerCase() === inv.email.toLowerCase());
          if (existing) {
            await supabase.auth.admin.updateUserById(existing.id, { password });
            // Create team profiles
            await createTeamProfiles(supabase, existing.id, inv, full_name);
            await supabase.from("invitations").update({
              status: "accepted", activated_by: existing.id, activated_at: new Date().toISOString()
            }).eq("id", inv.id);
            return new Response(JSON.stringify({ success: true, message: "Account activated. You can now log in." }), {
              status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
        return new Response(JSON.stringify({ error: createErr.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const userId = newUser.user.id;
      await createTeamProfiles(supabase, userId, inv, full_name);
      await supabase.from("invitations").update({
        status: "accepted", activated_by: userId, activated_at: new Date().toISOString()
      }).eq("id", inv.id);

      await supabase.from("security_events").insert({
        user_id: userId,
        event_type: "account_activated",
        success: true,
        metadata: { invitation_id: inv.id },
      });

      return new Response(JSON.stringify({ success: true, message: "Account created successfully. You can now log in." }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============================================================
    // CHANGE ROLE
    // ============================================================
    if (action === "change_role") {
      const { member_id, new_role_id } = body;
      if (!member_id || !new_role_id) {
        return new Response(JSON.stringify({ error: "Member ID and new role are required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Can't change own role
      if (member_id === caller.id) {
        return new Response(JSON.stringify({ error: "You cannot change your own role" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get target member
      const { data: target } = await supabase
        .from("team_member_profiles")
        .select("*")
        .eq("id", member_id)
        .maybeSingle();
      if (!target) {
        return new Response(JSON.stringify({ error: "Member not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Cannot change founder's role (except via transfer)
      if (target.is_founder) {
        return new Response(JSON.stringify({ error: "The founder's role can only be changed via ownership transfer" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Cannot assign founder role
      if (new_role_id === "founder") {
        return new Response(JSON.stringify({ error: "Founder status can only be transferred via the ownership transfer process" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const canAssign = await canAssignRole(supabase, caller.id, new_role_id);
      const canManage = await hasPermission(supabase, caller.id, "team_accounts", "edit") || callerProfile.is_founder;
      if (!canAssign || !canManage) {
        return new Response(JSON.stringify({ error: "You do not have permission to assign this role" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const oldRole = target.role_id;
      await supabase.from("team_member_profiles").update({
        role_id: new_role_id, updated_at: new Date().toISOString()
      }).eq("id", member_id);
      // Sync team_profiles
      await supabase.from("team_profiles").update({
        role: new_role_id
      }).eq("id", member_id);

      await supabase.from("security_events").insert({
        user_id: member_id,
        event_type: "role_change",
        success: true,
        metadata: { from: oldRole, to: new_role_id, changed_by: caller.id },
      });

      await supabase.from("activity_log").insert({
        actor_id: caller.id,
        action: "change_role",
        target_type: "team_member_profiles",
        target_id: member_id,
        summary: `Changed role from ${oldRole} to ${new_role_id}`,
        before: { role_id: oldRole },
        after: { role_id: new_role_id },
      });

      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============================================================
    // SUSPEND / REACTIVATE / DEACTIVATE
    // ============================================================
    if (action === "suspend" || action === "reactivate" || action === "deactivate") {
      const { member_id } = body;
      if (!member_id) {
        return new Response(JSON.stringify({ error: "Member ID is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (member_id === caller.id) {
        return new Response(JSON.stringify({ error: "You cannot modify your own account status" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: target } = await supabase
        .from("team_member_profiles")
        .select("*")
        .eq("id", member_id)
        .maybeSingle();
      if (!target) {
        return new Response(JSON.stringify({ error: "Member not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Cannot suspend/deactivate the founder
      if (target.is_founder) {
        return new Response(JSON.stringify({ error: "The founder account cannot be suspended or deactivated" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if this is the last founder
      if (action === "deactivate" && target.is_founder) {
        const { data: founderCount } = await supabase
          .from("team_member_profiles")
          .select("id", { count: "exact", head: true })
          .eq("is_founder", true)
          .eq("account_status", "active");
        if ((founderCount?.length ?? 0) >= 0 && (founderCount?.length ?? 1) <= 1) {
          return new Response(JSON.stringify({ error: "Cannot deactivate the last founder" }), {
            status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      const canManage = await hasPermission(supabase, caller.id, "team_accounts", "edit") || callerProfile.is_founder;
      if (!canManage) {
        return new Response(JSON.stringify({ error: "You do not have permission to modify account status" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const newStatus = action === "suspend" ? "suspended" : action === "reactivate" ? "active" : "deactivated";
      const now = new Date().toISOString();
      const patch: Record<string, unknown> = {
        account_status: newStatus, updated_at: now,
      };
      if (action === "suspend") patch.suspended_at = now;
      if (action === "reactivate") { patch.suspended_at = null; patch.deactivated_at = null; }
      if (action === "deactivate") patch.deactivated_at = now;

      await supabase.from("team_member_profiles").update(patch).eq("id", member_id);
      // Sync team_profiles is_active
      await supabase.from("team_profiles").update({
        is_active: action === "reactivate"
      }).eq("id", member_id);

      await supabase.from("security_events").insert({
        user_id: member_id,
        event_type: action === "suspend" ? "account_suspended" : action === "reactivate" ? "account_reactivated" : "account_deactivated",
        success: true,
        metadata: { performed_by: caller.id },
      });

      await supabase.from("activity_log").insert({
        actor_id: caller.id,
        action,
        target_type: "team_member_profiles",
        target_id: member_id,
        summary: `${action} member ${target.full_name}`,
      });

      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============================================================
    // UPDATE MEMBER (non-sensitive fields)
    // ============================================================
    if (action === "update_member") {
      const { member_id, custom_title, phone, department_id, bio, avatar_url, instagram_url, display_name, join_classification_id, reporting_manager_id } = body;
      if (!member_id) {
        return new Response(JSON.stringify({ error: "Member ID is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const isSelf = member_id === caller.id;
      const canEdit = isSelf || await hasPermission(supabase, caller.id, "team_accounts", "edit") || callerProfile.is_founder;
      if (!canEdit) {
        return new Response(JSON.stringify({ error: "You do not have permission to edit this member" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Self can only edit non-sensitive fields (not role, not status, not permissions)
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (custom_title !== undefined) patch.custom_title = custom_title;
      if (phone !== undefined) patch.phone = phone;
      if (bio !== undefined) patch.bio = bio;
      if (avatar_url !== undefined) patch.avatar_url = avatar_url;
      if (instagram_url !== undefined) patch.instagram_url = instagram_url;
      if (display_name !== undefined) patch.display_name = display_name;

      // These require team_accounts.edit permission (not self)
      if (!isSelf || callerProfile.is_founder) {
        if (department_id !== undefined) patch.department_id = department_id;
        if (join_classification_id !== undefined) patch.join_classification_id = join_classification_id;
        if (reporting_manager_id !== undefined) patch.reporting_manager_id = reporting_manager_id;
      }

      await supabase.from("team_member_profiles").update(patch).eq("id", member_id);

      await supabase.from("activity_log").insert({
        actor_id: caller.id,
        action: "update_member",
        target_type: "team_member_profiles",
        target_id: member_id,
        summary: `Updated profile for member ${member_id}`,
      });

      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============================================================
    // TRANSFER FOUNDERSHIP
    // ============================================================
    if (action === "transfer_foundership") {
      const { target_user_id, confirm_password, new_role_for_old_founder } = body;

      if (!target_user_id) {
        return new Response(JSON.stringify({ error: "Target user ID is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify caller is the current founder
      if (!callerProfile.is_founder) {
        return new Response(JSON.stringify({ error: "Only the current founder can transfer ownership" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify password confirmation
      if (!confirm_password) {
        return new Response(JSON.stringify({ error: "Password confirmation is required for founder transfer" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
        email: caller.email,
        password: confirm_password,
      });
      if (signInErr || !signInData.user) {
        await supabase.from("security_events").insert({
          user_id: caller.id,
          event_type: "founder_transfer",
          success: false,
          metadata: { reason: "password_confirmation_failed" },
        });
        return new Response(JSON.stringify({ error: "Password confirmation failed" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get target member
      const { data: target } = await supabase
        .from("team_member_profiles")
        .select("*")
        .eq("id", target_user_id)
        .maybeSingle();
      if (!target) {
        return new Response(JSON.stringify({ error: "Target member not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (target.account_status !== "active") {
        return new Response(JSON.stringify({ error: "Target member must be active" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (target_user_id === caller.id) {
        return new Response(JSON.stringify({ error: "You cannot transfer foundership to yourself" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const oldRoleId = callerProfile.role_id;
      const targetOldRoleId = target.role_id;
      const newRoleForOld = new_role_for_old_founder || "co_founder";

      // Atomically transfer: update founder record, update both profiles
      // 1. Update founder_record
      const { data: currentFounder } = await supabase
        .from("founder_record")
        .select("user_id")
        .eq("id", 1)
        .maybeSingle();

      await supabase.from("founder_record").upsert({
        id: 1,
        user_id: target_user_id,
        previous_founder_id: currentFounder?.user_id || caller.id,
        transferred_at: new Date().toISOString(),
      });

      // 2. Old founder loses founder status, gets new role
      await supabase.from("team_member_profiles").update({
        is_founder: false,
        role_id: newRoleForOld,
        updated_at: new Date().toISOString(),
      }).eq("id", caller.id);
      await supabase.from("team_profiles").update({
        role: newRoleForOld
      }).eq("id", caller.id);

      // 3. New founder gains founder status
      await supabase.from("team_member_profiles").update({
        is_founder: true,
        role_id: "founder",
        updated_at: new Date().toISOString(),
      }).eq("id", target_user_id);
      await supabase.from("team_profiles").update({
        role: "founder"
      }).eq("id", target_user_id);

      // 4. Record in immutable transfer history
      await supabase.from("ownership_transfer_history").insert({
        from_user_id: caller.id,
        to_user_id: target_user_id,
        transferred_by: caller.id,
        previous_role_id: oldRoleId,
        new_role_id: "founder",
      });

      // 5. Security events
      await supabase.from("security_events").insert([
        { user_id: caller.id, event_type: "founder_transfer", success: true, metadata: { transferred_to: target_user_id } },
        { user_id: target_user_id, event_type: "founder_transfer", success: true, metadata: { transferred_from: caller.id } },
      ]);

      await supabase.from("activity_log").insert({
        actor_id: caller.id,
        action: "transfer_foundership",
        target_type: "team_member_profiles",
        target_id: target_user_id,
        summary: `Transferred foundership from ${caller.email} to ${target.full_name}`,
      });

      return new Response(JSON.stringify({
        success: true,
        message: `Foundership transferred to ${target.full_name}. You are now ${newRoleForOld}.`,
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============================================================
    // REVOKE INVITATION
    // ============================================================
    if (action === "revoke_invitation") {
      const { invitation_id } = body;
      if (!invitation_id) {
        return new Response(JSON.stringify({ error: "Invitation ID required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const canManage = await hasPermission(supabase, caller.id, "team_accounts", "edit") || callerProfile.is_founder;
      if (!canManage) {
        return new Response(JSON.stringify({ error: "Not authorized" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      await supabase.from("invitations").update({
        status: "deactivated", revoked_at: new Date().toISOString()
      }).eq("id", invitation_id);
      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============================================================
    // RESEND INVITATION
    // ============================================================
    if (action === "resend_invitation") {
      const { invitation_id } = body;
      if (!invitation_id) {
        return new Response(JSON.stringify({ error: "Invitation ID required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const canManage = await hasPermission(supabase, caller.id, "team_accounts", "edit") || callerProfile.is_founder;
      if (!canManage) {
        return new Response(JSON.stringify({ error: "Not authorized" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const newToken = crypto.randomUUID();
      const newHash = await hashToken(newToken);
      await supabase.from("invitations").update({
        token_hash: newHash,
        status: "pending",
        expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
        revoked_at: null,
      }).eq("id", invitation_id);
      return new Response(JSON.stringify({ success: true, setup_token: newToken }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============================================================
    // LIST INVITATIONS
    // ============================================================
    if (action === "list_invitations") {
      const canView = await hasPermission(supabase, caller.id, "team_accounts", "view") || callerProfile.is_founder;
      if (!canView) {
        return new Response(JSON.stringify({ error: "Not authorized" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: invs } = await supabase
        .from("invitations")
        .select(`
          *,
          department:departments(id,name),
          role_definition:role_definitions(id,display_name),
          join_classification:join_classifications(id,display_name)
        `)
        .order("created_at", { ascending: false });
      return new Response(JSON.stringify({ invitations: invs || [] }), {
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

// ============================================================
// Helper functions
// ============================================================

async function hasPermission(supabase: ReturnType<typeof createClient>, userId: string, module: string, action: string): Promise<boolean> {
  const { data } = await supabase.rpc("has_permission", {
    p_user_id: userId, p_module: module, p_action: action,
  });
  return data === true;
}

async function canAssignRole(supabase: ReturnType<typeof createClient>, assignerId: string, roleId: string): Promise<boolean> {
  const { data } = await supabase.rpc("can_assign_role", {
    p_assigner: assignerId, p_role_id: roleId,
  });
  return data === true;
}

async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
  let pwd = "";
  for (let i = 0; i < 16; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
  return pwd;
}

async function createTeamProfiles(supabase: ReturnType<typeof createClient>, userId: string, inv: Record<string, unknown>, fullName?: string): Promise<void> {
  const name = fullName || (inv.full_name as string) || "";
  const roleId = inv.role_id as string;
  const deptId = inv.department_id as string | null;
  const jcId = inv.join_classification_id as string | null;
  const customTitle = inv.custom_title as string | null;
  const phone = inv.phone as string | null;
  const reportingManager = inv.reporting_manager_id as string | null;

  await supabase.from("team_profiles").upsert({
    id: userId, full_name: name, role: roleId, is_active: true,
  });

  await supabase.from("team_member_profiles").insert({
    id: userId, user_id: userId,
    role_id: roleId,
    department_id: deptId,
    join_classification_id: jcId || "direct_appointment",
    custom_title: customTitle,
    phone,
    reporting_manager_id: reportingManager,
    account_status: "active",
    full_name: name,
    display_name: customTitle,
    created_by: inv.invited_by as string,
  });
}

