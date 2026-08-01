-- Migration: 00015_project_settings
--
-- Adds extended project settings fields.

alter table public.projects
  add column if not exists description_long text,
  add column if not exists technologies text[] default '{}',
  add column if not exists recruitment jsonb default '[]'::jsonb,
  add column if not exists website text,
  add column if not exists github_url text;
