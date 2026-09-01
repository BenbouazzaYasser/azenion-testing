-- Migration: 00109_academy_labs_submission_column_privileges
--
-- A direct RLS-level test run during this audit found a serious,
-- pre-existing gap: the "users can create submissions" / "users can
-- update their own submissions" policies on lab_submissions only gate
-- which ROWS a learner can touch (their own), not which COLUMNS. The
-- `authenticated` role holds a blanket table-level INSERT/UPDATE grant
-- (see 00104), so a learner using the Supabase client directly with
-- their own session -- the anon key is public, so this requires no
-- special access, just opening browser devtools -- could set their own
-- submission's `status` to 'passed' and `score` to 100 directly,
-- completely bypassing submitLabAnswers/submitLabSolution and every
-- grading rule in lib/labs/grading.ts. Confirmed directly: an update
-- setting status='passed', score=100 on an existing 'failed' row
-- succeeded under the learner's own RLS context before this migration.
--
-- Every current app code path writes to lab_submissions exclusively
-- through the service-role client (submitLabAnswers, submitLabSolution,
-- gradeLabSubmission), which is unaffected by column-level privileges,
-- so this closes a real attack surface without changing any existing,
-- actually-used behavior.
--
-- Fix: same defense-in-depth pattern already used for
-- lab_versions.answer_key (00106) -- revoke the blanket table-level
-- INSERT/UPDATE grant for anon/authenticated and re-grant it as an
-- explicit column allowlist that excludes every grading-authoritative
-- field (status, score, test_results, feedback_url, evaluated_at,
-- submitted_at) and identity/audit fields (id, created_at, updated_at).
-- SELECT and DELETE privileges, and every existing RLS policy, are
-- untouched.

revoke insert, update on public.lab_submissions from anon, authenticated;

grant insert (lab_id, user_id, lab_version_id, answers, submission_url)
  on public.lab_submissions to authenticated;

grant update (lab_id, user_id, lab_version_id, answers, submission_url)
  on public.lab_submissions to authenticated;
