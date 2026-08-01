-- Migration: 00021_team_technologies
--
-- Adds technologies array to teams and updates the update_team RPC.

alter table public.teams
  add column if not exists technologies text[] default '{}';

-- ── Update RPC: update_team ─────────────────────────────────────────────

create or replace function public.update_team(
  p_team_id uuid,
  p_name text default null,
  p_slug text default null,
  p_description text default null,
  p_visibility text default null,
  p_logo_url text default null,
  p_banner_url text default null,
  p_category_id uuid default null,
  p_technologies text[] default null
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_role text;
begin
  select role into v_user_role
  from public.team_members
  where team_id = p_team_id and user_id = auth.uid();

  if v_user_role is null or v_user_role not in ('owner', 'admin') then
    raise exception 'Only the team owner or an admin can update team settings';
  end if;

  update public.teams set
    name        = coalesce(p_name, name),
    slug        = coalesce(p_slug, slug),
    description = coalesce(p_description, description),
    visibility  = coalesce(p_visibility, visibility),
    logo_url    = coalesce(p_logo_url, logo_url),
    banner_url  = coalesce(p_banner_url, banner_url),
    category_id = coalesce(p_category_id, category_id),
    technologies = coalesce(p_technologies, technologies),
    updated_at  = now()
  where id = p_team_id;
end;
$$;

grant execute on function public.update_team(uuid, text, text, text, text, text, text, uuid, text[]) to anon, authenticated, service_role;
