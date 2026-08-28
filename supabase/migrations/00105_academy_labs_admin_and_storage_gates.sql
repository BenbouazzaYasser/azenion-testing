-- Migration: 00105_academy_labs_admin_and_storage_gates
--
-- Phase 0 of the Academy Labs expansion: closes two permission gaps found
-- during the Labs audit. Purely additive -- no existing policy, role, or
-- table is changed or removed.
--
--   1. Platform admins could read any lab (existing policy), but had no
--      RLS path to update/delete a lab they did not personally create.
--      The existing "lab creators can edit/delete their own labs" policies
--      are untouched; two new permissive policies are added alongside them
--      granting platform admins the same update/delete access. Postgres
--      combines multiple permissive policies for the same command with
--      OR, so this only adds access, it never removes any.
--      Note: updateLab/deleteLab in actions/academy-labs.actions.ts write
--      through the service-role client, which bypasses RLS, and also had
--      their own explicit `created_by !== user.id` check that blocked
--      admins independently of RLS. That check was updated alongside this
--      migration to allow platform admins through as well -- the two
--      changes together close the gap; this migration alone is the
--      defense-in-depth half of the fix, for any current or future code
--      path that does respect RLS.
--
--   2. Lab files (thumbnails, instructions, starter code, etc.) are
--      uploaded into the shared `course-files` storage bucket. That
--      bucket's existing write policies (00095) gate on
--      is_course_manager() (core_team_member / creator / admin), which
--      does not include the `instructor` role -- even though Labs' own
--      is_lab_creator() gate (00104) already does. This adds a new write
--      policy scoped strictly to the `labs/` path prefix of the
--      `course-files` bucket, gated on is_lab_creator(), so verified
--      instructors have storage-level write access matching the access
--      the Labs actions already intend for them. The existing
--      "course managers can upload/update/delete course files" policies,
--      which cover the rest of the bucket, are left exactly as they are.

-- ── RLS: labs — platform admin update/delete override ──────────────────────

create policy "platform admins can update any lab"
  on public.labs for update
  using (public.is_platform_admin());

create policy "platform admins can delete any lab"
  on public.labs for delete
  using (public.is_platform_admin());

-- ── Storage: course-files/labs/* — instructor write access ─────────────────
-- Scoped by path prefix so this does not broaden access to course files
-- that live outside the labs/ folder.

create policy "lab creators can upload lab files"
  on storage.objects for insert
  with check (
    bucket_id = 'course-files'
    and (storage.foldername(name))[1] = 'labs'
    and public.is_lab_creator()
  );

create policy "lab creators can update lab files"
  on storage.objects for update
  using (
    bucket_id = 'course-files'
    and (storage.foldername(name))[1] = 'labs'
    and public.is_lab_creator()
  );

create policy "lab creators can delete lab files"
  on storage.objects for delete
  using (
    bucket_id = 'course-files'
    and (storage.foldername(name))[1] = 'labs'
    and public.is_lab_creator()
  );
