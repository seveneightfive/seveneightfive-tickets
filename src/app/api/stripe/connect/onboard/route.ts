import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: organizer } = await supabase
    .from("organizers")
    .select("stripe_account_id")
    .eq("user_id", user.id)
    .single();

  let stripeAccountId: string = organizer?.stripe_account_id ?? "";

  if (!stripeAccountId) {
    const account = await stripe.accounts.create({
      type: "express",
      metadata: { user_id: user.id },
    });
    stripeAccountId = account.id;

    await supabase
      .from("organizers")
      .update({ stripe_account_id: stripeAccountId })
      .eq("user_id", user.id);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const accountLink = await stripe.accountLinks.create({
    account: stripeAccountId,
    refresh_url: `${appUrl}/dashboard?stripe=refresh`,
    return_url: `${appUrl}/dashboard?stripe=success`,
    type: "account_onboarding",
  });

  return NextResponse.json({ url: accountLink.url });
}
