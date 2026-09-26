-- Migration: 00157_index_unindexed_fks
--
-- Add indexes on the 5 high-value unindexed FK columns that hot paths
-- actually filter/join on. The other 23 are audit columns (created_by,
-- author_id, assigned_by) with no selective query evidence.
--
-- concurrently if exists = no lock, idempotent.

-- projects.owner_id: ownership checks, delete_project auth
create index concurrently if not exists idx_projects_owner_id
  on public.projects(owner_id);

-- servers.owner_id: gateway checks, channel creation auth
create index concurrently if not exists idx_servers_owner_id
  on public.servers(owner_id);

-- teams.category_id: team browse/filter by category
create index concurrently if not exists idx_teams_category_id
  on public.teams(category_id);

-- conversations.member_a: direct conversation lookups (member_a, member_b pair)
create index concurrently if not exists idx_conversations_member_a
  on public.conversations(member_a);

-- lab_submissions.lab_version_id: submission lookup by lab version
create index concurrently if not exists idx_lab_submissions_lab_version_id
  on public.lab_submissions(lab_version_id);