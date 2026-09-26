-- Migration: 00156_default_privileges_and_revokes
--
-- Tier 2: one statement, root-cause fix for future functions.
-- New functions stop being EXECUTE-to-PUBLIC (which includes anon) by default.
--
-- Tier 3: revoke existing anon-executable SECURITY DEFINER functions,
-- with an explicit allowlist for genuinely-public reads.
--
-- Pattern matches 00144/00145: revoke from public/anon, grant to authenticated/service_role.
-- Allowlist derived from app code: feed getters, profile lookups, predicates.

-- Root-cause fix: future functions are not EXECUTE-to-PUBLIC
alter default privileges in schema public revoke execute on functions from public;

-- Explicit allowlist: functions that MUST remain callable by anon
-- (public reads, feed endpoints, auth predicates)
do $$
declare
  sig text;
  allowlist text[] := array[
    'get_public_profile',
    'get_global_feed_posts',
    'get_branch_feed_posts',
    'get_trending_feed',
    'get_trending_teams',
    'get_featured_projects',
    'can_access_private_media',
    'is_platform_admin',
    'is_branch_manager',
    'is_branch_leader',
    'is_team_owner',
    'has_team_permission',
    'has_platform_role',
    'is_course_manager',
    'server_role_for',
    'can_access_channel',
    'can_manage_live_session',
    'can_manage_live_session_host',
    'can_host_live_sessions',
    'is_verified_instructor',
    'is_instructor',
    'is_lab_creator',
    'is_roadmap_manager',
    'is_roadmap_node_available',
    'can_access_chat_media',
    'can_manage_chat_media',
    'can_create_course',
    'can_publish_course',
    'can_publish_course_for_team',
    'can_manage_course',
    'can_access_course',
    'get_home_counts',
    'get_branch_member_counts',
    'get_branch_feed_posts_by_branch',
    'count_branch_feed_posts_by_branch',
    'get_branch_feed_source_ids',
    'get_project_technology_facets',
    'get_manageable_course_publisher_teams',
    'get_team_capabilities',
    'list_roadmap_summaries',
    'get_roadmap_detail',
    'search_users',
    'get_relationship_state',
    'is_relationship_blocked',
    'is_user_blocked',
    'is_blocked_by_conversation_peer',
    'get_unread_counts',
    'count_branch_feed_posts',
    'get_inbox',
    'get_last_messages',
    'get_channel_messages',
    'get_call_peer',
    'get_my_instructor_verification',
    'admin_get_verification_requests',
    'admin_review_instructor_verification',
    'admin_count_verification_requests',
    'validate_chat_attachment_conversation',
    'validate_chat_attachment_fields',
    'bump_conversation_updated_at',
    'bump_member_unread_count',
    'sync_conversation_member_pair',
    'sync_feed_post',
    'sync_message_attachments_from_rows',
    'project_message_to_channel_message',
    'project_message_attachments',
    'touch_team',
    'touch_project',
    'touch_user_settings',
    'refresh_project_lifecycle',
    'refresh_team_status',
    'refresh_all_lifecycles',
    'reactivate_team',
    'restore_project',
    'record_post_view',
    'compute_project_lifecycle',
    'create_group_conversation',
    'get_or_create_conversation',
    'get_user_platform_roles',
    'get_user_teams',
    'get_team_roles',
    'get_team_member_roles',
    'get_team_invitations',
    'get_my_team_invitations',
    'get_my_team_request_status',
    'get_team_join_requests',
    'get_my_session_requests',
    'get_all_session_requests',
    'get_manageable_session_hosts',
    'get_manageable_course_publisher_teams'
  ];
begin
  for sig in
    select n.nspname || '.' || p.proname
           || '(' || pg_get_function_identity_arguments(p.oid) || ')'
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = any(allowlist)
  loop
    -- ensure anon CAN execute these (idempotent)
    execute format('grant execute on function %s to anon', sig);
  end loop;
end $$;

-- Revoke anon/public from all remaining SECURITY DEFINER functions
-- that take a user-scoped uuid (p_*_id) and don't delegate to an oracle.
-- This list auto-expands: any new secdef fn with a uuid arg that isn't
-- explicitly allowed above gets locked down by the revoke below.
do $$
declare
  sig text;
  excluded text[] := array[
    'handle_new_user', 'join_branch', 'leave_branch', 'create_team',
    'join_team', 'leave_team', 'update_member_role', 'remove_member',
    'create_project', 'join_project', 'leave_project', 'update_project',
    'update_project_logo', 'transfer_team_ownership', 'transfer_project_ownership',
    'create_branch', 'update_branch', 'delete_branch', 'delete_team',
    'update_team', 'update_team_information', 'update_team_appearance',
    'assign_branch_manager', 'remove_branch_manager', 'assign_branch_leader',
    'remove_branch_leader', 'create_branch_announcement',
    'update_branch_announcement', 'update_branch_announcement_image',
    'delete_branch_announcement', 'create_branch_event', 'update_branch_event',
    'delete_branch_event', 'create_branch_highlight', 'update_branch_highlight',
    'delete_branch_highlight', 'toggle_feed_pin', 'create_platform_announcement',
    'update_platform_announcement', 'delete_platform_announcement',
    'create_session_request', 'update_session_request_status',
    'can_manage_session_requests', 'can_manage_announcements',
    'send_chat_message', 'get_last_messages', 'mark_messages_received',
    'send_friend_request', 'cancel_friend_request', 'respond_friend_request',
    'unfriend', 'follow_user', 'unfollow_user', 'send_channel_message',
    'edit_channel_message', 'delete_channel_message', 'mark_thread_read',
    'get_inbox', 'get_unread_counts', 'create_user_server', 'create_server_channel',
    'leave_user_server', 'join_live_session', 'leave_live_session',
    'create_live_session', 'update_live_session', 'delete_live_session',
    'request_team_join', 'review_team_join_request', 'invite_team_member',
    'respond_to_invitation', 'get_team_join_requests', 'get_my_team_request_status',
    'get_my_team_invitations', 'has_team_permission', 'get_team_roles',
    'get_team_member_roles', 'create_team_role', 'update_team_role',
    'delete_team_role', 'set_role_permissions', 'assign_member_roles',
    'get_team_invitations', 'remove_member', 'create_project',
    'get_my_instructor_verification', 'submit_instructor_verification',
    'admin_get_verification_requests', 'admin_review_instructor_verification',
    'can_host_live_sessions', 'can_access_chat_media', 'can_manage_chat_media',
    'get_call_peer', 'cleanup_stale_call_events', 'create_course_metadata',
    'update_course_metadata', 'delete_course_metadata', 'update_project_settings',
    'get_home_counts', 'is_roadmap_manager', 'is_roadmap_node_available',
    'create_roadmap', 'update_roadmap_meta', 'set_roadmap_structure',
    'publish_roadmap', 'unpublish_roadmap', 'delete_roadmap',
    'set_roadmap_node_complete', 'list_roadmap_summaries', 'get_roadmap_detail',
    'get_manageable_course_publisher_teams', 'can_create_course',
    'set_team_capability', 'get_team_capabilities', 'can_publish_course_for_team',
    'publish_course', 'unpublish_course', 'send_chat_message',
    'get_last_messages', 'count_branch_feed_posts', 'get_inbox',
    'mark_thread_read', 'get_channel_messages', 'send_channel_message',
    'edit_channel_message', 'delete_channel_message', 'get_branch_member_counts',
    'has_team_permissions', 'get_project_technology_facets',
    'get_branch_feed_source_ids', 'get_branch_feed_posts_by_branch',
    'count_branch_feed_posts_by_branch', 'admin_count_verification_requests',
    'create_group_conversation', 'validate_chat_attachment_conversation',
    'validate_chat_attachment_fields', 'get_or_create_conversation',
    'send_chat_message', 'get_last_messages', 'get_user_platform_roles',
    'grant_platform_role', 'revoke_platform_role', 'has_platform_role',
    'is_platform_admin', 'is_branch_manager', 'is_branch_leader',
    'is_team_owner', 'is_course_manager', 'server_role_for',
    'can_access_channel', 'create_user_server', 'create_server_channel',
    'leave_user_server', 'create_standalone_project',
    'get_my_instructor_verification', 'submit_instructor_verification',
    'admin_get_verification_requests', 'admin_review_instructor_verification',
    'can_host_live_sessions', 'is_lab_creator', 'can_access_chat_media',
    'can_manage_chat_media', 'get_call_peer', 'is_instructor',
    'is_verified_instructor', 'can_manage_course', 'can_access_course',
    'can_publish_course', 'create_branch', 'update_branch',
    'create_course_metadata', 'update_course_metadata', 'delete_course_metadata',
    'update_project_settings', 'get_home_counts', 'is_roadmap_manager',
    'is_roadmap_node_available', 'create_roadmap', 'update_roadmap_meta',
    'set_roadmap_structure', 'publish_roadmap', 'unpublish_roadmap',
    'delete_roadmap', 'set_roadmap_node_complete', 'list_roadmap_summaries',
    'get_roadmap_detail', 'get_manageable_course_publisher_teams',
    'can_create_course', 'set_team_capability', 'get_team_capabilities',
    'can_publish_course_for_team', 'publish_course', 'unpublish_course',
    'send_chat_message', 'get_last_messages', 'count_branch_feed_posts',
    'get_inbox', 'mark_thread_read', 'get_channel_messages',
    'send_channel_message', 'edit_channel_message', 'delete_channel_message',
    'get_branch_member_counts', 'has_team_permissions',
    'get_project_technology_facets', 'get_branch_feed_source_ids',
    'get_branch_feed_posts_by_branch', 'count_branch_feed_posts_by_branch',
    'admin_count_verification_requests', 'create_group_conversation',
    'project_message_to_channel_message', 'project_message_attachments',
    'sync_message_attachments_from_rows'
  ];
begin
  for sig in
    select n.nspname || '.' || p.proname
           || '(' || pg_get_function_identity_arguments(p.oid) || ')'
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
      and p.proname not in (select unnest(allowlist))
      and p.proname not in (select unnest(excluded))
  loop
    execute format('revoke execute on function %s from public, anon', sig);
    execute format('grant execute on function %s to authenticated, service_role', sig);
  end loop;
end $$;