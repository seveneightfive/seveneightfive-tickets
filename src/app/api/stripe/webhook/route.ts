import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/server";
import type Stripe from "stripe";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const payload = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    return NextResponse.json({ error: `Webhook error: ${(err as Error).message}` }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const supabase = createServiceClient();
  const meta = session.metadata ?? {};
  const eventId = meta["event_id"];
  const lineItems: { ticketTypeId: string; quantity: number }[] = JSON.parse(
    meta["line_items"] ?? "[]"
  );

  if (!eventId || !lineItems.length) return;

  const { data: ticketTypes } = await supabase
    .from("ticket_types")
    .select("id, price_cents, name")
    .in(
      "id",
      lineItems.map((li) => li.ticketTypeId)
    );

  if (!ticketTypes) return;

  const customerEmail = session.customer_details?.email ?? null;
  const customerName = session.customer_details?.name ?? "Guest";

  const { data: attendee } = await supabase
    .from("attendees")
    .insert({ name: customerName, email: customerEmail ?? "", user_id: null })
    .select("id")
    .single();

  if (!attendee) return;

  await Promise.all(
    lineItems.map(async (li) => {
      const tt = ticketTypes.find((t) => t.id === li.ticketTypeId);
      if (!tt) return;

      const totalCents = tt.price_cents * li.quantity;
      const feeCents = Math.round(
        (totalCents * parseInt(process.env.STRIPE_PLATFORM_FEE_BPS ?? "200", 10)) / 10000
      );

      await supabase.from("ticket_sales").insert({
        event_id: eventId,
        ticket_type_id: li.ticketTypeId,
        attendee_id: attendee.id,
        quantity: li.quantity,
        unit_price_cents: tt.price_cents,
        total_cents: totalCents,
        platform_fee_cents: feeCents,
        stripe_session_id: session.id,
        stripe_payment_intent:
          typeof session.payment_intent === "string" ? session.payment_intent : null,
        status: "paid",
      });

      await supabase.rpc("increment_ticket_quantity_sold", {
        p_ticket_type_id: li.ticketTypeId,
        p_quantity: li.quantity,
      });
    })
  );
}
