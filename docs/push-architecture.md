# Push Notification Architecture (future — design only)

No push code, table, or provider integration ships in Phase 0C. This document
records the agreed boundary so later phases build on it.

## 1. Decision

Expo Notifications + EAS for transport, with a Supabase Edge Function as the
server-side sender (triggered off notification-row inserts). Raw FCM/APNs
integration is rejected for ordinary notifications; direct APNs work is
reserved for the VoIP incoming-call question below.

## 2. Device registration (additive, future migration)

- A future `public.device_push_tokens` table is the registry:
  `(user_id, platform, expo_push_token unique, device_id, app_version,
  locale, created_at, updated_at, revoked_at)`.
- RLS: owner-only read/write (`auth.uid() = user_id`); revocation is a
  `revoked_at` timestamp, not a delete. Service role has full access for the
  sender.
- Token registration **never accepts an arbitrary user ID as the authority**:
  `user_id` is always forced to the validated bearer principal
  (`auth.uid()`), exactly like every other Phase 0 boundary.
- Token uniqueness is enforced at the DB level; re-registration moves
  ownership and bumps `updated_at`. Server-side invalidation runs on
  `DeviceNotRegistered` receipts; client-side revocation runs on logout and
  on refresh-failure re-login.

## 3. Fan-out stays server-side

- `public.notifications` rows remain the source of truth. All existing
  insertion/fan-out (`lib/notifications.ts`, service-role) stays
  server-only; authenticated clients are never granted notification INSERT.
- The Edge Function (service role) tails inserts, re-checks
  `user_settings.notifications` preferences, loads active tokens for the
  recipient, and sends via the Expo Push API. Provider credentials live in
  server/EAS environment — never in Postgres, never on device.
- Push is a **delivery mechanism, not the authorization mechanism**:
  receiving a push grants nothing; opening the app still resolves content
  through RLS/RPC/bearer boundaries.

## 4. Payloads and behavior

- Per-category payloads (feed interaction, reply, mention, team/project,
  branch, academy, chat message, incoming call) carry
  `{ type, targetType, targetId, href/deepLink }` resolved with the existing
  server-side target logic; badge counts come from the unread count.
- Foreground / background / terminated handling and permission prompts are
  mobile-phase work (`expo-notifications`, `expo-device`).

## 5. VoIP incoming-call push (separate future concern)

- Waking a terminated app for an incoming call may require platform VoIP
  pushes (APNs VoIP / FCM high-priority with CallKit / ConnectionService),
  which Expo Push does not deliver. That decision — and any direct APNs
  integration — is explicitly deferred to the mobile calling phase and must
  not block ordinary notification push.
