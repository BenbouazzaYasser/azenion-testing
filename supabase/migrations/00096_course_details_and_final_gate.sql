-- Migration: 00096_course_details_and_final_gate
--
-- Extends courses with richer catalog metadata and extends the course
-- management gate to include the `creator` platform role.
--
--   * public.courses.duration    — text, e.g. "6 weeks", "2 hours"
--   * public.courses.difficulty  — beginner | intermediate | advanced
--   * public.courses.tags        — text[]
--
-- The `creator` role itself is seeded in 00093. Here the `is_course_manager()`
-- gate (created in 00095 and used by the courses + storage RLS policies and
-- the server actions) is redefined so that anyone holding `creator` can
-- insert/update/delete courses and upload files exactly like a core team
-- member. Because the policies call the function by name, they automatically
-- use this final definition.

-- ── Columns: courses ─────────────────────────────────────────────────────────

alter table public.courses
  add column if not exists duration text,
  add column if not exists difficulty text
    check (difficulty in ('beginner', 'intermediate', 'advanced')),
  add column if not exists tags text[];

-- ── Extend the management gate to include creators ──────────────────────────

create or replace function public.is_course_manager()
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

grant execute on function public.is_course_manager()
  to anon, authenticated, service_role;