-- 00062: Activity/feed context fixes
--
--  1. sync_feed_post referenced posts.is_pinned, a column dropped in 00034 and
--     re-introduced by mistake in 00056 → every project_updates / team_updates /
--     branch_announcements insert was failing in production. Recreated without
--     is_pinned (mirrors the post-00034 contract).
--  2. create_project logged created_project activities without team context,
--     so the profile timeline could not show "created X in [Team]". It now
--     stores team_name / team_slug alongside team_id.
--  3. Backfills: enriches existing team-scoped activities that are missing
--     team_name/team_slug, and inserts missing created_project activities for
--     projects that predate the activity logging (e.g. historical projects).

-- ── 1. sync_feed_post without is_pinned ────────────────────────────────────

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
    when 'team_updates' then
      v_source_type := 'team_update';
      v_title := NEW.title;
      v_body := NEW.body;
      v_author_id := NEW.author_id;
      v_images := coalesce(NEW.images,
        case when NEW.image_url is not null then jsonb_build_array(NEW.image_url) else '[]'::jsonb end);
      v_videos := coalesce(NEW.videos, '[]'::jsonb);
    when 'branch_announcements' then
      v_source_type := 'branch_announcement';
      v_title := NEW.title;
      v_body := NEW.body;
      v_author_id := NEW.author_id;
      v_images := coalesce(NEW.images,
        case when NEW.image_url is not null then jsonb_build_array(NEW.image_url) else '[]'::jsonb end);
      v_videos := coalesce(NEW.videos, '[]'::jsonb);
    when 'branch_highlights' then
      v_source_type := 'branch_highlight';
      v_title := NEW.title;
      v_body := NEW.description;
      v_author_id := null;
      v_images := case when NEW.image_url is not null then jsonb_build_array(NEW.image_url) else '[]'::jsonb end;
      v_videos := coalesce(NEW.videos, '[]'::jsonb);
    when 'branch_events' then
      v_source_type := 'branch_event';
      v_title := NEW.title;
      v_body := NEW.description;
      v_author_id := null;
      v_images := case when NEW.cover_url is not null then jsonb_build_array(NEW.cover_url) else '[]'::jsonb end;
      v_videos := coalesce(NEW.videos, '[]'::jsonb);
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
    author_id, title, body, images, videos, source_type, source_id, created_at, updated_at
  )
  values (v_author_id, v_title, v_body, v_images, v_videos, v_source_type, NEW.id, v_created_at, v_updated_at)
  on conflict (source_type, source_id) do update set
    title      = excluded.title,
    body       = excluded.body,
    images     = excluded.images,
    videos     = excluded.videos,
    updated_at = excluded.updated_at;

  return NEW;
end;
$$;

-- ── 2. create_project → include team context in the activity ───────────────

create or replace function public.create_project(
  p_team_id uuid,
  p_name text,
  p_slug text,
  p_description text default null,
  p_visibility text default 'open',
  p_logo_url text default null
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_project_id uuid;
  v_team_name text;
  v_team_slug text;
begin
  if not public.has_team_permission(p_team_id, 'CREATE_PROJECTS') then
    raise exception 'You do not have permission to create projects in this team';
  end if;

  select name, slug into v_team_name, v_team_slug
  from public.teams
  where id = p_team_id;

  insert into public.projects (
    team_id, owner_id, name, slug, description, visibility, logo_url
  ) values (
    p_team_id, auth.uid(), p_name, p_slug, p_description, p_visibility, p_logo_url
  )
  returning id into v_project_id;

  insert into public.project_members (project_id, user_id, role)
  values (v_project_id, auth.uid(), 'owner');

  insert into public.activities (user_id, type, metadata)
  values (
    auth.uid(),
    'created_project',
    jsonb_build_object(
      'project_id', v_project_id,
      'project_name', p_name,
      'project_slug', p_slug,
      'team_id', p_team_id,
      'team_name', v_team_name,
      'team_slug', v_team_slug
    )
  );

  return v_project_id;
end;
$$;

grant execute on function public.create_project(uuid, text, text, text, text, text)
  to authenticated, service_role;

-- ── 3a. Backfill: enrich team-scoped activities missing team context ────────

update public.activities a
set metadata = a.metadata
  || jsonb_build_object('team_name', t.name, 'team_slug', t.slug)
from public.teams t
where a.metadata->>'team_id' = t.id::text
  and not (a.metadata ? 'team_name');

-- ── 3b. Backfill: insert missing created_project activities ────────────────

insert into public.activities (user_id, type, metadata, created_at)
select
  p.owner_id,
  'created_project',
  jsonb_build_object(
    'project_id', p.id,
    'project_name', p.name,
    'project_slug', p.slug,
    'team_id', p.team_id,
    'team_name', t.name,
    'team_slug', t.slug
  ),
  p.created_at
from public.projects p
left join public.teams t on t.id = p.team_id
where not exists (
  select 1 from public.activities a
  where a.type = 'created_project'
    and a.metadata->>'project_id' = p.id::text
);
