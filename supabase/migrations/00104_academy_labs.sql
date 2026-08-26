-- Migration: 00104_academy_labs
--
-- Academy Labs system: Self-contained, hands-on coding environments for learning.
-- 
-- Labs differ from Courses:
--   * Courses: passive learning (reading PDFs, watching tutorials)
--   * Labs: active learning (code challenges, interactive exercises)
--
-- Access control:
--   * Reads: Public to all
--   * Writes: Users with 'instructor' or 'creator' platform roles, or platform admins
--   * Storage: course-files bucket (shared with courses) with RLS
--
-- Lab Structure:
--   * public.labs                — core lab metadata (title, description, difficulty, etc.)
--   * public.lab_versions        — versioned content for labs (instructions, starter code, tests)
--   * public.lab_submissions     — user submissions per lab with status tracking
--   * storage/course-files/labs  — lab content (starter code, test files, resources)

-- ── Table: public.labs ────────────────────────────────────────────────────────

create table if not exists public.labs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text not null, -- e.g., 'web-dev', 'backend', 'data-science'
  difficulty text not null check (difficulty in ('beginner', 'intermediate', 'advanced')),
  estimated_duration_minutes integer, -- e.g., 30, 60, 120
  tags text[] default '{}',
  thumbnail_url text,
  -- Instructor/Creator who created the lab
  created_by uuid not null references public.profiles(id) on delete set null,
  -- Lifecycle
  is_published boolean default false,
  published_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.labs enable row level security;

create index if not exists idx_labs_created_at on public.labs(created_at desc);
create index if not exists idx_labs_category on public.labs(category);
create index if not exists idx_labs_difficulty on public.labs(difficulty);
create index if not exists idx_labs_created_by on public.labs(created_by);
create index if not exists idx_labs_is_published on public.labs(is_published);

-- ── Table: public.lab_versions ───────────────────────────────────────────────
-- Versioned lab content. Every update creates a new version (immutable).
-- The RPC for creating/updating labs handles this automatically.

create table if not exists public.lab_versions (
  id uuid primary key default gen_random_uuid(),
  lab_id uuid not null references public.labs(id) on delete cascade,
  version_number integer not null,
  -- Content files (stored in storage bucket)
  instructions_url text, -- markdown or HTML instructions
  starter_code_url text, -- starter code template (zip or individual files)
  test_file_url text, -- test suite or evaluation script
  solution_url text, -- reference solution (admin only)
  resources_url text, -- optional: additional resources (zip)
  -- Metadata
  created_by uuid not null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (lab_id, version_number)
);

alter table public.lab_versions enable row level security;

create index if not exists idx_lab_versions_lab_id on public.lab_versions(lab_id);

-- ── Table: public.lab_submissions ─────────────────────────────────────────────
-- User attempts to complete a lab. Multiple submissions per user per lab allowed.

create table if not exists public.lab_submissions (
  id uuid primary key default gen_random_uuid(),
  lab_id uuid not null references public.labs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  lab_version_id uuid not null references public.lab_versions(id) on delete restrict,
  -- Submission status
  status text not null default 'in_progress' check (status in ('in_progress', 'submitted', 'passed', 'failed')),
  -- Submitted code (stored in storage bucket)
  submission_url text, -- zip of their submission
  -- Results/feedback
  test_results jsonb, -- e.g., { "passed": 5, "failed": 2, "output": "..." }
  feedback_url text, -- optional: feedback document
  score integer, -- 0-100 if evaluated
  -- Timestamps
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  evaluated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lab_id, user_id) -- one active submission per user per lab
);

alter table public.lab_submissions enable row level security;

create index if not exists idx_lab_submissions_lab_id on public.lab_submissions(lab_id);
create index if not exists idx_lab_submissions_user_id on public.lab_submissions(user_id);
create index if not exists idx_lab_submissions_status on public.lab_submissions(status);
create index if not exists idx_lab_submissions_created_at on public.lab_submissions(created_at desc);

-- ── RPC: is_lab_creator ──────────────────────────────────────────────────────
-- Checks if user can create/edit labs: 'instructor', 'creator', or platform admin.

create or replace function public.is_lab_creator()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select public.is_platform_admin()
     or public.has_platform_role('instructor')
     or public.has_platform_role('creator');
$$;

grant execute on function public.is_lab_creator()
  to anon, authenticated, service_role;

-- ── RLS: labs ────────────────────────────────────────────────────────────────

create policy "published labs are publicly readable"
  on public.labs for select using (is_published = true);

create policy "creators can read their own labs"
  on public.labs for select using (created_by = auth.uid());

create policy "platform admins can read all labs"
  on public.labs for select using (public.is_platform_admin());

create policy "lab creators can create labs"
  on public.labs for insert with check (public.is_lab_creator() and auth.uid() = created_by);

create policy "lab creators can edit their own labs"
  on public.labs for update using (public.is_lab_creator() and created_by = auth.uid());

create policy "lab creators can delete their own labs"
  on public.labs for delete using (public.is_lab_creator() and created_by = auth.uid());

-- ── RLS: lab_versions ────────────────────────────────────────────────────────

create policy "published lab versions are readable"
  on public.lab_versions for select
  using (
    exists (
      select 1 from public.labs
      where id = lab_versions.lab_id and is_published = true
    )
  );

create policy "creators can read their lab versions"
  on public.lab_versions for select
  using (
    exists (
      select 1 from public.labs
      where id = lab_versions.lab_id and created_by = auth.uid()
    )
  );

create policy "platform admins can read all lab versions"
  on public.lab_versions for select using (public.is_platform_admin());

create policy "lab creators can create versions"
  on public.lab_versions for insert
  with check (
    public.is_lab_creator()
    and auth.uid() = created_by
    and exists (
      select 1 from public.labs
      where id = lab_id and created_by = auth.uid()
    )
  );

-- ── RLS: lab_submissions ─────────────────────────────────────────────────────

create policy "users can read their own submissions"
  on public.lab_submissions for select
  using (user_id = auth.uid());

create policy "instructors can read submissions for their labs"
  on public.lab_submissions for select
  using (
    exists (
      select 1 from public.labs
      where id = lab_submissions.lab_id
        and (created_by = auth.uid() or public.is_platform_admin())
    )
  );

create policy "users can create submissions"
  on public.lab_submissions for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.labs
      where id = lab_id and is_published = true
    )
  );

create policy "users can update their own submissions"
  on public.lab_submissions for update
  using (user_id = auth.uid());

create policy "instructors can update submissions (grading)"
  on public.lab_submissions for update
  using (
    public.is_platform_admin()
    or exists (
      select 1 from public.labs
      where id = lab_id and created_by = auth.uid()
    )
  );

-- ── Storage: labs support (reuse course-files bucket) ────────────────────────
-- Labs and courses share the course-files bucket for simplicity.
-- RLS policies already exist for course managers; they inherit here.

-- ── Grants ───────────────────────────────────────────────────────────────────

grant select, insert, update, delete on public.labs to authenticated, service_role;
grant select on public.labs to anon;

grant select, insert, update, delete on public.lab_versions to authenticated, service_role;
grant select on public.lab_versions to anon;

grant select, insert, update, delete on public.lab_submissions to authenticated, service_role;
grant select on public.lab_submissions to anon;
