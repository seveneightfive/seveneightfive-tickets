import { notFound } from "next/navigation";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";

interface Props {
  params: { id: string };
}

// Detect if the param is a UUID or a slug
function isUuid(s: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

async function fetchEvent(idOrSlug: string) {
  const supabase = createServerClient();
  const column = isUuid(idOrSlug) ? "id" : "slug";

  const { data: event } = await supabase
    .from("events")
    .select(`
      id, title, slug, description, event_date, event_start_time, event_end_time,
      end_date, image_url, ticket_price, capacity, ticketing_enabled, status,
      ticket_platform, cta_label,
      venue:venues ( id, name, address, neighborhood, city, state, slug, image_url ),
      organizers ( id, name, avatar_url )
    `)
    .eq(column, idOrSlug)
    .eq("status", "published")
    .single();

  return event;
}

export async function generateMetadata({ params }: Props) {
  const event = await fetchEvent(params.id);
  if (!event) return { title: "Event Not Found" };
  return {
    title: `${event.title} | 785 Tickets`,
    description: event.description ?? undefined,
  };
}

export default async function EventPage({ params }: Props) {
  const event = await fetchEvent(params.id);
  if (!event) notFound();

  const supabase = createServerClient();
  const { data: ticketTypes } = await supabase
    .from("ticket_types")
    .select("*")
    .eq("event_id", event.id)
    .eq("is_active", true)
    .order("price_cents", { ascending: true });

  const venue = Array.isArray(event.venue) ? event.venue[0] : event.venue;
  const organizer = Array.isArray(event.organizers) ? event.organizers[0] : event.organizers;

  return (
    <main className="max-w-4xl mx-auto px-4 py-10">
      <Link href="/" className="text-brand-yellow text-sm mb-6 inline-block hover:underline">
        ← All Events
      </Link>

      {event.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={event.image_url}
          alt={event.title}
          className="w-full max-h-72 object-cover rounded-md mb-8"
        />
      )}

      <h1 className="font-heading text-4xl md:text-5xl text-brand-yellow mb-2">
        {event.title}
      </h1>

      <p className="text-white/60 mb-6">
        {new Date(event.event_date + "T12:00:00").toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        })}
        {event.event_start_time && ` · ${event.event_start_time}`}
        {venue && ` · ${venue.name}`}
      </p>

      {event.description && (
        <p className="text-white/80 mb-8 leading-relaxed whitespace-pre-line">
          {event.description}
        </p>
      )}

      {!event.ticketing_enabled || event.ticket_platform !== "785tickets" ? (
        <section className="card mb-10 text-center py-8">
          <p className="text-white/70 mb-4">
            Ticketing is not enabled for this event on 785 Tickets.
          </p>
          
            href={`https://seveneightfive.com/events/${event.slug}`}
            className="text-brand-yellow underline text-sm"
          >
            View this event on seveneightfive.com →
          </a>
        </section>
      ) : !ticketTypes || ticketTypes.length === 0 ? (
        <section className="card mb-10 text-center py-8">
          <p className="text-white/70">
            Tickets are not yet on sale for this event. Check back soon.
          </p>
        </section>
      ) : (
        <section className="mb-10">
          <h2 className="section-heading mb-4">Tickets</h2>
          <div className="space-y-3">
            {ticketTypes.map((tt) => (
              <div key={tt.id} className="card flex items-center justify-between">
                <div>
                  <p className="font-heading text-brand-white">{tt.name}</p>
                  {tt.description && (
                    <p className="text-white/50 text-sm">{tt.description}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-heading text-brand-yellow text-xl">
                    {tt.price_cents === 0
                      ? "FREE"
                      : `$${(tt.price_cents / 100).toFixed(2)}`}
                  </p>
                  {tt.capacity && (
                    <p className="text-white/40 text-xs">
                      {tt.quantity_sold ?? 0}/{tt.capacity} sold
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
          <Link
            href={`/event/${event.slug ?? event.id}/checkout`}
            className="btn-primary mt-6 inline-block"
          >
            {event.cta_label || "Get Tickets"}
          </Link>
        </section>
      )}
    </main>
  );
}
