-- 00075: Remove the "Updated branch" activity
--
-- The update_branch RPC logged an `updated_branch` row into public.activities
-- on every successful branch update. Branch updates themselves remain fully
-- functional; only the activity logging is removed.
--
-- Redefines the function with the same signature/body as 00030 minus the
-- activities insert. Grants persist since the function identity is unchanged.

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
  if not public.is_platform_admin() and not public.is_branch_leader(p_branch_id) then
    raise exception 'Only the platform administrator or a branch leader can update a branch';
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
