// Shared Labs authorization context. Not a new permission system -- this
// reads the exact same existing tables (public.platform_admins,
// public.user_roles, public.roles) that is_platform_admin() and
// has_platform_role() already read from. It exists because those RPCs
// resolve the current user via an unparameterized `auth.uid()` default,
// which was found to be unreliable when called from a Next.js Server
// Component context (the RPC's internal auth.uid() didn't always resolve
// to the actual logged-in user there). Querying these tables directly
// with an explicitly-fetched user id sidesteps that failure mode entirely
// -- all three tables are already publicly readable (see 00028_branch_hub
// and 00100_platform_roles), so this requires no new grants or policies.
//
// Callers must fetch the user id themselves via supabase.auth.getUser()
// first (that part was confirmed reliable) and pass it in explicitly.

import type { SupabaseClient } from "@supabase/supabase-js";

export interface LabsAuthContext {
  // True via public.platform_admins OR the 'platform_admin' role in
  // user_roles -- either representation grants full, unrestricted Labs
  // management (any lab, not just their own).
  isPlatformAdmin: boolean;
  // True for core_team_member / instructor / creator (in addition to
  // platform admins). Can create labs and manage labs they created --
  // deliberately NOT the same as isPlatformAdmin, which is required for
  // managing labs created by someone else. This distinction must not be
  // collapsed: core_team_member intentionally does not get unrestricted
  // access.
  canCreateLab: boolean;
}

const NO_ACCESS: LabsAuthContext = { isPlatformAdmin: false, canCreateLab: false };

export async function getLabsAuthContext(
  supabase: SupabaseClient,
  userId: string | null | undefined,
): Promise<LabsAuthContext> {
  if (!userId) return NO_ACCESS;

  const [{ data: adminRow }, { data: roleRows }] = await Promise.all([
    supabase.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle(),
    supabase.from("user_roles").select("roles(name)").eq("user_id", userId),
  ]);

  const roleNames = new Set<string>();
  for (const row of (roleRows ?? []) as Array<{ roles: { name: string } | { name: string }[] | null }>) {
    const r = row.roles;
    if (!r) continue;
    if (Array.isArray(r)) {
      for (const x of r) roleNames.add(x.name);
    } else {
      roleNames.add(r.name);
    }
  }

  const isPlatformAdmin = Boolean(adminRow) || roleNames.has("platform_admin");
  const canCreateLab =
    isPlatformAdmin || roleNames.has("core_team_member") || roleNames.has("instructor") || roleNames.has("creator");

  return { isPlatformAdmin, canCreateLab };
}
