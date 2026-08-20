-- Fix RPCs that still referenced the dropped `is_branch_manager` function.
-- Migration 00030 renamed branch_managers -> branch_leaders and replaced
-- `is_branch_manager(uuid, uuid)` with `is_branch_leader(uuid, uuid)`, but the
-- following functions were left referencing the dropped function, which breaks
-- them at runtime. Redefine them to gate on `is_branch_leader`.

-- ── update_branch_announcement_image ───────────────────────────────────────

create or replace function public.update_branch_announcement_image(
  p_announcement_id uuid,
  p_image_url text
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_branch_id uuid;
begin
  select branch_id into v_branch_id
  from public.branch_announcements
  where id = p_announcement_id;

  if v_branch_id is null then
    raise exception 'Announcement not found';
  end if;

  if not public.is_branch_leader(v_branch_id) and not public.is_platform_admin() then
    raise exception 'Only branch leaders can edit announcements';
  end if;

  update public.branch_announcements set
    image_url  = p_image_url,
    updated_at = now()
  where id = p_announcement_id;
end;
$$;

-- ── delete_branch_announcement ─────────────────────────────────────────────

create or replace function public.delete_branch_announcement(
  p_announcement_id uuid
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_branch_id uuid;
begin
  select branch_id into v_branch_id
  from public.branch_announcements
  where id = p_announcement_id;

  if v_branch_id is null then
    raise exception 'Announcement not found';
  end if;

  if not public.is_branch_leader(v_branch_id) and not public.is_platform_admin() then
    raise exception 'Only branch leaders can delete announcements';
  end if;

  delete from public.branch_announcements where id = p_announcement_id;

  insert into public.activities (user_id, type, metadata)
  values (
    auth.uid(),
    'deleted_branch_announcement',
    jsonb_build_object('announcement_id', p_announcement_id)
  );
end;
$$;

-- ── delete_branch_event ────────────────────────────────────────────────────

create or replace function public.delete_branch_event(p_event_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_branch_id uuid;
begin
  select branch_id into v_branch_id
  from public.branch_events
  where id = p_event_id;

  if v_branch_id is null then
    raise exception 'Event not found';
  end if;

  if not public.is_branch_leader(v_branch_id) and not public.is_platform_admin() then
    raise exception 'Only branch leaders can delete events';
  end if;

  delete from public.branch_events where id = p_event_id;

  insert into public.activities (user_id, type, metadata)
  values (
    auth.uid(),
    'deleted_branch_event',
    jsonb_build_object('event_id', p_event_id)
  );
end;
$$;

-- ── create_branch_highlight ────────────────────────────────────────────────

create or replace function public.create_branch_highlight(
  p_branch_id uuid,
  p_title text,
  p_description text default null,
  p_image_url text default null,
  p_link_url text default null,
  p_sort_order int default 0
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_highlight_id uuid;
  v_branch_name text;
begin
  if not public.is_branch_leader(p_branch_id) and not public.is_platform_admin() then
    raise exception 'Only branch leaders can create highlights';
  end if;

  select name into v_branch_name
  from public.branches
  where id = p_branch_id;

  if v_branch_name is null then
    raise exception 'Branch not found';
  end if;

  insert into public.branch_highlights (
    branch_id, title, description, image_url, link_url, sort_order
  )
  values (p_branch_id, p_title, p_description, p_image_url, p_link_url, p_sort_order)
  returning id into v_highlight_id;

  insert into public.activities (user_id, type, metadata)
  values (
    auth.uid(),
    'created_branch_highlight',
    jsonb_build_object(
      'branch_id', p_branch_id,
      'branch_name', v_branch_name,
      'highlight_id', v_highlight_id,
      'highlight_title', p_title
    )
  );

  return v_highlight_id;
end;
$$;

-- ── update_branch_highlight ────────────────────────────────────────────────

create or replace function public.update_branch_highlight(
  p_highlight_id uuid,
  p_title text default null,
  p_description text default null,
  p_image_url text default null,
  p_link_url text default null,
  p_sort_order int default null
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_branch_id uuid;
begin
  select branch_id into v_branch_id
  from public.branch_highlights
  where id = p_highlight_id;

  if v_branch_id is null then
    raise exception 'Highlight not found';
  end if;

  if not public.is_branch_leader(v_branch_id) and not public.is_platform_admin() then
    raise exception 'Only branch leaders can edit highlights';
  end if;

  update public.branch_highlights set
    title        = coalesce(p_title, title),
    description  = coalesce(p_description, description),
    image_url    = coalesce(p_image_url, image_url),
    link_url     = coalesce(p_link_url, link_url),
    sort_order   = coalesce(p_sort_order, sort_order)
  where id = p_highlight_id;
end;
$$;

-- ── delete_branch_highlight ────────────────────────────────────────────────

create or replace function public.delete_branch_highlight(p_highlight_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_branch_id uuid;
begin
  select branch_id into v_branch_id
  from public.branch_highlights
  where id = p_highlight_id;

  if v_branch_id is null then
    raise exception 'Highlight not found';
  end if;

  if not public.is_branch_leader(v_branch_id) and not public.is_platform_admin() then
    raise exception 'Only branch leaders can delete highlights';
  end if;

  delete from public.branch_highlights where id = p_highlight_id;

  insert into public.activities (user_id, type, metadata)
  values (
    auth.uid(),
    'deleted_branch_highlight',
    jsonb_build_object('highlight_id', p_highlight_id)
  );
end;
$$;

-- ── Grants ────────────────────────────────────────────────────────────────

grant execute on function public.update_branch_announcement_image(uuid, text) to anon, authenticated, service_role;
grant execute on function public.delete_branch_announcement(uuid) to anon, authenticated, service_role;
grant execute on function public.delete_branch_event(uuid) to anon, authenticated, service_role;
grant execute on function public.create_branch_highlight(uuid, text, text, text, text, int) to anon, authenticated, service_role;
grant execute on function public.update_branch_highlight(uuid, text, text, text, text, int) to anon, authenticated, service_role;
grant execute on function public.delete_branch_highlight(uuid) to anon, authenticated, service_role;
