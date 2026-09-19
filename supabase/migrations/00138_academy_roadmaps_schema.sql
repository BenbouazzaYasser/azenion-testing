-- Migration: 00138_academy_roadmaps_schema
--
-- Academy Roadmaps, part 1 of 3 (00138 -> 00140). The Roadmaps UI
-- foundation lives in lib/roadmaps/* + components/sections/academy/roadmaps/
-- since b23148e; this is the database behind it.
--
-- Approved design decisions reflected here:
--   1. Manager-wide editing (same model as Courses): platform admins (via
--      is_platform_admin), core_team_member, and creator can create/edit/
--      publish any roadmap. Instructors can only read published roadmaps as
--      learners. The gate is implemented as is_roadmap_manager(), mirroring
--      is_course_manager() (00095/00096/00101).
--   2. Draft -> Publish is explicit: creation and editing happen on a draft;
--      publishing is a separate manager action (RPC in 00139). A published
--      roadmap is locked against structural edits.
--   4. Versioning (structure now / UX later): roadmap_versions snapshots the
--      full stage/node structure as JSONB at publish time. No version
--      acquisition/update UX is built yet.
--   5. Node metadata (title, description, estimated_minutes) is intentionally
--      roadmap-authored snapshot data stored on roadmap_nodes, so roadmap
--      presentation stays stable even if the underlying course/lab metadata
--      changes.
--   9. Completion is server-authoritative: roadmap_completions rows are owned
--      by the learner, and RLS only allows recording a completion for a node
--      whose roadmap is currently published AND whose referenced content is
--      currently available. Idempotency comes from the (user_id, node_id)
--      primary key. The 00139 RPC is the action path; RLS is the independent
--      fail-closed half.
--
-- Schema correction (agreed): the course/lab references on roadmap_nodes use
-- ON DELETE RESTRICT, and a CHECK enforces exactly-one-reference. A referenced
-- course/lab can never be deleted silently, so a roadmap can never silently
-- become structurally invalid.
--
-- Fail-closed posture everywhere: RLS enabled before policies, policies are
-- explicit, anonymous/progress reads are gated, and the published-status check
-- is repeated on every child table (roadmap_versions, roadmap_stages,
-- roadmap_nodes, roadmap_node_prerequisites, roadmap_completions).

-- ── Oracle: is_roadmap_manager ───────────────────────────────────────────────
-- Same roles as is_course_manager() (00095/00096/00101 final definition):
-- core_team_member OR creator; platform admins implicitly hold every role via
-- has_platform_role() -> is_platform_admin(). Instructors are deliberately
-- excluded: they may read published roadmaps as learners, not manage them.

create or replace function public.is_roadmap_manager()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select public.has_platform_role('core_team_member')
     or public.has_platform_role('creator');
$$;

revoke execute on function public.is_roadmap_manager() from public;
grant execute on function public.is_roadmap_manager()
  to anon, authenticated, service_role;

comment on function public.is_roadmap_manager() is
  'Roadmap manager gate (core_team_member or creator; platform admins implicit). Instructors are excluded: they can only read published roadmaps as learners.';

-- ── Table: public.roadmaps ───────────────────────────────────────────────────
-- Working row for a roadmap. Editor mutations happen while status = 'draft';
-- publishing (00139) creates the roadmap_versions snapshot and flips status.

create table if not exists public.roadmaps (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null
    check (char_length(btrim(title)) between 1 and 200),
  description text
    check (description is null or char_length(description) <= 5000),
  level text not null
    check (level in ('beginner', 'intermediate', 'advanced')),
  status text not null default 'draft'
    check (status in ('draft', 'published')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  published_version_id uuid
);

alter table public.roadmaps enable row level security;

create index if not exists idx_roadmaps_status on public.roadmaps(status);
create index if not exists idx_roadmaps_level on public.roadmaps(level);
create index if not exists idx_roadmaps_created_at on public.roadmaps(created_at desc);

-- ── Table: public.roadmap_versions ───────────────────────────────────────────
-- Immutable publish-time snapshot of the ordered stage/node structure (JSONB).
-- The published presentation always comes from the latest published snapshot,
-- while the live draft tables are only authoritative for draft roadmaps.
-- Version acquisition/update UX is deliberately deferred (decision #4).

create table if not exists public.roadmap_versions (
  id uuid primary key default gen_random_uuid(),
  roadmap_id uuid not null references public.roadmaps(id) on delete cascade,
  version_number integer not null,
  structure jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (roadmap_id, version_number)
);

alter table public.roadmap_versions enable row level security;

-- The published snapshot pointer lives on roadmaps (forward reference to the
-- version created just above).
alter table public.roadmaps
  add constraint roadmaps_published_version_fk
  foreign key (published_version_id)
  references public.roadmap_versions(id)
  on delete set null;

create index if not exists idx_roadmap_versions_roadmap_id on public.roadmap_versions(roadmap_id);

comment on column public.roadmaps.published_version_id is
  'Pointer to the roadmap_versions snapshot the published status presents. Set by publish_roadmap(), cleared by unpublish_roadmap().';
comment on column public.roadmap_versions.structure is
  'JSONB snapshot of the Publish-time stage/node structure. Shape: {"stages":[{"id","position","title","description","nodes":[{"id","position","kind","ref_id","title","description","estimated_minutes","is_optional","required_node_ids":[]}]}]}';

-- ── Table: public.roadmap_stages ─────────────────────────────────────────────
-- Ordered stage of a roadmap's draft structure.

create table if not exists public.roadmap_stages (
  id uuid primary key default gen_random_uuid(),
  roadmap_id uuid not null references public.roadmaps(id) on delete cascade,
  position integer not null check (position > 0),
  title text not null
    check (char_length(btrim(title)) between 1 and 200),
  description text
    check (description is null or char_length(description) <= 5000),
  unique (roadmap_id, position)
);

alter table public.roadmap_stages enable row level security;

create index if not exists idx_roadmap_stages_roadmap_id on public.roadmap_stages(roadmap_id);

-- ── Table: public.roadmap_nodes ──────────────────────────────────────────────
-- One learnable step. References exactly one course or one lab (CHECK below),
-- with ON DELETE RESTRICT so a referenced course/lab can never be deleted out
-- from under a roadmap. Title / description / estimated_minutes are the
-- roadmap-authored snapshot (decision #5); optional nodes do not count toward
-- required completion (decision #3).

create table if not exists public.roadmap_nodes (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references public.roadmap_stages(id) on delete cascade,
  position integer not null check (position > 0),
  course_id uuid references public.courses(id) on delete restrict,
  lab_id uuid references public.labs(id) on delete restrict,
  title text not null
    check (char_length(btrim(title)) between 1 and 200),
  description text
    check (description is null or char_length(description) <= 5000),
  estimated_minutes integer
    check (estimated_minutes is null or estimated_minutes >= 0),
  is_optional boolean not null default false,
  constraint roadmap_nodes_exactly_one_reference
    check ((course_id is null) <> (lab_id is null))
);

alter table public.roadmap_nodes enable row level security;

create index if not exists idx_roadmap_nodes_stage_id on public.roadmap_nodes(stage_id);
create index if not exists idx_roadmap_nodes_course_id on public.roadmap_nodes(course_id);
create index if not exists idx_roadmap_nodes_lab_id on public.roadmap_nodes(lab_id);

-- ── Table: public.roadmap_node_prerequisites ─────────────────────────────────
-- Optional explicit prerequisites between nodes of the same roadmap
-- ('requiresCompletionOf' in the UI model, decision #3).

create table if not exists public.roadmap_node_prerequisites (
  node_id uuid not null references public.roadmap_nodes(id) on delete cascade,
  prerequisite_node_id uuid not null references public.roadmap_nodes(id) on delete cascade,
  primary key (node_id, prerequisite_node_id),
  check (node_id <> prerequisite_node_id)
);

alter table public.roadmap_node_prerequisites enable row level security;

create index if not exists idx_roadmap_node_prerequisites_prereq on public.roadmap_node_prerequisites(prerequisite_node_id);

-- ── Table: public.roadmap_completions ────────────────────────────────────────
-- Server-authoritative learner completion (decision #9). The primary key makes
-- marking idempotent; the RLS insert policy independently enforces that a
-- completion may only be recorded for a node in a currently-published roadmap
-- whose referenced content is currently available — so a client can never
-- spoof completion of unavailable/unpublished content through raw table
-- writes, and decisions #7/#8 are honored even if every RPC is bypassed.

create table if not exists public.roadmap_completions (
  user_id uuid not null references public.profiles(id) on delete cascade,
  node_id uuid not null references public.roadmap_nodes(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, node_id)
);

alter table public.roadmap_completions enable row level security;

create index if not exists idx_roadmap_completions_node_id on public.roadmap_completions(node_id);

-- ── RLS: roadmaps ────────────────────────────────────────────────────────────
-- Published roadmaps are public to all (learners, incl. instructors as
-- learners); drafts are manager-only. Writes are manager-only everywhere.

drop policy if exists "published roadmaps are publicly readable" on public.roadmaps;
create policy "published roadmaps are publicly readable"
  on public.roadmaps for select
  using (status = 'published' or public.is_roadmap_manager());

drop policy if exists "roadmap managers can create roadmaps" on public.roadmaps;
create policy "roadmap managers can create roadmaps"
  on public.roadmaps for insert
  with check ( public.is_roadmap_manager() );

drop policy if exists "roadmap managers can update roadmaps" on public.roadmaps;
create policy "roadmap managers can update roadmaps"
  on public.roadmaps for update
  using ( public.is_roadmap_manager() );

drop policy if exists "roadmap managers can delete roadmaps" on public.roadmaps;
create policy "roadmap managers can delete roadmaps"
  on public.roadmaps for delete
  using ( public.is_roadmap_manager() );

-- ── RLS: roadmap_versions ────────────────────────────────────────────────────

drop policy if exists "published roadmap versions are readable" on public.roadmap_versions;
create policy "published roadmap versions are readable"
  on public.roadmap_versions for select
  using (
    exists (
      select 1 from public.roadmaps rm
      where rm.id = roadmap_versions.roadmap_id
        and (rm.status = 'published' or public.is_roadmap_manager())
    )
  );

drop policy if exists "roadmap managers can create versions" on public.roadmap_versions;
create policy "roadmap managers can create versions"
  on public.roadmap_versions for insert
  with check ( public.is_roadmap_manager() );

drop policy if exists "roadmap managers can update versions" on public.roadmap_versions;
create policy "roadmap managers can update versions"
  on public.roadmap_versions for update
  using ( public.is_roadmap_manager() );

drop policy if exists "roadmap managers can delete versions" on public.roadmap_versions;
create policy "roadmap managers can delete versions"
  on public.roadmap_versions for delete
  using ( public.is_roadmap_manager() );

-- ── RLS: roadmap_stages ──────────────────────────────────────────────────────

drop policy if exists "published roadmap stages are readable" on public.roadmap_stages;
create policy "published roadmap stages are readable"
  on public.roadmap_stages for select
  using (
    exists (
      select 1 from public.roadmaps rm
      where rm.id = roadmap_stages.roadmap_id
        and (rm.status = 'published' or public.is_roadmap_manager())
    )
  );

drop policy if exists "roadmap managers can create stages" on public.roadmap_stages;
create policy "roadmap managers can create stages"
  on public.roadmap_stages for insert
  with check ( public.is_roadmap_manager() );

drop policy if exists "roadmap managers can update stages" on public.roadmap_stages;
create policy "roadmap managers can update stages"
  on public.roadmap_stages for update
  using ( public.is_roadmap_manager() );

drop policy if exists "roadmap managers can delete stages" on public.roadmap_stages;
create policy "roadmap managers can delete stages"
  on public.roadmap_stages for delete
  using ( public.is_roadmap_manager() );

-- ── RLS: roadmap_nodes ───────────────────────────────────────────────────────

drop policy if exists "published roadmap nodes are readable" on public.roadmap_nodes;
create policy "published roadmap nodes are readable"
  on public.roadmap_nodes for select
  using (
    exists (
      select 1
      from public.roadmap_stages st
      join public.roadmaps rm on rm.id = st.roadmap_id
      where st.id = roadmap_nodes.stage_id
        and (rm.status = 'published' or public.is_roadmap_manager())
    )
  );

drop policy if exists "roadmap managers can create nodes" on public.roadmap_nodes;
create policy "roadmap managers can create nodes"
  on public.roadmap_nodes for insert
  with check ( public.is_roadmap_manager() );

drop policy if exists "roadmap managers can update nodes" on public.roadmap_nodes;
create policy "roadmap managers can update nodes"
  on public.roadmap_nodes for update
  using ( public.is_roadmap_manager() );

drop policy if exists "roadmap managers can delete nodes" on public.roadmap_nodes;
create policy "roadmap managers can delete nodes"
  on public.roadmap_nodes for delete
  using ( public.is_roadmap_manager() );

-- ── RLS: roadmap_node_prerequisites ──────────────────────────────────────────

drop policy if exists "published prerequisites are readable" on public.roadmap_node_prerequisites;
create policy "published prerequisites are readable"
  on public.roadmap_node_prerequisites for select
  using (
    exists (
      select 1
      from public.roadmap_nodes rn
      join public.roadmap_stages st on st.id = rn.stage_id
      join public.roadmaps rm on rm.id = st.roadmap_id
      where (rn.id = roadmap_node_prerequisites.node_id
         or rn.id = roadmap_node_prerequisites.prerequisite_node_id)
        and (rm.status = 'published' or public.is_roadmap_manager())
    )
  );

drop policy if exists "roadmap managers can create prerequisites" on public.roadmap_node_prerequisites;
create policy "roadmap managers can create prerequisites"
  on public.roadmap_node_prerequisites for insert
  with check ( public.is_roadmap_manager() );

drop policy if exists "roadmap managers can update prerequisites" on public.roadmap_node_prerequisites;
create policy "roadmap managers can update prerequisites"
  on public.roadmap_node_prerequisites for update
  using ( public.is_roadmap_manager() );

drop policy if exists "roadmap managers can delete prerequisites" on public.roadmap_node_prerequisites;
create policy "roadmap managers can delete prerequisites"
  on public.roadmap_node_prerequisites for delete
  using ( public.is_roadmap_manager() );

-- ── Oracle: is_roadmap_node_available ────────────────────────────────────────
-- Single source of truth for "the content a node references is currently
-- available": a published course, or a published, non-archived lab. Used by
-- the completion RLS policy below, by publish_roadmap() validation (00139),
-- and by the read model (00140). Status of the containing roadmap is NOT part
-- of this check; callers layer that on top.

create or replace function public.is_roadmap_node_available(p_node_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1
    from public.roadmap_nodes rn
    where rn.id = p_node_id
      and (
        (rn.course_id is not null and exists (
          select 1 from public.courses c
          where c.id = rn.course_id and c.status = 'published'
        ))
        or
        (rn.lab_id is not null and exists (
          select 1 from public.labs l
          where l.id = rn.lab_id and l.is_published and l.archived_at is null
        ))
      )
  );
$$;

revoke execute on function public.is_roadmap_node_available(uuid) from public;
grant execute on function public.is_roadmap_node_available(uuid)
  to anon, authenticated, service_role;

comment on function public.is_roadmap_node_available(uuid) is
  'True when the course/lab a roadmap node references is currently available (published course; published, non-archived lab). Does not consider the containing roadmap status.';

-- ── RLS: roadmap_completions ─────────────────────────────────────────────────
-- Learners own their completion rows; inserts additionally require the node
-- to belong to a currently-published roadmap AND its referenced content to be
-- currently available (via is_roadmap_node_available above).

drop policy if exists "learners can read their own completions" on public.roadmap_completions;
create policy "learners can read their own completions"
  on public.roadmap_completions for select
  using (user_id = auth.uid());

drop policy if exists "learners can record completions for published nodes" on public.roadmap_completions;
create policy "learners can record completions for published nodes"
  on public.roadmap_completions for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.roadmap_nodes rn
      join public.roadmap_stages st on st.id = rn.stage_id
      join public.roadmaps rm on rm.id = st.roadmap_id
      where rn.id = node_id
        and rm.status = 'published'
    )
    and public.is_roadmap_node_available(node_id)
  );

drop policy if exists "learners can update their own completions" on public.roadmap_completions;
create policy "learners can update their own completions"
  on public.roadmap_completions for update
  using (user_id = auth.uid());

drop policy if exists "learners can delete their own completions" on public.roadmap_completions;
create policy "learners can delete their own completions"
  on public.roadmap_completions for delete
  using (user_id = auth.uid());

-- ── Grants ───────────────────────────────────────────────────────────────────
-- Matches the Courses posture (00095): authenticated + service_role hold full
-- DML and RLS authorizes; anon can read the roadmap story tables (published-
-- only via RLS). anon also holds SELECT on roadmap_completions: the 00140 read
-- RPCs are SECURITY INVOKER and reference roadmap_completions for per-caller
-- progress, so anonymous callers need the table privilege for those RPCs to
-- run at all. The "learners can read their own completions" RLS policy caps
-- anon to auth.uid() = NULL rows, i.e. zero rows — the grant is privilege-only
-- and never exposes another learner's completions. anon gets NO DML grants.

grant select, insert, update, delete on public.roadmaps to authenticated, service_role;
grant select on public.roadmaps to anon;

grant select, insert, update, delete on public.roadmap_versions to authenticated, service_role;
grant select on public.roadmap_versions to anon;

grant select, insert, update, delete on public.roadmap_stages to authenticated, service_role;
grant select on public.roadmap_stages to anon;

grant select, insert, update, delete on public.roadmap_nodes to authenticated, service_role;
grant select on public.roadmap_nodes to anon;

grant select, insert, update, delete on public.roadmap_node_prerequisites to authenticated, service_role;
grant select on public.roadmap_node_prerequisites to anon;

grant select, insert, update, delete on public.roadmap_completions to authenticated, service_role;
grant select on public.roadmap_completions to anon;