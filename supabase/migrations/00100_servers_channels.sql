-- Migration: 00100_servers_channels
--
-- Discord-style servers & channels, auto-synced with the ecosystem:
--
--   1. Team or branch created  -> server auto-created (slug = team/branch slug)
--   2. Team leader -> server owner; team admins -> server admins.
--      Branch: leaders ("president" / "VP") -> server admins.
--   3. Members auto-added to the server when they join the team/branch and
--      removed when they leave (DB triggers — no code path can skip it).
--   4. A project under a team becomes a channel inside that team's server.
--   5. Project-only members (not in the team) get access ONLY to that
--      project's channel — enforced by RLS via can_access_channel().
--   6. Standalone projects (team_id IS NULL) get no server — their channel
--      is a simple group chat surfaced on the project page.
--   7. Users can create their own independent servers.

-- ── Servers table ────────────────────────────────────────────────────────

create table if not exists public.servers (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  icon_url text,
  kind text not null default 'user' check (kind in ('team', 'branch', 'user')),
  team_id uuid unique references public.teams(id) on delete cascade,
  branch_id uuid unique references public.branches(id) on delete cascade,
  owner_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.servers enable row level security;

comment on table public.servers is
  'Chat servers. Auto-created for teams/branches; users can also create their own.';

-- ── Server members ───────────────────────────────────────────────────────

create table if not exists public.server_members (
  server_id uuid not null references public.servers(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  joined_at timestamptz default now(),
  primary key (server_id, user_id)
);

alter table public.server_members enable row level security;

create index if not exists idx_server_members_server_id on public.server_members(server_id);
create index if not exists idx_server_members_user_id on public.server_members(user_id);

comment on table public.server_members is
  'Server membership, kept in sync with team/branch membership by triggers.';

-- ── Channels ─────────────────────────────────────────────────────────────

create table if not exists public.channels (
  id uuid primary key default gen_random_uuid(),
  -- NULL server_id = standalone project group chat (not part of any server).
  server_id uuid references public.servers(id) on delete cascade,
  name text not null,
  slug text not null,
  topic text,
  position int not null default 0,
  -- Set when the channel belongs to a project (scoped visibility).
  project_id uuid unique references public.projects(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

alter table public.channels enable row level security;

-- Postgres allows many NULLs in a UNIQUE column, so this only blocks a second
-- channel per project while permitting multiple channels per server.
create unique index if not exists idx_channels_server_slug on public.channels(server_id, slug);
create index if not exists idx_channels_server_id on public.channels(server_id);
create index if not exists idx_channels_project_id on public.channels(project_id);

comment on table public.channels is
  'Channels within a server. project_id channels are scoped to project members (+ server staff).';

-- ── Channel messages ─────────────────────────────────────────────────────

create table if not exists public.channel_messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  image_url text,
  created_at timestamptz default now(),
  edited_at timestamptz
);

alter table public.channel_messages enable row level security;

create index if not exists idx_channel_messages_channel_id
  on public.channel_messages(channel_id);
create index if not exists idx_channel_messages_created_at
  on public.channel_messages(created_at desc);

-- ── Access helpers (SECURITY DEFINER so they bypass RLS internally) ──────

-- Role of a user in a server ('owner' | 'admin' | 'member' | NULL).
create or replace function public.server_role_for(
  p_server_id uuid,
  p_user_id uuid default auth.uid()
)
returns text
language sql
security definer set search_path = public
stable
as $$
  select role from public.server_members
  where server_id = p_server_id and user_id = p_user_id;
$$;

-- Can the user read/write in the channel?
--   - Server owner/admins see every channel of their server.
--   - Plain channels: any server member.
--   - Project channels: project members; plus everyone in the server when the
--     project is public. Standalone projects (no server): members only.
create or replace function public.can_access_channel(
  p_channel_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language plpgsql
security definer set search_path = public
stable
as $$
declare
  v_server_id uuid;
  v_project_id uuid;
  v_role text;
  v_is_project_member boolean;
  v_project_public boolean;
begin
  if p_user_id is null then
    return false;
  end if;

  select server_id, project_id into v_server_id, v_project_id
  from public.channels where id = p_channel_id;

  if v_server_id is null and v_project_id is null then
    return false;
  end if;

  v_role := public.server_role_for(v_server_id, p_user_id);
  if v_role in ('owner', 'admin') then
    return true;
  end if;

  if v_project_id is null then
    return v_role is not null;
  end if;

  select exists (
    select 1 from public.project_members
    where project_id = v_project_id and user_id = p_user_id
  ) into v_is_project_member;
  if v_is_project_member then
    return true;
  end if;

  select visibility = 'open' into v_project_public
  from public.projects where id = v_project_id;

  return coalesce(v_project_public, false) and v_role is not null;
end;
$$;

grant execute on function public.server_role_for(uuid, uuid) to anon, authenticated, service_role;
grant execute on function public.can_access_channel(uuid, uuid) to anon, authenticated, service_role;

-- ── RLS ──────────────────────────────────────────────────────────────────

create policy "authenticated users can view servers"
  on public.servers for select using (auth.role() = 'authenticated');

create policy "authenticated users can view server members"
  on public.server_members for select using (auth.role() = 'authenticated');

create policy "users can view accessible channels"
  on public.channels for select using (public.can_access_channel(id));

create policy "members can read channel messages"
  on public.channel_messages for select using (public.can_access_channel(channel_id));

create policy "members can send channel messages"
  on public.channel_messages for insert with check (
    sender_id = auth.uid() and public.can_access_channel(channel_id)
  );

create policy "senders can edit channel messages"
  on public.channel_messages for update using (
    sender_id = auth.uid() and public.can_access_channel(channel_id)
  );

create policy "senders can delete channel messages"
  on public.channel_messages for delete using (
    sender_id = auth.uid() and public.can_access_channel(channel_id)
  );

grant select on public.servers, public.server_members, public.channels
  to anon, authenticated, service_role;
grant select, insert, update, delete on public.channel_messages
  to anon, authenticated, service_role;

-- ── Server provisioning helpers (used by triggers + backfill) ────────────

create or replace function public.fn_ensure_entity_server(
  p_kind text,            -- 'team' | 'branch'
  p_entity_id uuid,
  p_slug text,
  p_name text,
  p_owner_id uuid         -- nullable for branches
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_server_id uuid;
begin
  select id into v_server_id from public.servers
  where (p_kind = 'team' and team_id = p_entity_id)
     or (p_kind = 'branch' and branch_id = p_entity_id);

  if v_server_id is null then
    insert into public.servers (slug, name, kind, team_id, branch_id, owner_id)
    values (
      p_slug, p_name, p_kind,
      case when p_kind = 'team' then p_entity_id end,
      case when p_kind = 'branch' then p_entity_id end,
      p_owner_id
    )
    on conflict (slug) do nothing
    returning id into v_server_id;

    if v_server_id is null then
      -- Slug collision: fall back to a suffixed slug.
      insert into public.servers (slug, name, kind, team_id, branch_id, owner_id)
      values (
        p_slug || '-' || substr(p_entity_id::text, 1, 8), p_name, p_kind,
        case when p_kind = 'team' then p_entity_id end,
        case when p_kind = 'branch' then p_entity_id end,
        p_owner_id
      )
      returning id into v_server_id;
    end if;

    insert into public.channels (server_id, name, slug, position, created_by)
    values (v_server_id, 'general', 'general', 0, p_owner_id);
  end if;

  return v_server_id;
end;
$$;

create or replace function public.fn_upsert_server_member(
  p_server_id uuid,
  p_user_id uuid,
  p_role text
)
returns void
language sql
security definer set search_path = public
as $$
  insert into public.server_members (server_id, user_id, role)
  values (p_server_id, p_user_id, p_role)
  on conflict (server_id, user_id) do update
    set role = excluded.role;
$$;

create or replace function public.fn_map_team_role(p_team_role text)
returns text
language sql
immutable
as $$
  select case p_team_role
    when 'owner' then 'owner'
    when 'admin' then 'admin'
    else 'member'
  end;
$$;

-- ── Triggers: teams ──────────────────────────────────────────────────────

create or replace function public.trg_teams_after_insert()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  perform public.fn_ensure_entity_server('team', new.id, new.slug, new.name, new.owner_id);
  perform public.fn_upsert_server_member(
    (select id from public.servers where team_id = new.id),
    new.owner_id,
    'owner'
  );
  return new;
end;
$$;

drop trigger if exists trg_teams_server_sync on public.teams;
create trigger trg_teams_server_sync
  after insert on public.teams
  for each row execute function public.trg_teams_after_insert();

create or replace function public.trg_teams_after_update()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.servers
  set name = new.name, slug = new.slug, owner_id = new.owner_id, updated_at = now()
  where team_id = new.id;
  return new;
end;
$$;

drop trigger if exists trg_teams_metadata_sync on public.teams;
create trigger trg_teams_metadata_sync
  after update of name, slug, owner_id on public.teams
  for each row execute function public.trg_teams_after_update();

-- ── Triggers: branches ───────────────────────────────────────────────────

create or replace function public.trg_branches_after_insert()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  perform public.fn_ensure_entity_server('branch', new.id, new.slug, new.name, null);
  return new;
end;
$$;

drop trigger if exists trg_branches_server_sync on public.branches;
create trigger trg_branches_server_sync
  after insert on public.branches
  for each row execute function public.trg_branches_after_insert();

create or replace function public.trg_branches_after_update()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.servers
  set name = new.name, slug = new.slug, updated_at = now()
  where branch_id = new.id;
  return new;
end;
$$;

drop trigger if exists trg_branches_metadata_sync on public.branches;
create trigger trg_branches_metadata_sync
  after update of name, slug on public.branches
  for each row execute function public.trg_branches_after_update();

-- ── Triggers: team members → server members ─────────────────────────────

create or replace function public.trg_team_members_sync()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_server_id uuid;
begin
  select id into v_server_id from public.servers where team_id = coalesce(new.team_id, old.team_id);

  if v_server_id is null then
    return coalesce(new, old);
  end if;

  if tg_op = 'DELETE' then
    delete from public.server_members
    where server_id = v_server_id and user_id = old.user_id and role <> 'owner';
  else
    perform public.fn_upsert_server_member(
      v_server_id, new.user_id, public.fn_map_team_role(new.role)
    );
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_team_members_server_sync on public.team_members;
create trigger trg_team_members_server_sync
  after insert or update of role or delete on public.team_members
  for each row execute function public.trg_team_members_sync();

-- ── Triggers: branch members → server members ───────────────────────────

create or replace function public.trg_branch_members_sync()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_server_id uuid;
  v_is_leader boolean;
begin
  select id into v_server_id from public.servers where branch_id = coalesce(new.branch_id, old.branch_id);

  if v_server_id is null then
    return coalesce(new, old);
  end if;

  if tg_op = 'DELETE' then
    delete from public.server_members
    where server_id = v_server_id and user_id = old.user_id and role <> 'owner';
  else
    select exists (
      select 1 from public.branch_leaders
      where branch_id = new.branch_id and user_id = new.user_id
    ) into v_is_leader;

    perform public.fn_upsert_server_member(
      v_server_id, new.user_id, case when v_is_leader then 'admin' else 'member' end
    );
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_branch_members_server_sync on public.branch_members;
create trigger trg_branch_members_server_sync
  after insert or delete on public.branch_members
  for each row execute function public.trg_branch_members_sync();

-- Branch leaders ("president" + "VP") become server admins automatically.
create or replace function public.trg_branch_leaders_sync()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_server_id uuid;
begin
  select id into v_server_id from public.servers
  where branch_id = coalesce(new.branch_id, old.branch_id);

  if v_server_id is null then
    return coalesce(new, old);
  end if;

  if tg_op = 'DELETE' then
    if exists (
      select 1 from public.branch_members
      where branch_id = old.branch_id and user_id = old.user_id
    ) then
      update public.server_members set role = 'member'
      where server_id = v_server_id and user_id = old.user_id and role = 'admin';
    else
      delete from public.server_members
      where server_id = v_server_id and user_id = old.user_id and role = 'admin';
    end if;
  else
    perform public.fn_ensure_entity_server('branch', new.branch_id,
      (select slug from public.branches where id = new.branch_id),
      (select name from public.branches where id = new.branch_id),
      null);
    perform public.fn_upsert_server_member(v_server_id, new.user_id, 'admin');
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_branch_leaders_server_sync on public.branch_leaders;
create trigger trg_branch_leaders_server_sync
  after insert or delete on public.branch_leaders
  for each row execute function public.trg_branch_leaders_sync();

-- ── Triggers: projects → channels ────────────────────────────────────────

-- Standalone projects need a parent-less channel; relax team_id first.
alter table public.projects alter column team_id drop not null;

create or replace function public.trg_projects_channel_sync()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_server_id uuid;
begin
  if tg_op = 'INSERT' then
    if new.team_id is not null then
      select id into v_server_id from public.servers where team_id = new.team_id;
      if v_server_id is null then
        perform public.fn_ensure_entity_server('team', new.team_id,
          (select slug from public.teams where id = new.team_id),
          (select name from public.teams where id = new.team_id),
          (select owner_id from public.teams where id = new.team_id));
        select id into v_server_id from public.servers where team_id = new.team_id;
      end if;
    else
      v_server_id := null; -- standalone project group chat
    end if;

    insert into public.channels (server_id, name, slug, project_id, position, created_by)
    values (v_server_id, new.name, new.slug, new.id, 10, new.owner_id)
    on conflict (project_id) do nothing;

    return new;
  end if;

  -- UPDATE: keep channel placement/name/slug in sync.
  if new.team_id is not null then
    select id into v_server_id from public.servers where team_id = new.team_id;
  else
    v_server_id := null;
  end if;

  update public.channels
  set server_id = v_server_id, name = new.name, slug = new.slug
  where project_id = new.id;

  return new;
end;
$$;

drop trigger if exists trg_projects_channel_sync on public.projects;
create trigger trg_projects_channel_sync
  after insert or update of team_id, name, slug on public.projects
  for each row execute function public.trg_projects_channel_sync();

-- ── RPCs: independent user servers ───────────────────────────────────────

create or replace function public.create_user_server(
  p_name text,
  p_slug text,
  p_description text default null
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_server_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_name is null or length(btrim(p_name)) < 2 or length(p_name) > 60 then
    raise exception 'Server name must be between 2 and 60 characters';
  end if;

  if p_slug is null or p_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' or length(p_slug) > 60 then
    raise exception 'Slug must be lowercase letters, numbers and dashes';
  end if;

  insert into public.servers (slug, name, description, kind, owner_id)
  values (p_slug, btrim(p_name), p_description, 'user', auth.uid())
  returning id into v_server_id;

  insert into public.server_members (server_id, user_id, role)
  values (v_server_id, auth.uid(), 'owner');

  insert into public.channels (server_id, name, slug, position, created_by)
  values (v_server_id, 'general', 'general', 0, auth.uid());

  insert into public.activities (user_id, type, metadata)
  values (
    auth.uid(),
    'created_server',
    jsonb_build_object('server_id', v_server_id, 'server_name', p_name, 'server_slug', p_slug)
  );

  return v_server_id;
end;
$$;

grant execute on function public.create_user_server(text, text, text) to authenticated;

create or replace function public.create_server_channel(
  p_server_id uuid,
  p_name text,
  p_slug text
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_channel_id uuid;
begin
  if public.server_role_for(p_server_id) not in ('owner', 'admin') then
    raise exception 'Only server admins can create channels';
  end if;

  if p_name is null or length(btrim(p_name)) < 1 or length(p_name) > 40 then
    raise exception 'Channel name must be between 1 and 40 characters';
  end if;

  if p_slug is null or p_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' or length(p_slug) > 60 then
    raise exception 'Slug must be lowercase letters, numbers and dashes';
  end if;

  insert into public.channels (server_id, name, slug, position, created_by)
  values (p_server_id, btrim(p_name), p_slug, 20, auth.uid())
  returning id into v_channel_id;

  return v_channel_id;
end;
$$;

grant execute on function public.create_server_channel(uuid, text, text) to authenticated;

create or replace function public.leave_user_server(p_server_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (select 1 from public.servers where id = p_server_id and kind = 'user') then
    raise exception 'Team and branch servers are managed automatically through your membership';
  end if;

  delete from public.server_members
  where server_id = p_server_id and user_id = auth.uid() and role <> 'owner';

  if exists (select 1 from public.servers where id = p_server_id) then
    update public.servers set owner_id = null where id = p_server_id;
  end if;
end;
$$;

grant execute on function public.leave_user_server(uuid) to authenticated;

-- ── RPC: standalone project creation (no parent team) ────────────────────

create or replace function public.create_standalone_project(
  p_name text,
  p_slug text,
  p_description text default null,
  p_visibility text default 'open',
  p_logo_url text default null,
  p_github_url text default null,
  p_website text default null
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_project_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.projects (
    team_id, owner_id, name, slug, description,
    visibility, logo_url, github_url, website
  ) values (
    null, auth.uid(), p_name, p_slug, p_description,
    p_visibility, p_logo_url, p_github_url, p_website
  )
  returning id into v_project_id;

  insert into public.project_members (project_id, user_id, role)
  values (v_project_id, auth.uid(), 'owner');

  insert into public.activities (user_id, type, metadata)
  values (
    auth.uid(),
    'created_project',
    jsonb_build_object(
      'project_id', v_project_id,
      'project_name', p_name,
      'project_slug', p_slug,
      'team_id', null
    )
  );

  return v_project_id;
end;
$$;

grant execute on function public.create_standalone_project(text, text, text, text, text, text, text) to authenticated;

-- ── Realtime ─────────────────────────────────────────────────────────────

alter publication supabase_realtime add table public.channel_messages;

-- ── Backfill existing teams, branches, members and projects ─────────────

-- 1. Servers for teams + owner memberships + general channel.
select public.fn_ensure_entity_server('team', t.id, t.slug, t.name, t.owner_id)
from public.teams t
where not exists (select 1 from public.servers s where s.team_id = t.id);

insert into public.server_members (server_id, user_id, role)
select s.id, tm.user_id, public.fn_map_team_role(tm.role)
from public.team_members tm
join public.servers s on s.team_id = tm.team_id
on conflict (server_id, user_id) do update set role = excluded.role;

-- 2. Servers for branches + leaders as admins + members as members.
select public.fn_ensure_entity_server('branch', b.id, b.slug, b.name, null)
from public.branches b
where not exists (select 1 from public.servers s where s.branch_id = b.id);

insert into public.server_members (server_id, user_id, role)
select s.id, bl.user_id, 'admin'
from public.branch_leaders bl
join public.servers s on s.branch_id = bl.branch_id
on conflict (server_id, user_id) do update set role = excluded.role;

insert into public.server_members (server_id, user_id, role)
select s.id, bm.user_id,
  case when exists (
    select 1 from public.branch_leaders bl
    where bl.branch_id = bm.branch_id and bl.user_id = bm.user_id
  ) then 'admin' else 'member' end
from public.branch_members bm
join public.servers s on s.branch_id = bm.branch_id
on conflict (server_id, user_id) do nothing;

-- 3. Channels for existing projects (inside their team's server).
insert into public.channels (server_id, name, slug, project_id, position, created_by)
select s.id, p.name, p.slug, p.id, 10, p.owner_id
from public.projects p
join public.servers s on s.team_id = p.team_id
where not exists (select 1 from public.channels c where c.project_id = p.id);
