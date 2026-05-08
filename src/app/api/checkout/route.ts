import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { stripe, computePlatformFee } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/server";

const LineItemSchema = z.object({
  ticketTypeId: z.string().uuid(),
  quantity: z.number().int().positive(),
});

const CheckoutBodySchema = z.object({
  eventId: z.string().uuid(),
  lineItems: z.array(LineItemSchema).min(1),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = CheckoutBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { eventId, lineItems } = parsed.data;
  const supabase = createServiceClient();

  const { data: event } = await supabase
    .from("events")
    .select("id, title, organizers(stripe_account_id)")
    .eq("id", eventId)
    .single();

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const organizer = event.organizers as { stripe_account_id: string | null } | null;
  if (!organizer?.stripe_account_id) {
    return NextResponse.json(
      { error: "Organizer has not completed Stripe onboarding" },
      { status: 422 }
    );
  }

  const ticketTypeIds = lineItems.map((li) => li.ticketTypeId);
  const { data: ticketTypes } = await supabase
    .from("ticket_types")
    .select("*")
    .in("id", ticketTypeIds)
    .eq("event_id", eventId)
    .eq("is_active", true);

  if (!ticketTypes || ticketTypes.length !== lineItems.length) {
    return NextResponse.json({ error: "Invalid ticket types" }, { status: 400 });
  }

  const subtotalCents = lineItems.reduce((sum, li) => {
    const tt = ticketTypes.find((t) => t.id === li.ticketTypeId)!;
    return sum + tt.price_cents * li.quantity;
  }, 0);

  const platformFeeCents = computePlatformFee(subtotalCents);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      line_items: lineItems.map((li) => {
        const tt = ticketTypes.find((t) => t.id === li.ticketTypeId)!;
        return {
          price_data: {
            currency: "usd",
            unit_amount: tt.price_cents,
            product_data: { name: tt.name, description: tt.description ?? undefined },
          },
          quantity: li.quantity,
        };
      }),
      payment_intent_data: {
        application_fee_amount: platformFeeCents,
      },
      success_url: `${appUrl}/event/${eventId}?checkout=success`,
      cancel_url: `${appUrl}/event/${eventId}/checkout`,
      metadata: {
        event_id: eventId,
        line_items: JSON.stringify(lineItems),
      },
    },
    { stripeAccount: organizer.stripe_account_id }
  );

  return NextResponse.json({ sessionId: session.id });
}
