import { NextResponse } from "next/server";

import { getVerifiedAuthUser } from "@/lib/supabase/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getStripeClient } from "@/lib/stripe";

function getReturnUrl(request: Request) {
  return process.env.STRIPE_PORTAL_RETURN_URL ?? `${process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin}/dashboard`;
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { user } = await getVerifiedAuthUser(supabase);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  if (!profile?.stripe_customer_id) {
    return NextResponse.json({ error: "Stripe customer not found" }, { status: 400 });
  }

  const stripe = getStripeClient();

  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: getReturnUrl(request),
  });

  return NextResponse.json({ url: session.url });
}
