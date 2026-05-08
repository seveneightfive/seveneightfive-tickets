import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { SalesSummary } from "@/components/SalesSummary";

interface Props {
  params: { eventId: string };
}

export default async function EventDashboardPage({ params }: Props) {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", params.eventId)
    .eq("organizer_user_id", user.id)
    .single();

  if (!event) notFound();

  const { data: ticketTypes } = await supabase
    .from("ticket_types")
    .select("*, ticket_sales(count)")
    .eq("event_id", params.eventId);

  const { data: recentSales } = await supabase
    .from("ticket_sales")
    .select("id, created_at, total_cents, attendees(name, email)")
    .eq("event_id", params.eventId)
    .order("created_at", { ascending: false })
    .limit(20);

  const { count: checkinCount } = await supabase
    .from("checkins")
    .select("*", { count: "exact", head: true })
    .eq("event_id", params.eventId);

  const totalRevenueCents =
    recentSales?.reduce((sum, s) => sum + (s.total_cents ?? 0), 0) ?? 0;

  return (
    <main className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-2">
        <Link href="/dashboard" className="text-brand-yellow text-sm hover:underline">
          ← Dashboard
        </Link>
        <Link
          href={`/event/${params.eventId}/scan`}
          className="btn-primary text-sm"
        >
          Open Scanner
        </Link>
      </div>

      <h1 className="font-heading text-4xl text-brand-yellow mt-4 mb-8">{event.title}</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <StatCard label="Revenue" value={`$${(totalRevenueCents / 100).toFixed(0)}`} />
        <StatCard label="Check-ins" value={String(checkinCount ?? 0)} />
        <StatCard
          label="Tickets Sold"
          value={String(ticketTypes?.reduce((s, tt) => s + (tt.ticket_sales?.[0]?.count ?? 0), 0) ?? 0)}
        />
        <StatCard label="Ticket Types" value={String(ticketTypes?.length ?? 0)} />
      </div>

      <SalesSummary eventId={params.eventId} />

      <section className="mt-10">
        <h2 className="section-heading mb-4">Recent Sales</h2>
        {(!recentSales || recentSales.length === 0) && (
          <p className="text-white/50">No sales yet.</p>
        )}
        <div className="space-y-2">
          {recentSales?.map((sale) => (
            <div key={sale.id} className="card flex items-center justify-between text-sm">
              <div>
                <p className="text-brand-white">
                  {(sale.attendees as { name: string } | null)?.name ?? "Anonymous"}
                </p>
                <p className="text-white/40 text-xs">
                  {new Date(sale.created_at).toLocaleString()}
                </p>
              </div>
              <p className="font-heading text-brand-yellow">
                ${((sale.total_cents ?? 0) / 100).toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card text-center">
      <p className="font-heading text-3xl text-brand-yellow">{value}</p>
      <p className="text-white/50 text-sm mt-1 uppercase tracking-wider">{label}</p>
    </div>
  );
}
