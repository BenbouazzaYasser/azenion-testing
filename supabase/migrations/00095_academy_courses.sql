-- Migration: 00095_academy_courses
--
-- Turns the Academy Courses page from a static "coming soon" into a real
-- catalog that Core Team members can populate.
--
--   * public.courses          — course metadata (title, description, category,
--                               content_type, file_url, file_path, thumbnail)
--   * storage bucket
--     course-files            — public bucket holding the uploaded course files
--                               and course thumbnails
--
-- Writes (table + storage) are gated to users holding the `core_team_member`
<<<<<<< HEAD
-- platform role (see 00093) and to platform admins via the `is_core_team_member`
-- helper. Reads stay public.
=======
-- platform role (00093) and to platform admins via the `is_course_manager`
-- helper. Reads stay public. The gate is redefined in 00096 to also include
-- the `creator` role; policies reference the function by name, so they pick
-- up the final definition automatically.
>>>>>>> 1602953abf04ad8ff52e495c6074a1ca86fa00d5

-- ── Table: public.courses ───────────────────────────────────────────────────

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text not null,
  content_type text not null check (content_type in ('html_css', 'pdf')),
  file_url text not null,
  file_path text not null,
  thumbnail text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.courses enable row level security;

create index if not exists idx_courses_created_at on public.courses(created_at desc);
create index if not exists idx_courses_category on public.courses(category);

<<<<<<< HEAD
-- ── RPC: is_core_team_member ────────────────────────────────────────────────
-- True for anyone holding the platform `core_team_member` role (00093) or a
-- platform admin. Reused by the table + storage policies and by the server
-- actions, so the gate stays consistent everywhere.

create or replace function public.is_core_team_member()
=======
-- ── RPC: is_course_manager ───────────────────────────────────────────────────
-- True for anyone holding the platform `core_team_member` role (00093) or a
-- platform admin. Reused by the table + storage policies and by the server
-- actions, so the gate stays consistent everywhere. Redefined in 00096 to
-- include the `creator` role.

create or replace function public.is_course_manager()
>>>>>>> 1602953abf04ad8ff52e495c6074a1ca86fa00d5
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid()
      and r.name = 'core_team_member'
  )
  or exists (
    select 1 from public.platform_admins where user_id = auth.uid()
  );
$$;

<<<<<<< HEAD
grant execute on function public.is_core_team_member()
=======
grant execute on function public.is_course_manager()
>>>>>>> 1602953abf04ad8ff52e495c6074a1ca86fa00d5
  to anon, authenticated, service_role;

-- ── RLS: courses ────────────────────────────────────────────────────────────

drop policy if exists "courses are publicly readable" on public.courses;
create policy "courses are publicly readable"
  on public.courses for select using (true);

<<<<<<< HEAD
drop policy if exists "core team members can create courses" on public.courses;
create policy "core team members can create courses"
  on public.courses for insert with check ( public.is_core_team_member() );

drop policy if exists "core team members can update courses" on public.courses;
create policy "core team members can update courses"
  on public.courses for update using ( public.is_core_team_member() );

drop policy if exists "core team members can delete courses" on public.courses;
create policy "core team members can delete courses"
  on public.courses for delete using ( public.is_core_team_member() );
=======
drop policy if exists "course managers can create courses" on public.courses;
create policy "course managers can create courses"
  on public.courses for insert with check ( public.is_course_manager() );

drop policy if exists "course managers can update courses" on public.courses;
create policy "course managers can update courses"
  on public.courses for update using ( public.is_course_manager() );

drop policy if exists "course managers can delete courses" on public.courses;
create policy "course managers can delete courses"
  on public.courses for delete using ( public.is_course_manager() );
>>>>>>> 1602953abf04ad8ff52e495c6074a1ca86fa00d5

-- ── Storage: course-files bucket ────────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('course-files', 'course-files', true)
on conflict (id) do nothing;

drop policy if exists "course files are publicly readable" on storage.objects;
create policy "course files are publicly readable"
  on storage.objects for select using ( bucket_id = 'course-files' );

<<<<<<< HEAD
drop policy if exists "core team members can upload course files" on storage.objects;
create policy "core team members can upload course files"
  on storage.objects for insert with check ( public.is_core_team_member() );

drop policy if exists "core team members can update course files" on storage.objects;
create policy "core team members can update course files"
  on storage.objects for update using ( public.is_core_team_member() );

drop policy if exists "core team members can delete course files" on storage.objects;
create policy "core team members can delete course files"
  on storage.objects for delete using ( public.is_core_team_member() );
=======
drop policy if exists "course managers can upload course files" on storage.objects;
create policy "course managers can upload course files"
  on storage.objects for insert with check ( public.is_course_manager() );

drop policy if exists "course managers can update course files" on storage.objects;
create policy "course managers can update course files"
  on storage.objects for update using ( public.is_course_manager() );

drop policy if exists "course managers can delete course files" on storage.objects;
create policy "course managers can delete course files"
  on storage.objects for delete using ( public.is_course_manager() );
>>>>>>> 1602953abf04ad8ff52e495c6074a1ca86fa00d5

-- ── Grants ──────────────────────────────────────────────────────────────────

grant select, insert, update, delete
  on public.courses to authenticated, service_role;
grant select on public.courses to anon;