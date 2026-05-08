# 785 Tickets — Architecture

Community-driven, offline-first event ticketing PWA for the Wichita 785 scene.  
Built with **Next.js 14 App Router**, **Supabase**, **Stripe Connect**, and **OneSignal**.

---

## Project Tree

```
seveneightfive-tickets/
├── docs/
│   └── ARCHITECTURE.md          # this file
├── public/
│   ├── manifest.json            # PWA manifest (theme: #FFCE03)
│   ├── sw-custom.js             # Workbox service worker — BackgroundSync for /api/checkins
│   └── icons/
│       ├── icon-192.png
│       └── icon-512.png
├── src/
│   ├── app/
│   │   ├── layout.tsx           # Root layout — Oswald + Inter fonts, brand tokens
│   │   ├── globals.css          # Tailwind base, brand utilities (.btn-primary, .card, etc.)
│   │   ├── page.tsx             # Home — upcoming events grid (server component, 60s ISR)
│   │   ├── middleware.ts        # Supabase session refresh on every request
│   │   ├── event/[id]/
│   │   │   ├── page.tsx         # Event detail — ticket types, metadata
│   │   │   ├── checkout/
│   │   │   │   └── page.tsx     # Client component — quantity picker → Stripe Checkout redirect
│   │   │   └── scan/
│   │   │       └── page.tsx     # QR scanner — online POST /api/checkins, offline queue via idb
│   │   ├── dashboard/
│   │   │   ├── page.tsx         # Organizer dashboard — event list (auth-guarded server component)
│   │   │   └── [eventId]/
│   │   │       └── page.tsx     # Event analytics — stat cards, SalesSummary recharts, recent sales
│   │   └── api/
│   │       ├── checkout/
│   │       │   └── route.ts     # POST — create Stripe Checkout Session with application_fee_amount
│   │       ├── checkins/
│   │       │   └── route.ts     # POST — validate QR secret, insert checkin record
│   │       ├── ticket-types/
│   │       │   └── route.ts     # GET  — public ticket type list for an event
│   │       ├── analytics/
│   │       │   └── sales-summary/
│   │       │       └── route.ts # GET  — daily revenue/tickets for recharts (organizer only)
│   │       ├── stripe/
│   │       │   ├── connect/
│   │       │   │   └── onboard/
│   │       │   │       └── route.ts  # POST — create/resume Stripe Connect onboarding link
│   │       │   └── webhook/
│   │       │       └── route.ts      # POST — handle checkout.session.completed → insert ticket_sales
│   │       └── notifications/
│   │           └── send/
│   │               └── route.ts      # POST — trigger OneSignal push, log to notifications table
│   ├── components/
│   │   └── SalesSummary.tsx     # Client recharts AreaChart — fetches /api/analytics/sales-summary
│   ├── hooks/
│   │   └── useOfflineSync.ts    # online/offline detection, idb queue drain on reconnect
│   ├── lib/
│   │   ├── stripe.ts            # Stripe SDK singleton + platform fee helpers
│   │   ├── onesignal.ts         # OneSignal browser SDK init, permission, tag helpers
│   │   ├── supabase/
│   │   │   ├── client.ts        # createBrowserClient (@supabase/ssr)
│   │   │   ├── server.ts        # createServerClient + createServiceClient
│   │   │   └── middleware.ts    # updateSession — refresh cookie on every request
│   │   └── offline/
│   │       └── db.ts            # idb schema + queue/drain helpers for offline check-ins
│   └── types/
│       └── database.ts          # TypeScript Database type stub (regen with supabase gen types)
└── supabase/
    └── migrations/
        ├── 20240001_785tickets_schema.sql   # All additive tables + RLS policies
        └── 20240002_rpc_increment_quantity.sql  # increment_ticket_quantity_sold() RPC
```

---

## Data Flow

### Ticket Purchase

```
Browser → /event/[id]/checkout (client)
        → POST /api/checkout
            ↳ validate ticket types (Supabase service role)
            ↳ stripe.checkout.sessions.create (on organizer's Connected Account)
                  application_fee_amount = subtotal × STRIPE_PLATFORM_FEE_BPS / 10000
        → redirectToCheckout (Stripe hosted page)
        → Stripe webhook → POST /api/stripe/webhook
            ↳ checkout.session.completed
            ↳ upsert attendee
            ↳ insert ticket_sales (status = 'paid')
            ↳ increment_ticket_quantity_sold()
```

### Check-in (Online)

```
Scanner (event/[id]/scan) → html5-qrcode decodes QR
  → POST /api/checkins { ticketId: qr_code_secret, eventId }
      ↳ verify ticket_sales.qr_code_secret + status = 'paid'
      ↳ check for existing checkins row (409 if duplicate)
      ↳ insert checkins
```

### Check-in (Offline)

```
Scanner → navigator.onLine = false
  → queueCheckin() → idb checkin-queue (IndexedDB)
  → Workbox BackgroundSyncPlugin also queues failed POST /api/checkins
  → window 'online' event fires
  → useOfflineSync.replayQueue() drains idb queue → POST /api/checkins per record
```

### Push Notification

```
Organizer/system → POST /api/notifications/send
  { title, body, eventId? | userIds? }
  → OneSignal REST API (filter by tag or external_id)
  → insert notifications row (for inbox)
```

---

## Auth & RLS Summary

| Table            | Public read              | Buyer read | Organizer read/write | Staff write (JWT claim)  |
|------------------|--------------------------|-----------|----------------------|--------------------------|
| ticket_types     | active rows              | —         | their events         | —                        |
| ticket_sales     | —                        | own rows  | their events         | —                        |
| checkins         | —                        | —         | their events (read)  | `app_metadata.event_staff = true` |
| notifications    | —                        | own rows  | —                    | service_role insert       |
| analytics_events | —                        | —         | their events         | service_role insert       |

---

## Environment Variables

| Variable                          | Where used              |
|-----------------------------------|-------------------------|
| `NEXT_PUBLIC_SUPABASE_URL`        | client + server         |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`   | client + server         |
| `SUPABASE_SERVICE_ROLE_KEY`       | server only (webhooks)  |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | client checkout      |
| `STRIPE_SECRET_KEY`               | server                  |
| `STRIPE_WEBHOOK_SECRET`           | webhook verification    |
| `STRIPE_PLATFORM_FEE_BPS`         | fee calculation (default 200 = 2%) |
| `NEXT_PUBLIC_ONESIGNAL_APP_ID`    | client + server         |
| `ONESIGNAL_REST_API_KEY`          | server push trigger     |
| `NEXT_PUBLIC_APP_URL`             | redirect URLs           |

---

## Brand

| Token        | Value     |
|--------------|-----------|
| Yellow       | `#FFCE03` |
| Red          | `#C80650` |
| Black        | `#0A0A0A` |
| White        | `#FAFAFA` |
| Heading font | Oswald (Google Fonts, `--font-oswald`) |
| Body font    | Inter (Google Fonts, `--font-inter`) |

---

## Getting Started

```bash
# Install dependencies
npm install

# Copy and fill env vars
cp .env.example .env.local

# Run Supabase migrations (against linked project)
supabase db push

# Generate TypeScript types
supabase gen types typescript --linked > src/types/database.ts

# Start dev server
npm run dev

# Register Stripe webhook (local)
stripe listen --forward-to localhost:3000/api/stripe/webhook
```
