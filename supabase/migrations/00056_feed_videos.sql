-- Migration: 00056_feed_videos
--
-- Adds VIDEO support to the feed alongside the existing images.
--
--   * A `videos` jsonb column (array of public URLs) on `posts` and the five
--     source tables, mirroring the existing `images` column exactly so the
--     feed sync trigger keeps them in sync the same way.
--   * The `sync_feed_post` trigger now copies `videos` through to `posts`.
--   * A dedicated `feed-videos` storage bucket for video files (public read +
--     owner write), kept separate from `feed-images` so image uploads are
--     untouched and both share the same policy shape.

-- ── 1. videos column on source tables + posts ────────────────────────────

alter table public.project_updates
  add column if not exists videos jsonb not null default '[]'::jsonb;

alter table public.team_updates
  add column if not exists videos jsonb not null default '[]'::jsonb;

alter table public.branch_announcements
  add column if not exists videos jsonb not null default '[]'::jsonb;

alter table public.branch_highlights
  add column if not exists videos jsonb not null default '[]'::jsonb;

alter table public.branch_events
  add column if not exists videos jsonb not null default '[]'::jsonb;

alter table public.posts
  add column if not exists videos jsonb not null default '[]'::jsonb;

-- ── 2. Sync trigger: carry videos through to posts ───────────────────────

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
  v_videos jsonb;
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
      v_videos := coalesce(NEW.videos, '[]'::jsonb);
      v_is_pinned := false;
    when 'team_updates' then
      v_source_type := 'team_update';
      v_title := NEW.title;
      v_body := NEW.body;
      v_author_id := NEW.author_id;
      v_images := coalesce(NEW.images,
        case when NEW.image_url is not null then jsonb_build_array(NEW.image_url) else '[]'::jsonb end);
      v_videos := coalesce(NEW.videos, '[]'::jsonb);
      v_is_pinned := false;
    when 'branch_announcements' then
      v_source_type := 'branch_announcement';
      v_title := NEW.title;
      v_body := NEW.body;
      v_author_id := NEW.author_id;
      v_images := coalesce(NEW.images,
        case when NEW.image_url is not null then jsonb_build_array(NEW.image_url) else '[]'::jsonb end);
      v_videos := coalesce(NEW.videos, '[]'::jsonb);
      v_is_pinned := coalesce(NEW.is_pinned, false);
    when 'branch_highlights' then
      v_source_type := 'branch_highlight';
      v_title := NEW.title;
      v_body := NEW.description;
      v_author_id := null;
      v_images := case when NEW.image_url is not null then jsonb_build_array(NEW.image_url) else '[]'::jsonb end;
      v_videos := coalesce(NEW.videos, '[]'::jsonb);
      v_is_pinned := false;
    when 'branch_events' then
      v_source_type := 'branch_event';
      v_title := NEW.title;
      v_body := NEW.description;
      v_author_id := null;
      v_images := case when NEW.cover_url is not null then jsonb_build_array(NEW.cover_url) else '[]'::jsonb end;
      v_videos := coalesce(NEW.videos, '[]'::jsonb);
      v_is_pinned := false;
    else
      v_source_type := TG_TABLE_NAME;
      v_title := v_row->>'title';
      v_body := v_row->>'body';
      v_images := coalesce(v_row->'images', '[]'::jsonb);
      v_videos := coalesce(v_row->'videos', '[]'::jsonb);
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
    author_id, title, body, images, videos, source_type, source_id, is_pinned, created_at, updated_at
  )
  values (v_author_id, v_title, v_body, v_images, v_videos, v_source_type, NEW.id, v_is_pinned, v_created_at, v_updated_at)
  on conflict (source_type, source_id) do update set
    title     = excluded.title,
    body      = excluded.body,
    images    = excluded.images,
    videos    = excluded.videos,
    is_pinned = excluded.is_pinned,
    updated_at = excluded.updated_at;

  return NEW;
end;
$$;

-- ── 3. Storage: feed-videos bucket ───────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('feed-videos', 'feed-videos', true)
on conflict (id) do nothing;

create policy "feed videos are publicly readable"
  on storage.objects for select using (bucket_id = 'feed-videos');

create policy "authenticated users can upload feed videos"
  on storage.objects for insert with check (
    bucket_id = 'feed-videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "authenticated users can update their feed videos"
  on storage.objects for update using (
    bucket_id = 'feed-videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "authenticated users can delete their feed videos"
  on storage.objects for delete using (
    bucket_id = 'feed-videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );