-- Performance indexes for hot query paths (see repo perf audit).
-- Composite indexes matching WHERE + ORDER BY clauses that currently only
-- have single-column coverage.

-- Feed listings: WHERE source_type = X ORDER BY created_at DESC
create index if not exists idx_posts_source_created
  on public.posts (source_type, created_at desc);

-- Unread badge / notification list: WHERE user_id = X AND read = false
create index if not exists idx_notifications_user_unread
  on public.notifications (user_id, created_at desc)
  where read = false;

-- Chat message window: WHERE conversation_id = X ORDER BY created_at DESC
create index if not exists idx_messages_conversation_created
  on public.messages (conversation_id, created_at desc);

-- Pin-state lookups when rendering post lists: WHERE post_id = ANY(...)
create index if not exists idx_feed_pins_post_id
  on public.feed_pins (post_id);

-- Category member resolution on team/project detail pages
create index if not exists idx_team_category_members_team_id
  on public.team_category_members (team_id);
create index if not exists idx_project_category_members_project_id
  on public.project_category_members (project_id);
