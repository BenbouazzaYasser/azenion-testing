-- Migration: 00080_post_share_chat
--
-- Delivers a feed-post share INTO the sharer/recipient private chat as a real,
-- structured chat message, instead of only a durable post_shares row plus a
-- notification. The chat is the canonical place a share appears; the recipient
-- sees a native post-share card in the existing conversation with the sharer.
--
-- PROBLEM
--   share_post (00079) wrote only post_shares + a notification. The chat
--   renders exclusively rows from `messages`, and `messages` had no way to
--   represent anything other than plain text, so a share never appeared in
--   chat.
--
-- FIX
--   1. `messages` gains two additive, backwards-compatible columns:
--        message_type text NOT NULL DEFAULT 'text'   (CHECK: text | post_share)
--        metadata     jsonb                          (structured entity snapshot)
--      Existing text messages are untouched (message_type defaults to 'text',
--      metadata stays NULL).
--   2. `share_post` becomes ONE atomic SECURITY DEFINER transaction:
--        validate (auth.uid, recipient, post visibility, self-share, blocks)
--        -> insert post_shares
--        -> get_or_create_conversation(recipient)
--        -> insert a post_share message with a curated metadata snapshot
--        -> return { share_id, conversation_id, message_id }
--      If conversation/message creation fails, the whole transaction rolls back
--      (no orphaned post_shares row). The sender is always auth.uid(); no
--      client-supplied sender id is ever trusted.
--   3. The metadata snapshot contains ONLY what the chat card needs: post_id,
--      source_type, title, a short excerpt, the first image, and minimal author
--      info — never a blind dump of the posts row. Because it is a snapshot,
--      the card keeps rendering even if the original post is later deleted or
--      unpublished.

-- ── 1. messages: structured message type ──────────────────────────────────────
alter table public.messages
  add column if not exists message_type text not null default 'text';

alter table public.messages
  add column if not exists metadata jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'messages_message_type_check'
      and conrelid = 'public.messages'::regclass
  ) then
    alter table public.messages
      add constraint messages_message_type_check
      check (message_type in ('text', 'post_share'));
  end if;
end;
$$;

comment on column public.messages.message_type is
  'Structured message kind. Defaults to text for backwards compatibility.';
comment on column public.messages.metadata is
  'Structured snapshot for non-text messages (e.g. a shared post card).';

-- ── 2. share_post: atomic share + chat delivery ──────────────────────────────
-- Keeps the exact same validation as 00079 and additionally delivers the share
-- into the private conversation. SECURITY DEFINER bypasses RLS (matching the
-- established chat pattern in 00047/00071), so the message insert re-enforces
-- the same invariants the RLS INSERT policy normally guarantees: the sender is
-- the authenticated caller, the caller is a member of the conversation, and
-- neither direction is blocked. All of that holds by construction here because
-- the conversation is created/found by get_or_create_conversation for the exact
-- (auth.uid, recipient) pair and blocks were already validated above.
drop function if exists public.share_post(uuid, uuid, text);
create or replace function public.share_post(
  p_post_id uuid,
  p_recipient_id uuid,
  p_message text default null
)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_sharer uuid := auth.uid();
  v_msg text := nullif(trim(coalesce(p_message, '')), '');
  v_post public.posts%rowtype;
  v_share_id uuid;
  v_conversation_id uuid;
  v_message_id uuid;
  v_author_name text;
  v_author_username text;
  v_author_avatar text;
  v_excerpt text;
  v_image text;
  v_metadata jsonb;
begin
  if v_sharer is null then
    raise exception 'Not authenticated';
  end if;

  if p_post_id is null then
    raise exception 'Post ID is required.';
  end if;
  if p_recipient_id is null or p_recipient_id = v_sharer then
    raise exception 'You cannot share a post with yourself.';
  end if;
  if v_msg is not null and length(v_msg) > 500 then
    raise exception 'Message must be 500 characters or fewer.';
  end if;

  -- Recipient must be a real member.
  if not exists (select 1 from public.profiles where id = p_recipient_id) then
    raise exception 'Recipient not found.';
  end if;

  -- Post must exist and be visible to the sharer (private team/project posts
  -- are only shareable by members who can actually see them).
  select * into v_post from public.posts where id = p_post_id;
  if not found then
    raise exception 'This post is no longer available.';
  end if;
  if not public.is_feed_post_visible(v_post.source_type, v_post.source_id) then
    raise exception 'This post is no longer available.';
  end if;

  -- Blocking in either direction prevents a share (mirrors the conversation
  -- rules in 00071_user_blocks).
  if public.is_user_blocked(v_sharer, p_recipient_id)
     or public.is_user_blocked(p_recipient_id, v_sharer) then
    raise exception 'You cannot share this post with this member right now.';
  end if;

  insert into public.post_shares (sharer_id, recipient_id, post_id, message)
  values (v_sharer, p_recipient_id, p_post_id, v_msg)
  returning id into v_share_id;

  -- Private conversation for the pair (reuses an existing one, never creates
  -- a duplicate). Raises if the recipient blocked the caller — already
  -- impossible here, but keeps a concurrent block from leaving a share behind.
  v_conversation_id := public.get_or_create_conversation(p_recipient_id);

  -- Curated snapshot for the chat card. Only what the UI needs to render:
  -- id/source_type/title/excerpt/first image + minimal author info.
  select full_name, username, avatar_url
    into v_author_name, v_author_username, v_author_avatar
    from public.profiles
    where id = v_post.author_id;

  v_excerpt := nullif(left(coalesce(v_post.body, ''), 200), '');
  v_image := nullif(v_post.images ->> 0, '');

  v_metadata := jsonb_build_object(
    'post_id', v_post.id,
    'source_type', v_post.source_type,
    'title', v_post.title,
    'excerpt', v_excerpt,
    'image', v_image,
    'author', case when v_post.author_id is not null then
      jsonb_build_object(
        'id', v_post.author_id,
        'full_name', v_author_name,
        'username', v_author_username,
        'avatar_url', v_author_avatar
      )
    else null end
  );

  insert into public.messages (
    conversation_id, sender_id, content, message_type, metadata
  )
  values (v_conversation_id, v_sharer, coalesce(v_msg, ''), 'post_share', v_metadata)
  returning id into v_message_id;

  return jsonb_build_object(
    'share_id', v_share_id,
    'conversation_id', v_conversation_id,
    'message_id', v_message_id
  );
end;
$$;

grant execute on function public.share_post(uuid, uuid, text)
  to authenticated, service_role;

comment on function public.share_post(uuid, uuid, text) is
  'Creates a directed post share and delivers it as a structured post_share
   chat message in the sharer/recipient private conversation. Returns
   { share_id, conversation_id, message_id } atomically.';