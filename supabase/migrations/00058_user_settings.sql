-- Migration: 00058_user_settings
--
-- Centralizes preferences: appearance, notifications, and privacy.
-- Stored as a single row per user with JSONB preference bags so that new
-- settings can be added without schema changes. A trigger keeps the row in
-- sync whenever a profile is created.

-- ── Table ────────────────────────────────────────────────────────────────

create table if not exists public.user_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  theme text not null default 'system' check (theme in ('system', 'light', 'dark')),
  notifications jsonb not null default '{
    "team_updates": true,
    "project_updates": true,
    "feed_interactions": true,
    "replies": true,
    "mentions": true,
    "branch_announcements": true,
    "academy_sessions": true
  }'::jsonb,
  privacy jsonb not null default '{
    "show_profile_publicly": true,
    "allow_dms": true,
    "show_activity": true,
    "search_visibility": true
  }'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

comment on table public.user_settings is
  'Per-user preferences: appearance theme, notification toggles, and privacy controls.';

-- ── RLS ──────────────────────────────────────────────────────────────────

create policy "auth can read own settings"
  on public.user_settings for select
  using (auth.uid() = user_id);

create policy "auth can create own settings"
  on public.user_settings for insert
  with check (auth.uid() = user_id);

create policy "auth can update own settings"
  on public.user_settings for update
  using (auth.uid() = user_id);

create policy "auth can delete own settings"
  on public.user_settings for delete
  using (auth.uid() = user_id);

-- ── Sync row on profile creation ─────────────────────────────────────────

create or replace function public.touch_user_settings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists ensure_user_settings on public.profiles;
create trigger ensure_user_settings
  after insert on public.profiles
  for each row execute function public.touch_user_settings();

-- ── Grants ───────────────────────────────────────────────────────────────

grant select, insert, update, delete
  on public.user_settings to authenticated;