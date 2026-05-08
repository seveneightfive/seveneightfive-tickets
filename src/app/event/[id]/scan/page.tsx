"use client";

import { useEffect, useRef, useState } from "react";
import { useOfflineSync } from "@/hooks/useOfflineSync";

interface Props {
  params: { id: string };
}

type ScanStatus = "idle" | "scanning" | "checking" | "valid" | "already_used" | "invalid" | "queued";

export default function ScanPage({ params }: Props) {
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const scannerRef = useRef<HTMLDivElement>(null);
  const { queueCheckin, isOnline } = useOfflineSync();

  useEffect(() => {
    let scanner: import("html5-qrcode").Html5Qrcode | null = null;

    async function startScanner() {
      const { Html5Qrcode } = await import("html5-qrcode");
      scanner = new Html5Qrcode("qr-reader");
      setStatus("scanning");

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          await scanner?.pause(true);
          setLastScanned(decodedText);
          setStatus("checking");

          if (!isOnline) {
            await queueCheckin({ ticketId: decodedText, eventId: params.id });
            setStatus("queued");
            setTimeout(() => {
              setStatus("scanning");
              scanner?.resume();
            }, 2000);
            return;
          }

          const res = await fetch("/api/checkins", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ticketId: decodedText, eventId: params.id }),
          });
          const data = await res.json();

          if (res.ok) {
            setStatus("valid");
          } else if (res.status === 409) {
            setStatus("already_used");
          } else {
            setStatus("invalid");
          }

          setTimeout(() => {
            setStatus("scanning");
            scanner?.resume();
          }, 2500);
        },
        () => {}
      );
    }

    startScanner();
    return () => {
      scanner?.stop().catch(() => {});
    };
  }, [params.id, isOnline, queueCheckin]);

  const statusColors: Record<ScanStatus, string> = {
    idle: "text-white/40",
    scanning: "text-white/60",
    checking: "text-brand-yellow",
    valid: "text-green-400",
    already_used: "text-brand-red",
    invalid: "text-brand-red",
    queued: "text-brand-yellow",
  };

  const statusMessages: Record<ScanStatus, string> = {
    idle: "Starting camera…",
    scanning: isOnline ? "Scan a ticket QR code" : "Offline mode — scans will sync later",
    checking: "Checking ticket…",
    valid: "✓ Valid — Entry granted",
    already_used: "✗ Already used",
    invalid: "✗ Invalid ticket",
    queued: "⟳ Queued for sync",
  };

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-8 bg-brand-black">
      <h1 className="font-heading text-3xl text-brand-yellow mb-2">Ticket Scanner</h1>
      <p className={`text-lg mb-6 font-heading ${statusColors[status]}`}>
        {statusMessages[status]}
      </p>

      {!isOnline && (
        <div className="bg-brand-red/20 border border-brand-red text-brand-red text-sm px-4 py-2 rounded mb-4">
          Offline — check-ins queued locally and will sync when reconnected.
        </div>
      )}

      <div
        id="qr-reader"
        ref={scannerRef}
        className="w-full max-w-sm rounded-md overflow-hidden border-2 border-brand-yellow"
      />

      {lastScanned && (
        <p className="mt-4 text-white/40 text-xs font-mono break-all max-w-xs text-center">
          {lastScanned}
        </p>
      )}
    </main>
  );
}
