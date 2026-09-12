-- Migration: 00134_update_project_settings
--
-- Phase 0C: canonical database RPC for project settings mutation.
--
-- Background: actions/project.actions.ts:updateProjectSettings performs the
-- write through the service-role client ("bypasses RLS") with a hand-rolled
-- TypeScript membership check (owner or role in owner/maintainer). The
-- projects table has no member-writable UPDATE RLS path (all mutations go
-- through RPCs per 00013), so a native client holding only a user JWT cannot
-- perform this operation directly. This RPC moves the authorization inside
-- the database against auth.uid(): no caller-supplied actor id is accepted.
--
-- Scope (mirrors the server action exactly, no widening):
--   - oracle: projects.owner_id = auth.uid() OR project_members.role in
--     (owner, maintainer) — the same allow-set as the action.
--   - fields: name, slug, description, description_long, website, github_url,
--     visibility, technologies, recruitment — the same set the action writes.
--   - category resync (project_category_members) runs inside the RPC because
--     that table has no user-writable RLS path either.
--   - logo updates stay in update_project_logo (00013); membership management
--     stays in its own RPCs. This is NOT a generic project update RPC.

create or replace function public.update_project_settings(
  p_project_id uuid,
  p_name text default null,
  p_slug text default null,
  p_description text default null,
  p_description_long text default null,
  p_website text default null,
  p_github_url text default null,
  p_visibility text default null,
  p_technologies jsonb default null,
  p_recruitment jsonb default null,
  p_category_ids uuid[] default null
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_is_owner boolean;
  v_role text;
begin
  if p_project_id is null then
    raise exception 'Project ID is required';
  end if;

  select (owner_id = auth.uid()) into v_is_owner
  from public.projects where id = p_project_id;

  if v_is_owner is null then
    raise exception 'Project not found';
  end if;

  select role into v_role
  from public.project_members
  where project_id = p_project_id and user_id = auth.uid()
  limit 1;

  if not v_is_owner and (v_role is null or v_role not in ('owner', 'maintainer')) then
    raise exception 'You do not have permission to edit this project';
  end if;

  if p_visibility is not null
     and p_visibility not in ('public', 'open', 'private', 'invite_only')
  then
    raise exception 'Invalid visibility';
  end if;

  update public.projects set
    name = coalesce(p_name, name),
    slug = coalesce(p_slug, slug),
    description = coalesce(p_description, description),
    description_long = coalesce(p_description_long, description_long),
    website = coalesce(p_website, website),
    github_url = coalesce(p_github_url, github_url),
    visibility = coalesce(p_visibility, visibility),
    technologies = coalesce(p_technologies, technologies),
    recruitment = coalesce(p_recruitment, recruitment),
    updated_at = now()
  where id = p_project_id;

  if p_category_ids is not null then
    delete from public.project_category_members where project_id = p_project_id;
    if array_length(p_category_ids, 1) > 0 then
      insert into public.project_category_members (project_id, category_id)
      select p_project_id, unnest(p_category_ids)
      on conflict do nothing;
    end if;
  end if;
end;
$$;

revoke all on function public.update_project_settings(uuid, text, text, text, text, text, text, text, jsonb, jsonb, uuid[]) from public;
grant execute on function public.update_project_settings(uuid, text, text, text, text, text, text, text, jsonb, jsonb, uuid[])
  to authenticated, service_role;
