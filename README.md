# MadTV MVP

MVP multi-creator subscription platform (HeroHero-like) built with:
- Next.js App Router + TypeScript
- Supabase (Postgres + Auth + RLS)
- Stripe subscriptions (Checkout, Portal, Webhooks)
- Bunny Stream direct uploads via TUS

## Features implemented

### Creator
- Sign up / sign in
- Create and edit creator profile (`slug`, `title`, `about`)
- Create/activate/deactivate/delete tiers (Stripe Product/Price created on tier creation)
- Create/edit/delete posts with visibility:
  - `public`
  - `members`
  - `tier` (min tier rank)
- Upload Bunny video and attach to post

### Member
- Browse creator page and post feed
- See public posts anonymously
- Subscribe via Stripe Checkout
- Manage subscription via Stripe Billing Portal
- After successful subscription + webhook sync, gated posts become visible via RLS

### Security
- RLS enabled on all relevant tables
- Post visibility checks enforced in Postgres policies/functions
- Service role, Stripe, and Bunny secrets are server-only

## Routes

Public:
- `/`
- `/c/[slug]`
- `/c/[slug]/posts/[id]`

Auth:
- `/login`
- `/logout`

Dashboard (protected):
- `/dashboard`
- `/dashboard/creator`
- `/dashboard/tiers`
- `/dashboard/posts`
- `/dashboard/posts/new`
- `/dashboard/posts/[id]/edit`

Stripe APIs:
- `POST /api/stripe/checkout`
- `POST /api/stripe/portal`
- `POST /api/stripe/webhook`

Bunny APIs:
- `POST /api/bunny/create-upload`
- `GET|POST /api/bunny/embed-token`

Other:
- `GET /api/health`

## Environment variables

Copy `.env.example` to `.env.local` and fill values:

Public:
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Server-only:
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PORTAL_RETURN_URL`
- `BUNNY_STREAM_API_KEY`
- `BUNNY_STREAM_LIBRARY_ID`
- `BUNNY_EMBED_TOKEN_KEY` (optional)

## Local development

1. Install dependencies:

```bash
pnpm install
```

2. Configure env:

```bash
cp .env.example .env.local
```

3. Apply SQL migration to Supabase Postgres:

```bash
psql "$SUPABASE_DB_URL" -f supabase/migrations/20260304213000_init.sql
```

If using Supabase CLI with a linked project, you can also use:

```bash
supabase db push
```

4. Start app:

```bash
pnpm dev
```

App runs on `http://localhost:3000`.

## Stripe setup notes

- Ensure each creator tier gets Stripe product/price from dashboard tier creation.
- Run webhook forwarding locally:

```bash
stripe listen --forward-to http://localhost:3000/api/stripe/webhook
```

- Put returned signing secret into `STRIPE_WEBHOOK_SECRET`.

## Bunny upload flow

1. Client requests `POST /api/bunny/create-upload`.
2. Server creates Bunny video object and returns TUS auth signature.
3. Client uploads directly to Bunny TUS endpoint (`https://video.bunnycdn.com/tusupload`).
4. Post save stores `bunny_video_id` + `bunny_library_id` in `post_assets`.
5. Post detail renders Bunny iframe embed.

## Database and RLS

SQL migration is in:
- `supabase/migrations/20260304213000_init.sql`

It includes:
- Schema tables for profiles/creators/tiers/subscriptions/posts/assets/comments/stripe events
- Triggers:
  - `handle_new_user()` on `auth.users`
  - owner auto-membership on creator create
- Helper functions:
  - `is_creator_admin(creator_id uuid)`
  - `active_subscription_rank(creator_id uuid)`
  - `can_view_post(...)`
- Policies enforcing post gating and admin ownership permissions

## Manual acceptance test checklist

1. Sign up user in `/login` and verify profile row exists in `profiles`.
2. Create creator profile in `/dashboard/creator`.
3. Create tier in `/dashboard/tiers` and confirm Stripe product/price IDs are stored.
4. Create two posts:
   - public post is visible anonymously at `/c/[slug]`
   - members/tier posts are hidden anonymously
5. Subscribe via `/c/[slug]` tier button.
6. Verify Stripe webhook writes/updates `subscriptions` row.
7. Reload `/c/[slug]` as subscribed user and verify gated post visibility appears.
8. Upload Bunny video in post form and verify playback in post detail page.

## Deploying on Coolify

- Use included `Dockerfile`.
- Configure environment variables in Coolify.
- Health check endpoint: `/api/health`.
- Exposed port: `3000`.

