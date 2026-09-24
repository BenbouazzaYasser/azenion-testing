-- Migration: 00149_server_channel_gateway
--
-- Tighten the server-topology read boundary: authenticated members can see
-- their own server and membership graph, not every private server roster.
drop policy if exists "authenticated users can view servers" on public.servers;
create policy "members can view servers"
  on public.servers for select
  using (public.server_role_for(id, auth.uid()) is not null);

drop policy if exists "authenticated users can view server members" on public.server_members;
create policy "members can view server members"
  on public.server_members for select
  using (public.server_role_for(server_id, auth.uid()) is not null);

revoke select on public.servers, public.server_members from anon;
revoke execute on function public.server_role_for(uuid, uuid) from public, anon;
revoke execute on function public.can_access_channel(uuid, uuid) from public, anon;
revoke execute on function public.fn_ensure_entity_server(text, uuid, text, text, uuid) from public, anon;
revoke execute on function public.fn_upsert_server_member(uuid, uuid, text) from public, anon;
grant execute on function public.server_role_for(uuid, uuid) to authenticated, service_role;
grant execute on function public.can_access_channel(uuid, uuid) to authenticated, service_role;
--   * one composite bucket index for keyset reads
--   * one cursor RPC for bi-directional page loading
--   * one atomic send RPC for optimistic-client reconciliation
--
-- The application owns the multiplexed Realtime connection. PostgreSQL only
-- stores durable channel messages; presence/typing remain ephemeral.

create index if not exists idx_channel_messages_bucket
  on public.channel_messages (channel_id, created_at desc, id desc);
create index if not exists idx_channel_messages_sender
  on public.channel_messages (sender_id);
create index if not exists idx_channels_server_position
  on public.channels (server_id, position, name);

alter table public.channel_messages replica identity full;
alter table public.servers replica identity full;
alter table public.channels replica identity full;
alter table public.server_members replica identity full;
alter publication supabase_realtime add table public.servers;
alter publication supabase_realtime add table public.channels;
alter publication supabase_realtime add table public.server_members;

create or replace function public.get_channel_messages(
  p_channel_id uuid,
  p_before_created_at timestamptz default null,
  p_before_id uuid default null,
  p_after_created_at timestamptz default null,
  p_after_id uuid default null,
  p_limit integer default 50
)
returns table (
  id uuid,
  channel_id uuid,
  sender_id uuid,
  content text,
  image_url text,
  created_at timestamptz,
  edited_at timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  select m.id, m.channel_id, m.sender_id, m.content, m.image_url, m.created_at, m.edited_at
  from public.channel_messages m
  where m.channel_id = p_channel_id
    and (
      p_before_created_at is null
      or (m.created_at, m.id) < (p_before_created_at, p_before_id)
    )
    and (
      p_after_created_at is null
      or (m.created_at, m.id) > (p_after_created_at, p_after_id)
    )
  order by m.created_at desc, m.id desc
  limit least(greatest(coalesce(p_limit, 50), 1), 100);
$$;

grant execute on function public.get_channel_messages(uuid, timestamptz, uuid, timestamptz, uuid, integer)
  to authenticated, service_role;
revoke execute on function public.get_channel_messages(uuid, timestamptz, uuid, timestamptz, uuid, integer)
  from anon, public;

comment on function public.get_channel_messages(uuid, timestamptz, uuid, timestamptz, uuid, integer) is
  'Keyset-paginated channel messages. Never uses OFFSET; RLS remains the authorization boundary.';

create or replace function public.send_channel_message(
  p_channel_id uuid,
  p_content text
)
returns table (id uuid, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_content text := coalesce(trim(p_content), '');
  v_id uuid;
  v_created_at timestamptz;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  if v_content = '' then
    raise exception 'Message cannot be empty';
  end if;
  if char_length(v_content) > 4000 then
    raise exception 'Message is too long (max 4000 characters).';
  end if;
  if not public.can_access_channel(p_channel_id, v_uid) then
    raise exception 'You are not a member of this channel.';
  end if;

  insert into public.channel_messages as cm (channel_id, sender_id, content)
  values (p_channel_id, v_uid, v_content)
  returning cm.id, cm.created_at into v_id, v_created_at;

  return query select v_id, v_created_at;
end;
$$;

grant execute on function public.send_channel_message(uuid, text)
  to authenticated, service_role;
revoke execute on function public.send_channel_message(uuid, text)
  from anon, public;

comment on function public.send_channel_message(uuid, text) is
  'Atomic durable channel-message write returning the server identity for optimistic reconciliation.';

create or replace function public.edit_channel_message(
  p_message_id uuid,
  p_content text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_content text := coalesce(trim(p_content), '');
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if v_content = '' then raise exception 'Message cannot be empty'; end if;
  if char_length(v_content) > 4000 then raise exception 'Message is too long (max 4000 characters).'; end if;
  update public.channel_messages
  set content = v_content, edited_at = now()
  where id = p_message_id
    and sender_id = v_uid
    and public.can_access_channel(channel_id, v_uid);
  if not found then raise exception 'Message not found or not editable'; end if;
end;
$$;

grant execute on function public.edit_channel_message(uuid, text) to authenticated, service_role;
revoke execute on function public.edit_channel_message(uuid, text) from anon, public;

create or replace function public.delete_channel_message(p_message_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  delete from public.channel_messages
  where id = p_message_id
    and sender_id = v_uid
    and public.can_access_channel(channel_id, v_uid);
  if not found then raise exception 'Message not found or not deletable'; end if;
end;
$$;

grant execute on function public.delete_channel_message(uuid) to authenticated, service_role;
revoke execute on function public.delete_channel_message(uuid) from anon, public;

-- Once the RPCs are deployed, direct client writes are no longer part of the
-- contract; the actions keep a temporary fallback for pre-migration installs.
revoke insert, update, delete on public.channel_messages from anon, authenticated;
grant select on public.channel_messages to authenticated, service_role;

