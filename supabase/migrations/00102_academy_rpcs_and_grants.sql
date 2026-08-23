-- Migration: 00102_academy_rpcs_and_grants
-- Creates the canonical authorization RPCs and grants.
-- Run after 00101_academy_finance_and_instructor_tables.sql.
-- Does NOT modify any existing migration 00000–00099.

-- ── RPC: public.is_instructor() ──────────────────────────────────────────
-- Role-only instructor check. Returns true if the caller holds the 'instructor'
-- role in public.user_roles joined with public.roles.

create or replace function public.is_instructor()
returns boolean
language sql security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid() and r.name = 'instructor'
  );
$$;

grant execute on function public.is_instructor()
  to anon, authenticated, service_role;

-- ── RPC: public.is_verified_instructor() ─────────────────────────────────
-- Instructor role + trusted instructor_profiles.

create or replace function public.is_verified_instructor()
returns boolean
language sql security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid() and r.name = 'instructor'
  )
  and exists (
    select 1 from public.instructor_profiles ip
    where ip.profile_id = auth.uid() and ip.trust_level >= 1
  );
$$;

grant execute on function public.is_verified_instructor()
  to anon, authenticated, service_role;

-- ── RPC: public.can_manage_course(course_id) ─────────────────────────────
-- Platform admin OR course owner (created_by = auth.uid()) OR staff manager.

create or replace function public.can_manage_course(course_id uuid)
returns boolean
language sql security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.courses c
    where c.id = course_id
      and (
        c.created_by = auth.uid()  -- course owner
        or public.is_platform_admin()  -- platform admin
        or public.is_course_manager()  -- staff manager (core_team_member + platform admin)
      )
  );
$$;

grant execute on function public.can_manage_course(uuid)
  to anon, authenticated, service_role;

-- ── RPC: public.can_access_course(course_id) ────────────────────────────
-- THE canonical access boundary.
-- Returns exactly one boolean.
-- Distinguishes anonymous vs authenticated via auth.role().
-- Course existence is a prerequisite; non-existent → false.
-- Anonymous: only published + free courses are accessible.
-- Authenticated: owner + staff + active entitlement + published + free.

create or replace function public.can_access_course(course_id uuid)
returns boolean
language sql security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.courses c
    where c.id = course_id
      and (
        -- Anonymous: only published + free courses are accessible
        (auth.role() = 'anonymous' AND c.status = 'published' AND c.is_free = true)
        OR
        -- Authenticated users: full authorization
        (
          auth.role() != 'anonymous'
          AND (
            -- Course owner retains access
            c.created_by = auth.uid()
            OR
            -- Staff manager
            public.is_course_manager()
            OR
            -- Active entitlement for paid courses
            exists (
              select 1 from public.entitlements e
              where e.course_id = course_id
                and e.user_id = auth.uid()
                and e.status = 'active'
            )
            OR
            -- Published + free (also accessible to authenticated users)
            (c.status = 'published' AND c.is_free = true)
          )
        )
      )
  );
$$;

grant execute on function public.can_access_course(uuid)
  to anon, authenticated, service_role;

-- ── RPC: public.can_publish_course(course_id) ────────────────────────────
-- Owner OR staff/admin authorization.
-- Does NOT block owner publication on trust_level.
-- New instructors publishing their own courses are authorized by ownership alone.

create or replace function public.can_publish_course(course_id uuid)
returns boolean
language sql security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.courses c
    where c.id = course_id
      and (
        c.created_by = auth.uid()  -- course owner (authorizes regardless of trust_level)
        or public.is_platform_admin()  -- platform admin
        or public.is_course_manager()  -- staff manager
      )
  );
$$;

grant execute on function public.can_publish_course(uuid)
  to anon, authenticated, service_role;

-- ── RPC grants summary ──────────────────────────────────────────────────

comment on function public.is_instructor() is
  'Role-only instructor check; checks public.user_roles joined with public.roles where name = instructor';

comment on function public.is_verified_instructor() is
  'Instructor role + trusted instructor_profiles with trust_level >= 1';

comment on function public.can_manage_course(uuid) is
  'Platform admin OR course owner (created_by = auth.uid()) OR staff manager (is_course_manager)';
-- instructor role itself is NOT a global management gate;

comment on function public.can_access_course(uuid) is
 'THE canonical access boundary.
  - Course existence is a prerequisite; non-existent returns false.
  - Anonymous: only published + free courses are accessible.
  - Authenticated: owner + staff + active entitlement + published + free.
  - Uses auth.uid() from the requester''s user-scoped session, never admin context.';

comment on function public.can_publish_course(uuid) is
  'Owner OR staff/admin authorization.
   Does NOT block owner publication on trust_level.
   New instructors publishing their own courses are authorized by ownership alone.';


-- ── End of migration ──────────────────────────────────────────────────────