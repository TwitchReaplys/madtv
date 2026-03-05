import { NextResponse } from "next/server";
import Stripe from "stripe";

import { enqueueStripeEvent } from "@/lib/queue";
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

  if (insertError?.code === "23505") {
    return NextResponse.json({ received: true, duplicate: true });
  }

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  try {
    await enqueueStripeEvent(event.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to enqueue Stripe event";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true, queued: true });
}
