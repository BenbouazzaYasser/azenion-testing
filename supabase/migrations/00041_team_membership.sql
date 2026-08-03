-- Migration: 00041_team_membership
--
-- Unifies team membership around two PENDING-based flows:
--   1. Join Requests  — a user asks to join; the team owner/platform admin
--                       accepts (creating the membership) or declines.
--   2. Invitations    — the team owner/platform admin invites a user by
--                       username or email; the user accepts or declines.
--
-- Design notes:
--   - Both tables are RPC-only for writes (no direct INSERT/UPDATE/DELETE
--     policies); reads are limited via RLS to the involved parties.
--   - `is_team_leader` (owner/admin) may VIEW pending requests; only the
--     team OWNER or a platform admin may ACCEPT/DECLINE/INVITE.
--   - Schemas are notification/email/realtime-ready: no schema change is
--     needed to add those features later.

-- ── Team join requests ─────────────────────────────────────────────────────

create table if not exists public.team_join_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  message text,
  status text not null default 'PENDING' check (status in ('PENDING', 'ACCEPTED', 'DECLINED')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  unique (team_id, user_id)
);

alter table public.team_join_requests enable row level security;

drop policy if exists "users can view their own join requests" on public.team_join_requests;
create policy "users can view their own join requests"
  on public.team_join_requests for select
  using (auth.uid() = user_id);

drop policy if exists "team leaders can view join requests for their teams" on public.team_join_requests;
create policy "team leaders can view join requests for their teams"
  on public.team_join_requests for select
  using (
    public.is_platform_admin()
    or public.is_team_leader(team_id)
  );

create index if not exists idx_team_join_requests_team_id on public.team_join_requests(team_id);
create index if not exists idx_team_join_requests_user_id on public.team_join_requests(user_id);

grant select on public.team_join_requests to authenticated;

-- ── Team invitations ───────────────────────────────────────────────────────

create table if not exists public.team_invitations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  team_id uuid not null references public.teams(id) on delete cascade,
  invited_user_id uuid not null references public.profiles(id) on delete cascade,
  invited_by uuid references public.profiles(id) on delete set null,
  status text not null default 'PENDING' check (status in ('PENDING', 'ACCEPTED', 'DECLINED')),
  unique (team_id, invited_user_id)
);

alter table public.team_invitations enable row level security;

drop policy if exists "invited users can view their invitations"
  on public.team_invitations;
create policy "invited users can view their invitations"
  on public.team_invitations for select
  using (auth.uid() = invited_user_id);

drop policy if exists "team leaders can view invitations for their teams"
  on public.team_invitations;
create policy "team leaders can view invitations for their teams"
  on public.team_invitations for select
  using (
    public.is_platform_admin()
    or public.is_team_leader(team_id)
  );

create index if not exists idx_team_invitations_team_id on public.team_invitations(team_id);
create index if not exists idx_team_invitations_user_id on public.team_invitations(invited_user_id);

grant select on public.team_invitations to authenticated;

-- ── Helper: is_team_owner ──────────────────────────────────────────────────
-- Decision-maker role: team owner or platform admin.

create or replace function public.is_team_owner(
  p_team_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.team_members
    where team_id = p_team_id
      and user_id = p_user_id
      and role = 'owner'
  );
$$;

grant execute on function public.is_team_owner(uuid, uuid) to anon, authenticated, service_role;

-- ── RPC: request_team_join ─────────────────────────────────────────────────

create or replace function public.request_team_join(
  p_team_id uuid,
  p_message text default null
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_team_name text;
  v_team_slug text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select name, slug into v_team_name, v_team_slug
  from public.teams where id = p_team_id;

  if v_team_name is null then
    raise exception 'Team not found';
  end if;

  if exists (
    select 1 from public.team_members
    where team_id = p_team_id and user_id = auth.uid()
  ) then
    raise exception 'You are already a member of this team';
  end if;

  if exists (
    select 1 from public.team_join_requests
    where team_id = p_team_id and user_id = auth.uid() and status = 'PENDING'
  ) then
    raise exception 'You have already requested to join this team';
  end if;

  insert into public.team_join_requests (team_id, user_id, message)
  values (p_team_id, auth.uid(), p_message)
  on conflict (team_id, user_id)
  do update set
    status = 'PENDING',
    message = excluded.message,
    reviewed_by = null,
    reviewed_at = null,
    updated_at = now();

  insert into public.activities (user_id, type, metadata)
  values (
    auth.uid(),
    'requested_team_join',
    jsonb_build_object('team_id', p_team_id, 'team_name', v_team_name, 'team_slug', v_team_slug)
  );
end;
$$;

grant execute on function public.request_team_join(uuid, text) to authenticated, service_role;

-- ── RPC: review_team_join_request ──────────────────────────────────────────

create or replace function public.review_team_join_request(
  p_request_id uuid,
  p_accept boolean
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_team_id uuid;
  v_user_id uuid;
  v_team_name text;
  v_team_slug text;
begin
  select team_id, user_id into v_team_id, v_user_id
  from public.team_join_requests
  where id = p_request_id;

  if v_team_id is null then
    raise exception 'Request not found';
  end if;

  if not (public.is_platform_admin() or public.is_team_owner(v_team_id)) then
    raise exception 'Only the team owner or a platform admin can review join requests';
  end if;

  select name, slug into v_team_name, v_team_slug
  from public.teams where id = v_team_id;

  update public.team_join_requests
  set status = case when p_accept then 'ACCEPTED' else 'DECLINED' end,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      updated_at = now()
  where id = p_request_id and status = 'PENDING';

  if not found then
    raise exception 'This request has already been reviewed';
  end if;

  if p_accept then
    insert into public.team_members (team_id, user_id, role)
    values (v_team_id, v_user_id, 'member')
    on conflict (team_id, user_id) do nothing;

    insert into public.activities (user_id, type, metadata)
    values (
      v_user_id,
      'joined_team',
      jsonb_build_object('team_id', v_team_id, 'team_name', v_team_name, 'team_slug', v_team_slug)
    );
  end if;
end;
$$;

grant execute on function public.review_team_join_request(uuid, boolean) to authenticated, service_role;

-- ── RPC: invite_team_member ────────────────────────────────────────────────

create or replace function public.invite_team_member(
  p_team_id uuid,
  p_username text default null,
  p_email text default null
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_invited_user_id uuid;
  v_team_name text;
  v_team_slug text;
begin
  if not (public.is_platform_admin() or public.is_team_owner(p_team_id)) then
    raise exception 'Only the team owner or a platform admin can send invitations';
  end if;

  if (p_username is null or p_username = '') and (p_email is null or p_email = '') then
    raise exception 'Provide a username or email';
  end if;

  if p_username is not null and p_username <> '' then
    select id into v_invited_user_id
    from public.profiles
    where lower(username) = lower(p_username)
    limit 1;
  else
    select id into v_invited_user_id
    from auth.users
    where lower(email) = lower(p_email)
    limit 1;
  end if;

  if v_invited_user_id is null then
    raise exception 'No user found with that username or email';
  end if;

  if exists (
    select 1 from public.team_members
    where team_id = p_team_id and user_id = v_invited_user_id
  ) then
    raise exception 'This user is already a member of the team';
  end if;

  if exists (
    select 1 from public.team_invitations
    where team_id = p_team_id and invited_user_id = v_invited_user_id and status = 'PENDING'
  ) then
    raise exception 'This user has already been invited to this team';
  end if;

  insert into public.team_invitations (team_id, invited_user_id, invited_by)
  values (p_team_id, v_invited_user_id, auth.uid())
  on conflict (team_id, invited_user_id)
  do update set
    status = 'PENDING',
    invited_by = excluded.invited_by,
    updated_at = now();

  select name, slug into v_team_name, v_team_slug
  from public.teams where id = p_team_id;

  insert into public.activities (user_id, type, metadata)
  values (
    auth.uid(),
    'invited_team_member',
    jsonb_build_object(
      'team_id', p_team_id,
      'team_name', v_team_name,
      'team_slug', v_team_slug,
      'invited_user_id', v_invited_user_id
    )
  );
end;
$$;

grant execute on function public.invite_team_member(uuid, text, text) to authenticated, service_role;

-- ── RPC: respond_to_invitation ─────────────────────────────────────────────

create or replace function public.respond_to_invitation(
  p_invitation_id uuid,
  p_accept boolean
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_team_id uuid;
  v_team_name text;
  v_team_slug text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select team_id into v_team_id
  from public.team_invitations
  where id = p_invitation_id;

  if v_team_id is null then
    raise exception 'Invitation not found';
  end if;

  if not exists (
    select 1 from public.team_invitations
    where id = p_invitation_id and invited_user_id = auth.uid()
  ) then
    raise exception 'This invitation is not addressed to you';
  end if;

  select name, slug into v_team_name, v_team_slug
  from public.teams where id = v_team_id;

  update public.team_invitations
  set status = case when p_accept then 'ACCEPTED' else 'DECLINED' end,
      updated_at = now()
  where id = p_invitation_id and status = 'PENDING';

  if not found then
    raise exception 'This invitation has already been responded to';
  end if;

  if p_accept then
    insert into public.team_members (team_id, user_id, role)
    values (v_team_id, auth.uid(), 'member')
    on conflict (team_id, user_id) do nothing;

    insert into public.activities (user_id, type, metadata)
    values (
      auth.uid(),
      'joined_team',
      jsonb_build_object('team_id', v_team_id, 'team_name', v_team_name, 'team_slug', v_team_slug)
    );
  end if;
end;
$$;

grant execute on function public.respond_to_invitation(uuid, boolean) to authenticated, service_role;

-- ── RPC: get_team_join_requests ────────────────────────────────────────────

create or replace function public.get_team_join_requests(p_team_id uuid)
returns table (
  id uuid,
  team_id uuid,
  user_id uuid,
  username text,
  full_name text,
  avatar_url text,
  institution text,
  message text,
  status text,
  created_at timestamptz
)
language plpgsql
security definer set search_path = public
stable
as $$
begin
  if not (public.is_platform_admin() or public.is_team_leader(p_team_id)) then
    raise exception 'Only team leaders can view join requests';
  end if;

  return query
  select
    r.id,
    r.team_id,
    r.user_id,
    p.username,
    p.full_name,
    p.avatar_url,
    p.institution,
    r.message,
    r.status,
    r.created_at
  from public.team_join_requests r
  join public.profiles p on p.id = r.user_id
  where r.team_id = p_team_id
  order by case when r.status = 'PENDING' then 0 else 1 end, r.created_at asc;
end;
$$;

grant execute on function public.get_team_join_requests(uuid) to authenticated, service_role;

-- ── RPC: get_my_team_request_status ────────────────────────────────────────

create or replace function public.get_my_team_request_status(p_team_id uuid)
returns text
language sql
security definer set search_path = public
stable
as $$
  select status
  from public.team_join_requests
  where team_id = p_team_id and user_id = auth.uid();
$$;

grant execute on function public.get_my_team_request_status(uuid) to authenticated, service_role;

-- ── RPC: get_my_team_invitations ───────────────────────────────────────────

create or replace function public.get_my_team_invitations()
returns table (
  id uuid,
  team_id uuid,
  team_name text,
  team_slug text,
  team_logo_url text,
  invited_by_username text,
  invited_by_full_name text,
  status text,
  created_at timestamptz
)
language plpgsql
security definer set search_path = public
stable
as $$
begin
  return query
  select
    i.id,
    i.team_id,
    t.name,
    t.slug,
    t.logo_url,
    p.username,
    p.full_name,
    i.status,
    i.created_at
  from public.team_invitations i
  join public.teams t on t.id = i.team_id
  left join public.profiles p on p.id = i.invited_by
  where i.invited_user_id = auth.uid()
  order by i.created_at desc;
end;
$$;

grant execute on function public.get_my_team_invitations() to authenticated, service_role;
