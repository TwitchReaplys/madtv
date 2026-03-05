# MadTV Monorepo

Multi-creator subscription platform MVP (HeroHero-like), now extended with:
- modern mobile-first UI (Tailwind + Radix-style components)
- dark mode (system + manual toggle)
- creator microsites with theme accent + locked post teasers
- audience-first public IA (`/`, `/explore`, `/for-creators`)
- post comments gated by active membership or creator admin
- featured media block on creator pages (intro Bunny video modal / featured image)
- split Viewer vs Creator portals + role switcher in dashboard
- analytics events API + daily aggregate worker jobs
- platform admin panel (`/admin/*`) with worker heartbeat status
- Redis queue + BullMQ worker for Stripe event processing

## Monorepo structure

- `apps/web` - Next.js App Router app
- `apps/worker` - BullMQ background worker
- `packages/shared` - shared Zod schemas + queue constants
- `supabase/migrations` - SQL schema, RLS, helper functions

## Implemented add-ons

### UI / design system

`apps/web/components/ui/*`:
- `button.tsx`
- `card.tsx`
- `badge.tsx`
- `tabs.tsx`
- `dialog.tsx`
- `input.tsx`
- `textarea.tsx`
- `dropdown.tsx`
- `skeleton.tsx`

`apps/web/components/marketing/*`:
- `hero.tsx`
- `feature-grid.tsx`
- `pricing-cards.tsx`
- `faq.tsx`

`apps/web/components/creator/*`:
- `creator-header.tsx`
- `tier-cards.tsx`
- `post-card.tsx`
- `locked-post-card.tsx`
- `subscribe-cta.tsx`
- `paywall-panel.tsx`

Dark mode:
- `components/theme-provider.tsx`
- `components/theme-toggle.tsx`

### Public creator pages

- `/` (audience-first landing)
- `/explore` (public creator directory)
- `/for-creators` (creator acquisition page)

- `/c/[slug]`:
  - cover/avatar/title/tagline/bio/social links
  - featured media block:
    - intro Bunny preview card (thumbnail fallback chain)
    - modal iframe load only after click
    - featured image fallback mode
  - tier cards near top
  - locked teasers for gated posts
  - sticky mobile subscribe CTA for non-members
  - creator accent color via CSS variable `--accent`

- `/c/[slug]/posts/[id]`:
  - full content for authorized users
  - paywall panel for unauthorized users with subscribe CTA
  - comments section (labelled `Komentáře k videu` when a Bunny video is attached)
  - comment write gate: active subscriber (rank >= 1) or creator admin

### Portals and admin

- Viewer portal:
  - `/dashboard/viewer`
  - `/dashboard/viewer/explore`
  - `/dashboard/viewer/subscriptions`
  - `/dashboard/viewer/profile`
  - `/dashboard/viewer/billing`

- Creator portal:
  - `/dashboard/creator`
  - `/dashboard/creator/[creatorId]/profile`
  - `/dashboard/creator/[creatorId]/tiers`
  - `/dashboard/creator/[creatorId]/posts`
  - `/dashboard/creator/[creatorId]/videos`
  - `/dashboard/creator/[creatorId]/subscribers`
  - `/dashboard/creator/[creatorId]/analytics`
  - `/dashboard/creator/[creatorId]/settings`

- Admin panel:
  - `/admin`
  - `/admin/settings`
  - `/admin/users`
  - `/admin/creators`
  - `/admin/services`

SEO:
- dynamic metadata via `generateMetadata` on creator and post routes

### Worker + queue architecture

- Redis-backed queue via BullMQ
- Webhook route `POST /api/stripe/webhook` is thin:
  1. verify Stripe signature
  2. persist event in `stripe_events` (idempotency)
  3. enqueue `stripe:event` job
  4. return `200` quickly

Worker (`apps/worker`) processes jobs:
- `stripe:event`
- `bunny:sync` (stub)
- `email:send` (stub)

Retry strategy:
- attempts: `8`
- exponential backoff starting at `5s`

## Database changes

Base migration:
- `supabase/migrations/20260304213000_init.sql`

Add-on migration:
- `supabase/migrations/20260305110000_creator_theme_and_previews.sql`
- `supabase/migrations/20260305130000_explore_and_comments.sql`
- `supabase/migrations/20260305170000_portals_analytics_admin.sql`
- `supabase/migrations/20260305203000_creator_onboarding_stripe_connect.sql`
- `supabase/migrations/20260305213000_fix_creator_status_visibility.sql`
- `supabase/migrations/20260305224500_creator_fee_percent.sql`

Added fields:
- `creators.accent_color`
- `creators.cover_image_url`
- `creators.avatar_url`
- `creators.seo_description`
- `creators.tagline`
- `creators.social_links`
- `creators.status`
- `creators.is_featured`
- `creators.featured_media_type`
- `creators.featured_video_id`
- `creators.featured_thumbnail_url`
- `creators.featured_image_url`
- `creators.onboarding_status`
- `creators.onboarding_submitted_at`
- `creators.onboarding_email_verified_at`
- `creators.legal_full_name`
- `creators.legal_business_id`
- `creators.contact_email`
- `creators.contact_phone`
- `creators.address_line1`
- `creators.address_line2`
- `creators.address_city`
- `creators.address_postal_code`
- `creators.address_country`
- `creators.content_focus`
- `creators.stripe_connect_account_id`
- `creators.stripe_connect_charges_enabled`
- `creators.stripe_connect_payouts_enabled`
- `creators.stripe_connect_details_submitted`
- `creators.platform_fee_percent` (default `10`, editable per creator by platform admin)
- `post_assets.meta`
- `post_assets.creator_video_id`

Added view:
- `creator_explore` (public list view with creator data + starting price)

New tables:
- `creator_videos`
- `analytics_events`
- `analytics_daily_creator`
- `platform_admins`
- `platform_settings`
- `service_status`

Added SQL functions for safe public previews:
- `creator_post_previews(p_creator_id uuid)`
- `creator_post_detail_preview(p_creator_slug text, p_post_id uuid)`

These functions expose teaser data while full content remains RLS-protected.

## Environment variables

Web env template:
- `apps/web/.env.example`
  - optional: `NEXT_PUBLIC_SUPABASE_COOKIE_SECURE=true|false`
    - leave empty to auto-detect from `NEXT_PUBLIC_APP_URL` / request protocol
    - set `false` only if you run app over plain HTTP
  - optional: `STRIPE_CONNECT_REFRESH_URL` and `STRIPE_CONNECT_RETURN_URL`
    - can include `{creatorId}` placeholder

Worker env template:
- `apps/worker/.env.example`

## Local development

Install:

```bash
pnpm install
```

Apply migrations (example):

```bash
psql "$SUPABASE_DB_URL" -f supabase/migrations/20260304213000_init.sql
psql "$SUPABASE_DB_URL" -f supabase/migrations/20260305110000_creator_theme_and_previews.sql
psql "$SUPABASE_DB_URL" -f supabase/migrations/20260305130000_explore_and_comments.sql
psql "$SUPABASE_DB_URL" -f supabase/migrations/20260305170000_portals_analytics_admin.sql
psql "$SUPABASE_DB_URL" -f supabase/migrations/20260305203000_creator_onboarding_stripe_connect.sql
psql "$SUPABASE_DB_URL" -f supabase/migrations/20260305213000_fix_creator_status_visibility.sql
psql "$SUPABASE_DB_URL" -f supabase/migrations/20260305224500_creator_fee_percent.sql
```

Run web:

```bash
pnpm dev:web
```

Run worker:

```bash
pnpm dev:worker
```

## Build & typecheck

```bash
pnpm lint
pnpm typecheck
pnpm build:web
pnpm build:worker
```

## Docker / Coolify

Web Dockerfile:
- `apps/web/Dockerfile`

Worker Dockerfile:
- `apps/worker/Dockerfile`

Compose example:
- `docker-compose.example.yml`

Health endpoint:
- `/api/health`

## Manual acceptance checks (UI + flow)

1. Landing page is audience-first and top nav has `Explore`, `Jak to funguje`, `Pro tvůrce`, `Přihlásit se/Účet`.
2. `/explore` lists creators with avatar, tagline, starting price and social icons.
3. Creator page supports dark mode and shows tier cards + locked previews + sticky mobile subscribe CTA.
4. Creator featured media works (intro video modal or featured image).
5. Unauthorized post detail shows paywall panel.
6. Authorized member sees full gated content + Bunny video.
7. Comments are readable only when post is viewable and writable only by active subscribers/admins.
8. `/dashboard` auto-redirects to creator or viewer portal by role.
9. `/api/analytics` stores events and worker fills `analytics_daily_creator`.
10. Admin pages show settings/users/creators and worker heartbeat status.
11. Stripe webhook stores event and enqueues job; worker processes `stripe:event` and updates `subscriptions`.
