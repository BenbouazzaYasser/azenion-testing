-- Migration: 00032_feed_posts
--
-- Makes every feed item a first-class entity via a `posts` table. Each
-- project update, team update, branch announcement, highlight, or event gets
-- one canonical `posts` row (source_type/source_id unique) that backs:
--   - permalinks        /feed/post/[id]
--   - rich media        multiple images per post (jsonb array)
--   - saved posts       saved_posts join table
--   - notifications     stable target ids
--
-- Source tables gain an `images` jsonb column (keeping `image_url` as the
-- first image for backwards compatibility). DB triggers keep `posts` in sync
-- with the source tables automatically.

-- ── 1. Rich media: multiple images on the source tables ──────────────────

alter table public.project_updates
  add column if not exists images jsonb not null default '[]'::jsonb;

alter table public.team_updates
  add column if not exists images jsonb not null default '[]'::jsonb;

alter table public.branch_announcements
  add column if not exists images jsonb not null default '[]'::jsonb;

-- ── 2. posts: first-class feed entity ────────────────────────────────────

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references public.profiles(id) on delete set null,
  title text not null default '',
  body text,
  images jsonb not null default '[]'::jsonb,
  source_type text not null,
  source_id uuid,
  is_pinned boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (source_type, source_id)
);

alter table public.posts enable row level security;

create index if not exists idx_posts_created_at
  on public.posts(created_at desc);
create index if not exists idx_posts_source
  on public.posts(source_type, source_id);
create index if not exists idx_posts_author
  on public.posts(author_id);

comment on table public.posts is
  'First-class feed entities. source_type/source_id point back at the source
   row (project_updates, team_updates, branch_announcements, branch_highlights,
   branch_events, or user_post).';

-- ── 3. saved_posts ───────────────────────────────────────────────────────

create table if not exists public.saved_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz default now(),
  unique (user_id, post_id)
);

alter table public.saved_posts enable row level security;

create index if not exists idx_saved_posts_user
  on public.saved_posts(user_id, created_at desc);

-- ── 4. Sync trigger (backfills and keeps posts in sync) ──────────────────

create or replace function public.sync_feed_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_source_type text;
  v_title text;
  v_body text;
  v_images jsonb;
  v_author_id uuid;
  v_is_pinned boolean := false;
  v_created_at timestamptz;
  v_updated_at timestamptz;
  v_row jsonb;
begin
  v_row := to_jsonb(NEW);
  v_created_at := (v_row->>'created_at')::timestamptz;

  case TG_TABLE_NAME
    when 'project_updates' then
      v_source_type := 'project_update';
      v_title := NEW.title;
      v_body := NEW.body;
      v_author_id := NEW.author_id;
      v_images := coalesce(NEW.images,
        case when NEW.image_url is not null then jsonb_build_array(NEW.image_url) else '[]'::jsonb end);
      v_is_pinned := false;
    when 'team_updates' then
      v_source_type := 'team_update';
      v_title := NEW.title;
      v_body := NEW.body;
      v_author_id := NEW.author_id;
      v_images := coalesce(NEW.images,
        case when NEW.image_url is not null then jsonb_build_array(NEW.image_url) else '[]'::jsonb end);
      v_is_pinned := false;
    when 'branch_announcements' then
      v_source_type := 'branch_announcement';
      v_title := NEW.title;
      v_body := NEW.body;
      v_author_id := NEW.author_id;
      v_images := coalesce(NEW.images,
        case when NEW.image_url is not null then jsonb_build_array(NEW.image_url) else '[]'::jsonb end);
      v_is_pinned := coalesce(NEW.is_pinned, false);
    when 'branch_highlights' then
      v_source_type := 'branch_highlight';
      v_title := NEW.title;
      v_body := NEW.description;
      v_author_id := null;
      v_images := case when NEW.image_url is not null then jsonb_build_array(NEW.image_url) else '[]'::jsonb end;
      v_is_pinned := false;
    when 'branch_events' then
      v_source_type := 'branch_event';
      v_title := NEW.title;
      v_body := NEW.description;
      v_author_id := null;
      v_images := case when NEW.cover_url is not null then jsonb_build_array(NEW.cover_url) else '[]'::jsonb end;
      v_is_pinned := false;
    else
      v_source_type := TG_TABLE_NAME;
      v_title := v_row->>'title';
      v_body := v_row->>'body';
      v_images := coalesce(v_row->'images', '[]'::jsonb);
  end case;

  if TG_OP = 'DELETE' then
    delete from public.posts
    where source_type = v_source_type and source_id = OLD.id;
    return OLD;
  end if;

  if v_row ? 'updated_at' and (v_row->>'updated_at') is not null then
    v_updated_at := (v_row->>'updated_at')::timestamptz;
  else
    v_updated_at := v_created_at;
  end if;

  insert into public.posts (
    author_id, title, body, images, source_type, source_id, is_pinned, created_at, updated_at
  )
  values (v_author_id, v_title, v_body, v_images, v_source_type, NEW.id, v_is_pinned, v_created_at, v_updated_at)
  on conflict (source_type, source_id) do update set
    title     = excluded.title,
    body      = excluded.body,
    images    = excluded.images,
    is_pinned = excluded.is_pinned,
    updated_at = excluded.updated_at;

  return NEW;
end;
$$;

create trigger trg_sync_feed_post_project_updates
  after insert or update or delete on public.project_updates
  for each row execute function public.sync_feed_post();

create trigger trg_sync_feed_post_team_updates
  after insert or update or delete on public.team_updates
  for each row execute function public.sync_feed_post();

create trigger trg_sync_feed_post_branch_announcements
  after insert or update or delete on public.branch_announcements
  for each row execute function public.sync_feed_post();

create trigger trg_sync_feed_post_branch_highlights
  after insert or update or delete on public.branch_highlights
  for each row execute function public.sync_feed_post();

create trigger trg_sync_feed_post_branch_events
  after insert or update or delete on public.branch_events
  for each row execute function public.sync_feed_post();

-- ── 5. Backfill existing rows ────────────────────────────────────────────

insert into public.posts (author_id, title, body, images, source_type, source_id, is_pinned, created_at, updated_at)
select author_id, title, body,
  case when image_url is not null then jsonb_build_array(image_url) else '[]'::jsonb end,
  'project_update', id, false, created_at, coalesce(updated_at, created_at)
from public.project_updates
on conflict (source_type, source_id) do nothing;

insert into public.posts (author_id, title, body, images, source_type, source_id, is_pinned, created_at, updated_at)
select author_id, title, body,
  case when image_url is not null then jsonb_build_array(image_url) else '[]'::jsonb end,
  'team_update', id, false, created_at, coalesce(updated_at, created_at)
from public.team_updates
on conflict (source_type, source_id) do nothing;

insert into public.posts (author_id, title, body, images, source_type, source_id, is_pinned, created_at, updated_at)
select author_id, title, body,
  case when image_url is not null then jsonb_build_array(image_url) else '[]'::jsonb end,
  'branch_announcement', id, coalesce(is_pinned, false), created_at, coalesce(updated_at, created_at)
from public.branch_announcements
on conflict (source_type, source_id) do nothing;

insert into public.posts (author_id, title, body, images, source_type, source_id, is_pinned, created_at, updated_at)
select null, title, description,
  case when image_url is not null then jsonb_build_array(image_url) else '[]'::jsonb end,
  'branch_highlight', id, false, created_at, created_at
from public.branch_highlights
on conflict (source_type, source_id) do nothing;

insert into public.posts (author_id, title, body, images, source_type, source_id, is_pinned, created_at, updated_at)
select null, title, description,
  case when cover_url is not null then jsonb_build_array(cover_url) else '[]'::jsonb end,
  'branch_event', id, false, created_at, coalesce(updated_at, created_at)
from public.branch_events
on conflict (source_type, source_id) do nothing;

-- ── 6. RLS: posts ────────────────────────────────────────────────────────

create policy "anyone can read posts"
  on public.posts for select
  using (true);

create policy "users can create posts"
  on public.posts for insert
  with check (auth.uid() = author_id or auth.role() = 'service_role');

create policy "users can update their own posts"
  on public.posts for update
  using (auth.uid() = author_id);

create policy "users can delete their own posts"
  on public.posts for delete
  using (auth.uid() = author_id);

-- ── 7. RLS: saved_posts ──────────────────────────────────────────────────

create policy "users can read their saved posts"
  on public.saved_posts for select
  using (auth.uid() = user_id);

create policy "users can save posts"
  on public.saved_posts for insert
  with check (auth.uid() = user_id);

create policy "users can unsave posts"
  on public.saved_posts for delete
  using (auth.uid() = user_id);

-- ── 8. Storage: feed-images bucket (standalone composer posts) ───────────

insert into storage.buckets (id, name, public)
values ('feed-images', 'feed-images', true)
on conflict (id) do nothing;

create policy "feed images are publicly readable"
  on storage.objects for select using (bucket_id = 'feed-images');

create policy "authenticated users can upload feed images"
  on storage.objects for insert with check (
    bucket_id = 'feed-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "authenticated users can update their feed images"
  on storage.objects for update using (
    bucket_id = 'feed-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "authenticated users can delete their feed images"
  on storage.objects for delete using (
    bucket_id = 'feed-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── 9. Realtime: notifications so the bell updates live ──────────────────

alter publication supabase_realtime add table public.notifications;

-- ── 10. Grants ───────────────────────────────────────────────────────────

grant select, insert, update, delete
  on public.posts to anon, authenticated, service_role;
grant select, insert, update, delete
  on public.saved_posts to anon, authenticated, service_role;
