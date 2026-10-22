// Roles & Permissions Management Edge Function
// Handles: list_roles, create_role, update_role, delete_role, get_permissions,
//          update_permissions, list_join_classifications, list_departments,
//          create_department, update_department

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

    // Load caller's member profile
    const { data: caller } = await supabase
      .from("team_member_profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (!caller || caller.account_status !== "active") {
      return new Response(JSON.stringify({ error: "Not authorized" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const action = body.action;

    // ============================================================
    // LIST ROLES
    // ============================================================
    if (action === "list_roles") {
      const { data: roles } = await supabase
        .from("role_definitions")
        .select("*")
        .order("hierarchy_level", { ascending: true });
      return new Response(JSON.stringify({ roles: roles || [] }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============================================================
    // GET PERMISSIONS for a role
    // ============================================================
    if (action === "get_permissions") {
      const { role_id } = body;
      if (!role_id) {
        return new Response(JSON.stringify({ error: "Role ID required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: perms } = await supabase
        .from("role_permissions")
        .select("*")
        .eq("role_id", role_id);
      return new Response(JSON.stringify({ permissions: perms || [] }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Permission check for write operations
    const canManagePermissions = caller.is_founder || await hasPermission(supabase, userId, "roles_permissions", "manage_permissions");
    const canEditRoles = caller.is_founder || await hasPermission(supabase, userId, "roles_permissions", "manage_settings");

    // ============================================================
    // CREATE ROLE
    // ============================================================
    if (action === "create_role") {
      if (!canManagePermissions) {
        return new Response(JSON.stringify({ error: "You do not have permission to create roles" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { id, display_name, description, hierarchy_level, can_assign_roles, can_manage_roles } = body;
      if (!id || !display_name) {
        return new Response(JSON.stringify({ error: "Role ID and display name are required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Cannot create system roles
      const { data: existing } = await supabase
        .from("role_definitions")
        .select("id")
        .eq("id", id)
        .maybeSingle();
      if (existing) {
        return new Response(JSON.stringify({ error: "A role with this ID already exists" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: createErr } = await supabase.from("role_definitions").insert({
        id,
        display_name,
        description: description || null,
        hierarchy_level: hierarchy_level ?? 50,
        is_system: false,
        can_assign_roles: can_assign_roles || [],
        can_manage_roles: can_manage_roles || [],
        is_active: true,
      });

      if (createErr) {
        return new Response(JSON.stringify({ error: createErr.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabase.from("activity_log").insert({
        actor_id: userId,
        action: "create_role",
        target_type: "role_definitions",
        target_id: id,
        summary: `Created role: ${display_name}`,
      });

      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============================================================
    // UPDATE ROLE
    // ============================================================
    if (action === "update_role") {
      if (!canEditRoles) {
        return new Response(JSON.stringify({ error: "You do not have permission to edit roles" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { id, display_name, description, hierarchy_level, can_assign_roles, can_manage_roles, is_active } = body;
      if (!id) {
        return new Response(JSON.stringify({ error: "Role ID required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (display_name !== undefined) patch.display_name = display_name;
      if (description !== undefined) patch.description = description;
      if (hierarchy_level !== undefined) patch.hierarchy_level = hierarchy_level;
      if (can_assign_roles !== undefined) patch.can_assign_roles = can_assign_roles;
      if (can_manage_roles !== undefined) patch.can_manage_roles = can_manage_roles;
      if (is_active !== undefined) patch.is_active = is_active;

      // Cannot deactivate the founder role
      if (id === "founder" && is_active === false) {
        return new Response(JSON.stringify({ error: "The founder role cannot be deactivated" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: updateErr } = await supabase.from("role_definitions").update(patch).eq("id", id);
      if (updateErr) {
        return new Response(JSON.stringify({ error: updateErr.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabase.from("activity_log").insert({
        actor_id: userId,
        action: "update_role",
        target_type: "role_definitions",
        target_id: id,
        summary: `Updated role: ${id}`,
      });

      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============================================================
    // DELETE ROLE
    // ============================================================
    if (action === "delete_role") {
      if (!canManagePermissions) {
        return new Response(JSON.stringify({ error: "You do not have permission to delete roles" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { id } = body;
      if (!id) {
        return new Response(JSON.stringify({ error: "Role ID required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Cannot delete system roles
      const { data: role } = await supabase
        .from("role_definitions")
        .select("is_system")
        .eq("id", id)
        .maybeSingle();
      if (role?.is_system) {
        return new Response(JSON.stringify({ error: "System roles cannot be deleted. Deactivate them instead." }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if any members are assigned
      const { data: members } = await supabase
        .from("team_member_profiles")
        .select("id")
        .eq("role_id", id)
        .limit(1);
      if (members && members.length > 0) {
        return new Response(JSON.stringify({ error: "Cannot delete a role that still has members. Reassign members first." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabase.from("role_definitions").delete().eq("id", id);

      await supabase.from("activity_log").insert({
        actor_id: userId,
        action: "delete_role",
        target_type: "role_definitions",
        target_id: id,
        summary: `Deleted role: ${id}`,
      });

      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============================================================
    // UPDATE PERMISSIONS (batch)
    // ============================================================
    if (action === "update_permissions") {
      if (!canManagePermissions) {
        return new Response(JSON.stringify({ error: "You do not have permission to manage permissions" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { role_id, permissions } = body;
      if (!role_id || !permissions || !Array.isArray(permissions)) {
        return new Response(JSON.stringify({ error: "Role ID and permissions array are required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Delete existing permissions for this role, then insert the new set
      await supabase.from("role_permissions").delete().eq("role_id", role_id);

      const rows = permissions.map((p: { module: string; action: string; allowed: boolean }) => ({
        role_id,
        module: p.module,
        action: p.action,
        allowed: p.allowed,
      }));

      if (rows.length > 0) {
        const { error: insertErr } = await supabase.from("role_permissions").insert(rows);
        if (insertErr) {
          return new Response(JSON.stringify({ error: insertErr.message }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      await supabase.from("activity_log").insert({
        actor_id: userId,
        action: "update_permissions",
        target_type: "role_permissions",
        target_id: role_id,
        summary: `Updated permissions for role: ${role_id}`,
      });

      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============================================================
    // LIST JOIN CLASSIFICATIONS
    // ============================================================
    if (action === "list_join_classifications") {
      const { data: jcs } = await supabase
        .from("join_classifications")
        .select("*")
        .order("sort_order");
      return new Response(JSON.stringify({ classifications: jcs || [] }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============================================================
    // LIST DEPARTMENTS
    // ============================================================
    if (action === "list_departments") {
      const { data: depts } = await supabase
        .from("departments")
        .select("*")
        .order("sort_order");
      return new Response(JSON.stringify({ departments: depts || [] }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============================================================
    // CREATE / UPDATE DEPARTMENT
    // ============================================================
    if (action === "create_department" || action === "update_department") {
      if (!canEditRoles) {
        return new Response(JSON.stringify({ error: "Not authorized" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (action === "create_department") {
        const { id, name, description, sort_order } = body;
        if (!id || !name) {
          return new Response(JSON.stringify({ error: "ID and name required" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { error: e } = await supabase.from("departments").insert({
          id, name, description: description || null, sort_order: sort_order || 0, is_active: true,
        });
        if (e) return new Response(JSON.stringify({ error: e.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } else {
        const { id, name, description, sort_order, is_active } = body;
        const patch: Record<string, unknown> = {};
        if (name !== undefined) patch.name = name;
        if (description !== undefined) patch.description = description;
        if (sort_order !== undefined) patch.sort_order = sort_order;
        if (is_active !== undefined) patch.is_active = is_active;
        const { error: e } = await supabase.from("departments").update(patch).eq("id", id);
        if (e) return new Response(JSON.stringify({ error: e.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============================================================
    // GET FOUNDER RECORD + TRANSFER HISTORY
    // ============================================================
    if (action === "get_founder_info") {
      const { data: founder } = await supabase
        .from("founder_record")
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      const { data: history } = await supabase
        .from("ownership_transfer_history")
        .select("*")
        .order("created_at", { ascending: false });
      return new Response(JSON.stringify({ founder, transfer_history: history || [] }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============================================================
    // GET SECURITY EVENTS (admin only)
    // ============================================================
    if (action === "get_security_events") {
      const canView = caller.is_founder || await hasPermission(supabase, userId, "audit_logs", "view") || await hasPermission(supabase, userId, "security_settings", "view");
      if (!canView) {
        return new Response(JSON.stringify({ error: "Not authorized to view security events" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const limit = body.limit || 100;
      const { data: events } = await supabase
        .from("security_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      return new Response(JSON.stringify({ events: events || [] }), {
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

async function hasPermission(supabase: ReturnType<typeof createClient>, userId: string, module: string, action: string): Promise<boolean> {
  const { data } = await supabase.rpc("has_permission", {
    p_user_id: userId, p_module: module, p_action: action,
  });
  return data === true;
}

