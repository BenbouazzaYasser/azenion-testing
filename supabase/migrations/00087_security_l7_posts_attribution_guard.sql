-- Migration: 00087_security_l7_posts_attribution_guard
--
-- L7 (low, confirmed): post authors can retarget their own post to any
-- source (source_type / source_id) — a direct UPDATE on posts bypasses the
-- post-creation gates and the feed's source-authorization logic.
--
-- PROBLEM
--   The posts UPDATE policy ("users can update their own posts",
--   using (auth.uid() = author_id), no WITH CHECK) lets an author update
--   every column of their own row, including `source_type` and `source_id`.
--   An attacker could set source_type = 'team_update' with another team's
--   update id, or repoint the row to arbitrary content, so feed resolution
--   (and the update path in feed.actions) treats it as an entity post.
--
-- FIX
--   A BEFORE UPDATE trigger rejects any change to source_type / source_id
--   from non-service callers. Legitimate updates never touch those columns:
--     * the sync trigger (00032) updates posts only via ON CONFLICT DO UPDATE
--       on title / body / images / is_pinned / updated_at;
--     * the app's updateFeedPost edits only title / body / updated_at.
--   Migrations and the admin client run as service_role / supabase_admin and
--   are unaffected.

create or replace function public.prevent_post_attribution_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if coalesce(auth.role(), '') not in ('service_role', 'supabase_admin')
     and (
       new.source_type is distinct from old.source_type
       or new.source_id is distinct from old.source_id
     ) then
    raise exception 'Cannot change a post''s source attribution';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_posts_prevent_attribution_change on public.posts;
create trigger trg_posts_prevent_attribution_change
  before update on public.posts
  for each row execute function public.prevent_post_attribution_change();