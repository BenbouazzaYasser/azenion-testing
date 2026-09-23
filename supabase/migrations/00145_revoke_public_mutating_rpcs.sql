-- Migration: 00145_revoke_public_mutating_rpcs
--
-- Completes 00144's anon revoke (audit critical #3). Postgres grants EXECUTE
-- to PUBLIC on every function by default, so revoking only `from anon` left
-- anonymous PostgREST callers able to invoke these through PUBLIC. Revoke
-- PUBLIC (and anon, belt-and-suspenders) and re-assert the legitimate callers.
-- Covers the audit's mutating-RPC list plus 00143's three chat functions,
-- whose anon-only revoke was ineffective for the same PUBLIC reason.
--
-- authenticated/service_role already hold explicit grants on all of these
-- (their original `to anon, authenticated, service_role` grants); the loop
-- re-grants them so a missing historical grant can't strand a caller.

do $$
declare sig text;
begin
  for sig in
    select n.nspname || '.' || p.proname
           || '(' || pg_get_function_identity_arguments(p.oid) || ')'
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'delete_project', 'delete_team', 'create_branch', 'update_branch',
        'delete_branch', 'update_team', 'assign_branch_leader',
        'remove_branch_leader', 'assign_branch_manager', 'remove_branch_manager',
        'create_branch_announcement', 'update_branch_announcement',
        'update_branch_announcement_image', 'delete_branch_announcement',
        'create_branch_event', 'update_branch_event', 'delete_branch_event',
        'create_branch_highlight', 'update_branch_highlight', 'delete_branch_highlight',
        'send_chat_message', 'get_last_messages', 'is_allowed_gif_host'
      )
  loop
    execute format('grant execute on function %s to authenticated, service_role', sig);
    execute format('revoke execute on function %s from public, anon', sig);
  end loop;
end $$;

-- ── End of migration ────────────────────────────────────────────────────────
