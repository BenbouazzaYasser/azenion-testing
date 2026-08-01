-- Migration: 00010_teams_member_select
--
-- Adds a SELECT policy on public.teams so that members can read teams
-- they belong to, even when the team is private.
--
-- WHY
--   Current teams SELECT policies:
--     1. visibility = 'public'        — anyone can see public teams
--     2. owner_id = auth.uid()        — owners can see their own teams
--
--   There is no policy for regular members.  When a non-owner member
--   visits /teams/[slug] the query returns null → notFound().
--
--   The subquery references public.team_members whose SELECT policy is
--   just auth.role() = 'authenticated' (flat, no table ref), so there
--   is no risk of infinite recursion.

create policy "members can read their teams"
  on public.teams for select
  using (
    id in (
      select team_id from public.team_members
      where user_id = auth.uid()
    )
  );
