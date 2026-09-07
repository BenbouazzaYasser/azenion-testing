-- Migration: 00127_branch_supervisor_role
--
-- Adds the `branch_supervisor` platform role and lets it create branches.
--
--   - Seeds `branch_supervisor` into public.roles (is_system = true).
--   - Recreates create_branch to allow branch supervisors (platform admins
--     implicitly hold every role via has_platform_role, so they keep access).

insert into public.roles (name, description, is_system) values
  ('branch_supervisor', 'Branch supervisor - can create campus branches', true)
on conflict (name) do update set
  description = excluded.description,
  is_system = excluded.is_system;

create or replace function public.create_branch(
  p_name text,
  p_slug text,
  p_institution text default null,
  p_city text default null,
  p_description text default null,
  p_logo_url text default null
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_branch_id uuid;
begin
  if not public.has_platform_role('branch_supervisor') then
    raise exception 'Only a branch supervisor or the platform administrator can create branches';
  end if;

  insert into public.branches (slug, name, full_name, description, city, logo_url)
  values (p_slug, p_name, p_institution, p_description, p_city, p_logo_url)
  returning id into v_branch_id;

  insert into public.activities (user_id, type, metadata)
  values (
    auth.uid(),
    'created_branch',
    jsonb_build_object(
      'branch_id', v_branch_id,
      'branch_name', p_name,
      'branch_slug', p_slug
    )
  );

  return v_branch_id;
end;
$$;

-- ── Storage: allow branch supervisors to pre-upload branch logos ─────────────
-- The logo upload runs before the branch exists, targeting the reserved
-- staging prefix 00000000-0000-0000-0000-000000000000/logos/. The existing
-- insert policy only covers branch leaders + platform admins, so extend it
-- for branch supervisors on that staging prefix.
-- (Uses is_branch_leader: is_branch_manager was dropped in 00030.)

drop policy if exists "branch leaders can upload branch assets" on storage.objects;
create policy "branch leaders can upload branch assets"
  on storage.objects for insert with check (
    bucket_id = 'branch-assets'
    and (
      public.is_branch_leader((storage.foldername(name))[1]::uuid)
      or public.is_platform_admin()
      or (
        (storage.foldername(name))[1] = '00000000-0000-0000-0000-000000000000'
        and public.has_platform_role('branch_supervisor')
      )
    )
  );