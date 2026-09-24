# Azenion Mobile

Expo + React Native client for the Azenion Supabase backend. Email/password
auth only (SecureStore sessions). No service-role keys or server secrets may
ever enter this directory.

## Run it tonight (Expo Go)

1. `cd mobile && npm install`
2. Copy `.env.example` to `.env` (public anon key only — never service-role).
3. `npx expo start`, then scan the QR code with Expo Go (iOS/Android) or
   press `w` for the web preview.
4. Sign up with an email + password, or sign in with an existing account.

The app talks to Supabase Auth directly and to the Next.js Phase 0C
boundaries (`/api/feed`, `/api/auth/hydrate`, `/api/chat/media/sign`)
via `EXPO_PUBLIC_API_BASE_URL`.

## Scripts

- `npm start` — Metro dev server
- `npm run typecheck` — `tsc --noEmit`
- `npm test` — Jest (API bearer helper)
- `npx expo export --platform ios|android` — bundle validation

## Security rules

- `expo-secure-store` only for sessions. Never AsyncStorage for tokens.
- Bearer helper (`lib/api.ts`): one refresh + one retry on 401, then sign out.
- Never log tokens, headers, or signed URLs. Never decode JWTs manually.
- Username login, OAuth, push delivery, and calling are out of scope for v1.
