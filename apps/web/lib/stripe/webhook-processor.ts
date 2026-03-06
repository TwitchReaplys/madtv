import type Stripe from "stripe";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";

type AdminSupabaseClient = ReturnType<typeof createAdminSupabaseClient>;

type SubscriptionMetadata = {
  userId?: string;
  creatorId?: string;
  tierId?: string;
};

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

async function getSubscriptionIdFromPaymentIntent(stripe: Stripe, paymentIntent: Stripe.PaymentIntent) {
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

async function getUserIdFromCustomerId(supabase: AdminSupabaseClient, customerId: string) {
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

async function resolveTierAndCreator(
  supabase: AdminSupabaseClient,
  stripePriceId: string | null,
  metadata: SubscriptionMetadata,
) {
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

async function upsertSubscriptionFromStripe(params: {
  supabase: AdminSupabaseClient;
  subscription: Stripe.Subscription;
  fallbackMetadata?: SubscriptionMetadata;
}) {
  const { supabase, subscription, fallbackMetadata } = params;

  const metadata = {
    ...(fallbackMetadata ?? {}),
    ...(subscription.metadata ?? {}),
  } as SubscriptionMetadata;

  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id ?? null;

  let userId = metadata.userId ?? null;

  if (!userId && customerId) {
    userId = await getUserIdFromCustomerId(supabase, customerId);
  }

  const firstItem = subscription.items.data[0];
  const stripePriceId = firstItem?.price?.id ?? null;
  const { tierId, creatorId } = await resolveTierAndCreator(supabase, stripePriceId, metadata);

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
}

export async function syncSubscriptionFromCheckoutSessionId(params: {
  supabase: AdminSupabaseClient;
  stripe: Stripe;
  sessionId: string;
  expectedUserId?: string;
}) {
  const { supabase, stripe, sessionId, expectedUserId } = params;
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const subscriptionId = getSubscriptionIdFromCheckoutSession(session);

  if (session.mode !== "subscription" || !subscriptionId) {
    return;
  }

  if (expectedUserId && session.metadata?.userId && session.metadata.userId !== expectedUserId) {
    throw new Error(`Checkout session ${sessionId} does not belong to expected user`);
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  await upsertSubscriptionFromStripe({
    supabase,
    subscription,
    fallbackMetadata: {
      userId: session.metadata?.userId,
      creatorId: session.metadata?.creatorId,
      tierId: session.metadata?.tierId,
    },
  });
}

export async function processStripeEventPayload(params: {
  supabase: AdminSupabaseClient;
  stripe: Stripe;
  event: Stripe.Event;
}) {
  const { supabase, stripe, event } = params;

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const subscriptionId = getSubscriptionIdFromCheckoutSession(session);

      if (session.mode === "subscription" && subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        await upsertSubscriptionFromStripe({
          supabase,
          subscription,
          fallbackMetadata: {
            userId: session.metadata?.userId,
            creatorId: session.metadata?.creatorId,
            tierId: session.metadata?.tierId,
          },
        });
      }
      break;
    }

    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object as Stripe.Checkout.Session;
      const subscriptionId = getSubscriptionIdFromCheckoutSession(session);

      if (session.mode === "subscription" && subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        await upsertSubscriptionFromStripe({
          supabase,
          subscription,
          fallbackMetadata: {
            userId: session.metadata?.userId,
            creatorId: session.metadata?.creatorId,
            tierId: session.metadata?.tierId,
          },
        });
      }
      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await upsertSubscriptionFromStripe({ supabase, subscription });
      break;
    }

    case "invoice.payment_succeeded":
    case "invoice.paid":
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = getSubscriptionIdFromInvoice(invoice);

      if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        await upsertSubscriptionFromStripe({ supabase, subscription });
      }
      break;
    }

    case "payment_intent.succeeded":
    case "payment_intent.payment_failed": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const subscriptionId = await getSubscriptionIdFromPaymentIntent(stripe, paymentIntent);

      if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        await upsertSubscriptionFromStripe({ supabase, subscription });
      }
      break;
    }

    default:
      break;
  }
}
