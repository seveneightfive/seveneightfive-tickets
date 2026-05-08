import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: events } = await supabase
    .from("events")
    .select("id, title, start_at, venue")
    .eq("organizer_user_id", user.id)
    .order("start_at", { ascending: false });

  return (
    <main className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-10">
        <h1 className="font-heading text-4xl text-brand-yellow">Organizer Dashboard</h1>
        <Link href="/" className="text-white/60 hover:text-brand-yellow text-sm transition-colors">
          ← Public Site
        </Link>
      </div>

      <section>
        <h2 className="section-heading mb-6">Your Events</h2>
        {(!events || events.length === 0) && (
          <p className="text-white/50">No events yet. Create your first event on seveneightfive.com.</p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {events?.map((event) => (
            <Link
              key={event.id}
              href={`/dashboard/${event.id}`}
              className="card group hover:border-brand-yellow transition-colors"
            >
              <h3 className="font-heading text-brand-white group-hover:text-brand-yellow transition-colors">
                {event.title}
              </h3>
              <p className="text-white/50 text-sm mt-1">
                {new Date(event.start_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
                {event.venue && ` · ${event.venue}`}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
