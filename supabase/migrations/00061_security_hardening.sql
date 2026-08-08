-- Migration: 00061_security_hardening
--
-- Red-team findings (post-launch authorization pass) and their fixes:
--
--   C1 : Feed RPCs (`get_global_feed_posts`, `get_branch_feed_posts`,
--        `get_trending_feed`) accept a client-supplied `p_viewer` and pass it
--        straight into `is_feed_post_visible`, which is SECURITY DEFINER.
--        A caller (even anonymous) can therefore pass a victim's user id and
--        read private team/project posts. Verified live.
--        -> Pin the effective viewer to the authenticated caller: only
--           service_role / supabase_admin may override with `p_user_id`.
--
--   C2 : Direct INSERT on `update_likes` / `update_comments` /
--        `comment_likes` / `saved_posts` has no visibility check, so an
--        unrelated user can like / comment / save private content (rows
--        commit even though RLS SELECT denies them). Verified live.
--        -> Require the target to be visible to the inserting user.
--
--   C3 : The `notifications` INSERT policy allows any authenticated user to
--        write a notification into any other user's inbox (verified live).
--        -> Route notification creation through the service role only.
--
--   C4 : Authenticated users could INSERT arbitrary `posts` rows with fake
--        source_type/source_id, spoofing real team/project feed items.
--        -> Restrict direct posts INSERT to `user_post` for authenticated.

-- ── 1. C1: pin feed visibility to the authenticated caller ──────────────

create or replace function public.is_feed_post_visible(
  p_source_type text,
  p_source_id uuid,
  p_user_id uuid default null
)
returns boolean
language plpgsql
security definer set search_path = public
stable
as $$
declare
  v_uid uuid := case
    when coalesce(auth.role(), '') in ('service_role', 'supabase_admin')
      then coalesce(p_user_id, auth.uid())
    else auth.uid()
  end;
begin
  if p_source_type = 'team_update' then
    return exists (
      select 1
      from public.team_updates tu
      join public.teams t on t.id = tu.team_id
      where tu.id = p_source_id
        and (
          t.visibility = 'public'
          or exists (
            select 1 from public.team_members tm
            where tm.team_id = t.id and tm.user_id = v_uid
          )
        )
    );
  elsif p_source_type = 'project_update' then
    return exists (
      select 1
      from public.project_updates pu
      join public.projects p on p.id = pu.project_id
      where pu.id = p_source_id
        and (
          p.visibility in ('public', 'open')
          or exists (
            select 1 from public.project_members pm
            where pm.project_id = p.id and pm.user_id = v_uid
          )
        )
    );
  else
    -- branch_announcements, branch_highlights, branch_events, user_post, etc.
    return true;
  end if;
end;
$$;

-- ── 2. C2: gate interaction INSERTs by target visibility ────────────────

drop policy if exists "authenticated users can like" on public.update_likes;
create policy "authenticated users can like"
  on public.update_likes for insert
  with check (
    auth.uid() = user_id
    and public.is_feed_post_visible(target_type, target_id)
  );

drop policy if exists "authenticated users can comment" on public.update_comments;
create policy "authenticated users can comment"
  on public.update_comments for insert
  with check (
    auth.uid() = user_id
    and public.is_feed_post_visible(target_type, target_id)
  );

drop policy if exists "authenticated users can like comments" on public.comment_likes;
create policy "authenticated users can like comments"
  on public.comment_likes for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.update_comments c
      where c.id = comment_likes.comment_id
        and public.is_feed_post_visible(c.target_type, c.target_id)
    )
  );

drop policy if exists "users can save posts" on public.saved_posts;
create policy "users can save posts"
  on public.saved_posts for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.posts p
      where p.id = saved_posts.post_id
        and public.is_feed_post_visible(p.source_type, p.source_id)
    )
  );

-- ── 3. C3: notifications are created via the service role only ───────────
-- The app's notification creation (lib/notifications.ts) uses a service-role
-- client, so revoking direct client INSERT closes the inbox-spam vector.

drop policy if exists "system can insert notifications" on public.notifications;
revoke insert on public.notifications from anon, authenticated;

-- ── 4. C4: restrict direct posts INSERT to standalone user posts ─────────

drop policy if exists "users can create posts" on public.posts;
create policy "users can create posts"
  on public.posts for insert
  with check (
    (
      auth.uid() = author_id
      and source_type = 'user_post'
    )
    or auth.role() = 'service_role'
  );
