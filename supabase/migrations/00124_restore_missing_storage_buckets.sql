-- Migration: 00124_restore_missing_storage_buckets
--
-- Restores storage buckets + RLS policies that are tracked in migrations
-- but missing on production (verified 2026-09-07 via Storage API: avatars,
-- team-updates, and project-updates all return 404 "Bucket not found").
-- This is why setting a profile picture fails with "Bucket not found".
--
-- Root cause: early bucket-creation migrations (00002 avatars, 00018
-- project-updates, 00020 team-updates) were recorded in schema_migrations
-- but their storage.buckets rows never materialized on the remote project
-- (same drift class documented in 00051). Buckets created via the Storage
-- API do not carry the SQL RLS policies, so this migration recreates both
-- idempotently: INSERT ... ON CONFLICT DO NOTHING + DROP IF EXISTS + CREATE.
--
-- Safe to re-run. No data changes.

-- ── 1. Buckets ──────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('team-updates', 'team-updates', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('project-updates', 'project-updates', true)
on conflict (id) do nothing;

-- ── 2. avatars policies (final state = 00002 + 00048 fix) ────────────────
-- Upload path is `avatars/<user_id>/<file>` (see actions/profile.actions.ts),
-- so foldername(name) = ['avatars', '<user_id>'].

drop policy if exists "avatars are publicly readable" on storage.objects;
create policy "avatars are publicly readable"
  on storage.objects for select using (bucket_id = 'avatars');

drop policy if exists "users can upload their own avatar" on storage.objects;
create policy "users can upload their own avatar"
  on storage.objects
  for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = 'avatars'
    and (storage.foldername(name))[2] = (auth.uid())::text
  );

drop policy if exists "users can update their own avatar" on storage.objects;
create policy "users can update their own avatar"
  on storage.objects
  for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = 'avatars'
    and (storage.foldername(name))[2] = (auth.uid())::text
  );

drop policy if exists "users can delete their own avatar" on storage.objects;
create policy "users can delete their own avatar"
  on storage.objects
  for delete
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = 'avatars'
    and (storage.foldername(name))[2] = (auth.uid())::text
  );

-- ── 3. team-updates policies (verbatim from 00020:83-114) ────────────────

drop policy if exists "team update images are publicly readable" on storage.objects;
create policy "team update images are publicly readable"
  on storage.objects for select using (bucket_id = 'team-updates');

drop policy if exists "team members can upload update images" on storage.objects;
create policy "team members can upload update images"
  on storage.objects for insert with check (
    bucket_id = 'team-updates'
    and exists (
      select 1 from public.team_members
      where team_members.team_id = (storage.foldername(name))[1]::uuid
        and team_members.user_id = auth.uid()
    )
  );

drop policy if exists "authors can update their team update images" on storage.objects;
create policy "authors can update their team update images"
  on storage.objects for update using (
    bucket_id = 'team-updates'
    and exists (
      select 1 from public.team_updates
      where team_updates.image_url like '%' || name
        and team_updates.author_id = auth.uid()
    )
  );

drop policy if exists "authors can delete their team update images" on storage.objects;
create policy "authors can delete their team update images"
  on storage.objects for delete using (
    bucket_id = 'team-updates'
    and exists (
      select 1 from public.team_updates
      where team_updates.image_url like '%' || name
        and team_updates.author_id = auth.uid()
    )
  );

-- ── 4. project-updates policies (verbatim from 00018:82-113) ─────────────

drop policy if exists "project update images are publicly readable" on storage.objects;
create policy "project update images are publicly readable"
  on storage.objects for select using (bucket_id = 'project-updates');

drop policy if exists "project members can upload update images" on storage.objects;
create policy "project members can upload update images"
  on storage.objects for insert with check (
    bucket_id = 'project-updates'
    and exists (
      select 1 from public.project_members
      where project_members.project_id = (storage.foldername(name))[1]::uuid
        and project_members.user_id = auth.uid()
    )
  );

drop policy if exists "authors can update their update images" on storage.objects;
create policy "authors can update their update images"
  on storage.objects for update using (
    bucket_id = 'project-updates'
    and exists (
      select 1 from public.project_updates
      where project_updates.image_url like '%' || name
        and project_updates.author_id = auth.uid()
    )
  );

drop policy if exists "authors can delete their update images" on storage.objects;
create policy "authors can delete their update images"
  on storage.objects for delete using (
    bucket_id = 'project-updates'
    and exists (
      select 1 from public.project_updates
      where project_updates.image_url like '%' || name
        and project_updates.author_id = auth.uid()
    )
  );
