import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";

const BodySchema = z.object({
  ticketId: z.string(),
  eventId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { ticketId, eventId } = parsed.data;
  const supabase = createServiceClient();

  const { data: sale } = await supabase
    .from("ticket_sales")
    .select("id, status, qr_code_secret")
    .eq("event_id", eventId)
    .eq("qr_code_secret", ticketId)
    .single();

  if (!sale) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  if (sale.status !== "paid") {
    return NextResponse.json({ error: "Ticket not paid" }, { status: 422 });
  }

  const { data: existing } = await supabase
    .from("checkins")
    .select("id")
    .eq("ticket_sale_id", sale.id)
    .single();

  if (existing) {
    return NextResponse.json({ error: "Already checked in" }, { status: 409 });
  }

  const { error } = await supabase.from("checkins").insert({
    event_id: eventId,
    ticket_sale_id: sale.id,
    synced_at: new Date().toISOString(),
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
