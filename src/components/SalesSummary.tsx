"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useEffect, useState } from "react";

interface DailySale {
  date: string;
  revenue: number;
  tickets: number;
}

export function SalesSummary({ eventId }: { eventId: string }) {
  const [data, setData] = useState<DailySale[]>([]);

  useEffect(() => {
    fetch(`/api/analytics/sales-summary?eventId=${eventId}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, [eventId]);

  if (data.length === 0) return null;

  return (
    <section>
      <h2 className="section-heading mb-4">Sales Over Time</h2>
      <div className="card">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FFCE03" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#FFCE03" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} />
            <YAxis
              tickFormatter={(v) => `$${v}`}
              tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
            />
            <Tooltip
              contentStyle={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)" }}
              labelStyle={{ color: "#FFCE03" }}
              formatter={(value: number) => [`$${value.toFixed(2)}`, "Revenue"]}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#FFCE03"
              strokeWidth={2}
              fill="url(#colorRevenue)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
