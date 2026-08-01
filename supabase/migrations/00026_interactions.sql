-- Migration: 00026_interactions
--
-- Generic likes and comments system using target_type/target_id pattern.
-- Supports project_updates, team_updates, and any future content type.
--
-- Also creates the notifications table (foundation, no UI yet).

-- ── Update Likes ────────────────────────────────────────────────────────

create table if not exists public.update_likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null,
  target_id uuid not null,
  created_at timestamptz default now(),
  unique (user_id, target_type, target_id)
);

alter table public.update_likes enable row level security;

create index if not exists idx_update_likes_target
  on public.update_likes(target_type, target_id);
create index if not exists idx_update_likes_user
  on public.update_likes(user_id);

comment on table public.update_likes is
  'Generic likes for any content type. target_type = "project_update" | "team_update" | ...';

-- ── RLS: Update Likes ───────────────────────────────────────────────────

create policy "anyone can read likes"
  on public.update_likes for select
  using (auth.role() = 'authenticated');

create policy "authenticated users can like"
  on public.update_likes for insert
  with check (auth.uid() = user_id);

create policy "users can unlike their own likes"
  on public.update_likes for delete
  using (auth.uid() = user_id);

-- ── Update Comments ─────────────────────────────────────────────────────

create table if not exists public.update_comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null,
  target_id uuid not null,
  parent_comment_id uuid references public.update_comments(id) on delete set null,
  body text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.update_comments enable row level security;

create index if not exists idx_update_comments_target
  on public.update_comments(target_type, target_id);
create index if not exists idx_update_comments_user
  on public.update_comments(user_id);
create index if not exists idx_update_comments_parent
  on public.update_comments(parent_comment_id);

comment on table public.update_comments is
  'Generic comments for any content type. parent_comment_id enables future threaded replies.';

-- ── RLS: Update Comments ────────────────────────────────────────────────

create policy "anyone can read comments"
  on public.update_comments for select
  using (auth.role() = 'authenticated');

create policy "authenticated users can comment"
  on public.update_comments for insert
  with check (auth.uid() = user_id);

create policy "users can edit their own comments"
  on public.update_comments for update
  using (auth.uid() = user_id);

create policy "users can delete their own comments"
  on public.update_comments for delete
  using (auth.uid() = user_id);

-- ── Notifications (Foundation) ──────────────────────────────────────────

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  actor_id uuid references public.profiles(id) on delete set null,
  target_type text,
  target_id uuid,
  metadata jsonb default '{}'::jsonb,
  read boolean default false,
  created_at timestamptz default now()
);

alter table public.notifications enable row level security;

create index if not exists idx_notifications_user
  on public.notifications(user_id, created_at desc);

comment on table public.notifications is
  'Foundation for future notifications. Types: liked_your_update, commented_on_your_update, etc.';

-- ── RLS: Notifications ─────────────────────────────────────────────────

create policy "users can read their own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "system can insert notifications"
  on public.notifications for insert
  with check (auth.role() = 'authenticated');

create policy "users can mark notifications as read"
  on public.notifications for update
  using (auth.uid() = user_id);

-- ── Grants ──────────────────────────────────────────────────────────────

grant select, insert, update, delete
  on public.update_likes to anon, authenticated, service_role;
grant select, insert, update, delete
  on public.update_comments to anon, authenticated, service_role;
grant select, insert, update, delete
  on public.notifications to anon, authenticated, service_role;
