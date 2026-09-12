-- Migration: 00133_course_metadata_rpcs
--
-- Phase 0C: canonical database RPCs for Academy course metadata mutations.
--
-- Background: actions/academy-courses.actions.ts performs course inserts /
-- updates / deletes through the service-role client ("to bypass RLS ... gated
-- by is_course_manager"). The courses table already carries manager-gated RLS
-- (00095), but the privileged server path cannot be reached by a native
-- client holding only a user JWT + cookies-less session. These RPCs give the
-- future native client (and the web actions) a DB-enforced boundary:
-- authorization runs inside the RPC against auth.uid(), never against a
-- caller-supplied user id.
--
-- Scope (mirrors the server actions exactly, no widening):
--   - create_course_metadata: is_course_manager() only. created_by is forced
--     to auth.uid(); file_path must live under courses/<caller>/ and match
--     the safe object pattern enforced by the file route.
--   - update_course_metadata: is_course_manager() only. Same mutable fields
--     as updateCourse (title/description/category/duration/difficulty/tags/
--     thumbnail). Status, file bytes, and ownership are NOT mutable here.
--   - delete_course_metadata: is_course_manager() only. Deletes the row;
--     storage-object cleanup stays caller-side (same as the action).
--
-- File bytes never travel through these RPCs: uploads/downloads stay
-- storage-mediated under the existing course-files bucket policies.
-- can_manage_course()/can_access_course() were dropped as dead code in 00130
-- and are intentionally NOT revived here.

-- ── create ────────────────────────────────────────────────────────────────

create or replace function public.create_course_metadata(
  p_title text,
  p_description text,
  p_category text,
  p_content_type text,
  p_file_path text,
  p_file_url text,
  p_duration text,
  p_difficulty text default null,
  p_tags text[] default null
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.is_course_manager() then
    raise exception 'Not authorized - core team only';
  end if;

  if coalesce(nullif(btrim(p_title), ''), '') = '' or char_length(p_title) > 200 then
    raise exception 'Invalid title';
  end if;
  if p_description is not null and char_length(p_description) > 5000 then
    raise exception 'Invalid description';
  end if;
  if p_content_type not in ('html_css', 'pdf') then
    raise exception 'Invalid content type';
  end if;
  if p_file_path is null
     or p_file_path !~ '^courses/[0-9a-f-]{36}/[0-9a-f-]{36}\.[a-z0-9]{1,10}$'
  then
    raise exception 'Invalid file path';
  end if;
  if split_part(p_file_path, '/', 2) is distinct from auth.uid()::text then
    raise exception 'File path must belong to the caller';
  end if;
  if p_difficulty is not null and p_difficulty not in ('beginner', 'intermediate', 'advanced') then
    raise exception 'Invalid difficulty';
  end if;
  if p_tags is not null and array_length(p_tags, 1) > 10 then
    raise exception 'Too many tags';
  end if;

  insert into public.courses (
    title, description, category, content_type,
    file_url, file_path, duration, difficulty, tags, created_by
  ) values (
    btrim(p_title), nullif(btrim(coalesce(p_description, '')), ''),
    p_category, p_content_type, p_file_url, p_file_path,
    nullif(btrim(coalesce(p_duration, '')), ''),
    p_difficulty, p_tags, auth.uid()
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.create_course_metadata(text, text, text, text, text, text, text, text, text[]) from public;
grant execute on function public.create_course_metadata(text, text, text, text, text, text, text, text, text[])
  to authenticated, service_role;

-- ── update ────────────────────────────────────────────────────────────────

create or replace function public.update_course_metadata(
  p_course_id uuid,
  p_title text,
  p_description text,
  p_category text,
  p_duration text,
  p_difficulty text default null,
  p_tags text[] default null,
  p_thumbnail text default null
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_course_manager() then
    raise exception 'Not authorized - core team only';
  end if;

  if coalesce(nullif(btrim(p_title), ''), '') = '' or char_length(p_title) > 200 then
    raise exception 'Invalid title';
  end if;
  if p_description is not null and char_length(p_description) > 5000 then
    raise exception 'Invalid description';
  end if;
  if p_difficulty is not null and p_difficulty not in ('beginner', 'intermediate', 'advanced') then
    raise exception 'Invalid difficulty';
  end if;
  if p_tags is not null and array_length(p_tags, 1) > 10 then
    raise exception 'Too many tags';
  end if;

  update public.courses set
    title = btrim(p_title),
    description = nullif(btrim(coalesce(p_description, '')), ''),
    category = p_category,
    duration = nullif(btrim(coalesce(p_duration, '')), ''),
    difficulty = p_difficulty,
    tags = p_tags,
    thumbnail = coalesce(p_thumbnail, thumbnail)
  where id = p_course_id;

  if not found then
    raise exception 'Course not found';
  end if;
end;
$$;

revoke all on function public.update_course_metadata(uuid, text, text, text, text, text, text[], text) from public;
grant execute on function public.update_course_metadata(uuid, text, text, text, text, text, text[], text)
  to authenticated, service_role;

-- ── delete ────────────────────────────────────────────────────────────────

create or replace function public.delete_course_metadata(p_course_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_course_manager() then
    raise exception 'Not authorized - core team only';
  end if;

  delete from public.courses where id = p_course_id;

  if not found then
    raise exception 'Course not found';
  end if;
end;
$$;

revoke all on function public.delete_course_metadata(uuid) from public;
grant execute on function public.delete_course_metadata(uuid)
  to authenticated, service_role;
