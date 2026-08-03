-- Migration: 00033_feed_sync_preserve_pin
--
-- Fix: sync_feed_post() hardcoded v_is_pinned := false for project_updates and
-- team_updates, so editing such a source row silently cleared an existing pin
-- on the canonical posts row (ON CONFLICT DO UPDATE overwrote is_pinned).
--
-- Now, on UPDATE, project/team update posts keep their existing posts.is_pinned
-- value. Branch announcements are unchanged: they keep flowing their own
-- is_pinned field through exactly as before.

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
    is_pinned = case
      when v_source_type in ('project_update', 'team_update') then public.posts.is_pinned
      else excluded.is_pinned
    end,
    updated_at = excluded.updated_at;

  return NEW;
end;
$$;
