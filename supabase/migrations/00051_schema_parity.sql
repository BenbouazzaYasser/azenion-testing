-- Migration: 00051_schema_parity
--
-- Restores the remote schema to the exact state produced by the local
-- migrations (00000-00050). The remote schema_migrations table records every
-- migration as applied, but several objects were never actually created and a
-- few were added manually outside the migrations. See the drift report for
-- full details. This migration is idempotent and safe to re-run.

-- ── 1. Missing: feed-images storage bucket (00032:257-259) ────────────────
insert into storage.buckets (id, name, public)
values ('feed-images', 'feed-images', true)
on conflict (id) do nothing;

-- ── 2. Missing: feed-images storage policies (00032:261-280) ──────────────
drop policy if exists "feed images are publicly readable" on storage.objects;
create policy "feed images are publicly readable"
  on storage.objects for select using (bucket_id = 'feed-images');

drop policy if exists "authenticated users can upload feed images" on storage.objects;
create policy "authenticated users can upload feed images"
  on storage.objects for insert with check (
    bucket_id = 'feed-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "authenticated users can update their feed images" on storage.objects;
create policy "authenticated users can update their feed images"
  on storage.objects for update using (
    bucket_id = 'feed-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "authenticated users can delete their feed images" on storage.objects;
create policy "authenticated users can delete their feed images"
  on storage.objects for delete using (
    bucket_id = 'feed-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── 3. Missing: saved_posts RLS policies (00032:243-253) ──────────────────
drop policy if exists "users can read their saved posts" on public.saved_posts;
create policy "users can read their saved posts"
  on public.saved_posts for select
  using (auth.uid() = user_id);

drop policy if exists "users can save posts" on public.saved_posts;
create policy "users can save posts"
  on public.saved_posts for insert
  with check (auth.uid() = user_id);

drop policy if exists "users can unsave posts" on public.saved_posts;
create policy "users can unsave posts"
  on public.saved_posts for delete
  using (auth.uid() = user_id);

-- ── 4. Missing: teams "owner can read their teams" policy (00005:46) ──────
drop policy if exists "owner can read their teams" on public.teams;
create policy "owner can read their teams"
  on public.teams for select
  using (owner_id = auth.uid());

-- ── 5. Missing: project-assets storage write policies (00011:402-432) ─────
drop policy if exists "project owners can upload assets" on storage.objects;
create policy "project owners can upload assets"
  on storage.objects for insert with check (
    bucket_id = 'project-assets'
    and exists (
      select 1 from public.project_members
      where project_members.project_id = (storage.foldername(name))[1]::uuid
        and project_members.user_id = auth.uid()
        and project_members.role = 'owner'
    )
  );

drop policy if exists "project owners can update assets" on storage.objects;
create policy "project owners can update assets"
  on storage.objects for update using (
    bucket_id = 'project-assets'
    and exists (
      select 1 from public.project_members
      where project_members.project_id = (storage.foldername(name))[1]::uuid
        and project_members.user_id = auth.uid()
        and project_members.role = 'owner'
    )
  );

drop policy if exists "project owners can delete assets" on storage.objects;
create policy "project owners can delete assets"
  on storage.objects for delete using (
    bucket_id = 'project-assets'
    and exists (
      select 1 from public.project_members
      where project_members.project_id = (storage.foldername(name))[1]::uuid
        and project_members.user_id = auth.uid()
        and project_members.role = 'owner'
    )
  );

-- ── 6. Missing: notifications in supabase_realtime (00032:284) ─────────────
do $$
begin
  if not exists (
    select 1 from pg_publication_rel pr
    join pg_publication p on p.oid = pr.prpubid
    where p.pubname = 'supabase_realtime'
      and pr.prrelid = 'public.notifications'::regclass
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

-- ── 7. Extra: RLS policies not defined in any migration ────────────────────
drop policy if exists "Platform admins can update branches" on public.branches;
drop policy if exists "users can join teams" on public.team_members;
drop policy if exists "users can leave teams" on public.team_members;

-- ── 8. Extra: table privileges not granted by any migration ────────────────
-- TRUNCATE/REFERENCES/TRIGGER on every public table for anon+authenticated
-- came from an external "grant all" (dashboard/SQL editor). TRUNCATE bypasses
-- RLS, so this is a real security exposure.
revoke references, trigger, truncate on all tables in schema public
  from anon, authenticated;

-- Extra UPDATE grant on branches (00004:37 grants select only).
revoke update on public.branches from authenticated;
