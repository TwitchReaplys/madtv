import { NextResponse } from "next/server";
import Stripe from "stripe";

import { enqueueStripeEvent } from "@/lib/queue";
import { processStripeEventPayload } from "@/lib/stripe/webhook-processor";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getStripeClient } from "@/lib/stripe";

export const runtime = "nodejs";

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

  const { error: insertError } = await supabase.from("stripe_events").insert({
    id: event.id,
    type: event.type,
    payload: event,
  });

  const isDuplicate = insertError?.code === "23505";

  if (insertError && !isDuplicate) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  try {
    await enqueueStripeEvent(event.id);
  } catch (error) {
    try {
      await processStripeEventPayload({
        supabase,
        stripe,
        event,
      });
    } catch (inlineError) {
      const queueErrorMessage = error instanceof Error ? error.message : "Failed to enqueue Stripe event";
      const inlineErrorMessage = inlineError instanceof Error ? inlineError.message : "Failed to process Stripe event inline";
      return NextResponse.json(
        {
          error: `Queue error: ${queueErrorMessage}; inline error: ${inlineErrorMessage}`,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ received: true, queued: false, processedInline: true, duplicate: isDuplicate });
  }

  return NextResponse.json({ received: true, queued: true, duplicate: isDuplicate });
}
