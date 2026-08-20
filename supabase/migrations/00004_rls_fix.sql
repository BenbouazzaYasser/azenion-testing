-- Fix table-level permissions and RLS policies.
--
-- PROBLEM
--   The previous migrations created tables, enabled RLS, and defined policies,
--   but never GRANTed table-level access to any PostgreSQL role. In Supabase,
--   PostgREST uses SET ROLE to switch to the role from the JWT claim before
--   executing queries:
--
--     Unauthenticated requests  → role = `anon`
--     Authenticated requests    → role = `authenticated`
--     Service/admin requests    → role = `service_role`
--
--   The role must have explicit table privileges (SELECT, INSERT, UPDATE, etc.)
--   for the query to reach the table at all. RLS policies are only evaluated
--   AFTER the role can access the table. Without GRANTs, every API call gets:
--     permission denied for table <name>
--
--   The previous SELECT policies also used `using (true)` (publicly readable),
--   which is overly permissive. The new policies restrict each table to the
--   authenticated user's own data via auth.uid().
--
-- FIX
--   1. GRANT table-level privileges to `anon`, `authenticated`, and
--      `service_role` (so queries reach the RLS gate).
--   2. Lock SELECT policies to auth.uid() for profiles, activities, and
--      branch_members. Branches remain publicly readable (branch info is
--      public by design).
--   3. Add a policy so the self-healing INSERT in the profile page works
--      (users can insert their own profile row if it does not exist).

-- ── Table-level privileges ────────────────────────────────────────────────
-- Without these, PostgREST rejects every query with "permission denied"
-- before RLS policies are ever consulted.

grant select, insert, update on public.profiles       to anon, authenticated, service_role;
grant select on public.activities                      to anon, authenticated, service_role;
grant select on public.branches                        to anon, authenticated, service_role;
grant select on public.branch_members                  to anon, authenticated, service_role;

-- ── Profiles ─────────────────────────────────────────────────────────────

drop policy if exists "profiles are publicly readable" on public.profiles;
drop policy if exists "users can insert own profile" on public.profiles;
drop policy if exists "users update own profile" on public.profiles;

create policy "users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- ── Activities ───────────────────────────────────────────────────────────

drop policy if exists "activities are publicly readable" on public.activities;

create policy "users can read own activities"
  on public.activities for select
  using (auth.uid() = user_id);

-- ── Branches ─────────────────────────────────────────────────────────────
-- Branch info (name, description, city) is intentionally public — anyone
-- should be able to browse available branches.

-- Re-assert the public read policy for clarity.
drop policy if exists "branches are publicly readable" on public.branches;

create policy "branches are publicly readable"
  on public.branches for select
  using (true);

-- ── Branch members ───────────────────────────────────────────────────────

drop policy if exists "branch members are publicly readable" on public.branch_members;

create policy "users can read own branch membership"
  on public.branch_members for select
  using (auth.uid() = user_id);
