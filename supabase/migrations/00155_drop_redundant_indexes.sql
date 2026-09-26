-- Migration: 00155_drop_redundant_indexes
--
-- Drop 8 indexes that are strictly prefix-covered by another index on the same
-- table. Each pair verified from exact definitions across 00001, 00069, 00100,
-- 00135, 00146, 00149. The covering index starts with the same leading
-- columns, has no WHERE clause, and is non-unique where the dropped one is
-- non-unique (or unique covers non-unique).
--
-- Less write amplification, less disk, smaller planner search space.

-- activities: idx_activities_user_id (user_id) -> idx_activities_user_created (user_id, created_at desc)
drop index concurrently if exists public.idx_activities_user_id;

-- project_updates: idx_project_updates_project_id (project_id) -> idx_project_updates_project_created (project_id, created_at desc)
drop index concurrently if exists public.idx_project_updates_project_id;

-- team_updates: idx_team_updates_team_id (team_id) -> idx_team_updates_team_created (team_id, created_at desc)
drop index concurrently if exists public.idx_team_updates_team_id;

-- conversation_members: idx_conversation_members_user_id (user_id) -> idx_conversation_members_user_state (user_id, archived_at, deleted_at)
drop index concurrently if exists public.idx_conversation_members_user_id;

-- messages: idx_messages_conversation_id (conversation_id) -> idx_messages_conversation_created (conversation_id, created_at desc)
drop index concurrently if exists public.idx_messages_conversation_id;

-- channels: idx_channels_server_id (server_id) -> idx_channels_server_slug (server_id, slug) [unique]
drop index concurrently if exists public.idx_channels_server_id;

-- channel_messages: idx_channel_messages_channel_id (channel_id) -> idx_channel_messages_bucket (channel_id, created_at desc, id desc)
drop index concurrently if exists public.idx_channel_messages_channel_id;

-- channel_messages: idx_channel_messages_channel_created (channel_id, created_at) -> idx_channel_messages_bucket (channel_id, created_at desc, id desc)
drop index concurrently if exists public.idx_channel_messages_channel_created;