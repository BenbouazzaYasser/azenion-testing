-- Keyset pagination for the public project catalog (see app/projects/page.tsx).
-- The catalog page walks the table newest-first with a (created_at, id)
-- cursor instead of OFFSET, so page N stays O(page size) as the table grows.
-- This composite index covers ORDER BY created_at DESC, id DESC + the
-- created_at <= cursorKey range predicate used for "next page" lookups.

create index if not exists idx_projects_created_id_desc
  on public.projects (created_at desc, id desc);
