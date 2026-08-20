-- Migration: 00018_project_updates
--
-- Adds progress update tracking for projects (timeline feed).

-- ── Project updates table ───────────────────────────────────────────────

create table if not exists public.project_updates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text,
  image_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.project_updates enable row level security;

create index if not exists idx_project_updates_project_id
  on public.project_updates(project_id);
create index if not exists idx_project_updates_created_at
  on public.project_updates(created_at desc);

grant select, insert, update, delete
  on public.project_updates to anon, authenticated, service_role;

-- ── RLS: Project Updates SELECT ─────────────────────────────────────────

-- Members can read updates for their project
create policy "members can read project updates"
  on public.project_updates for select
  using (
    exists (
      select 1 from public.project_members
      where project_id = project_updates.project_id
        and user_id = auth.uid()
    )
  );

-- Non-members can read updates of open projects
create policy "anyone can read open project updates"
  on public.project_updates for select
  using (
    exists (
      select 1 from public.projects
      where id = project_updates.project_id
        and visibility in ('open', 'invite_only')
    )
  );

-- ── RLS: Project Updates INSERT ─────────────────────────────────────────

create policy "members can create updates"
  on public.project_updates for insert
  with check (
    exists (
      select 1 from public.project_members
      where project_id = project_updates.project_id
        and user_id = auth.uid()
    )
  );

-- ── RLS: Project Updates UPDATE ─────────────────────────────────────────

create policy "authors can update their own updates"
  on public.project_updates for update
  using (author_id = auth.uid());

-- ── RLS: Project Updates DELETE ─────────────────────────────────────────

create policy "authors can delete their own updates"
  on public.project_updates for delete
  using (author_id = auth.uid());

-- ── Storage: project-updates bucket ─────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('project-updates', 'project-updates', true)
on conflict (id) do nothing;

create policy "project update images are publicly readable"
  on storage.objects for select using (bucket_id = 'project-updates');

create policy "project members can upload update images"
  on storage.objects for insert with check (
    bucket_id = 'project-updates'
    and exists (
      select 1 from public.project_members
      where project_members.project_id = (storage.foldername(name))[1]::uuid
        and project_members.user_id = auth.uid()
    )
  );

create policy "authors can update their update images"
  on storage.objects for update using (
    bucket_id = 'project-updates'
    and exists (
      select 1 from public.project_updates
      where project_updates.image_url like '%' || name
        and project_updates.author_id = auth.uid()
    )
  );

create policy "authors can delete their update images"
  on storage.objects for delete using (
    bucket_id = 'project-updates'
    and exists (
      select 1 from public.project_updates
      where project_updates.image_url like '%' || name
        and project_updates.author_id = auth.uid()
    )
  );
