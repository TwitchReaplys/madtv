import {
  JOB_NAMES,
  analyticsAggregateJobSchema,
  bunnySyncJobSchema,
  emailSendJobSchema,
  stripeEventJobSchema,
} from "@madtv/shared";
import type { Job } from "bullmq";
import type Stripe from "stripe";

import { env } from "./env.js";
import { logger } from "./logger.js";
import { stripe } from "./stripe.js";
import { supabase } from "./supabase.js";

type SubscriptionMetadata = {
  userId?: string;
  creatorId?: string;
  tierId?: string;
};

function getSettingNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  if (value && typeof value === "object" && "value" in value) {
    return getSettingNumber((value as { value?: unknown }).value);
  }

  return null;
}

function normalizePercent(raw: unknown, fallback: number) {
  const parsed = getSettingNumber(raw);
  const value = parsed ?? fallback;
  return Math.min(100, Math.max(0, value));
}

function computeNetRevenueCents(grossRevenueCents: number, feePercent: number, vatPercent: number) {
  if (grossRevenueCents <= 0) {
    return 0;
  }

  const vatAmountCents =
    vatPercent > 0 ? Math.round((grossRevenueCents * vatPercent) / (100 + vatPercent)) : 0;
  const platformFeeCents = feePercent > 0 ? Math.round((grossRevenueCents * feePercent) / 100) : 0;

  return Math.max(0, grossRevenueCents - vatAmountCents - platformFeeCents);
}

function getSubscriptionIdFromCheckoutSession(session: Stripe.Checkout.Session) {
  const subscriptionRef = session.subscription;

  if (typeof subscriptionRef === "string") {
    return subscriptionRef;
  }

  if (subscriptionRef && typeof subscriptionRef === "object" && typeof subscriptionRef.id === "string") {
    return subscriptionRef.id;
  }

  return null;
}

function getSubscriptionIdFromInvoice(invoice: Stripe.Invoice) {
  const invoiceLike = invoice as Stripe.Invoice & {
    subscription?: string | { id?: string } | null;
    parent?: {
      subscription_details?: {
        subscription?: string | { id?: string } | null;
      } | null;
    } | null;
  };

  const direct = invoiceLike.subscription;
  if (typeof direct === "string") {
    return direct;
  }

  if (direct && typeof direct === "object" && typeof direct.id === "string") {
    return direct.id;
  }

  const nested = invoiceLike.parent?.subscription_details?.subscription;
  if (typeof nested === "string") {
    return nested;
  }

  if (nested && typeof nested === "object" && typeof nested.id === "string") {
    return nested.id;
  }

  return null;
}

async function getSubscriptionIdFromPaymentIntent(paymentIntent: Stripe.PaymentIntent) {
  const paymentIntentLike = paymentIntent as Stripe.PaymentIntent & {
    invoice?: string | Stripe.Invoice | null;
  };

  const invoiceRef = paymentIntentLike.invoice;

  if (!invoiceRef) {
    return null;
  }

  if (typeof invoiceRef === "string") {
    const invoice = await stripe.invoices.retrieve(invoiceRef);
    return getSubscriptionIdFromInvoice(invoice);
  }

  return getSubscriptionIdFromInvoice(invoiceRef);
}

function getCurrentPeriodEndIso(subscription: Stripe.Subscription) {
  const subLike = subscription as Stripe.Subscription & {
    current_period_end?: number | null;
  };

  if (typeof subLike.current_period_end === "number") {
    return new Date(subLike.current_period_end * 1000).toISOString();
  }

  const firstItem = subscription.items.data[0];
  if (typeof firstItem?.current_period_end === "number") {
    return new Date(firstItem.current_period_end * 1000).toISOString();
  }

  return null;
}

async function getUserIdFromCustomerId(customerId: string) {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to resolve profile by customer id ${customerId}: ${error.message}`);
  }

  return profile?.id ?? null;
}

async function resolveTierAndCreator(stripePriceId: string | null, metadata: SubscriptionMetadata) {
  let tierId = metadata.tierId ?? null;
  let creatorId = metadata.creatorId ?? null;

  if ((!tierId || !creatorId) && stripePriceId) {
    const { data: tier, error } = await supabase
      .from("tiers")
      .select("id, creator_id")
      .eq("stripe_price_id", stripePriceId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to resolve tier by stripe price id ${stripePriceId}: ${error.message}`);
    }

    if (tier) {
      tierId = tierId ?? tier.id;
      creatorId = creatorId ?? tier.creator_id;
    }
  }

  return { tierId, creatorId };
}

async function upsertSubscriptionFromStripe(
  subscription: Stripe.Subscription,
  fallbackMetadata?: SubscriptionMetadata,
) {
  const metadata = {
    ...(fallbackMetadata ?? {}),
    ...(subscription.metadata ?? {}),
  } as SubscriptionMetadata;

  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id ?? null;

  let userId = metadata.userId ?? null;

  if (!userId && customerId) {
    userId = await getUserIdFromCustomerId(customerId);
  }

  const firstItem = subscription.items.data[0];
  const stripePriceId = firstItem?.price?.id ?? null;
  const { tierId, creatorId } = await resolveTierAndCreator(stripePriceId, metadata);

  if (!userId || !creatorId) {
    throw new Error(`Could not resolve user/creator for Stripe subscription ${subscription.id}`);
  }

  const { error } = await supabase.from("subscriptions").upsert(
    {
      user_id: userId,
      creator_id: creatorId,
      tier_id: tierId,
      status: subscription.status,
      current_period_end: getCurrentPeriodEndIso(subscription),
      provider: "stripe",
      provider_subscription_id: subscription.id,
    },
    {
      onConflict: "provider_subscription_id",
    },
  );

  if (error) {
    throw new Error(`Failed to upsert subscription ${subscription.id}: ${error.message}`);
  }

  await recomputeAnalyticsForCreatorDay(creatorId, new Date().toISOString().slice(0, 10));
}

async function processStripeEvent(eventId: string) {
  const { data: eventRow, error } = await supabase
    .from("stripe_events")
    .select("id, type, payload")
    .eq("id", eventId)
    .single();

  if (error || !eventRow) {
    throw new Error(`Stripe event ${eventId} not found in database`);
  }

  const event = eventRow.payload as Stripe.Event;

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const subscriptionId = getSubscriptionIdFromCheckoutSession(session);

      if (session.mode === "subscription" && subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        await upsertSubscriptionFromStripe(subscription, {
          userId: session.metadata?.userId,
          creatorId: session.metadata?.creatorId,
          tierId: session.metadata?.tierId,
        });
      }
      break;
    }

    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object as Stripe.Checkout.Session;
      const subscriptionId = getSubscriptionIdFromCheckoutSession(session);

      if (session.mode === "subscription" && subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        await upsertSubscriptionFromStripe(subscription, {
          userId: session.metadata?.userId,
          creatorId: session.metadata?.creatorId,
          tierId: session.metadata?.tierId,
        });
      }
      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await upsertSubscriptionFromStripe(subscription);
      break;
    }

    case "invoice.payment_succeeded":
    case "invoice.paid":
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = getSubscriptionIdFromInvoice(invoice);

      if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        await upsertSubscriptionFromStripe(subscription);
      }
      break;
    }

    case "payment_intent.succeeded":
    case "payment_intent.payment_failed": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const subscriptionId = await getSubscriptionIdFromPaymentIntent(paymentIntent);

      if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        await upsertSubscriptionFromStripe(subscription);
      }
      break;
    }

    default:
      logger.info({ eventId, type: event.type }, "Ignoring unsupported Stripe event type");
      break;
  }
}

async function processBunnySync(job: Job) {
  const payload = bunnySyncJobSchema.parse(job.data);
  logger.info({ payload }, "Running bunny:sync");

  let videoMeta: Record<string, unknown> = {
    syncedAt: new Date().toISOString(),
  };
  let status: "uploading" | "processing" | "ready" | "error" = "processing";
  let durationSeconds: number | null = null;
  let thumbnailUrl: string | null = null;

  if (env.bunnyStreamApiKey) {
    const response = await fetch(`https://video.bunnycdn.com/library/${payload.libraryId}/videos/${payload.videoId}`, {
      headers: {
        AccessKey: env.bunnyStreamApiKey,
      },
    });

    if (response.ok) {
      const bunnyPayload = (await response.json()) as {
        status?: number;
        length?: number;
        thumbnailFileName?: string;
        [key: string]: unknown;
      };

      videoMeta = {
        ...videoMeta,
        bunny: bunnyPayload,
      };

      if (typeof bunnyPayload.length === "number") {
        durationSeconds = Math.max(0, Math.round(bunnyPayload.length));
      }

      if (
        typeof bunnyPayload.thumbnailFileName === "string" &&
        bunnyPayload.thumbnailFileName.length > 0 &&
        bunnyPayload.thumbnailFileName.startsWith("http")
      ) {
        thumbnailUrl = bunnyPayload.thumbnailFileName;
      }

      if (bunnyPayload.status === 4 || bunnyPayload.status === 5) {
        status = "ready";
      } else {
        status = "processing";
      }
    } else {
      status = "error";
      videoMeta = {
        ...videoMeta,
        bunnyError: await response.text(),
      };
    }
  }

  const { error } = await supabase
    .from("post_assets")
    .update({ meta: videoMeta })
    .eq("id", payload.assetId)
    .eq("bunny_video_id", payload.videoId)
    .eq("bunny_library_id", payload.libraryId);

  if (error) {
    throw new Error(`Failed bunny sync update for asset ${payload.assetId}: ${error.message}`);
  }

  const { error: creatorVideoError } = await supabase
    .from("creator_videos")
    .update({
      status,
      duration_seconds: durationSeconds,
      thumbnail_url: thumbnailUrl,
      meta: videoMeta,
    })
    .eq("bunny_video_id", payload.videoId);

  if (creatorVideoError) {
    throw new Error(`Failed creator_videos sync for bunny id ${payload.videoId}: ${creatorVideoError.message}`);
  }
}

async function recomputeAnalyticsForCreatorDay(creatorId: string, day: string) {
  const start = new Date(`${day}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  const [{ data: events, error: eventsError }, { data: creatorRow }, { data: settingRows }] = await Promise.all([
    supabase
      .from("analytics_events")
      .select("event_type, user_id, session_id")
      .eq("creator_id", creatorId)
      .gte("created_at", start.toISOString())
      .lt("created_at", end.toISOString()),
    supabase
      .from("creators")
      .select("platform_fee_percent")
      .eq("id", creatorId)
      .maybeSingle(),
    supabase
      .from("platform_settings")
      .select("key, value")
      .in("key", ["platform_fee_percent", "vat_percent"]),
  ]);

  if (eventsError) {
    throw new Error(`Failed to load analytics events: ${eventsError.message}`);
  }

  const rows = events ?? [];
  const postViews = rows.filter((row) => row.event_type === "post_view").length;
  const videoPlayIntents = rows.filter((row) => row.event_type === "video_play_intent").length;
  const videoPlayStarted = rows.filter((row) => row.event_type === "video_play_started").length;
  const uniqueViewers = new Set(
    rows
      .map((row) => row.user_id ?? (row.session_id ? `session:${row.session_id}` : null))
      .filter((value): value is string => Boolean(value)),
  ).size;

  const settingsMap = new Map<string, unknown>((settingRows ?? []).map((row) => [row.key, row.value]));
  const defaultFeePercent = normalizePercent(settingsMap.get("platform_fee_percent"), 10);
  const vatPercent = normalizePercent(settingsMap.get("vat_percent"), 21);

  const creatorFeePercentRaw =
    typeof creatorRow?.platform_fee_percent === "number"
      ? creatorRow.platform_fee_percent
      : typeof creatorRow?.platform_fee_percent === "string"
        ? Number(creatorRow.platform_fee_percent)
        : null;

  const effectiveFeePercent = Number.isFinite(creatorFeePercentRaw)
    ? Number(creatorFeePercentRaw)
    : defaultFeePercent;
  const feePercent = normalizePercent(effectiveFeePercent, defaultFeePercent);

  const { data: invoiceRows, error: invoiceRowsError } = await supabase
    .from("stripe_events")
    .select("payload")
    .eq("type", "invoice.paid")
    .gte("created_at", start.toISOString())
    .lt("created_at", end.toISOString());

  if (invoiceRowsError) {
    throw new Error(`Failed to load invoice events: ${invoiceRowsError.message}`);
  }

  let grossRevenueCents = 0;

  for (const eventRow of invoiceRows ?? []) {
    const payloadJson = eventRow.payload as {
      data?: {
        object?: {
          amount_paid?: number;
          lines?: {
            data?: Array<{
              price?: {
                id?: string;
              };
            }>;
          };
        };
      };
    };

    const priceId = payloadJson.data?.object?.lines?.data?.[0]?.price?.id ?? null;
    const amountPaid = Number(payloadJson.data?.object?.amount_paid ?? 0);

    if (!priceId || amountPaid <= 0) {
      continue;
    }

    const { data: tier } = await supabase
      .from("tiers")
      .select("creator_id")
      .eq("stripe_price_id", priceId)
      .maybeSingle();

    if (tier?.creator_id === creatorId) {
      grossRevenueCents += Math.round(amountPaid);
    }
  }

  const netRevenueCents = computeNetRevenueCents(grossRevenueCents, feePercent, vatPercent);

  const { error: upsertError } = await supabase.from("analytics_daily_creator").upsert(
    {
      creator_id: creatorId,
      date: day,
      post_views: postViews,
      video_play_intents: videoPlayIntents,
      video_play_started: videoPlayStarted,
      unique_viewers: uniqueViewers,
      gross_revenue_cents: grossRevenueCents,
      net_revenue_cents: netRevenueCents,
    },
    {
      onConflict: "creator_id,date",
    },
  );

  if (upsertError) {
    throw new Error(`Failed to upsert analytics daily row: ${upsertError.message}`);
  }
}

async function processAnalyticsAggregate(job: Job) {
  const payload = analyticsAggregateJobSchema.parse(job.data);
  await recomputeAnalyticsForCreatorDay(payload.creatorId, payload.day);
}

async function processEmailSend(job: Job) {
  const payload = emailSendJobSchema.parse(job.data);
  logger.info({ to: payload.to, subject: payload.subject }, "Running email:send (stub)");

  // Optional job stub: write to outbox table or integrate provider.
  await Promise.resolve();
}

export async function processJob(job: Job) {
  switch (job.name) {
    case JOB_NAMES.STRIPE_EVENT: {
      const payload = stripeEventJobSchema.parse(job.data);
      await processStripeEvent(payload.eventId);
      break;
    }

    case JOB_NAMES.BUNNY_SYNC:
      await processBunnySync(job);
      break;

    case JOB_NAMES.ANALYTICS_AGGREGATE:
      await processAnalyticsAggregate(job);
      break;

    case JOB_NAMES.EMAIL_SEND:
      await processEmailSend(job);
      break;

    default:
      throw new Error(`Unsupported job name: ${job.name}`);
  }
}
