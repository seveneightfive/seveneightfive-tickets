import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId");

  if (!eventId) {
    return NextResponse.json({ error: "eventId required" }, { status: 400 });
  }

  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: event } = await supabase
    .from("events")
    .select("organizer_user_id")
    .eq("id", eventId)
    .eq("organizer_user_id", user.id)
    .single();

  if (!event) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: sales } = await supabase
    .from("ticket_sales")
    .select("created_at, total_cents, quantity")
    .eq("event_id", eventId)
    .eq("status", "paid")
    .order("created_at", { ascending: true });

  const dailyMap: Record<string, { revenue: number; tickets: number }> = {};

  for (const sale of sales ?? []) {
    const day = sale.created_at.slice(0, 10);
    if (!dailyMap[day]) dailyMap[day] = { revenue: 0, tickets: 0 };
    dailyMap[day].revenue += (sale.total_cents ?? 0) / 100;
    dailyMap[day].tickets += sale.quantity ?? 0;
  }

  const result = Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => ({ date, ...vals }));

  return NextResponse.json(result);
}
