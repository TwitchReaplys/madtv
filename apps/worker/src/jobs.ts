import { JOB_NAMES, bunnySyncJobSchema, emailSendJobSchema, stripeEventJobSchema } from "@madtv/shared";
import type { Job } from "bullmq";
import type Stripe from "stripe";

import { logger } from "./logger.js";
import { stripe } from "./stripe.js";
import { supabase } from "./supabase.js";

type SubscriptionMetadata = {
  userId?: string;
  creatorId?: string;
  tierId?: string;
};

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

  const currentPeriodEnd = firstItem?.current_period_end
    ? new Date(firstItem.current_period_end * 1000).toISOString()
    : null;

  const { error } = await supabase.from("subscriptions").upsert(
    {
      user_id: userId,
      creator_id: creatorId,
      tier_id: tierId,
      status: subscription.status,
      current_period_end: currentPeriodEnd,
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
      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id;

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

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await upsertSubscriptionFromStripe(subscription);
      break;
    }

    case "invoice.paid":
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionRef = invoice.parent?.subscription_details?.subscription;
      const subscriptionId =
        typeof subscriptionRef === "string" ? subscriptionRef : subscriptionRef?.id;

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
  logger.info({ payload }, "Running bunny:sync (stub)");

  // Optional job stub: fetch Bunny metadata and store into post_assets.meta
  const meta = {
    syncedAt: new Date().toISOString(),
    status: "stub",
    note: "Implement Bunny API fetch here",
  };

  const { error } = await supabase
    .from("post_assets")
    .update({ meta })
    .eq("id", payload.assetId)
    .eq("bunny_video_id", payload.videoId)
    .eq("bunny_library_id", payload.libraryId);

  if (error) {
    throw new Error(`Failed bunny sync update for asset ${payload.assetId}: ${error.message}`);
  }
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

    case JOB_NAMES.EMAIL_SEND:
      await processEmailSend(job);
      break;

    default:
      throw new Error(`Unsupported job name: ${job.name}`);
  }
}
