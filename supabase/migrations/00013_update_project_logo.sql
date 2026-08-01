-- Migration: 00013_update_project_logo
--
-- Adds an RPC so project owners can update the logo_url.
-- (No direct UPDATE policy exists on projects — all mutations go through RPCs.)

create or replace function public.update_project_logo(
  p_project_id uuid,
  p_logo_url text
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not exists (
    select 1 from public.project_members
    where project_id = p_project_id
      and user_id = auth.uid()
      and role in ('owner', 'admin')
  ) then
    raise exception 'Only project owners or admins can update the project logo';
  end if;

  update public.projects set
    logo_url   = p_logo_url,
    updated_at = now()
  where id = p_project_id;
end;
$$;
