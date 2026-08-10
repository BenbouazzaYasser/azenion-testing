-- 00064: Grant activities write privileges
--
-- 00063 added RLS policies, but the `authenticated` role still lacked the
-- underlying table privileges (only SELECT was granted in 00004). Without the
-- grants, client-side activity inserts/deletes fail with
-- "permission denied for table activities" before RLS is even evaluated.

grant insert, update, delete on public.activities to authenticated;
