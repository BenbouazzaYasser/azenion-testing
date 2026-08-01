-- Migration: 00027_comment_likes
--
-- Likes on comments. Comments are already generic (update_comments keyed by
-- target_type/target_id), so comment likes are keyed directly on comment_id.
-- One user may like a comment only once (unique constraint).
-- parent_comment_id on update_comments already enables future threaded replies.

create table if not exists public.comment_likes (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.update_comments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique (comment_id, user_id)
);

alter table public.comment_likes enable row level security;

create index if not exists idx_comment_likes_comment
  on public.comment_likes(comment_id);
create index if not exists idx_comment_likes_user
  on public.comment_likes(user_id);

comment on table public.comment_likes is
  'Likes on comments. One user may like a comment once (enforced by unique constraint).';

-- ── RLS: Comment Likes ──────────────────────────────────────────────────
-- Anyone who can read the comment can read its likes. Authenticated users
-- can like (insert) and unlike (delete) their own likes.

create policy "anyone can read comment likes"
  on public.comment_likes for select
  using (auth.role() = 'authenticated');

create policy "authenticated users can like comments"
  on public.comment_likes for insert
  with check (auth.uid() = user_id);

create policy "users can unlike their own comment likes"
  on public.comment_likes for delete
  using (auth.uid() = user_id);

-- ── Grants ──────────────────────────────────────────────────────────────

grant select, insert, delete
  on public.comment_likes to anon, authenticated, service_role;
