-- Migration: 00130_drop_dead_course_rpcs
--
-- Removes three Academy RPCs defined in 00123 that were verified (2026-09-12)
-- to have zero callers: no RLS policy, trigger, SQL function body, or
-- application code references them. The live access path uses
-- is_course_manager() + the file route, never these oracles.
--
--   - Drops can_access_course(uuid) (+ its grants/comments).
--   - Drops can_manage_course(uuid) (+ its grants/comments).
--   - Drops can_publish_course(uuid) (+ its grants/comments).
--
-- Preserved: is_course_manager(), is_instructor(), is_verified_instructor()
-- and every other live Academy authorization oracle.

drop function if exists public.can_access_course(uuid);
drop function if exists public.can_manage_course(uuid);
drop function if exists public.can_publish_course(uuid);
