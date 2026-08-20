-- Migration: 00099_course_details_and_creator_role
--
-- Extends courses with richer catalog metadata and introduces a `creator`
-- platform role with the same course-management powers as `core_team_member`.
--
--   * public.courses.duration    — text, e.g. "6 weeks", "2 hours"
--   * public.courses.difficulty  — beginner | intermediate | advanced
--   * public.courses.tags        — text[]
--   * public.roles 'creator'     — new platform role (00093 catalog)
--
-- The existing `is_core_team_member()` gate (used by the courses + storage RLS
-- policies and the server actions) is extended so that anyone holding the
-- `creator` role can insert/update/delete courses and upload files exactly like
-- a core team member.

-- ── Columns: courses ─────────────────────────────────────────────────────────

alter table public.courses
  add column if not exists duration text,
  add column if not exists difficulty text
    check (difficulty in ('beginner', 'intermediate', 'advanced')),
  add column if not exists tags text[];

-- ── Role: creator ────────────────────────────────────────────────────────────

insert into public.roles (name, description)
values ('creator', 'Course creator who can manage Academy courses')
on conflict (name) do nothing;

-- ── Extend the management gate to include creators ──────────────────────────

create or replace function public.is_core_team_member()
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
      and r.name in ('core_team_member', 'creator')
  )
  or exists (
    select 1 from public.platform_admins where user_id = auth.uid()
  );
$$;

grant execute on function public.is_core_team_member()
  to anon, authenticated, service_role;