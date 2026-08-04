-- Migration: 00050_posts_rls_policies
--
-- Restores the RLS policies on public.posts that migration 00032 declared but
-- which are absent from the remote database. RLS is enabled on the table with
-- zero policies, so Postgres denies every access for non-superuser roles.
-- Admin/service-role clients bypass RLS, which is why feeds still rendered,
-- but user-scoped server actions that read posts (e.g. toggleTeamFeedPin's
-- post lookup) silently received no rows and failed. Recreating the same
-- policies restores the originally intended access rules.

drop policy if exists "anyone can read posts" on public.posts;
create policy "anyone can read posts"
  on public.posts for select
  using (true);

drop policy if exists "users can create posts" on public.posts;
create policy "users can create posts"
  on public.posts for insert
  with check (auth.uid() = author_id or auth.role() = 'service_role');

drop policy if exists "users can update their own posts" on public.posts;
create policy "users can update their own posts"
  on public.posts for update
  using (auth.uid() = author_id);

drop policy if exists "users can delete their own posts" on public.posts;
create policy "users can delete their own posts"
  on public.posts for delete
  using (auth.uid() = author_id);
