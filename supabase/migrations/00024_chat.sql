-- Migration: 00024_chat
--
-- Adds private messaging: conversations, conversation_members, messages.
-- Architecture is reusable for team/project/branch chat later (same tables,
-- just filter by conversation type).

-- ── Conversations table ─────────────────────────────────────────────────

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.conversations enable row level security;

comment on table public.conversations is
  'Private conversations. Extensible for team/project/branch chat later.';

-- ── Conversation members table ──────────────────────────────────────────

create table if not exists public.conversation_members (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz default now(),
  unique (conversation_id, user_id)
);

alter table public.conversation_members enable row level security;

create index if not exists idx_conversation_members_conversation_id
  on public.conversation_members(conversation_id);
create index if not exists idx_conversation_members_user_id
  on public.conversation_members(user_id);

comment on table public.conversation_members is
  'Who belongs to each conversation.';

-- ── Messages table ──────────────────────────────────────────────────────

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  image_url text,
  created_at timestamptz default now(),
  edited_at timestamptz
);

alter table public.messages enable row level security;

create index if not exists idx_messages_conversation_id
  on public.messages(conversation_id);
create index if not exists idx_messages_created_at
  on public.messages(created_at desc);

comment on table public.messages is
  'Individual messages within conversations. Supports text and future image attachments.';

-- ── Helper: get or create private conversation ──────────────────────────

create or replace function public.get_or_create_conversation(p_user_id uuid)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_conversation_id uuid;
  v_current_user_id uuid;
begin
  v_current_user_id := auth.uid();
  if v_current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Check if a 1-on-1 conversation already exists between the two users
  select cm1.conversation_id into v_conversation_id
  from public.conversation_members cm1
  join public.conversation_members cm2
    on cm2.conversation_id = cm1.conversation_id
  where cm1.user_id = v_current_user_id
    and cm2.user_id = p_user_id;

  -- If no existing conversation, create one
  if v_conversation_id is null then
    insert into public.conversations default values
    returning id into v_conversation_id;

    insert into public.conversation_members (conversation_id, user_id)
    values (v_conversation_id, v_current_user_id),
           (v_conversation_id, p_user_id);
  end if;

  return v_conversation_id;
end;
$$;

grant execute on function public.get_or_create_conversation(uuid) to authenticated;

-- ── RLS: Conversations SELECT ───────────────────────────────────────────

create policy "members can view their conversations"
  on public.conversations for select
  using (
    exists (
      select 1 from public.conversation_members
      where conversation_id = conversations.id
        and user_id = auth.uid()
    )
  );

-- ── RLS: Conversations INSERT ───────────────────────────────────────────

create policy "authenticated users can create conversations"
  on public.conversations for insert
  with check (auth.role() = 'authenticated');

-- ── RLS: Conversation Members SELECT ────────────────────────────────────

create policy "members can view conversation members"
  on public.conversation_members for select
  using (
    exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = conversation_members.conversation_id
        and cm.user_id = auth.uid()
    )
  );

-- ── RLS: Conversation Members INSERT ────────────────────────────────────

create policy "system can add members"
  on public.conversation_members for insert
  with check (auth.role() = 'authenticated');

-- ── RLS: Messages SELECT ────────────────────────────────────────────────

create policy "members can read messages"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversation_members
      where conversation_id = messages.conversation_id
        and user_id = auth.uid()
    )
  );

-- ── RLS: Messages INSERT ────────────────────────────────────────────────

create policy "members can send messages"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversation_members
      where conversation_id = messages.conversation_id
        and user_id = auth.uid()
    )
  );

-- ── RLS: Messages UPDATE ────────────────────────────────────────────────

create policy "senders can edit their own messages"
  on public.messages for update
  using (sender_id = auth.uid());

-- ── RLS: Messages DELETE ────────────────────────────────────────────────

create policy "senders can delete their own messages"
  on public.messages for delete
  using (sender_id = auth.uid());

-- ── Grants ──────────────────────────────────────────────────────────────

grant select, insert, update, delete
  on public.conversations to anon, authenticated, service_role;
grant select, insert, update, delete
  on public.conversation_members to anon, authenticated, service_role;
grant select, insert, update, delete
  on public.messages to anon, authenticated, service_role;
