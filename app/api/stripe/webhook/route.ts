import { NextResponse } from "next/server";
import Stripe from "stripe";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getStripeClient } from "@/lib/stripe";

export const runtime = "nodejs";

type SubscriptionMetadata = {
  userId?: string;
  creatorId?: string;
  tierId?: string;
};

async function getUserIdFromCustomerId(customerId: string, supabase: ReturnType<typeof createAdminSupabaseClient>) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  return profile?.id ?? null;
}

async function resolveTierAndCreator(
  stripePriceId: string | null,
  metadata: SubscriptionMetadata,
  supabase: ReturnType<typeof createAdminSupabaseClient>,
) {
  let tierId = metadata.tierId ?? null;
  let creatorId = metadata.creatorId ?? null;

  if ((!tierId || !creatorId) && stripePriceId) {
    const { data: tier } = await supabase
      .from("tiers")
      .select("id, creator_id")
      .eq("stripe_price_id", stripePriceId)
      .maybeSingle();

    if (tier) {
      tierId = tierId ?? tier.id;
      creatorId = creatorId ?? tier.creator_id;
    }
  }

  return { tierId, creatorId };
}

async function upsertSubscriptionFromStripe(
  subscription: Stripe.Subscription,
  supabase: ReturnType<typeof createAdminSupabaseClient>,
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
    userId = await getUserIdFromCustomerId(customerId, supabase);
  }

  const firstItem = subscription.items.data[0];
  const stripePriceId = firstItem?.price?.id ?? null;
  const { tierId, creatorId } = await resolveTierAndCreator(stripePriceId, metadata, supabase);

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

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json({ error: "Missing STRIPE_WEBHOOK_SECRET" }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const rawBody = await request.text();
  const stripe = getStripeClient();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid Stripe signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();

  const { error: eventInsertError } = await supabase.from("stripe_events").insert({
    id: event.id,
    type: event.type,
    payload: event,
  });

  if (eventInsertError?.code === "23505") {
    return NextResponse.json({ received: true, duplicate: true });
  }

  if (eventInsertError) {
    return NextResponse.json({ error: eventInsertError.message }, { status: 500 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;

        if (session.mode === "subscription" && subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          await upsertSubscriptionFromStripe(subscription, supabase, {
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
        await upsertSubscriptionFromStripe(subscription, supabase);
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
          await upsertSubscriptionFromStripe(subscription, supabase);
        }

        break;
      }

      default:
        break;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook processing failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
