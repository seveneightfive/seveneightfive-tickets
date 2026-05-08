import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = createServerClient();
  const {
  data: { user },
} = await supabase.auth.getUser();

const effectiveUserId =
  user?.id ??
  (process.env.NODE_ENV === "development" ? process.env.DEV_BYPASS_USER_ID : null);

if (!effectiveUserId) {
  const returnTo = encodeURIComponent(
    `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/dashboard`,
  );
  redirect(`https://seveneightfive.com/login?returnTo=${returnTo}`);
}

  // Match by ANY of the ownership columns seveneightfive.com may populate
  const { data: events } = await supabase
    .from("events")
    .select(`
      id, title, slug, event_date, event_start_time,
      ticketing_enabled, ticket_platform, status,
      venue:venues(name, city)
    `)
    .or(
      `auth_user_id.eq.${user.id},organizer_user_id.eq.${user.id},created_by.eq.${user.id}`,
    )
    .order("event_date", { ascending: false });

  return (
    <main className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-10">
        <h1 className="font-heading text-4xl text-brand-yellow">Organizer Dashboard</h1>
        <Link
          href="/"
          className="text-white/60 hover:text-brand-yellow text-sm transition-colors"
        >
          ← Public Site
        </Link>
      </div>

      <section>
        <h2 className="section-heading mb-6">Your Events</h2>

        {(!events || events.length === 0) && (
          <p className="text-white/50">
            No events found for your account. Create your first event on{" "}
            
              href="https://seveneightfive.com"
              className="text-brand-yellow underline"
            >
              seveneightfive.com
            </a>
            , then come back here to enable ticketing.
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {events?.map((event) => {
            const venue = Array.isArray(event.venue) ? event.venue[0] : event.venue;
            const ticketingActive =
              event.ticketing_enabled && event.ticket_platform === "785tickets";

            return (
              <Link
                key={event.id}
                href={`/dashboard/${event.id}`}
                className="card group hover:border-brand-yellow transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-heading text-brand-white group-hover:text-brand-yellow transition-colors">
                    {event.title}
                  </h3>
                  <span
                    className={`text-[0.6rem] uppercase tracking-wider px-2 py-0.5 ${
                      ticketingActive
                        ? "bg-brand-yellow text-brand-black"
                        : "border border-white/20 text-white/50"
                    }`}
                  >
                    {ticketingActive ? "Ticketing On" : "Ticketing Off"}
                  </span>
                </div>
                <p className="text-white/50 text-sm">
                  {new Date(event.event_date + "T12:00:00").toLocaleDateString(
                    "en-US",
                    { month: "short", day: "numeric", year: "numeric" },
                  )}
                  {event.event_start_time && ` · ${event.event_start_time}`}
                  {venue && ` · ${venue.name}`}
                </p>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
