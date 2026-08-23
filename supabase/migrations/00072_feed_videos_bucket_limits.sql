-- Migration: 00072_feed_videos_bucket_limits
--
-- Adds defense-in-depth limits to the `feed-videos` storage bucket:
--
--   * allowed_mime_types — only the video MIME types the application already
--     accepts (see lib/validations/media.schema.ts ALLOWED_VIDEO_TYPES).
--   * file_size_limit    — 50 MB, matching MAX_VIDEO_SIZE.
--
-- These are enforced by the storage service *in addition to* the existing
-- server-action validation in actions/feed.actions.ts, so a client can no
-- longer write oversized or wrong-typed objects directly even if it bypasses
-- the application. The existing Storage RLS policies on `feed-videos`
-- (public read + owner-only write) are left completely untouched.

update storage.buckets
set
  allowed_mime_types = array['video/mp4', 'video/webm', 'video/quicktime']::text[],
  file_size_limit = 52428800
where id = 'feed-videos';