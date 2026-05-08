import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";

const SendSchema = z.object({
  eventId: z.string().uuid().optional(),
  userIds: z.array(z.string()).optional(),
  title: z.string().min(1),
  body: z.string().min(1),
  data: z.record(z.unknown()).optional(),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = SendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { eventId, userIds, title, body: notifBody, data } = parsed.data;

  const payload: Record<string, unknown> = {
    app_id: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID,
    headings: { en: title },
    contents: { en: notifBody },
    ...(data && { data }),
  };

  if (userIds && userIds.length > 0) {
    payload.include_aliases = { external_id: userIds };
    payload.target_channel = "push";
  } else if (eventId) {
    payload.filters = [{ field: "tag", key: `event_${eventId}`, relation: "exists" }];
  } else {
    payload.included_segments = ["All"];
  }

  const res = await fetch("https://onesignal.com/api/v1/notifications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${process.env.ONESIGNAL_REST_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  const result: unknown = await res.json();
  if (!res.ok) {
    return NextResponse.json({ error: result }, { status: res.status });
  }

  const onesignalId =
    result && typeof result === "object" && "id" in result ? (result as { id: string }).id : null;

  if (onesignalId) {
    const supabase = createServiceClient();
    if (userIds && userIds.length > 0) {
      await Promise.all(
        userIds.map((uid) =>
          supabase.from("notifications").insert({
            user_id: uid,
            event_id: eventId ?? null,
            type: "push",
            title,
            body: notifBody,
            data: data ?? null,
            onesignal_id: onesignalId,
          })
        )
      );
    } else {
      await supabase.from("notifications").insert({
        user_id: null,
        event_id: eventId ?? null,
        type: "broadcast",
        title,
        body: notifBody,
        data: data ?? null,
        onesignal_id: onesignalId,
      });
    }
  }

  return NextResponse.json({ success: true, result });
}
