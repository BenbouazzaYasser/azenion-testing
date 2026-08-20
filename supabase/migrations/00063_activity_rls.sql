-- 00063: Activities RLS write policies
--
-- Client-side actions (createTeamUpdate, createProjectUpdate, deleteTeamUpdate)
-- insert/delete their own activity rows, but only SELECT policies existed, so
-- every client-side write was silently denied (e.g. created_team_update /
-- created_project_update never reached the profile timeline). RPC inserts are
-- security definer and unaffected.

create policy "users can insert their own activities"
  on public.activities for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users can delete their own activities"
  on public.activities for delete
  to authenticated
  using (auth.uid() = user_id);
