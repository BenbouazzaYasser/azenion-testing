-- Migration: 00106_academy_labs_content_foundation
--
-- Phase 1 of the Academy Labs expansion: additive database foundation for
-- structured Lab content (instructions / QCM / text-answer / flag
-- questions / hints / evidence), structured Lab answers, and the
-- Course <-> Lab relationship.
--
-- Nothing existing is dropped, renamed, or retyped. Every new column is
-- nullable, so all existing labs/lab_versions/lab_submissions rows remain
-- valid as-is. The existing file-URL columns on lab_versions and the
-- existing submission_url on lab_submissions are untouched and keep
-- working exactly as before for Labs that don't use the new structured
-- content model -- the two approaches coexist on the same rows.

-- ── Column: labs.type ────────────────────────────────────────────────────
-- Extensible Lab "shape" (osint | linux | coding | ...), independent of
-- the existing `category` column (subject domain, e.g. Cybersecurity /
-- Programming -- unchanged). Left as a plain nullable text column,
-- validated at the application layer (lib/validations/lab.schema.ts) the
-- same way `category` already is, so new Lab types can ship without a
-- migration. No check constraint is added, by design.

alter table public.labs
  add column if not exists type text;

create index if not exists idx_labs_type on public.labs(type);

-- ── Columns: lab_versions.content / lab_versions.answer_key ────────────────
-- content    — structured, learner-safe lab content: instructions,
--              evidence, and question blocks (qcm / text_answer / flag)
--              with their prompts, options, and hints.
-- answer_key — correct answers / flag hashes for the same question
--              blocks, kept in a separate column so it can be (and is,
--              below) excluded from the learner-facing read path. Flags
--              are expected to be stored hashed by the server action that
--              authors them, never in plaintext.

alter table public.lab_versions
  add column if not exists content jsonb,
  add column if not exists answer_key jsonb;

-- Defense-in-depth: make answer_key unselectable for the client-facing
-- roles, independently of RLS and independently of any future query's
-- select-list mistakes.
--
-- Note: anon/authenticated already hold table-level SELECT on
-- lab_versions from 00104 ("grant select ... to authenticated, anon").
-- In Postgres, a table-level SELECT grant covers every column and is NOT
-- narrowed by a later column-level REVOKE on top of it -- a bare
-- `revoke select (answer_key) ... from anon, authenticated` would be a
-- no-op here. The effective pattern is to revoke the table-level SELECT
-- entirely and re-grant SELECT as an explicit column list that omits
-- answer_key. This also means a future `select *` from these roles will
-- now correctly fail closed instead of silently including answer_key,
-- which is the intended behavior. service_role is untouched, since all
-- existing and future Labs server actions use it and need answer_key for
-- grading.

revoke select on public.lab_versions from anon, authenticated;

grant select (
  id, lab_id, version_number,
  instructions_url, starter_code_url, test_file_url, solution_url, resources_url,
  content, created_by, created_at
) on public.lab_versions to anon, authenticated;

-- ── Column: lab_submissions.answers ─────────────────────────────────────────
-- Structured per-question learner answers, keyed the same way as
-- lab_versions.content / answer_key. Coexists with the existing
-- submission_url column -- file-based (e.g. Coding) submissions keep using
-- submission_url unchanged; answer-based (QCM / text / flag) submissions
-- use this new column.

alter table public.lab_submissions
  add column if not exists answers jsonb;

-- ── Table: public.course_labs ────────────────────────────────────────────
-- Many-to-many Course <-> Lab relationship. Independent of both parent
-- tables: no columns are added to courses or labs, and there is
-- deliberately no ordering, gating, or progress/unlock field on this
-- table. A course may link multiple labs; a lab may link to multiple
-- courses. Labs do not control course progress or unlocking.

create table if not exists public.course_labs (
  course_id  uuid not null references public.courses(id) on delete cascade,
  lab_id     uuid not null references public.labs(id) on delete cascade,
  added_by   uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (course_id, lab_id)
);

alter table public.course_labs enable row level security;

create index if not exists idx_course_labs_lab_id on public.course_labs(lab_id);

-- ── RLS: course_labs ────────────────────────────────────────────────────────
-- Reads: public, matching the existing public readability of both parent
-- entities (courses; published labs).
-- Writes: gated to whoever can already manage courses or labs, reusing
-- the existing is_course_manager() / is_lab_creator() gates rather than
-- introducing a new permission concept for the join table.

create policy "course-lab links are publicly readable"
  on public.course_labs for select using (true);

create policy "course or lab managers can link labs to courses"
  on public.course_labs for insert
  with check (public.is_course_manager() or public.is_lab_creator());

create policy "course or lab managers can unlink labs from courses"
  on public.course_labs for delete
  using (public.is_course_manager() or public.is_lab_creator());

-- ── Grants ────────────────────────────────────────────────────────────────

grant select, insert, delete on public.course_labs to authenticated, service_role;
grant select on public.course_labs to anon;
