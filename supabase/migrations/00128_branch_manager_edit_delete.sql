-- Migration: 00128_branch_manager_edit_delete
--
-- Lets `core_team_member` and `branch_supervisor` platform roles edit and
-- delete campus branches (platform admins keep access via has_platform_role,
-- which returns true for them implicitly).
--
--   - update_branch: adds both roles alongside the existing platform-admin and
--     branch-leader checks.
--   - delete_branch: adds both roles to what was platform-admin-only.
--   - storage insert policy on branch-assets: allows both roles to pre-upload
--     logos to the reserved staging prefix (used by uploadBranchLogoAsset).

-- ── update_branch: allow core team + branch supervisors ────────────────────
create or replace function public.update_branch(
  p_branch_id uuid,
  p_name text default null,
  p_slug text default null,
  p_institution text default null,
  p_city text default null,
  p_description text default null,
  p_logo_url text default null
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_platform_admin()
     and not public.is_branch_leader(p_branch_id)
     and not public.has_platform_role('core_team_member')
     and not public.has_platform_role('branch_supervisor') then
    raise exception 'Only the platform administrator, a core team member, a branch supervisor, or a branch leader can update a branch';
  end if;

  update public.branches set
    name        = coalesce(p_name, name),
    slug        = coalesce(p_slug, slug),
    full_name   = coalesce(p_institution, full_name),
    city        = coalesce(p_city, city),
    description = coalesce(p_description, description),
    logo_url    = coalesce(p_logo_url, logo_url)
  where id = p_branch_id;
end;
$$;

-- ── delete_branch: allow core team + branch supervisors ────────────────────
-- Recreated from 00035 (storage cleanup stays in the client action; this RPC
-- only deletes database rows). Branch-leader checks are intentionally NOT
-- added — deletion is restricted to platform admins and the two manager roles.
create or replace function public.delete_branch(p_branch_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_member_count int;
  v_branch_name text;
begin
  if not public.is_platform_admin()
     and not public.has_platform_role('core_team_member')
     and not public.has_platform_role('branch_supervisor') then
    raise exception 'Only the platform administrator, a core team member, or a branch supervisor can delete branches';
  end if;

  select count(*) into v_member_count
  from public.branch_members
  where branch_id = p_branch_id;

  if v_member_count > 0 then
    raise exception 'This branch still has members';
  end if;

  select name into v_branch_name
  from public.branches
  where id = p_branch_id;

  delete from public.branches where id = p_branch_id;

  insert into public.activities (user_id, type, metadata)
  values (
    auth.uid(),
    'deleted_branch',
    jsonb_build_object(
      'branch_id', p_branch_id,
      'branch_name', v_branch_name
    )
  );
end;
$$;

-- ── Storage: let core team members pre-upload branch logos ─────────────────
-- uploadBranchLogoAsset targets the reserved staging prefix
-- 00000000-0000-0000-0000-000000000000/logos/ before the branch exists.
-- 00127 extended this policy for branch_supervisor; add core_team_member.

drop policy if exists "branch managers can upload branch assets" on storage.objects;
create policy "branch managers can upload branch assets"
  on storage.objects for insert with check (
    bucket_id = 'branch-assets'
    and (
      public.is_branch_leader((storage.foldername(name))[1]::uuid)
      or public.is_platform_admin()
      or (
        (storage.foldername(name))[1] = '00000000-0000-0000-0000-000000000000'
        and (
          public.has_platform_role('branch_supervisor')
          or public.has_platform_role('core_team_member')
        )
      )
    )
  );