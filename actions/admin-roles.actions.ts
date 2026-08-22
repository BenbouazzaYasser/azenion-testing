"use server";

import { createClient } from "@/lib/supabase/server";
import {
  adminSearchUsersSchema,
  adminAssignRoleSchema,
} from "@/lib/validations/admin-roles.schema";

export interface AdminUserSearchResult {
  id: string;
  username: string;
  full_name: string | null;
  institution: string | null;
  avatar_url: string | null;
}

export type AdminRoleListResult =
  | { error: string; roles: null }
  | { error: null; roles: AdminUserRole[] };

export type AdminUserSearchActionResult =
  | { error: string; users: null }
  | { error: null; users: AdminUserSearchResult[] };

export interface AdminUserRole {
  name: string;
  description: string | null;
  assigned_at: string;
}

/**
 * Resolves the caller and verifies they are a platform administrator via the
 * `is_platform_admin()` SECURITY DEFINER RPC (00028). Returns either the
 * authenticated Supabase client or an error result.
 */
async function requirePlatformAdmin(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Not authenticated" };
  }

  const { data: isPlatformAdmin, error: rpcError } = await supabase.rpc(
    "is_platform_admin",
  );

  if (rpcError || !isPlatformAdmin) {
    return { ok: false, error: "Not authorized" };
  }

  return { ok: true };
}

export async function adminSearchUsers(input: {
  query: string;
}): Promise<AdminUserSearchActionResult> {
  const guard = await requirePlatformAdmin();
  if (!guard.ok) return { error: guard.error, users: null };

  const parsed = adminSearchUsersSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Invalid search query", users: null };
  }

  const supabase = createClient();
  const { data, error } = await supabase.rpc("search_users", {
    p_query: parsed.data.query || null,
    p_limit: 20,
  });

  if (error) {
    return { error: error.message, users: null };
  }

  return { error: null, users: (data ?? []) as AdminUserSearchResult[] };
}

export async function adminGetUserRoles(input: {
  user_id: string;
}): Promise<AdminRoleListResult> {
  const guard = await requirePlatformAdmin();
  if (!guard.ok) return { error: guard.error, roles: null };

  const parsed = adminAssignRoleSchema.pick({ user_id: true }).safeParse(input);
  if (!parsed.success) {
    return { error: "Invalid user", roles: null };
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("user_roles")
    .select("assigned_at, roles(name, description)")
    .eq("user_id", parsed.data.user_id)
    .order("assigned_at", { ascending: true });

  if (error) {
    return { error: error.message, roles: null };
  }

  const roles = (data ?? [])
    .map((row) => {
      const r = row.roles as
        | { name: string; description: string | null }
        | { name: string; description: string | null }[]
        | null;
      const single = Array.isArray(r) ? r[0] : r;
      if (!single) return null;
      return {
        name: single.name,
        description: single.description,
        assigned_at: row.assigned_at as string,
      };
    })
    .filter((r): r is AdminUserRole => r !== null);

  return { error: null, roles };
}

export async function adminGrantRole(input: {
  user_id: string;
  role_name: string;
}): Promise<{ error?: string; success?: boolean }> {
  const guard = await requirePlatformAdmin();
  if (!guard.ok) return { error: guard.error };

  const parsed = adminAssignRoleSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Invalid input" };
  }

  const supabase = createClient();
  const { error } = await supabase.rpc("admin_grant_role", {
    p_user_id: parsed.data.user_id,
    p_role_name: parsed.data.role_name,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function adminRevokeRole(input: {
  user_id: string;
  role_name: string;
}): Promise<{ error?: string; success?: boolean }> {
  const guard = await requirePlatformAdmin();
  if (!guard.ok) return { error: guard.error };

  const parsed = adminAssignRoleSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Invalid input" };
  }

  const supabase = createClient();
  const { error } = await supabase.rpc("admin_revoke_role", {
    p_user_id: parsed.data.user_id,
    p_role_name: parsed.data.role_name,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
