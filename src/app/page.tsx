import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";

export const revalidate = 60;

export default async function HomePage() {
  const supabase = createServerClient();

  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD for date column

  const { data: events, error } = await supabase
    .from("events")
    .select(`
      id,
      title,
      slug,
      event_date,
      event_start_time,
      image_url,
      ticketing_enabled,
      ticket_platform,
      status,
      venue:venues ( name, city )
    `)
    .eq("status", "published")
    .eq("ticketing_enabled", true)
    .eq("ticket_platform", "785tickets")
    .gte("event_date", today)
    .order("event_date", { ascending: true })
    .limit(12);

  if (error) {
    console.error("Events query error:", error);
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-10">
      <header className="mb-10 flex items-center justify-between">
        <h1 className="font-heading text-4xl md:text-6xl text-brand-yellow">
          785 Tickets
        </h1>
        <Link href="/dashboard" className="btn-outline text-sm">
          Organizer Dashboard
        </Link>
      </header>

      <section>
        <h2 className="section-heading mb-6">Upcoming Events</h2>

        {(!events || events.length === 0) && (
          <p className="text-white/60">
            No upcoming events with 785 Tickets enabled. Organizers can enable
            ticketing on any event from their dashboard.
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {events?.map((event) => {
            const venue = Array.isArray(event.venue) ? event.venue[0] : event.venue;
            return (
              <Link
                key={event.id}
                href={`/event/${event.slug ?? event.id}`}
                className="card group hover:border-brand-yellow transition-colors"
              >
                {event.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={event.image_url}
                    alt={event.title}
                    className="w-full h-40 object-cover rounded-sm mb-3"
                  />
                )}
                <h3 className="font-heading text-lg text-brand-white group-hover:text-brand-yellow transition-colors">
                  {event.title}
                </h3>
                <p className="text-white/60 text-sm mt-1">
                  {new Date(event.event_date).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                  {event.event_start_time && ` · ${event.event_start_time}`}
                </p>
                {venue && (
                  <p className="text-white/40 text-xs mt-0.5">
                    {venue.name}
                    {venue.city && `, ${venue.city}`}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
