"use client";

import { useCallback, useEffect, useState } from "react";
import {
  queueCheckinOffline,
  getPendingCheckins,
  markCheckinSynced,
  clearSyncedCheckins,
} from "@/lib/offline/db";

interface CheckinPayload {
  ticketId: string;
  eventId: string;
}

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
      replayQueue();
    }
    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    getPendingCheckins().then((records) => setPendingCount(records.length));
  }, []);

  const replayQueue = useCallback(async () => {
    const pending = await getPendingCheckins();
    if (pending.length === 0) return;

    const results = await Promise.allSettled(
      pending.map(async (record) => {
        const res = await fetch("/api/checkins", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticketId: record.ticketId, eventId: record.eventId }),
        });
        if (res.ok || res.status === 409) {
          await markCheckinSynced(record.id);
        }
      })
    );

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    if (succeeded > 0) {
      await clearSyncedCheckins();
      setPendingCount(0);
    }
  }, []);

  const queueCheckin = useCallback(
    async (payload: CheckinPayload) => {
      await queueCheckinOffline(payload);
      const pending = await getPendingCheckins();
      setPendingCount(pending.length);
    },
    []
  );

  return { isOnline, pendingCount, queueCheckin, replayQueue };
}
