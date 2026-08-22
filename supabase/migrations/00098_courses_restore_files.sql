-- Migration: 00098_courses_restore_files
--
-- Restores the course file fields on an already-applied `public.courses`.
--
-- The table may have been through different states:
--   * original 00095: had content_type, file_url, file_path
--   * 00097: added thumbnail_url
--   * an earlier 00098: renamed thumbnail_url -> thumbnail and dropped the file
--     columns
--
-- This migration brings every state to the canonical schema:
--
--   id, title, description, category, content_type, file_url, file_path,
--   thumbnail, created_by, created_at, updated_at
--
-- The `course-files` bucket is reused for course files and thumbnails.

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'courses' and column_name = 'thumbnail_url'
  ) then
    alter table public.courses rename column thumbnail_url to thumbnail;
  end if;
end $$;

alter table public.courses
  add column if not exists thumbnail text,
  add column if not exists content_type text default 'html_css',
  add column if not exists file_url text,
  add column if not exists file_path text;