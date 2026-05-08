"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface TicketType {
  id: string;
  name: string;
  price_cents: number;
  description: string | null;
  capacity: number | null;
  quantity_sold: number | null;
}

interface Props {
  params: { id: string };
}

export default function CheckoutPage({ params }: Props) {
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch(`/api/ticket-types?eventId=${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        setTicketTypes(data);
        const init: Record<string, number> = {};
        data.forEach((tt: TicketType) => (init[tt.id] = 0));
        setQuantities(init);
      });
  }, [params.id]);

  const total = ticketTypes.reduce(
    (sum, tt) => sum + tt.price_cents * (quantities[tt.id] ?? 0),
    0
  );

  async function handleCheckout() {
    setLoading(true);
    const lineItems = ticketTypes
      .filter((tt) => (quantities[tt.id] ?? 0) > 0)
      .map((tt) => ({ ticketTypeId: tt.id, quantity: quantities[tt.id] }));

    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId: params.id, lineItems }),
    });

    const { sessionId, error } = await res.json();
    if (error) {
      alert(error);
      setLoading(false);
      return;
    }

    const stripe = await stripePromise;
    await stripe?.redirectToCheckout({ sessionId });
    setLoading(false);
  }

  return (
    <main className="max-w-lg mx-auto px-4 py-10">
      <h1 className="font-heading text-3xl text-brand-yellow mb-8">Select Tickets</h1>

      <div className="space-y-4 mb-8">
        {ticketTypes.map((tt) => {
          const available = tt.capacity ? tt.capacity - (tt.quantity_sold ?? 0) : Infinity;
          return (
            <div key={tt.id} className="card flex items-center justify-between gap-4">
              <div className="flex-1">
                <p className="font-heading text-brand-white">{tt.name}</p>
                {tt.description && (
                  <p className="text-white/50 text-sm">{tt.description}</p>
                )}
                <p className="text-brand-yellow font-heading">
                  {tt.price_cents === 0 ? "FREE" : `$${(tt.price_cents / 100).toFixed(2)}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="w-8 h-8 rounded border border-white/20 text-white hover:border-brand-yellow transition-colors"
                  onClick={() =>
                    setQuantities((q) => ({ ...q, [tt.id]: Math.max(0, (q[tt.id] ?? 0) - 1) }))
                  }
                >
                  −
                </button>
                <span className="w-6 text-center">{quantities[tt.id] ?? 0}</span>
                <button
                  className="w-8 h-8 rounded border border-white/20 text-white hover:border-brand-yellow transition-colors"
                  disabled={(quantities[tt.id] ?? 0) >= available}
                  onClick={() =>
                    setQuantities((q) => ({
                      ...q,
                      [tt.id]: Math.min(available, (q[tt.id] ?? 0) + 1),
                    }))
                  }
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between mb-6">
        <span className="font-heading text-white/60">Total</span>
        <span className="font-heading text-2xl text-brand-yellow">
          ${(total / 100).toFixed(2)}
        </span>
      </div>

      <button
        className="btn-primary w-full disabled:opacity-50"
        disabled={total === 0 || loading}
        onClick={handleCheckout}
      >
        {loading ? "Redirecting…" : "Checkout with Stripe"}
      </button>
    </main>
  );
}
