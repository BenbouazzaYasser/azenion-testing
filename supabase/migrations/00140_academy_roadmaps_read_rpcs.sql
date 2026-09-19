-- Migration: 00140_academy_roadmaps_read_rpcs.sql
-- Academy Roadmaps — part 3 of 3.
--
-- Read model for the Academy Roadmaps UI. Two single-call RPCs feed the
-- existing catalog boundary (lib/roadmaps/catalog.ts) so the frontend never
-- issues per-node or per-roadmap queries (no N+1; each page = one RPC):
--
--   * list_roadmap_summaries()      -> jsonb array of card-level summaries.
--   * get_roadmap_detail(p_slug)    -> single jsonb payload: header, published
--                                      version snapshot, per-node completion/
--                                      availability flags, and progress.
--
-- Published presentation always comes from the immutable roadmap_versions
-- snapshot (00138/00139 decision #4), never the live draft tables. Per-node
-- "available" uses is_roadmap_node_available() so content unpublished after
-- publish is surfaced to clients as unavailable (decision #8). Per-user
-- "completed"/progress uses auth.uid() so anonymous visitors see neutral
-- (null progress, no completions) and identity can never be spoofed.
--
-- Both functions are SECURITY INVOKER (default) on purpose: RLS remains the
-- root of truth. A caller must already be able to see published roadmaps,
-- their version snapshots and their own completions for the read to succeed.

-- ── list_roadmap_summaries ───────────────────────────────────────────────────
-- Returns the shape the roadmap index page renders on discovery cards:
--   [{"slug","title","description","level","published_at","version",
--     "estimated_hours","stage_count","node_count","course_count",
--     "lab_count","progress"}]
-- Counts/hours are derived from the published snapshot's JSONB structure
-- (stage/nodes arrays), and progress is required-only, matching
-- getRoadmapCompletion() in lib/roadmaps/types.ts. progress is null for
-- anonymous callers, 0 for a signed-in learner with nothing marked yet, and
-- null when a roadmap has no required nodes.

create or replace function public.list_roadmap_summaries()
returns jsonb
language sql
stable
as $$
  with published as (
    select rm.slug,
           rm.title,
           rm.description,
           rm.level,
           rm.published_at,
           v.version_number as version,
           case when jsonb_typeof(v.structure->'stages') = 'array'
                then v.structure
                else '{"stages": []}'::jsonb
           end as structure
    from public.roadmaps rm
    join public.roadmap_versions v on v.id = rm.published_version_id
    where rm.status = 'published'
  ),
  stats as (
    select p.slug,
           case when jsonb_typeof(p.structure->'stages') = 'array'
                then jsonb_array_length(p.structure->'stages')
                else 0
           end as stage_count,
           s.node_count,
           s.course_count,
           s.lab_count,
           s.est_minutes,
           s.required_count,
           s.required_done
    from published p
    cross join lateral (
      select count(*)                                    as node_count,
             count(*) filter (where nd->>'kind' = 'course')              as course_count,
             count(*) filter (where nd->>'kind' = 'lab')                 as lab_count,
             coalesce(sum(case when nd->>'estimated_minutes' ~ '^[0-9]+$'
                               then (nd->>'estimated_minutes')::integer end), 0) as est_minutes,
             count(*) filter (where not coalesce((nd->>'is_optional')::boolean, false)) as required_count,
             count(*) filter (
               where not coalesce((nd->>'is_optional')::boolean, false)
                 and exists (
                   select 1
                   from public.roadmap_completions rc
                   where rc.user_id = auth.uid()
                     and rc.node_id = (nd->>'id')::uuid
                 )
             ) as required_done
      from jsonb_array_elements(
             case when jsonb_typeof(p.structure->'stages') = 'array'
                  then p.structure->'stages'
                  else '[]'::jsonb
             end
           ) st
      cross join jsonb_array_elements(st->'nodes') nd
    ) s
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'slug', p.slug,
        'title', p.title,
        'description', p.description,
        'level', p.level,
        'published_at', p.published_at,
        'version', p.version,
        'estimated_hours',
          case when coalesce(s.est_minutes, 0) > 0
               then round(s.est_minutes::numeric / 60.0, 1)
               else null
          end,
        'stage_count', s.stage_count,
        'node_count', coalesce(s.node_count, 0),
        'course_count', coalesce(s.course_count, 0),
        'lab_count', coalesce(s.lab_count, 0),
        'progress',
          case
            when auth.uid() is null then null
            when coalesce(s.required_count, 0) = 0 then null
            else round(coalesce(s.required_done, 0)::numeric / s.required_count::numeric, 2)
          end
      )
      order by p.published_at desc, p.title asc
    ),
    '[]'::jsonb
  )
  from published p
  left join stats s on s.slug = p.slug;
$$;

revoke all on function public.list_roadmap_summaries() from public;
grant execute on function public.list_roadmap_summaries() to anon, authenticated, service_role;

comment on function public.list_roadmap_summaries() is
  'Single-call read model for the roadmaps index: card summaries for every published roadmap (counts/hours derived from the published snapshot), plus per-caller required-node progress (null for anonymous).';

-- ── get_roadmap_detail ───────────────────────────────────────────────────────
-- Returns null for unknown or unpublished slugs so callers can render the
-- not-found state. Payload shape:
--   {"slug","title","description","level","published_at","version",
--    "structure":   <published snapshot jsonb>                |
--    "node_flags":  {<node id>: {"completed": bool, "available": bool}},
--    "progress":    <0..1 or null>}
-- The catalog layer maps structure + node_flags into the UI model
-- (RoadmapNodeRef.status = derived from completed/available/prerequisites),
-- so all status derivation stays in one testable place.

create or replace function public.get_roadmap_detail(p_slug text)
returns jsonb
language plpgsql
stable
as $$
declare
  v_title text;
  v_description text;
  v_level text;
  v_published_at timestamptz;
  v_version integer;
  v_structure jsonb;
  v_flags jsonb;
  v_progress numeric;
  v_required_count integer;
  v_required_done integer;
begin
  select rm.title,
         rm.description,
         rm.level,
         rm.published_at,
         v.version_number,
         case when jsonb_typeof(v.structure->'stages') = 'array'
              then v.structure
              else '{"stages": []}'::jsonb
         end
  into v_title, v_description, v_level, v_published_at, v_version, v_structure
  from public.roadmaps rm
  join public.roadmap_versions v on v.id = rm.published_version_id
  where rm.slug = p_slug
    and rm.status = 'published';

  if not found then
    return null;
  end if;

  select coalesce(jsonb_object_agg(
    (nd->>'id'),
    jsonb_build_object(
      'completed', exists (
        select 1
        from public.roadmap_completions rc
        where rc.node_id = (nd->>'id')::uuid
          and rc.user_id = auth.uid()
      ),
      'available', public.is_roadmap_node_available((nd->>'id')::uuid)
    )
  ), '{}'::jsonb)
  into v_flags
  from jsonb_array_elements(v_structure->'stages') st
  cross join jsonb_array_elements(st->'nodes') nd;

  if auth.uid() is null then
    v_progress := null;
  else
    select count(*) filter (where not coalesce((nd->>'is_optional')::boolean, false)),
           count(*) filter (
             where not coalesce((nd->>'is_optional')::boolean, false)
               and exists (
                 select 1
                 from public.roadmap_completions rc
                 where rc.node_id = (nd->>'id')::uuid
                   and rc.user_id = auth.uid()
               )
           )
    into v_required_count, v_required_done
    from jsonb_array_elements(v_structure->'stages') st
    cross join jsonb_array_elements(st->'nodes') nd;

    if v_required_count = 0 then
      v_progress := null;
    else
      v_progress := round(v_required_done::numeric / v_required_count::numeric, 2);
    end if;
  end if;

  return jsonb_build_object(
    'slug', p_slug,
    'title', v_title,
    'description', v_description,
    'level', v_level,
    'published_at', v_published_at,
    'version', v_version,
    'structure', v_structure,
    'node_flags', v_flags,
    'progress', v_progress
  );
end;
$$;

revoke all on function public.get_roadmap_detail(text) from public;
grant execute on function public.get_roadmap_detail(text) to anon, authenticated, service_role;

comment on function public.get_roadmap_detail(text) is
  'Single-call read model for the roadmap detail page: header, published snapshot structure, per-node completed/available flags for the caller, and required-node progress. Returns null for unknown or unpublished slugs.';