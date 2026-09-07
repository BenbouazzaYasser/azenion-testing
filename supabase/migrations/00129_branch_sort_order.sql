-- Migration: 00129_branch_sort_order
--
-- Adds a `sort_order` column to public.branches so managers can control the
-- display order of campus branches (1, 2, 3, ...) from the edit dialog.
--
--   - Adds sort_order int (not null, default 0) to public.branches.
--   - Recreates create_branch (from 00127) and update_branch (from 00128) to
--     accept a p_sort_order argument (defaults to 0 / null respectively).
--     Both keep the manager-role authorization introduced earlier.

alter table public.branches
  add column if not exists sort_order int not null default 0;

-- ── create_branch: accept p_sort_order ────────────────────────────────────
create or replace function public.create_branch(
  p_name text,
  p_slug text,
  p_institution text default null,
  p_city text default null,
  p_description text default null,
  p_logo_url text default null,
  p_sort_order int default 0
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

  insert into public.branches (slug, name, full_name, description, city, logo_url, sort_order)
  values (p_slug, p_name, p_institution, p_description, p_city, p_logo_url, p_sort_order)
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

-- ── update_branch: accept p_sort_order ────────────────────────────────────
create or replace function public.update_branch(
  p_branch_id uuid,
  p_name text default null,
  p_slug text default null,
  p_institution text default null,
  p_city text default null,
  p_description text default null,
  p_logo_url text default null,
  p_sort_order int default null
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
    logo_url    = coalesce(p_logo_url, logo_url),
    sort_order  = coalesce(p_sort_order, sort_order)
  where id = p_branch_id;
end;
$$;

grant execute on function public.create_branch(text, text, text, text, text, text, int) to authenticated, service_role;
grant execute on function public.update_branch(uuid, text, text, text, text, text, text, int) to authenticated, service_role;
grant execute on function public.delete_branch(uuid) to authenticated, service_role;