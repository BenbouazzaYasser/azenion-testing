-- ── Platform announcements ──────────────────────────────────────────────────
-- Public announcement board at /announcements. Only platform admins can
-- create / edit / delete announcements; everyone else sees a read-only board.
-- Authorization is centralized in can_manage_announcements() so additional
-- roles (Announcement Manager, Community Manager, Moderator, ...) can be
-- granted later in a single place without touching RLS or the RPCs.

create table if not exists public.platform_announcements (
  id uuid primary key default gen_random_uuid(),
  emoji text not null default '📢',
  title text not null,
  category text not null default 'Platform',
  description text not null,
  badge text,
  details text[],
  created_by uuid references public.profiles(id) on delete set null,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_platform_announcements_published_at
  on public.platform_announcements(published_at desc);

grant select, insert, update, delete
  on public.platform_announcements to anon, authenticated, service_role;

-- ── RPC: can_manage_announcements ───────────────────────────────────────────
-- Single source of truth for announcement management. Extend this function to
-- grant additional roles (e.g. Announcement Manager, Community Manager).

create or replace function public.can_manage_announcements()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select public.is_platform_admin();
$$;

grant execute on function public.can_manage_announcements() to anon, authenticated, service_role;

-- ── RLS ─────────────────────────────────────────────────────────────────────

alter table public.platform_announcements enable row level security;

drop policy if exists "platform announcements are publicly readable" on public.platform_announcements;
create policy "platform announcements are publicly readable"
  on public.platform_announcements for select using (true);

drop policy if exists "platform admins can create announcements" on public.platform_announcements;
create policy "platform admins can create announcements"
  on public.platform_announcements for insert
  to authenticated
  with check (public.can_manage_announcements());

drop policy if exists "platform admins can update announcements" on public.platform_announcements;
create policy "platform admins can update announcements"
  on public.platform_announcements for update
  using (public.can_manage_announcements());

drop policy if exists "platform admins can delete announcements" on public.platform_announcements;
create policy "platform admins can delete announcements"
  on public.platform_announcements for delete
  using (public.can_manage_announcements());

-- ── RPC: create_platform_announcement ───────────────────────────────────────

drop function if exists public.create_platform_announcement(text, text, text, text, text, text[]);
create or replace function public.create_platform_announcement(
  p_emoji text,
  p_title text,
  p_category text,
  p_description text,
  p_badge text,
  p_details text[]
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.can_manage_announcements() then
    raise exception 'Only platform admins can create announcements';
  end if;

  insert into public.platform_announcements (emoji, title, category, description, badge, details, created_by)
  values (p_emoji, p_title, p_category, p_description, p_badge, p_details, auth.uid())
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.create_platform_announcement(text, text, text, text, text, text[])
  to anon, authenticated, service_role;

-- ── RPC: update_platform_announcement ───────────────────────────────────────

drop function if exists public.update_platform_announcement(uuid, text, text, text, text, text, text[]);
create or replace function public.update_platform_announcement(
  p_id uuid,
  p_emoji text default null,
  p_title text default null,
  p_category text default null,
  p_description text default null,
  p_badge text default null,
  p_details text[] default null
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.can_manage_announcements() then
    raise exception 'Only platform admins can edit announcements';
  end if;

  update public.platform_announcements
  set emoji = p_emoji,
      title = p_title,
      category = p_category,
      description = p_description,
      badge = p_badge,
      details = p_details
  where id = p_id;

  if not found then
    raise exception 'Announcement not found';
  end if;
end;
$$;

grant execute on function public.update_platform_announcement(uuid, text, text, text, text, text, text[])
  to anon, authenticated, service_role;

-- ── RPC: delete_platform_announcement ───────────────────────────────────────

drop function if exists public.delete_platform_announcement(uuid);
create or replace function public.delete_platform_announcement(p_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.can_manage_announcements() then
    raise exception 'Only platform admins can delete announcements';
  end if;

  delete from public.platform_announcements where id = p_id;

  if not found then
    raise exception 'Announcement not found';
  end if;
end;
$$;

grant execute on function public.delete_platform_announcement(uuid)
  to anon, authenticated, service_role;

-- ── Seed: existing announcements ────────────────────────────────────────────

insert into public.platform_announcements (emoji, title, category, description, badge, published_at)
select * from (values
  ('🚀', 'Welcome to Azenion', 'Platform', 'Welcome to Azenion, The Limitless Network. Today marks the beginning of a community dedicated to connecting ambitious students, innovators and builders across institutions.', 'Latest', now()),
  ('🌐', 'Website Launch', 'Development', 'The first version of the Azenion website is now live. More pages, features and community tools will continue to be released over time.', null, now() - interval '1 day'),
  ('🏫', 'First Branches Available', 'Community', 'The first official branches are now available. Members can now join their institution and become part of the growing ecosystem.', null, now() - interval '2 days')
) as seed(emoji, title, category, description, badge, published_at)
where not exists (select 1 from public.platform_announcements);
