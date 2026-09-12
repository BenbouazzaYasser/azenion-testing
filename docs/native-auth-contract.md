# Native Auth Contract (v1) — Backend Boundary

Status: agreed for native v1. The mobile app does not exist yet; this document
is the backend-facing contract that Phase 0 implements against.

## 1. Email/password is the v1 login

- Native v1 authenticates with **email + password directly through Supabase
  Auth** using the public anon client (`@supabase/supabase-js` with
  `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
- No app server participates in password verification. The flow is
  `supabase.auth.signInWithPassword({ email, password })` inside the mobile
  app, exactly as the web client does against the same Supabase project.
- **Username login is explicitly deferred from native v1.** There is no
  username-lookup RPC, endpoint, CAPTCHA flow, or enumeration protection in
  this phase. The existing web-only `get_login_email_by_username` RPC stays
  service-role-only and unchanged.

## 2. Session storage (mobile-side, future)

- Native sessions (`access_token`, `refresh_token`, `user`) are persisted in
  **SecureStore / Keychain (iOS) / Keystore (Android)** — never in plain
  AsyncStorage.
- Supabase client in the app runs with `persistSession` wired to the secure
  store and token auto-refresh enabled.

## 3. Calling protected Next.js boundaries

- Every protected route requires:
  `Authorization: Bearer <access_token>`
- The single server-side primitive is `lib/supabase/bearer.ts`
  (`authenticateBearer`). It validates the token via Supabase Auth
  (`auth.getUser(token)`), then serves the request with a user-JWT client so
  RLS and `auth.uid()` resolve to the caller.
- Rules for all token routes: 401 = missing/invalid auth, 403 =
  authenticated but unauthorized; no user IDs accepted for authorization
  decisions; no service-role client in client-callable code; no token
  logging; `Cache-Control: private, no-store` on user-scoped responses.
- **Service-role credentials never enter native code** (not bundled, not
  fetched, not proxied).

## 4. Expiry handling (mobile-side, future)

- Access-token expiry is handled by the native client: on 401, **refresh
  once, retry the request once, then force re-login** (single-flight refresh
  to avoid stampedes).
- `POST /api/auth/*` session helpers do not exist; refresh goes directly to
  Supabase Auth (`supabase.auth.refreshSession`).

## 5. Post-login hydration

- After login the app calls `GET /api/auth/hydrate` (bearer only) for one
  authoritative snapshot: `{ user, roles, isPlatformAdmin, isCourseManager,
  labs: { isPlatformAdmin, canCreateLab }, branchLeadership }`.
- All fields are derived from canonical DB oracles/tables
  (`has_platform_role` sources, `is_course_manager()`, labs auth context,
  `branch_leaders`). The app caches the snapshot for the session and
  revalidates on 403.

## 6. OAuth (future, not implemented)

- Web Google OAuth is unchanged: browser PKCE flow with
  `https://azenion.com/auth/callback` (`app/auth/callback/route.ts`).
- Future native OAuth uses Supabase OAuth + in-app PKCE/deep-link handling
  with redirect `azenion://auth/callback`; the session is established inside
  the mobile app. No dashboard changes are made from this repository and
  `NEXT_PUBLIC_SITE_URL` is unchanged.
- Apple Sign-In is not implemented in this phase.

## 7. What web keeps

- Web cookie authentication (`@supabase/ssr`, middleware session refresh,
  Server Actions) is **unchanged**. Bearer and cookie paths coexist: web
  uses cookies, native uses bearer tokens, both resolve to the same
  `auth.uid()`-based authorization.
