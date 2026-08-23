-- Migration: 00092_account_deletion
--
-- Implements self-service account deletion with a 30-day appeal window.
--
--   * `profiles.deletion_requested_at` — set the moment the user asks to
--     delete their account (NULL when there is no pending deletion).
--   * `profiles.deletion_scheduled_at` — the exact date/time at which the
--     account is permanently deleted (deletion_requested_at + appeal window).
--   * RPC `request_account_deletion()`   — starts the appeal window.
--   * RPC `cancel_account_deletion()`    — the user's appeal: cancels a
--     pending deletion and keeps the account alive.
--   * RPC `sweep_pending_deletions()`    — permanently removes accounts whose
--     scheduled date has passed. This is the hook for the scheduled cleanup
--     job (pg_cron / external cron / Supabase scheduled function). The app
--     also invokes it lazily so deletions complete even without a cron.
--
-- Design notes:
--   - The appeal window is configurable via `deletion_config.appeal_days`
--     (single row, default 30) so it can be tuned without code changes.
--   - Nothing is deleted at request time; the user stays signed in and can
--     appeal from Settings → Danger Zone until the scheduled date.
--   - Permanent deletion is performed by deleting the `auth.users` row. The
--     existing FK cascade removes the profile and every related row
--     (activities, memberships, chats, posts, teams, projects, ...), and the
--     sweep additionally cleans up avatar storage.

-- ── 1. New columns ───────────────────────────────────────────────────────────

alter table public.profiles
  add column if not exists deletion_requested_at timestamptz,
  add column if not exists deletion_scheduled_at timestamptz;

create index if not exists idx_profiles_deletion_scheduled_at
  on public.profiles(deletion_scheduled_at)
  where deletion_scheduled_at is not null;

-- ── 2. Deletion config (single source of truth for the appeal window) ───────

create table if not exists public.deletion_config (
  id boolean primary key default true check (id = true),
  appeal_days int not null default 30
);

insert into public.deletion_config (id)
values (true)
on conflict (id) do nothing;

grant select on public.deletion_config to authenticated, service_role;

-- ── 3. RPCs ─────────────────────────────────────────────────────────────────

-- Starts the appeal window. Returns the scheduled deletion timestamp.
create or replace function public.request_account_deletion()
returns timestamptz
language plpgsql
security definer set search_path = public
as $$
declare
  v_appeal_days int;
  v_scheduled timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select appeal_days into v_appeal_days
  from public.deletion_config
  where id = true;

  v_scheduled := now() + make_interval(days => v_appeal_days);

  update public.profiles
  set deletion_requested_at = now(),
      deletion_scheduled_at = v_scheduled,
      updated_at = now()
  where id = auth.uid();

  if not found then
    raise exception 'Profile not found';
  end if;

  return v_scheduled;
end;
$$;

-- The user's appeal: cancels a pending deletion and keeps the account alive.
create or replace function public.cancel_account_deletion()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update public.profiles
  set deletion_requested_at = null,
      deletion_scheduled_at = null,
      updated_at = now()
  where id = auth.uid();
end;
$$;

-- Permanently deletes every account whose scheduled deletion date has passed.
-- Returns the number of accounts deleted. Safe to call on any schedule.
create or replace function public.sweep_pending_deletions()
returns int
language plpgsql
security definer set search_path = public
as $$
declare
  v_deleted int := 0;
  v_user_id uuid;
begin
  for v_user_id in
    select id
    from public.profiles
    where deletion_scheduled_at is not null
      and deletion_scheduled_at <= now()
  loop
    -- Avatar storage (profiles.avatar_url is removed by the FK cascade).
    -- Storage objects are protected from direct SQL writes, so opt in via the
    -- session flag and treat cleanup as best-effort: a storage hiccup must
    -- never prevent the account deletion itself.
    begin
      set local "storage.allow_sql_delete" = 'true';
      delete from storage.objects
      where bucket_id = 'avatars'
        and name like 'avatars/' || v_user_id || '/%';
      reset "storage.allow_sql_delete";
    exception when others then
      null;
    end;

    -- Deleting auth.users cascades to profiles and every dependent row.
    delete from auth.users where id = v_user_id;

    v_deleted := v_deleted + 1;
  end loop;

  return v_deleted;
end;
$$;

-- ── 4. Grants ────────────────────────────────────────────────────────────────

grant execute on function public.request_account_deletion() to authenticated;
grant execute on function public.cancel_account_deletion() to authenticated;
grant execute on function public.sweep_pending_deletions() to authenticated, service_role;

-- ── 5. Scheduled cleanup ─────────────────────────────────────────────────────
-- Runs daily at 03:00 UTC when pg_cron is available. The app also sweeps
-- lazily, so account deletion completes even without a cron job.

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'azenion-sweep-pending-deletions',
      '0 3 * * *',
      $cron$ select public.sweep_pending_deletions(); $cron$
    );
  end if;
end;
$$;