-- ── Ownership protection: prevent owners from leaving teams/projects ──────

create or replace function public.leave_team(p_team_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_role text;
  v_team_name text;
  v_team_slug text;
begin
  select role into v_user_role
  from public.team_members
  where team_id = p_team_id and user_id = auth.uid();

  if v_user_role is null then
    raise exception 'Not a member of this team';
  end if;

  if v_user_role = 'owner' then
    raise exception 'You cannot leave a team you own. Transfer ownership or delete the team.';
  end if;

  select name, slug into v_team_name, v_team_slug
  from public.teams
  where id = p_team_id;

  delete from public.team_members
  where team_id = p_team_id and user_id = auth.uid();

  insert into public.activities (user_id, type, metadata)
  values (
    auth.uid(),
    'left_team',
    jsonb_build_object(
      'team_id', p_team_id,
      'team_name', v_team_name,
      'team_slug', v_team_slug
    )
  );
end;
$$;

create or replace function public.leave_project(p_project_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_role text;
  v_project_name text;
  v_project_slug text;
begin
  select role into v_user_role
  from public.project_members
  where project_id = p_project_id and user_id = auth.uid();

  if v_user_role is null then
    raise exception 'Not a member of this project';
  end if;

  if v_user_role = 'owner' then
    raise exception 'You cannot leave a project you own. Transfer ownership or delete the project.';
  end if;

  select name, slug into v_project_name, v_project_slug
  from public.projects
  where id = p_project_id;

  delete from public.project_members
  where project_id = p_project_id and user_id = auth.uid();

  insert into public.activities (user_id, type, metadata)
  values (
    auth.uid(),
    'left_project',
    jsonb_build_object(
      'project_id', p_project_id,
      'project_name', v_project_name,
      'project_slug', v_project_slug
    )
  );
end;
$$;
