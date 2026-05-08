import { notFound } from "next/navigation";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props) {
  const supabase = createServerClient();
  const { data: event } = await supabase
    .from("events")
    .select("title, description")
    .eq("id", params.id)
    .single();
  if (!event) return { title: "Event Not Found" };
  return { title: event.title, description: event.description };
}

export default async function EventPage({ params }: Props) {
  const supabase = createServerClient();

  const { data: event } = await supabase
    .from("events")
    .select("*, organizers(name, avatar_url)")
    .eq("id", params.id)
    .single();

  if (!event) notFound();

  const { data: ticketTypes } = await supabase
    .from("ticket_types")
    .select("*")
    .eq("event_id", params.id)
    .eq("is_active", true)
    .order("price_cents", { ascending: true });

  return (
    <main className="max-w-4xl mx-auto px-4 py-10">
      <Link href="/" className="text-brand-yellow text-sm mb-6 inline-block hover:underline">
        ← All Events
      </Link>

      {event.cover_image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={event.cover_image_url}
          alt={event.title}
          className="w-full max-h-72 object-cover rounded-md mb-8"
        />
      )}

      <h1 className="font-heading text-4xl md:text-5xl text-brand-yellow mb-2">{event.title}</h1>
      <p className="text-white/60 mb-6">
        {new Date(event.start_at).toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })}
        {event.venue && ` · ${event.venue}`}
      </p>

      {event.description && (
        <p className="text-white/80 mb-8 leading-relaxed">{event.description}</p>
      )}

      {ticketTypes && ticketTypes.length > 0 && (
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
            href={`/event/${params.id}/checkout`}
            className="btn-primary mt-6 inline-block"
          >
            Get Tickets
          </Link>
        </section>
      )}
    </main>
  );
}
