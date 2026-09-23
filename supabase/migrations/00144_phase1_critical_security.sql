-- Migration: 00144_phase1_critical_security
--
-- Phase 1 of the 2026-09-23 code audit (criticals #3, #8, #9, #10).
-- Supersedes the live-DB state of:
--   - 00053_storage_cleanup_best_effort (null-owner guard added in-file, but
--     this migration is what re-creates the functions on the live project)
--   - 00118_platform_roles (user_roles SELECT restricted in-file + here)
-- and adds the anon-revoke block, content length CHECKs, and the
-- visibility-filtered branch feed count RPC.

-- ── #3: null-owner guard on delete RPCs ─────────────────────────────────────
-- Bug: `if v_owner_id <> auth.uid()` evaluates to NULL when auth.uid() is
-- null, so the owner guard was SKIPPED for unauthenticated callers (only a
-- later NOT NULL violation rolled the transaction back by accident).

create or replace function public.delete_project(p_project_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_owner_id uuid;
  v_project_name text;
  v_project_slug text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select owner_id, name, slug into v_owner_id, v_project_name, v_project_slug
  from public.projects
  where id = p_project_id;

  if v_owner_id is null then
    raise exception 'Project not found';
  end if;

  if v_owner_id <> auth.uid() then
    raise exception 'Only the owner can delete this project';
  end if;

  perform public.delete_storage_prefix('project-logos', p_project_id::text || '/');
  perform public.delete_storage_prefix('project-updates', p_project_id::text || '/');

  delete from public.activities
  where metadata->>'project_id' = p_project_id::text;

  insert into public.activities (user_id, type, metadata)
  values (
    auth.uid(),
    'deleted_project',
    jsonb_build_object(
      'project_id', p_project_id,
      'project_name', v_project_name,
      'project_slug', v_project_slug
    )
  );

  delete from public.projects where id = p_project_id;
end;
$$;

grant execute on function public.delete_project(uuid) to authenticated, service_role;

create or replace function public.delete_team(p_team_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_owner_id uuid;
  v_team_name text;
  v_team_slug text;
  v_project record;
  v_cooldown_days int;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select owner_id, name, slug into v_owner_id, v_team_name, v_team_slug
  from public.teams
  where id = p_team_id;

  if v_owner_id is null then
    raise exception 'Team not found';
  end if;

  if v_owner_id <> auth.uid() then
    raise exception 'Only the owner can delete this team';
  end if;

  perform public.delete_storage_prefix('team-logos', p_team_id::text || '/');
  perform public.delete_storage_prefix('team-logos', 'banners/' || p_team_id::text || '/');
  perform public.delete_storage_prefix('team-updates', p_team_id::text || '/');

  for v_project in
    select id, name, slug from public.projects where team_id = p_team_id
  loop
    perform public.delete_storage_prefix('project-logos', v_project.id::text || '/');
    perform public.delete_storage_prefix('project-updates', v_project.id::text || '/');

    delete from public.activities
    where metadata->>'project_id' = v_project.id::text;

    insert into public.activities (user_id, type, metadata)
    values (
      auth.uid(),
      'deleted_project',
      jsonb_build_object(
        'project_id', v_project.id,
        'project_name', v_project.name,
        'project_slug', v_project.slug
      )
    );
  end loop;

  delete from public.team_open_roles where team_id = p_team_id;
  delete from public.team_members where team_id = p_team_id;

  delete from public.activities
  where metadata->>'team_id' = p_team_id::text;

  insert into public.activities (user_id, type, metadata)
  values (
    auth.uid(),
    'deleted_team',
    jsonb_build_object(
      'team_id', p_team_id,
      'team_name', v_team_name,
      'team_slug', v_team_slug
    )
  );

  delete from public.teams where id = p_team_id;

  if public.is_platform_admin() is false then
    select ownership_cooldown_days into v_cooldown_days
    from public.ecosystem_config
    where id = true;

    update public.profiles
    set team_owner_cooldown_until = now() + make_interval(days => v_cooldown_days)
    where id = v_owner_id;
  end if;
end;
$$;

grant execute on function public.delete_team(uuid) to authenticated, service_role;

-- ── #3: no mutating RPC stays executable by anon ────────────────────────────
-- Covers every anon grant listed in the audit (00014/00019/00020/00021/00022/
-- 00028/00030/00031/00035/00052/00053). Resolved from pg_proc at run time so
-- signature drift/overloads can't make the revoke miss or fail. Read-only
-- helpers (is_platform_admin, is_branch_leader, can_manage_*, get_* …) keep
-- their anon grants — only mutating RPCs are revoked.
do $$
declare sig text;
begin
  for sig in
    select n.nspname || '.' || p.proname
           || '(' || pg_get_function_identity_arguments(p.oid) || ')'
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'delete_project', 'delete_team', 'create_branch', 'update_branch',
        'delete_branch', 'update_team', 'assign_branch_leader',
        'remove_branch_leader', 'assign_branch_manager', 'remove_branch_manager',
        'create_branch_announcement', 'update_branch_announcement',
        'update_branch_announcement_image', 'delete_branch_announcement',
        'create_branch_event', 'update_branch_event', 'delete_branch_event',
        'create_branch_highlight', 'update_branch_highlight', 'delete_branch_highlight'
      )
  loop
    execute format('revoke execute on function %s from anon', sig);
  end loop;
end $$;

-- ── #9: user_roles SELECT restricted to self + platform admins ──────────────
-- Was `using (true)` + grant to anon -> anyone could enumerate every user's
-- platform roles (incl. admins and assigned_by) via PostgREST.

drop policy if exists "user roles are publicly readable" on public.user_roles;
drop policy if exists "user roles readable by self and platform admins" on public.user_roles;
create policy "user roles readable by self and platform admins"
  on public.user_roles for select
  using (user_id = auth.uid() or public.is_platform_admin());

revoke select on public.user_roles from anon;

-- ── #8: DB CHECK length limits for user content ─────────────────────────────
-- NOT VALID: enforces the limits on every new write without failing the
-- migration on pre-existing over-long rows (no limit existed before).

alter table public.messages
  add constraint messages_content_len check (char_length(content) <= 4000) not valid;
alter table public.update_comments
  add constraint update_comments_body_len check (char_length(body) <= 5000) not valid;
alter table public.posts
  add constraint posts_title_len check (char_length(title) <= 200) not valid;
alter table public.posts
  add constraint posts_body_len check (body is null or char_length(body) <= 5000) not valid;
alter table public.channel_messages
  add constraint channel_messages_content_len check (char_length(content) <= 4000) not valid;

-- ── #10: visibility-filtered branch feed total ──────────────────────────────
-- Same predicate as get_branch_feed_posts; the old raw count leaked how many
-- private team/project updates a branch has to anonymous scope=branch callers.

create or replace function public.count_branch_feed_posts(
  p_source_ids uuid[],
  p_viewer uuid default null
)
returns bigint
language sql
security definer set search_path = public
stable
as $$
  select count(*)::bigint
  from public.posts p
  where p.source_id = any(p_source_ids)
    and public.is_feed_post_visible(p.source_type, p.source_id, p_viewer);
$$;

grant execute on function public.count_branch_feed_posts(uuid[], uuid)
  to anon, authenticated, service_role;
