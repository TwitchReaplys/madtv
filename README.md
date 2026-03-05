# MadTV Monorepo

Multi-creator subscription platform MVP (HeroHero-like), now extended with:
- modern mobile-first UI (Tailwind + Radix-style components)
- dark mode (system + manual toggle)
- creator microsites with theme accent + locked post teasers
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

- `/c/[slug]`:
  - cover/avatar/title/bio
  - tier cards near top
  - locked teasers for gated posts
  - sticky mobile subscribe CTA for non-members
  - creator accent color via CSS variable `--accent`

- `/c/[slug]/posts/[id]`:
  - full content for authorized users
  - paywall panel for unauthorized users with subscribe CTA

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

Added fields:
- `creators.accent_color`
- `creators.cover_image_url`
- `creators.avatar_url`
- `creators.seo_description`
- `creators.links`
- `post_assets.meta`

Added SQL functions for safe public previews:
- `creator_post_previews(p_creator_id uuid)`
- `creator_post_detail_preview(p_creator_slug text, p_post_id uuid)`

These functions expose teaser data while full content remains RLS-protected.

## Environment variables

Web env template:
- `apps/web/.env.example`

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

1. Landing page has hero + feature grid + pricing cards + FAQ.
2. Creator page supports dark mode and shows tier cards + locked previews.
3. On mobile, non-member sees sticky subscribe CTA.
4. Stripe webhook stores event and enqueues job.
5. Worker processes `stripe:event` and updates `subscriptions`.
6. Unauthorized post detail shows paywall panel.
7. Authorized member sees full gated content + Bunny video.
