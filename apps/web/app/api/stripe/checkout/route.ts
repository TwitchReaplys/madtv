import { NextResponse } from "next/server";

import { getAuthUser, parseCookieHeader } from "@/lib/supabase/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getStripeClient } from "@/lib/stripe";
import { checkoutSchema } from "@/lib/validators/schemas";

function getAppUrl(request: Request) {
  return process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = checkoutSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? "Invalid request body",
      },
      { status: 400 },
    );
  }

  const supabase = await createServerSupabaseClient();
  const { user } = await getAuthUser(supabase, parseCookieHeader(request.headers.get("cookie")));

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: tier, error: tierError } = await supabase
    .from("tiers")
    .select("id, creator_id, stripe_price_id, is_active, creators!inner ( slug )")
    .eq("id", parsed.data.tierId)
    .single();

  if (tierError || !tier) {
    return NextResponse.json({ error: "Tier not found" }, { status: 404 });
  }

  if (!tier.is_active || !tier.stripe_price_id) {
    return NextResponse.json({ error: "Tier is not purchasable" }, { status: 400 });
  }

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id, stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  const stripe = getStripeClient();

  let stripeCustomerId = existingProfile?.stripe_customer_id ?? null;

  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: {
        userId: user.id,
      },
    });

    stripeCustomerId = customer.id;

    if (!existingProfile) {
      await supabase.from("profiles").insert({
        id: user.id,
        stripe_customer_id: stripeCustomerId,
      });
    } else {
      await supabase
        .from("profiles")
        .update({
          stripe_customer_id: stripeCustomerId,
        })
        .eq("id", user.id);
    }
  }

  const creatorRelation = tier.creators as { slug?: string } | { slug?: string }[] | null;
  const creatorSlug = Array.isArray(creatorRelation) ? creatorRelation[0]?.slug : creatorRelation?.slug;

  if (!creatorSlug) {
    return NextResponse.json({ error: "Creator slug is missing" }, { status: 400 });
  }

  const appUrl = getAppUrl(request);

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: stripeCustomerId,
    line_items: [
      {
        price: tier.stripe_price_id,
        quantity: 1,
      },
    ],
    success_url: `${appUrl}/c/${creatorSlug}?checkout=success`,
    cancel_url: `${appUrl}/c/${creatorSlug}?checkout=cancel`,
    metadata: {
      userId: user.id,
      creatorId: tier.creator_id,
      tierId: tier.id,
    },
    subscription_data: {
      metadata: {
        userId: user.id,
        creatorId: tier.creator_id,
        tierId: tier.id,
      },
    },
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: session.url });
}
