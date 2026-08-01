-- ── Transfer Team Ownership ──────────────────────────────────────────────

create or replace function public.transfer_team_ownership(p_team_id uuid, p_new_owner_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_current_owner_id uuid;
  v_team_name text;
  v_new_owner_name text;
  v_member_count int;
  v_new_owner_role text;
begin
  -- Get current owner
  select owner_id into v_current_owner_id
  from public.teams
  where id = p_team_id;

  if v_current_owner_id is null then
    raise exception 'Team not found';
  end if;

  if auth.uid() <> v_current_owner_id then
    raise exception 'Only the current owner can transfer ownership';
  end if;

  if p_new_owner_id = v_current_owner_id then
    raise exception 'Cannot transfer ownership to yourself';
  end if;

  -- Check member count
  select count(*) into v_member_count
  from public.team_members
  where team_id = p_team_id;

  if v_member_count < 2 then
    raise exception 'There is nobody to transfer ownership to';
  end if;

  -- Verify target is a member
  select role into v_new_owner_role
  from public.team_members
  where team_id = p_team_id and user_id = p_new_owner_id;

  if v_new_owner_role is null then
    raise exception 'Target user is not a member of this team';
  end if;

  -- Get names for activity
  select name into v_team_name from public.teams where id = p_team_id;
  select full_name into v_new_owner_name from public.profiles where id = p_new_owner_id;

  -- Transfer ownership
  update public.teams
  set owner_id = p_new_owner_id,
      updated_at = now()
  where id = p_team_id;

  -- Demote current owner to admin
  update public.team_members
  set role = 'admin'
  where team_id = p_team_id and user_id = v_current_owner_id;

  -- Promote new owner
  update public.team_members
  set role = 'owner'
  where team_id = p_team_id and user_id = p_new_owner_id;

  -- Log activity
  insert into public.activities (user_id, type, metadata)
  values (
    auth.uid(),
    'transferred_team_ownership',
    jsonb_build_object(
      'team_id', p_team_id,
      'team_name', v_team_name,
      'old_owner', v_current_owner_id,
      'new_owner', p_new_owner_id,
      'new_owner_name', v_new_owner_name
    )
  );
end;
$$;

-- ── Transfer Project Ownership ───────────────────────────────────────────

create or replace function public.transfer_project_ownership(p_project_id uuid, p_new_owner_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_current_owner_id uuid;
  v_project_name text;
  v_new_owner_name text;
  v_member_count int;
  v_new_owner_role text;
begin
  select owner_id into v_current_owner_id
  from public.projects
  where id = p_project_id;

  if v_current_owner_id is null then
    raise exception 'Project not found';
  end if;

  if auth.uid() <> v_current_owner_id then
    raise exception 'Only the current owner can transfer ownership';
  end if;

  if p_new_owner_id = v_current_owner_id then
    raise exception 'Cannot transfer ownership to yourself';
  end if;

  select count(*) into v_member_count
  from public.project_members
  where project_id = p_project_id;

  if v_member_count < 2 then
    raise exception 'There is nobody to transfer ownership to';
  end if;

  select role into v_new_owner_role
  from public.project_members
  where project_id = p_project_id and user_id = p_new_owner_id;

  if v_new_owner_role is null then
    raise exception 'Target user is not a member of this project';
  end if;

  select name into v_project_name from public.projects where id = p_project_id;
  select full_name into v_new_owner_name from public.profiles where id = p_new_owner_id;

  update public.projects
  set owner_id = p_new_owner_id,
      updated_at = now()
  where id = p_project_id;

  update public.project_members
  set role = 'admin'
  where project_id = p_project_id and user_id = v_current_owner_id;

  update public.project_members
  set role = 'owner'
  where project_id = p_project_id and user_id = p_new_owner_id;

  insert into public.activities (user_id, type, metadata)
  values (
    auth.uid(),
    'transferred_project_ownership',
    jsonb_build_object(
      'project_id', p_project_id,
      'project_name', v_project_name,
      'old_owner', v_current_owner_id,
      'new_owner', p_new_owner_id,
      'new_owner_name', v_new_owner_name
    )
  );
end;
$$;
