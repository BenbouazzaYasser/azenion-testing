-- Migration: 00079_post_shares
--
-- Lets a member share a feed post with another member. A share is a directed,
-- durable record (sharer -> recipient -> post) with an optional short message.
-- The recipient is alerted via the existing notifications system; tapping the
-- notification deep-links to the post permalink (/feed/post/[id]).
--
-- PROBLEM
--   There is no way to send a specific post to another member. The global
--   search and social system can find members, but content can only be copied
--   as a link (ShareButton) — nothing notifies a recipient.
--
-- FIX
--   A small join table + a SECURITY DEFINER RPC that mirrors the established
--   patterns in this project:
--     * 00071_user_blocks: RLS lets a user manage only their OWN rows; complex
--       authorization lives in SECURITY DEFINER helpers (is_user_blocked).
--     * 00076_global_user_search: cross-user lookups go through SECURITY
--       DEFINER RPCs that honor privacy settings and blocks.
--   `share_post` is the ONLY way to create a share. It validates the recipient
--   exists, the post exists and is visible to the sharer (is_feed_post_visible),
--   blocks either direction via is_user_blocked, and rejects self-shares.
--   The authenticated client has no direct INSERT grant, so a raw PostgREST
--   insert (bypassing the RPC) is impossible.
--
-- Sharing the same post multiple times is allowed (each share is a distinct
-- event); the notifications layer (lib/notifications.ts) de-duplicates unread
-- notifications of the same (type, actor, target) so inboxes never spam.

-- ── 1. post_shares table ────────────────────────────────────────────────────
create table if not exists public.post_shares (
  id uuid primary key default gen_random_uuid(),
  sharer_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  message text,
  created_at timestamptz default now(),
  constraint post_shares_no_self_share check (sharer_id <> recipient_id)
);

alter table public.post_shares enable row level security;

create index if not exists idx_post_shares_recipient
  on public.post_shares(recipient_id, created_at desc);
create index if not exists idx_post_shares_sharer
  on public.post_shares(sharer_id, created_at desc);
create index if not exists idx_post_shares_post
  on public.post_shares(post_id);

comment on table public.post_shares is
  'Directed feed-post shares. sharer_id shared post_id with recipient_id.';
comment on column public.post_shares.message is
  'Optional short note from the sharer to the recipient.';

-- ── 2. RLS: participants read/revoke their own shares ──────────────────────
-- SELECT: both the sharer and the recipient may see the share.
-- DELETE: only the sharer may revoke their share.
-- (No UPDATE policy — shares are created and revoked, never mutated.)
drop policy if exists "share participants can read shares" on public.post_shares;
create policy "share participants can read shares"
  on public.post_shares for select
  using (sharer_id = auth.uid() or recipient_id = auth.uid());

drop policy if exists "sharers can revoke their shares" on public.post_shares;
create policy "sharers can revoke their shares"
  on public.post_shares for delete
  using (sharer_id = auth.uid());

-- ── 3. Grants ───────────────────────────────────────────────────────────────
-- authenticated may read/delete their own rows only. INSERT is deliberately NOT
-- granted to authenticated: share_post is the only creation path (same reason
-- the notifications INSERT was revoked for clients in 00061_security_hardening).
grant select, delete on public.post_shares to authenticated;
grant select, insert, delete on public.post_shares to service_role;

-- ── 4. share_post RPC ───────────────────────────────────────────────────────
-- The single, validated path for creating a share. Raises an exception with a
-- user-facing message on any invalid input so server actions surface it
-- directly. Runs SECURITY DEFINER (owner bypasses RLS) but pins the effective
-- viewer to the authenticated caller via auth.uid(), so is_feed_post_visible
-- checks the SHARER's access, never a client-supplied id.
create or replace function public.share_post(
  p_post_id uuid,
  p_recipient_id uuid,
  p_message text default null
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_sharer uuid := auth.uid();
  v_msg text := nullif(trim(coalesce(p_message, '')), '');
  v_post public.posts%rowtype;
  v_share_id uuid;
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

return v_share_id;
end;
$$;

grant execute on function public.share_post(uuid, uuid, text)
  to authenticated, service_role;

comment on function public.share_post(uuid, uuid, text) is
  'Creates a directed post share after validating the recipient, post
   visibility for the sharer, self-share rules, and blocks in both directions.';