-- Migration: 00139_academy_roadmaps_rpcs.sql
-- Academy Roadmaps — part 2 of 3.
--
-- Manager-wide editing RPCs (same "manager" gate as Courses, decision #1),
-- explicit draft -> publish semantics with fail-closed content validation
-- (decisions #2/#6), structural snapshots stored in roadmap_versions on every
-- publish (decision #4), and the server-authoritative, idempotent learner
-- completion RPC (decision #9) backed by auth.uid().
--
-- RLS remains the last line of defence: every mutating RPC runs security
-- definer but the underlying tables' policies independently authorise. Node
-- authored metadata (#5) can only be written through set_roadmap_structure(),
-- which itself only ever mutates draft roadmaps.

-- ── Internal helper: publish-time structure snapshot ─────────────────────────
-- Freezes the live draft stage/node/prerequisite rows into the JSONB shape
-- documented on roadmap_versions.structure. Used by publish_roadmap(); granted
-- to service_role only so the live draft tables are the sole writable surface
-- for other roles.

create or replace function public._roadmap_structure_snapshot(p_roadmap_id uuid)
returns jsonb
language sql
security definer set search_path = public
stable
as $$
  select jsonb_build_object(
    'stages',
    coalesce(
      (select jsonb_agg(
        jsonb_build_object(
          'id', st.id,
          'position', st.position,
          'title', st.title,
          'description', st.description,
          'nodes', coalesce(
            (select jsonb_agg(
               jsonb_build_object(
                 'id', rn.id,
                 'position', rn.position,
                 'kind', case when rn.course_id is not null then 'course' else 'lab' end,
                 'ref_id', coalesce(rn.course_id, rn.lab_id),
                 'title', rn.title,
                 'description', rn.description,
                 'estimated_minutes', rn.estimated_minutes,
                 'is_optional', rn.is_optional,
                 'required_node_ids', coalesce(
                   (select jsonb_agg(pr.prerequisite_node_id)
                    from public.roadmap_node_prerequisites pr
                    where pr.node_id = rn.id),
                   '[]'::jsonb
                 )
               )
               order by rn.position
             )
             from public.roadmap_nodes rn
             where rn.stage_id = st.id),
            '[]'::jsonb
          )
        )
        order by st.position
      )
      from public.roadmap_stages st
      where st.roadmap_id = p_roadmap_id),
      '[]'::jsonb
    )
  );
$$;

revoke all on function public._roadmap_structure_snapshot(uuid) from public;
grant execute on function public._roadmap_structure_snapshot(uuid) to service_role;

comment on function public._roadmap_structure_snapshot(uuid) is
  'Internal: freezes a roadmap''s draft stage/node/prerequisite rows into the roadmap_versions JSONB shape. Published roadmaps present this snapshot, never the live draft tables.';

-- ── create_roadmap ───────────────────────────────────────────────────────────
-- Creates a draft roadmap with a slug derived from the title (permalink stays
-- stable for the roadmap's lifetime; title edits do not re-slug). Returns the
-- new roadmap id.

create or replace function public.create_roadmap(
  p_title text,
  p_description text default null,
  p_level text default 'beginner'
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_title text := nullif(btrim(coalesce(p_title, '')), '');
  v_description text := nullif(btrim(coalesce(p_description, '')), '');
  v_level text;
  v_base_slug text;
  v_slug text;
  v_suffix integer := 0;
  v_id uuid;
begin
  if not public.is_roadmap_manager() then
    raise exception 'Only roadmap managers can create roadmaps (core team, creators, or platform admins)';
  end if;

  if v_title is null or char_length(v_title) > 200 then
    raise exception 'Invalid roadmap title (required, up to 200 characters)';
  end if;
  if v_description is not null and char_length(v_description) > 5000 then
    raise exception 'Invalid roadmap description (up to 5000 characters)';
  end if;
  v_level := coalesce(p_level, 'beginner');
  if v_level not in ('beginner', 'intermediate', 'advanced') then
    raise exception 'Invalid roadmap level (beginner, intermediate, or advanced)';
  end if;

  v_base_slug := regexp_replace(
    lower(regexp_replace(v_title, '[^a-zA-Z0-9]+', '-', 'g')),
    '(^-+|-+$)', '', 'g'
  );
  if v_base_slug = '' then
    -- Non-Latin titles (e.g. Arabic) yield no slug-safe characters; fall back
    -- to a random slug so every roadmap still gets a valid unique permalink.
    v_base_slug := 'roadmap-' || substr(md5(random()::text), 1, 10);
  end if;

  v_slug := v_base_slug;
  while exists (select 1 from public.roadmaps rm where rm.slug = v_slug) loop
    v_suffix := v_suffix + 1;
    v_slug := v_base_slug || '-' || v_suffix;
  end loop;

  insert into public.roadmaps (slug, title, description, level, created_by)
  values (v_slug, v_title, v_description, v_level, auth.uid())
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.create_roadmap(text, text, text) from public;
grant execute on function public.create_roadmap(text, text, text) to authenticated, service_role;

comment on function public.create_roadmap(text, text, text) is
  'Creates a draft roadmap with a permalink-stable slug derived from the title; returns the new id. Drafts only (create_action is always a draft); publishing is a separate, validated step.';

-- ── update_roadmap_meta ──────────────────────────────────────────────────────
-- Edits the header metadata (title/description/level) of a draft roadmap. The
-- slug and status are not writable here.

create or replace function public.update_roadmap_meta(
  p_roadmap_id uuid,
  p_title text default null,
  p_description text default null,
  p_level text default null
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_title text := nullif(btrim(coalesce(p_title, '')), '');
  v_description text := nullif(btrim(coalesce(p_description, '')), '');
begin
  if not public.is_roadmap_manager() then
    raise exception 'Only roadmap managers can edit roadmaps (core team, creators, or platform admins)';
  end if;
  if not exists (select 1 from public.roadmaps rm where rm.id = p_roadmap_id) then
    raise exception 'Roadmap not found';
  end if;

  if p_title is not null and (v_title is null or char_length(v_title) > 200) then
    raise exception 'Invalid roadmap title (required, up to 200 characters)';
  end if;
  if p_description is not null and char_length(v_description) > 5000 then
    raise exception 'Invalid roadmap description (up to 5000 characters)';
  end if;
  if p_level is not null and p_level not in ('beginner', 'intermediate', 'advanced') then
    raise exception 'Invalid roadmap level (beginner, intermediate, or advanced)';
  end if;

  update public.roadmaps
  set title = case when p_title is null then title else v_title end,
      description = case when p_description is null then description else v_description end,
      level = case when p_level is null then level else p_level end,
      updated_at = now()
  where id = p_roadmap_id
    and status = 'draft';

  if not found then
    if exists (select 1 from public.roadmaps rm where rm.id = p_roadmap_id and rm.status <> 'draft') then
      raise exception 'Published roadmaps are locked; unpublish before editing';
    end if;
    raise exception 'Roadmap not found';
  end if;
end;
$$;

revoke all on function public.update_roadmap_meta(uuid, text, text, text) from public;
grant execute on function public.update_roadmap_meta(uuid, text, text, text) to authenticated, service_role;

comment on function public.update_roadmap_meta(uuid, text, text, text) is
  'Updates the title/description/level of a draft roadmap. Null parameters keep the current value. Published roadmaps are locked until unpublished.';

-- ── set_roadmap_structure ────────────────────────────────────────────────────
-- Replaces the entire draft structure (stages, nodes, prerequisites) from a
-- JSONB payload, atomically. Shape:
--
--   {"stages": [{"id"?,"position":1,"title":"...","description"?,
--               "nodes": [{"id"?,"position":1,"kind":"course"|"lab",
--                          "ref_id":"<uuid>","title":"...","description"?,
--                          "estimated_minutes"?, "is_optional"?,
--                          "required_node_ids"?:[...]}]}]}
--
-- Node ids: optional. When provided they give stable handles so other nodes can
-- list them in "required_node_ids"; every required_node_ids entry MUST resolve
-- to a node id declared in the very same payload (fail-closed), and a node can
-- never be its own prerequisite. Node authored metadata (title/description/
-- estimated_minutes/is_optional, #5) is only writable here. Course/lab refs
-- must exist (drafts may reference not-yet-published content; publish_roadmap
-- enforces availability at publish time, #6).

create or replace function public.set_roadmap_structure(
  p_roadmap_id uuid,
  p_structure jsonb
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_stage jsonb;
  v_node jsonb;
  v_stage_position integer;
  v_node_position integer;
  v_node_kind text;
  v_ref_text text;
  v_title text;
  v_description text;
  v_node_id uuid;
  v_stage_id uuid;
  v_required text;
  v_dependent_uuid uuid;
  v_seen_stage_positions integer[] := '{}'::integer[];
  v_seen_node_positions integer[] := '{}'::integer[];
  v_resolved jsonb := '{}'::jsonb;          -- provided node id -> actual uuid
  v_actual jsonb := '{}'::jsonb;            -- stage:pos key -> actual uuid
begin
  if not public.is_roadmap_manager() then
    raise exception 'Only roadmap managers can edit roadmaps (core team, creators, or platform admins)';
  end if;

  if exists (select 1 from public.roadmaps rm where rm.id = p_roadmap_id and rm.status <> 'draft') then
    raise exception 'Published roadmaps are locked; unpublish before editing';
  end if;
  if not exists (select 1 from public.roadmaps rm where rm.id = p_roadmap_id) then
    raise exception 'Roadmap not found';
  end if;

  p_structure := coalesce(p_structure, '{"stages": []}'::jsonb);
  if jsonb_typeof(p_structure) <> 'object' or jsonb_typeof(p_structure->'stages') <> 'array' then
    raise exception 'Invalid structure: expected an object with a "stages" array';
  end if;

  -- ── Pass 1: validate every stage/node and reserve ids for declared nodes ──
  for v_stage in
    select * from jsonb_array_elements(p_structure->'stages') loop

    if jsonb_typeof(v_stage->'position') <> 'number'
       or v_stage->>'position' !~ '^[0-9]+$' then
      raise exception 'Invalid stage: position must be a positive integer';
    end if;
    v_stage_position := (v_stage->>'position')::integer;
    if v_stage_position < 1 then
      raise exception 'Invalid stage: position must be a positive integer';
    end if;
    if v_stage_position = any(v_seen_stage_positions) then
      raise exception 'Invalid structure: duplicate stage position %', v_stage_position;
    end if;
    v_seen_stage_positions := array_append(v_seen_stage_positions, v_stage_position);

    v_title := nullif(btrim(coalesce(v_stage->>'title', '')), '');
    if v_title is null or char_length(v_title) > 200 then
      raise exception 'Invalid stage %: title is required (up to 200 characters)', v_stage_position;
    end if;

    v_description := nullif(v_stage->>'description', '');
    if v_description is not null and char_length(v_description) > 5000 then
      raise exception 'Invalid stage %: description too long (up to 5000 characters)', v_stage_position;
    end if;

    if v_stage->'nodes' is not null and jsonb_typeof(v_stage->'nodes') <> 'array' then
      raise exception 'Invalid stage %: nodes must be an array', v_stage_position;
    end if;

    v_seen_node_positions := '{}'::integer[];
    for v_node in
      select * from jsonb_array_elements(coalesce(v_stage->'nodes', '[]'::jsonb)) loop

      if jsonb_typeof(v_node->'position') <> 'number'
         or v_node->>'position' !~ '^[0-9]+$' then
        raise exception 'Invalid node in stage %: position must be a positive integer', v_stage_position;
      end if;
      v_node_position := (v_node->>'position')::integer;
      if v_node_position < 1 then
        raise exception 'Invalid node in stage %: position must be a positive integer', v_stage_position;
      end if;
      if v_node_position = any(v_seen_node_positions) then
        raise exception 'Invalid structure: duplicate node position % in stage %', v_node_position, v_stage_position;
      end if;
      v_seen_node_positions := array_append(v_seen_node_positions, v_node_position);

      v_node_kind := v_node->>'kind';
      if v_node_kind not in ('course', 'lab') then
        raise exception 'Invalid node % in stage %: kind must be "course" or "lab"', v_node_position, v_stage_position;
      end if;

      v_ref_text := v_node->>'ref_id';
      if v_ref_text is null
         or v_ref_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
        raise exception 'Invalid node % in stage %: ref_id must be a uuid', v_node_position, v_stage_position;
      end if;
      if v_node_kind = 'course' then
        if not exists (select 1 from public.courses c where c.id = v_ref_text::uuid) then
          raise exception 'Invalid node % in stage %: course does not exist', v_node_position, v_stage_position;
        end if;
      else
        if not exists (select 1 from public.labs l where l.id = v_ref_text::uuid) then
          raise exception 'Invalid node % in stage %: lab does not exist', v_node_position, v_stage_position;
        end if;
      end if;

      v_title := nullif(btrim(coalesce(v_node->>'title', '')), '');
      if v_title is null or char_length(v_title) > 200 then
        raise exception 'Invalid node % in stage %: title is required (up to 200 characters)', v_node_position, v_stage_position;
      end if;

      v_description := nullif(v_node->>'description', '');
      if v_description is not null and char_length(v_description) > 5000 then
        raise exception 'Invalid node % in stage %: description too long (up to 5000 characters)', v_node_position, v_stage_position;
      end if;

      if v_node->'estimated_minutes' is not null then
        if jsonb_typeof(v_node->'estimated_minutes') <> 'number'
           or v_node->>'estimated_minutes' !~ '^[0-9]+$' then
          raise exception 'Invalid node % in stage %: estimated_minutes must be a non-negative integer', v_node_position, v_stage_position;
        end if;
        if (v_node->>'estimated_minutes')::integer < 0 then
          raise exception 'Invalid node % in stage %: estimated_minutes must be non-negative', v_node_position, v_stage_position;
        end if;
      end if;

      -- is_optional must be a real JSON boolean when provided (no implicit SQL
      -- coercion of strings like "yes"); a JSON "null" literal is also rejected
      -- because jsonb_typeof('null'::jsonb) is 'null', not 'boolean'.
      if v_node->'is_optional' is not null and jsonb_typeof(v_node->'is_optional') <> 'boolean' then
        raise exception 'Invalid node % in stage %: is_optional must be a boolean', v_node_position, v_stage_position;
      end if;

      if v_node->'required_node_ids' is not null and jsonb_typeof(v_node->'required_node_ids') <> 'array' then
        raise exception 'Invalid node % in stage %: required_node_ids must be an array', v_node_position, v_stage_position;
      end if;

      -- Reserve the actual uuid for any node that declares a stable handle.
      if v_node->'id' is not null and jsonb_typeof(v_node->'id') = 'string'
         and v_node->>'id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
        if v_resolved ? (v_node->>'id') then
          raise exception 'Invalid structure: duplicate declared node id %', v_node->>'id';
        end if;
        v_resolved := v_resolved || jsonb_build_object(v_node->>'id', gen_random_uuid()::text);
      end if;
    end loop;
  end loop;

  -- ── Pass 2: validate prerequisite references against declared node ids ────
  for v_stage in
    select * from jsonb_array_elements(p_structure->'stages') loop
    v_stage_position := (v_stage->>'position')::integer;
    for v_node in
      select * from jsonb_array_elements(coalesce(v_stage->'nodes', '[]'::jsonb)) loop
      v_node_position := (v_node->>'position')::integer;
      if v_node->'required_node_ids' is null then
        continue;
      end if;
      for v_required in
        select jsonb_array_elements_text(v_node->'required_node_ids') loop
        if v_required is null
           or v_required !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
          raise exception 'Invalid node % in stage %: required_node_ids must contain uuids', v_node_position, v_stage_position;
        end if;
        if not (v_resolved ? v_required) then
          raise exception 'Invalid node % in stage %: prerequisite % references a node id not declared in this structure', v_node_position, v_stage_position, v_required;
        end if;
        if v_node->'id' is not null and v_node->>'id' = v_required then
          raise exception 'Invalid node % in stage %: a node cannot be its own prerequisite', v_node_position, v_stage_position;
        end if;
      end loop;
    end loop;
  end loop;

  -- ── Pass 3: atomically replace the draft structure ─────────────────────────
  delete from public.roadmap_stages where roadmap_id = p_roadmap_id;

  for v_stage in
    select * from jsonb_array_elements(p_structure->'stages') loop
    v_stage_position := (v_stage->>'position')::integer;

    insert into public.roadmap_stages (roadmap_id, position, title, description)
    values (
      p_roadmap_id,
      v_stage_position,
      nullif(btrim(coalesce(v_stage->>'title', '')), ''),
      nullif(v_stage->>'description', '')
    )
    returning id into v_stage_id;

    for v_node in
      select * from jsonb_array_elements(coalesce(v_stage->'nodes', '[]'::jsonb)) loop
      v_node_position := (v_node->>'position')::integer;
      v_node_kind := v_node->>'kind';

      v_node_id := gen_random_uuid();
      -- Honor a declared handle so prerequisite references stay valid.
      v_node_id := coalesce(
        (v_resolved->>(v_node->>'id'))::uuid,
        v_node_id
      );

      insert into public.roadmap_nodes (
        id, stage_id, position, course_id, lab_id, title, description,
        estimated_minutes, is_optional
      )
      values (
        v_node_id,
        v_stage_id,
        v_node_position,
        case when v_node_kind = 'course' then (v_node->>'ref_id')::uuid else null end,
        case when v_node_kind = 'lab' then (v_node->>'ref_id')::uuid else null end,
        nullif(btrim(coalesce(v_node->>'title', '')), ''),
        nullif(v_node->>'description', ''),
        case when v_node->>'estimated_minutes' ~ '^[0-9]+$'
             then (v_node->>'estimated_minutes')::integer else null end,
        coalesce((v_node->'is_optional')::boolean, false)
      );

      v_actual := v_actual || jsonb_build_object(
        v_stage_position::text || ':' || v_node_position::text,
        v_node_id::text
      );
    end loop;
  end loop;

  -- ── Pass 4: insert prerequisites once every node row exists ───────────────
  for v_stage in
    select * from jsonb_array_elements(p_structure->'stages') loop
    v_stage_position := (v_stage->>'position')::integer;
    for v_node in
      select * from jsonb_array_elements(coalesce(v_stage->'nodes', '[]'::jsonb)) loop
      v_node_position := (v_node->>'position')::integer;
      if v_node->'required_node_ids' is null then
        continue;
      end if;
      v_dependent_uuid := (v_actual->>(v_stage_position::text || ':' || v_node_position::text))::uuid;
      for v_required in
        select jsonb_array_elements_text(v_node->'required_node_ids') loop
        insert into public.roadmap_node_prerequisites (node_id, prerequisite_node_id)
        values (v_dependent_uuid, (v_resolved->>v_required)::uuid);
      end loop;
    end loop;
  end loop;

  update public.roadmaps
  set updated_at = now()
  where id = p_roadmap_id;
end;
$$;

revoke all on function public.set_roadmap_structure(uuid, jsonb) from public;
grant execute on function public.set_roadmap_structure(uuid, jsonb) to authenticated, service_role;

comment on function public.set_roadmap_structure(uuid, jsonb) is
  'Atomically replaces the structure of a DRAFT roadmap from JSONB. Validates stages/nodes/prerequisites and referenced courses/labs before mutating; throws on any violation (fail-closed). Published roadmaps are locked.';

-- ── publish_roadmap ──────────────────────────────────────────────────────────
-- Flips a draft roadmap to published, fail-closed:
--   * requires at least one node;
--   * every referenced course/lab must be currently available
--     (published course, or published & non-archived lab) — decision #6;
--   * seats a new immutable roadmap_versions snapshot (#4) and points
--     roadmaps.published_version_id at it.
-- Later-unpublished content never blocks an already-published roadmap; the
-- read model (00140) marks such nodes unavailable at read time (#8).

create or replace function public.publish_roadmap(p_roadmap_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_node_count integer;
  v_unavailable_id uuid;
  v_next_version integer;
  v_snapshot jsonb;
  v_version_id uuid;
begin
  if not public.is_roadmap_manager() then
    raise exception 'Only roadmap managers can publish roadmaps (core team, creators, or platform admins)';
  end if;

  if not exists (select 1 from public.roadmaps rm where rm.id = p_roadmap_id) then
    raise exception 'Roadmap not found';
  end if;
  if exists (select 1 from public.roadmaps rm where rm.id = p_roadmap_id and rm.status = 'published') then
    raise exception 'Roadmap is already published';
  end if;

  select count(*) into v_node_count
  from public.roadmap_nodes rn
  join public.roadmap_stages st on st.id = rn.stage_id
  where st.roadmap_id = p_roadmap_id;
  if v_node_count = 0 then
    raise exception 'Cannot publish an empty roadmap (add at least one node)';
  end if;

  select rn.id into v_unavailable_id
  from public.roadmap_nodes rn
  join public.roadmap_stages st on st.id = rn.stage_id
  where st.roadmap_id = p_roadmap_id
    and not public.is_roadmap_node_available(rn.id)
  limit 1;
  if v_unavailable_id is not null then
    raise exception 'Cannot publish: node % references content that is not currently published or available', v_unavailable_id;
  end if;

  v_snapshot := public._roadmap_structure_snapshot(p_roadmap_id);

  select coalesce(max(version_number), 0) + 1 into v_next_version
  from public.roadmap_versions
  where roadmap_id = p_roadmap_id;

  insert into public.roadmap_versions (roadmap_id, version_number, structure, created_by)
  values (p_roadmap_id, v_next_version, v_snapshot, auth.uid())
  returning id into v_version_id;

  update public.roadmaps
  set status = 'published',
      published_at = now(),
      published_version_id = v_version_id,
      updated_at = now()
  where id = p_roadmap_id;
end;
$$;

revoke all on function public.publish_roadmap(uuid) from public;
grant execute on function public.publish_roadmap(uuid) to authenticated, service_role;

comment on function public.publish_roadmap(uuid) is
  'Publishes a draft roadmap after validating it has at least one node and that every referenced course/lab is currently available. Records an immutable roadmap_versions snapshot and points published_version_id at it.';

-- ── unpublish_roadmap ────────────────────────────────────────────────────────
-- Flips a published roadmap back to draft. The published_version pointer is
-- cleared but the historical snapshot rows are retained for later audit/X-legacy
-- (they simply become invisible to the new draft state).

create or replace function public.unpublish_roadmap(p_roadmap_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_roadmap_manager() then
    raise exception 'Only roadmap managers can unpublish roadmaps (core team, creators, or platform admins)';
  end if;

  update public.roadmaps
  set status = 'draft',
      published_at = null,
      published_version_id = null,
      updated_at = now()
  where id = p_roadmap_id
    and status = 'published';

  if not found then
    if exists (select 1 from public.roadmaps rm where rm.id = p_roadmap_id and rm.status = 'draft') then
      raise exception 'Roadmap is not published';
    end if;
    raise exception 'Roadmap not found';
  end if;
end;
$$;

revoke all on function public.unpublish_roadmap(uuid) from public;
grant execute on function public.unpublish_roadmap(uuid) to authenticated, service_role;

comment on function public.unpublish_roadmap(uuid) is
  'Flips a published roadmap back to draft and clears the published snapshot pointer. Historical versions are retained.';

-- ── delete_roadmap ───────────────────────────────────────────────────────────
-- Permanently deletes a roadmap (draft or published), cascading to versions,
-- stages, nodes, prerequisites and learner completions.

create or replace function public.delete_roadmap(p_roadmap_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_roadmap_manager() then
    raise exception 'Only roadmap managers can delete roadmaps (core team, creators, or platform admins)';
  end if;

  delete from public.roadmaps
  where id = p_roadmap_id;

  if not found then
    raise exception 'Roadmap not found';
  end if;
end;
$$;

revoke all on function public.delete_roadmap(uuid) from public;
grant execute on function public.delete_roadmap(uuid) to authenticated, service_role;

comment on function public.delete_roadmap(uuid) is
  'Permanently deletes a roadmap and all of its versions, stages, nodes, prerequisites and learner completions.';

-- ── set_roadmap_node_complete ────────────────────────────────────────────────
-- Server-authoritative, idempotent learner completion (decision #9). The
-- acting identity is auth.uid() — never a caller-supplied id — so completion
-- can't be spoofed as another user or self-granted. Fails unless the node
-- belongs to a currently-published roadmap AND its referenced content is
-- currently available (decisions #7/#8); the same guarantees the RLS insert
-- policy on roadmap_completions enforces independently.

create or replace function public.set_roadmap_node_complete(
  p_node_id uuid,
  p_completed boolean default true
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_published boolean;
begin
  if v_user_id is null then
    raise exception 'Authentication required to record roadmap completion';
  end if;
  if not exists (select 1 from public.roadmap_nodes rn where rn.id = p_node_id) then
    raise exception 'Roadmap node not found';
  end if;

  select exists (
    select 1
    from public.roadmap_nodes rn
    join public.roadmap_stages st on st.id = rn.stage_id
    join public.roadmaps rm on rm.id = st.roadmap_id
    where rn.id = p_node_id
      and rm.status = 'published'
  ) into v_published;
  if not v_published then
    raise exception 'Completion can only be recorded for nodes of a published roadmap';
  end if;

  if not public.is_roadmap_node_available(p_node_id) then
    raise exception 'Cannot complete a node whose content is currently unavailable';
  end if;

  if p_completed then
    insert into public.roadmap_completions (user_id, node_id)
    values (v_user_id, p_node_id)
    on conflict (user_id, node_id) do nothing;
  else
    delete from public.roadmap_completions
    where user_id = v_user_id and node_id = p_node_id;
  end if;
end;
$$;

revoke all on function public.set_roadmap_node_complete(uuid, boolean) from public;
grant execute on function public.set_roadmap_node_complete(uuid, boolean) to authenticated, service_role;

comment on function public.set_roadmap_node_complete(uuid, boolean) is
  'Records or clears the current learner''s completion (auth.uid()) for a node of a published roadmap whose content is currently available. Idempotent: re-marking a completed node is a no-op.';