-- ── Session Requests ────────────────────────────────────────────────────────
-- Academy → Live Sessions → "Request a Session".
--
-- Authorization model:
--   * Any authenticated user can create a request. user_id is forced to the
--     caller inside the SECURITY DEFINER RPC — it can never be forged.
--   * Any authenticated user can read their own requests (RLS).
--   * Platform admins can read every request and update status / admin_notes
--     via can_manage_session_requests() (single extension point for roles).
--
-- Writes are RPC-only:
--   create_session_request(...)
--   update_session_request_status(...)
-- anon / authenticated have NO direct INSERT/UPDATE/DELETE on the table, so
-- status & admin_notes stay strictly admin-controlled. service_role keeps full
-- access. Nothing is emailed — everything lives in this table.

-- ── Table ───────────────────────────────────────────────────────────────────
create table if not exists public.session_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null,
  preferred_format text not null default 'EITHER'
    check (preferred_format in ('ONLINE', 'IN_PERSON', 'EITHER')),
  preferred_branch_id uuid references public.branches(id) on delete set null,
  status text not null default 'PENDING'
    check (status in ('PENDING', 'REVIEWING', 'ACCEPTED', 'SCHEDULED', 'DECLINED')),
  admin_notes text
);

create index if not exists idx_session_requests_user
  on public.session_requests(user_id);
create index if not exists idx_session_requests_status
  on public.session_requests(status);
create index if not exists idx_session_requests_created_at
  on public.session_requests(created_at desc);

-- ── Grants ──────────────────────────────────────────────────────────────────
-- authenticated: SELECT only (RLS filters rows to own / admin). All writes go
-- through the SECURITY DEFINER RPCs below.
grant select on public.session_requests to authenticated;
grant select, insert, update, delete on public.session_requests to service_role;

-- ── Authorization ───────────────────────────────────────────────────────────
create or replace function public.can_manage_session_requests()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select public.is_platform_admin();
$$;

grant execute on function public.can_manage_session_requests() to anon, authenticated, service_role;

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.session_requests enable row level security;

drop policy if exists "users can read their own session requests" on public.session_requests;
create policy "users can read their own session requests"
  on public.session_requests for select
  to authenticated
  using (user_id = auth.uid() or public.can_manage_session_requests());

-- ── RPC: create a session request ───────────────────────────────────────────
drop function if exists public.create_session_request(text, text, text, uuid);
create or replace function public.create_session_request(
  p_title text,
  p_description text,
  p_preferred_format text,
  p_preferred_branch_id uuid
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_id uuid;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.session_requests (
    user_id,
    title,
    description,
    preferred_format,
    preferred_branch_id,
    status
  )
  values (
    v_user_id,
    p_title,
    p_description,
    p_preferred_format,
    p_preferred_branch_id,
    'PENDING'
  )
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.create_session_request(text, text, text, uuid)
  to authenticated, service_role;

-- ── RPC: update status / admin_notes ────────────────────────────────────────
drop function if exists public.update_session_request_status(uuid, text, text);
create or replace function public.update_session_request_status(
  p_id uuid,
  p_status text,
  p_admin_notes text default null
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.can_manage_session_requests() then
    raise exception 'Only platform admins can update session request status';
  end if;

  update public.session_requests
  set status = p_status,
      admin_notes = coalesce(p_admin_notes, admin_notes),
      updated_at = now()
  where id = p_id;

  if not found then
    raise exception 'Session request not found';
  end if;
end;
$$;

grant execute on function public.update_session_request_status(uuid, text, text)
  to authenticated, service_role;
