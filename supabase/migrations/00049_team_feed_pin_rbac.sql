-- Migration: 00049_team_feed_pin_rbac
--
-- Extends team-feed pinning permission (Bug Fix #9). Previously only the team
-- owner (or platform admin) could pin to a team feed; now any member whose
-- role carries EDIT_FEED_POSTS can pin/unpin too. The check delegates to
-- `has_team_permission`, which already grants platform admins and the owner
-- the permission implicitly, so all three allowed roles converge on one rule.

create or replace function public.toggle_feed_pin(
  p_post_id uuid,
  p_scope text,
  p_branch_id uuid default null,
  p_team_id uuid default null,
  p_project_id uuid default null
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_post_id uuid;
  v_source_type text;
  v_source_id uuid;
  v_feed_owner uuid;
begin
  select id, source_type, source_id into v_post_id, v_source_type, v_source_id
  from public.posts
  where id = p_post_id;

  if v_post_id is null then
    raise exception 'Post not found';
  end if;

  if p_scope = 'global' then
    if not public.is_platform_admin() then
      raise exception 'Only the platform administrator can pin to the global feed';
    end if;
    v_feed_owner := null;

  elsif p_scope = 'branch' then
    if v_source_type in ('branch_announcement', 'branch_highlight', 'branch_event') then
      if v_source_type = 'branch_announcement' then
        select branch_id into v_feed_owner from public.branch_announcements where id = v_source_id;
      elsif v_source_type = 'branch_highlight' then
        select branch_id into v_feed_owner from public.branch_highlights where id = v_source_id;
      else
        select branch_id into v_feed_owner from public.branch_events where id = v_source_id;
      end if;
    elsif v_source_type = 'team_update' then
      select t.branch_id into v_feed_owner
      from public.team_updates tu
      join public.teams t on t.id = tu.team_id
      where tu.id = v_source_id;
    elsif v_source_type = 'project_update' then
      select t.branch_id into v_feed_owner
      from public.project_updates pu
      join public.projects pr on pr.id = pu.project_id
      left join public.teams t on t.id = pr.team_id
      where pu.id = v_source_id;
    end if;

    if v_feed_owner is null then
      raise exception 'Post is not linked to a branch';
    end if;
    if p_branch_id is not null and p_branch_id <> v_feed_owner then
      raise exception 'Post does not belong to this branch';
    end if;
    if not public.is_branch_leader(v_feed_owner) and not public.is_platform_admin() then
      raise exception 'Only branch leaders can pin in this branch';
    end if;

  elsif p_scope = 'team' then
    if v_source_type = 'team_update' then
      select team_id into v_feed_owner from public.team_updates where id = v_source_id;
    elsif v_source_type = 'project_update' then
      select pr.team_id into v_feed_owner
      from public.project_updates pu
      join public.projects pr on pr.id = pu.project_id
      where pu.id = v_source_id;
    end if;

    if v_feed_owner is null then
      raise exception 'Post is not linked to a team';
    end if;
    if p_team_id is not null and p_team_id <> v_feed_owner then
      raise exception 'Post does not belong to this team';
    end if;
    if not public.has_team_permission(v_feed_owner, 'EDIT_FEED_POSTS') then
      raise exception 'Only team owners or members with edit permissions can pin in this team';
    end if;

  elsif p_scope = 'project' then
    if v_source_type = 'project_update' then
      select project_id into v_feed_owner from public.project_updates where id = v_source_id;
    end if;

    if v_feed_owner is null then
      raise exception 'Post is not linked to a project';
    end if;
    if p_project_id is not null and p_project_id <> v_feed_owner then
      raise exception 'Post does not belong to this project';
    end if;
    if not public.is_platform_admin()
      and not exists (select 1 from public.projects where id = v_feed_owner and owner_id = auth.uid()) then
      raise exception 'Only project owners can pin in this project';
    end if;

  else
    raise exception 'Invalid pin scope';
  end if;

  if exists (
    select 1 from public.feed_pins
    where post_id = v_post_id
      and scope = p_scope
      and (p_scope = 'global'
           or (p_scope = 'branch'  and branch_id  = v_feed_owner)
           or (p_scope = 'team'    and team_id    = v_feed_owner)
           or (p_scope = 'project' and project_id = v_feed_owner))
  ) then
    delete from public.feed_pins
    where post_id = v_post_id
      and scope = p_scope
      and (p_scope = 'global'
           or (p_scope = 'branch'  and branch_id  = v_feed_owner)
           or (p_scope = 'team'    and team_id    = v_feed_owner)
           or (p_scope = 'project' and project_id = v_feed_owner));
  else
    insert into public.feed_pins (post_id, scope, branch_id, team_id, project_id, created_by)
    values (
      v_post_id,
      p_scope,
      case when p_scope = 'branch'  then v_feed_owner else null end,
      case when p_scope = 'team'    then v_feed_owner else null end,
      case when p_scope = 'project' then v_feed_owner else null end,
      auth.uid()
    );
  end if;
end;
$$;

grant execute on function public.toggle_feed_pin(uuid, text, uuid, uuid, uuid)
  to anon, authenticated, service_role;
