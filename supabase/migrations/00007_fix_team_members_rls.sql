-- Migration: 00007_fix_team_members_rls
--
-- Removes recursive RLS policies on public.team_members that cause:
--   "infinite recursion detected in policy for relation team_members"
--
-- PROBLEM
--   The previous version of 00005_teams.sql created RLS policies on
--   public.team_members that performed EXISTS subqueries on the same
--   table (team_members), causing infinite recursion:
--
--     CREATE POLICY "members can see team members"
--       ON public.team_members FOR SELECT
--       USING (EXISTS (SELECT 1 FROM public.team_members WHERE ...));
--
--     CREATE POLICY "owner can delete members"
--       ON public.team_members FOR DELETE
--       USING (EXISTS (SELECT 1 FROM public.team_members WHERE ...));
--
--     CREATE POLICY "owner can manage members"
--       ON public.team_members FOR INSERT
--       WITH CHECK (EXISTS (SELECT 1 FROM public.team_members WHERE ...));
--
-- FIX
--   Drop every recursive policy on team_members.
--   Replace with a single non-recursive SELECT policy.
--   Remove all INSERT/UPDATE/DELETE policies — mutations go through
--   SECURITY DEFINER RPCs (create_team, join_team, leave_team) which
--   bypass RLS and perform their own authorization.
--
-- RLS DESIGN (after this migration)
--   team_members:
--     SELECT — auth.role() = 'authenticated'  (simple, no table ref)
--     INSERT — no policy (blocked; use RPCs)
--     UPDATE — no policy (blocked; use RPCs)
--     DELETE — no policy (blocked; use RPCs)
--
--   teams:
--     SELECT — visibility = 'public'  (simple)
--     SELECT — owner_id = auth.uid()  (simple)
--     INSERT — auth.uid() = owner_id  (simple)
--     UPDATE — auth.uid() = owner_id  (simple)
--     DELETE — auth.uid() = owner_id  (simple)

-- ── 1. Drop the recursive policies from the old 00005_teams.sql ─────────────

drop policy if exists "members can see team members" on public.team_members;
drop policy if exists "owner can delete members" on public.team_members;
drop policy if exists "owner can manage members" on public.team_members;

-- ── 2. Drop old helper function if it exists ──────────────────────────────

drop function if exists public.is_team_member(uuid, uuid);

-- ── 3. Create non-recursive SELECT policy ──────────────────────────────────

drop policy if exists "authenticated users can read team members" on public.team_members;
create policy "authenticated users can read team members"
  on public.team_members for select
  using (auth.role() = 'authenticated');

-- ── 4. No INSERT/UPDATE/DELETE policies ────────────────────────────────────
--
-- All membership mutations are handled by SECURITY DEFINER RPCs:
--
--   create_team
--     Inserts the team row and an 'owner' row into team_members.
--     Validates slug uniqueness via DB constraint (unique index).
--
--   join_team
--     Checks the user is not already a member.
--     Inserts a 'member' row into team_members.
--     Logs a joined_team activity.
--
--   leave_team
--     Checks the user is a member.
--     Prevents the last owner from leaving.
--     Deletes the row from team_members.
--     Logs a left_team activity.
--
-- Direct INSERT/UPDATE/DELETE on team_members via the Supabase API
-- is rejected because no policies grant those operations.
