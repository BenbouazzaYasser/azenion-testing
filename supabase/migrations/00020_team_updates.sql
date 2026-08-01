-- Migration: 00020_team_updates
--
-- Adds team update/feed tracking (timeline feed for teams).
-- Mirrors the project_updates architecture.

-- ── Team updates table ────────────────────────────────────────────────

create table if not exists public.team_updates (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text,
  image_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.team_updates enable row level security;

create index if not exists idx_team_updates_team_id
  on public.team_updates(team_id);
create index if not exists idx_team_updates_created_at
  on public.team_updates(created_at desc);

grant select, insert, update, delete
  on public.team_updates to anon, authenticated, service_role;

-- ── RLS: Team Updates SELECT ──────────────────────────────────────────

-- Members can read updates for their team
create policy "members can read team updates"
  on public.team_updates for select
  using (
    exists (
      select 1 from public.team_members
      where team_id = team_updates.team_id
        and user_id = auth.uid()
    )
  );

-- Non-members can read updates of public teams
create policy "anyone can read public team updates"
  on public.team_updates for select
  using (
    exists (
      select 1 from public.teams
      where id = team_updates.team_id
        and visibility = 'public'
    )
  );

-- ── RLS: Team Updates INSERT ──────────────────────────────────────────

create policy "members can create team updates"
  on public.team_updates for insert
  with check (
    exists (
      select 1 from public.team_members
      where team_id = team_updates.team_id
        and user_id = auth.uid()
    )
  );

-- ── RLS: Team Updates UPDATE ──────────────────────────────────────────

create policy "authors can update their own team updates"
  on public.team_updates for update
  using (author_id = auth.uid());

-- ── RLS: Team Updates DELETE ──────────────────────────────────────────

create policy "authors can delete their own team updates"
  on public.team_updates for delete
  using (author_id = auth.uid());

-- ── Storage: team-updates bucket ──────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('team-updates', 'team-updates', true)
on conflict (id) do nothing;

create policy "team update images are publicly readable"
  on storage.objects for select using (bucket_id = 'team-updates');

create policy "team members can upload update images"
  on storage.objects for insert with check (
    bucket_id = 'team-updates'
    and exists (
      select 1 from public.team_members
      where team_members.team_id = (storage.foldername(name))[1]::uuid
        and team_members.user_id = auth.uid()
    )
  );

create policy "authors can update their team update images"
  on storage.objects for update using (
    bucket_id = 'team-updates'
    and exists (
      select 1 from public.team_updates
      where team_updates.image_url like '%' || name
        and team_updates.author_id = auth.uid()
    )
  );

create policy "authors can delete their team update images"
  on storage.objects for delete using (
    bucket_id = 'team-updates'
    and exists (
      select 1 from public.team_updates
      where team_updates.image_url like '%' || name
        and team_updates.author_id = auth.uid()
    )
  );

-- ── Update delete_team RPC to cascade through team_updates ────────────

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
begin
  select owner_id, name, slug into v_owner_id, v_team_name, v_team_slug
  from public.teams
  where id = p_team_id;

  if v_owner_id is null then
    raise exception 'Team not found';
  end if;

  if v_owner_id <> auth.uid() then
    raise exception 'Only the owner can delete this team';
  end if;

  -- Delete storage: team logos and banners
  delete from storage.objects
  where bucket_id = 'team-logos'
    and (name like p_team_id || '/%' or name like 'banners/' || p_team_id || '/%');

  -- Delete storage: team update images
  delete from storage.objects
  where bucket_id = 'team-updates'
    and name like p_team_id || '/%';

  -- For each project in this team, clean up project-level storage and activities
  for v_project in
    select id, name, slug from public.projects where team_id = p_team_id
  loop
    delete from storage.objects
    where bucket_id = 'project-logos'
      and name like v_project.id || '/%';

    delete from storage.objects
    where bucket_id = 'project-updates'
      and name like v_project.id || '/%';

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

  -- Delete team-level data
  delete from public.team_open_roles where team_id = p_team_id;
  delete from public.team_members where team_id = p_team_id;

  -- Delete activities referencing this team (including created_team_update)
  delete from public.activities
  where metadata->>'team_id' = p_team_id::text;

  -- Log the deletion
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

  -- Delete the team (cascades to team_updates via FK)
  delete from public.teams where id = p_team_id;
end;
$$;

grant execute on function public.delete_team(uuid) to anon, authenticated, service_role;
