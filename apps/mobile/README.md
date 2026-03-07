# Mobile MVP (`apps/mobile`)

Native mobile MVP for the multi-creator platform (HeroHero-style) built with Expo + React Native.

## Stack

- TypeScript
- React Native + Expo
- Expo Router
- Supabase Auth + Postgres (RLS-backed)
- TanStack Query
- Zod validation (via shared packages)
- Bunny Stream HLS playback with native video player (`expo-av`)
- Monorepo shared packages: `@madtv/shared`, `@madtv/api`, `@madtv/ui`

## Run locally

1. Install dependencies at monorepo root:

```bash
pnpm install
```

2. Create mobile env file:

```bash
cp apps/mobile/.env.example apps/mobile/.env
```

3. Start mobile app:

```bash
pnpm dev:mobile
```

4. Open with Expo Go / simulator (iOS or Android).

## Environment variables

`apps/mobile/.env`:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_APP_WEB_URL`
- `EXPO_PUBLIC_APP_SCHEME`
- `EXPO_PUBLIC_BUNNY_LIBRARY_ID` (optional)

Security notes:

- Do not expose Supabase service role key.
- Do not expose Stripe secret key.
- Do not expose Bunny API key.
- Mobile app only uses public env vars.

## Auth model

- Supabase client is initialized with `AsyncStorage` session persistence.
- `AuthProvider` bootstraps `supabase.auth.getSession()` on app launch.
- Auth state is synchronized via `onAuthStateChange`.
- Expired/invalid sessions resolve to signed-out state gracefully.
- Login, Signup, Forgot Password screens are under `app/(auth)/*`.

## Data and architecture

- `packages/api` centralizes typed data access (`createPlatformApi`).
- `apps/mobile/src/hooks/*` wraps API calls with TanStack Query.
- Access control relies on backend RLS and RPC functions; client checks are UX-only.
- Locked content is surfaced as teaser cards + paywall UI rather than hidden entirely.

## Bunny playback

- Native player: `expo-av` `Video` component.
- Stream URL pattern used:
  - `https://vz-{libraryId}.b-cdn.net/{videoId}/playlist.m3u8`
- Player features:
  - play/pause
  - seek ±10s
  - fullscreen
  - loading/error handling
  - resume from saved position

## Playback persistence

Migration added:

- `supabase/migrations/20260307121000_mobile_video_progress_and_post_preview.sql`

It includes:

- `video_progress` table
- `unique(user_id, post_id)`
- RLS policies (`auth.uid() = user_id` for CRUD)
- `mobile_post_detail_preview` RPC for post deep-link + teaser handling by post ID

## Deep linking

Supported paths:

- `myapp://creator/{slug}` -> `app/creator/[slug].tsx`
- `myapp://post/{id}` -> `app/post/[id].tsx`
- `https://app.example.com/c/{slug}` -> alias route `app/c/[slug].tsx`
- `https://app.example.com/c/{slug}/posts/{id}` -> alias route `app/c/[slug]/posts/[id].tsx`

Web checkout/billing opens via external browser:

- creator subscribe: `/c/{slug}` (+ optional tier query)
- manage billing: `/dashboard/viewer`

## Implemented MVP scope

- Splash/bootstrap and session restore
- Auth flows (sign in/up, forgot password)
- Home tab (featured creators, recent public posts, continue watching)
- Discover tab (search + browse creators + category placeholders)
- Creator screen with branding, tiers, post feed
- Post detail with gated handling + paywall panel
- Dedicated paywall screen
- Account screen (profile basics, subscription summary, sign out, web billing CTA)
- Lightweight analytics abstraction/events

## Deferred (intentional)

- Native in-app purchases (Apple/Google)
- Push notifications
- Chat/community threads
- Creator admin tooling beyond basic account-level viewer flows
- Offline download and advanced video QoS

## Acceptance test checklist

1. Sign up / sign in works.
2. Session restores after restart.
3. Featured creators load on Home.
4. Creator search works on Discover.
5. Creator page opens by slug.
6. Public post opens.
7. Subscribed user sees gated post content (RLS).
8. Unsubscribed user sees paywall + web checkout CTA.
9. Bunny video plays natively.
10. Playback progress saves and resumes.
11. Account supports sign out + web billing management.
