import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";

export const revalidate = 60;

export default async function HomePage() {
  const supabase = createServerClient();
  const { data: events } = await supabase
    .from("events")
    .select("id, title, start_at, venue, cover_image_url, slug")
    .gte("start_at", new Date().toISOString())
    .order("start_at", { ascending: true })
    .limit(12);

  return (
    <main className="max-w-6xl mx-auto px-4 py-10">
      <header className="mb-10 flex items-center justify-between">
        <h1 className="font-heading text-4xl md:text-6xl text-brand-yellow">785 Tickets</h1>
        <Link href="/dashboard" className="btn-outline text-sm">
          Organizer Dashboard
        </Link>
      </header>

      <section>
        <h2 className="section-heading mb-6">Upcoming Events</h2>
        {(!events || events.length === 0) && (
          <p className="text-white/60">No upcoming events. Check back soon.</p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {events?.map((event) => (
            <Link
              key={event.id}
              href={`/event/${event.id}`}
              className="card group hover:border-brand-yellow transition-colors"
            >
              {event.cover_image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={event.cover_image_url}
                  alt={event.title}
                  className="w-full h-40 object-cover rounded-sm mb-3"
                />
              )}
              <h3 className="font-heading text-lg text-brand-white group-hover:text-brand-yellow transition-colors">
                {event.title}
              </h3>
              <p className="text-white/60 text-sm mt-1">
                {new Date(event.start_at).toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
              {event.venue && <p className="text-white/40 text-xs mt-0.5">{event.venue}</p>}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
