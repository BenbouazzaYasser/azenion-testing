-- Migration: 00103_storage_bucket_and_rls
-- Makes course-files bucket private and enforces owner-based SELECT policy.
-- Run after 00102_academy_rpcs_and_grants.sql.
-- Does NOT modify any existing migration 00000–00099.

-- ── Make course-files bucket private ───────────────────────────────────────

update storage.buckets set public = false where id = 'course-files';

-- ── Drop the unrestricted public SELECT policy ─────────────────────────────

drop policy if exists "course files are publicly readable" on storage.objects;

-- ── Preserve staff INSERT/UPDATE/DELETE policies via is_course_manager() ─────
-- These remain unchanged; staff still manages all course files.

-- ── Add owner SELECT policy using storage.foldername index [2] ──────────────
-- Path format: courses/${creatorUserId}/${uuid}.{ext}
-- [2] extracts the creator user ID from the 3-segment path prefix.
-- This correctly authorizes the course creator for direct SELECT.
-- Thumbnails (courses/${courseId}/thumbnail.{ext}) have [2] = courseId,
-- which does NOT match auth.uid() in general; thumbnail authorization
-- is handled exclusively through the API gate (can_access_course → signed URL).
-- Do NOT use [1] — [1] is always 'courses' for all paths in this bucket.

create policy "course owner can select own files"
  on storage.objects for select using (
    bucket_id = 'course-files'
    and (storage.foldername(name))[2]::text = auth.uid()::text
  );

-- ── Policy: course managers can upload course files ─────────────────────────

create policy "course managers can upload course files"
  on storage.objects for insert with check (public.is_course_manager());

-- ── Policy: course managers can update course files ─────────────────────────

create policy "course managers can update course files"
  on storage.objects for update using (public.is_course_manager());

-- ── Policy: course managers can delete course files ─────────────────────────

create policy "course managers can delete course files"
  on storage.objects for delete using (public.is_course_manager());

-- ── Guidance ──────────────────────────────────────────────────────────────
-- Upload actions (actions/academy-courses.actions.ts) should store metadata
-- { created_by: user.id } on course content uploads to aid RLS and debugging.
-- Thumbnail uploads retain the existing path structure:
--   courses/${course.id}/thumbnail.{ext}
-- and are accessed exclusively through the API route
--   /api/academy/courses/[id]/file
-- after can_access_course() authorization.
-- Do NOT add metadata to thumbnail uploads for owner-SELect RLS; the thumbnail
-- path does not use that policy. The API gate is the sole authorization path.

comment on policy "course owner can select own files" on storage.objects is
  'Allows the course creator (auth.uid() matching the 2nd segment of the path)'
  'to directly select objects from the private course-files bucket. Thumbnails'
  ' are NOT covered by this policy; they go through the API authorization flow.';

comment on policy "course managers can upload course files" on storage.objects is
  'Retained from previous design; staff still uploads course files and thumbnails';

comment on policy "course managers can update course files" on storage.objects is
  'Retained from previous design; staff still updates course files and thumbnails';

comment on policy "course managers can delete course files" on storage.objects is
  'Retained from previous design; staff still deletes course files and thumbnails';