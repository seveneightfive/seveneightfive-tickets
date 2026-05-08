-- =============================================================================
-- 785 Tickets — additive schema
-- Assumes events, users, organizers tables already exist from seveneightfive.com
-- =============================================================================

-- ──────────────────────────────────────────────────────────────────────────────
-- Extensions
-- ──────────────────────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- ──────────────────────────────────────────────────────────────────────────────
-- ticket_types
-- ──────────────────────────────────────────────────────────────────────────────
create table if not exists ticket_types (
  id              uuid primary key default gen_random_uuid(),
  event_id        uuid not null references events(id) on delete cascade,
  name            text not null,
  description     text,
  price_cents     integer not null default 0 check (price_cents >= 0),
  capacity        integer,
  quantity_sold   integer not null default 0,
  is_active       boolean not null default true,
  stripe_price_id text,
  sale_starts_at  timestamptz,
  sale_ends_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table ticket_types enable row level security;

-- Public can read active ticket types for public events
create policy "ticket_types: public read"
  on ticket_types for select
  using (is_active = true);

-- Organizers can manage their event's ticket types
create policy "ticket_types: organizer manage"
  on ticket_types for all
  using (
    exists (
      select 1 from events e
      where e.id = ticket_types.event_id
        and e.organizer_user_id = auth.uid()
    )
  );

-- ──────────────────────────────────────────────────────────────────────────────
-- attendees
-- ──────────────────────────────────────────────────────────────────────────────
create table if not exists attendees (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete set null,
  name       text not null,
  email      text not null,
  phone      text,
  created_at timestamptz not null default now()
);

alter table attendees enable row level security;

create policy "attendees: owner read"
  on attendees for select
  using (user_id = auth.uid());

create policy "attendees: owner insert"
  on attendees for insert
  with check (user_id = auth.uid() or user_id is null);

-- ──────────────────────────────────────────────────────────────────────────────
-- ticket_sales
-- ──────────────────────────────────────────────────────────────────────────────
create table if not exists ticket_sales (
  id                    uuid primary key default gen_random_uuid(),
  event_id              uuid not null references events(id) on delete cascade,
  ticket_type_id        uuid not null references ticket_types(id),
  attendee_id           uuid references attendees(id),
  quantity              integer not null default 1 check (quantity > 0),
  unit_price_cents      integer not null default 0,
  total_cents           integer not null default 0,
  platform_fee_cents    integer not null default 0,
  stripe_session_id     text unique,
  stripe_payment_intent text,
  status                text not null default 'pending'
                          check (status in ('pending','paid','refunded','cancelled')),
  qr_code_secret        text not null default encode(gen_random_bytes(16), 'hex'),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

alter table ticket_sales enable row level security;

-- Buyer can see their own sales
create policy "ticket_sales: buyer read"
  on ticket_sales for select
  using (
    attendee_id in (
      select id from attendees where user_id = auth.uid()
    )
  );

-- Organizer of the event can read all sales for that event
create policy "ticket_sales: organizer read"
  on ticket_sales for select
  using (
    exists (
      select 1 from events e
      where e.id = ticket_sales.event_id
        and e.organizer_user_id = auth.uid()
    )
  );

-- Service role inserts sales (via webhook)
create policy "ticket_sales: service insert"
  on ticket_sales for insert
  with check (auth.role() = 'service_role');

-- ──────────────────────────────────────────────────────────────────────────────
-- checkins
-- ──────────────────────────────────────────────────────────────────────────────
create table if not exists checkins (
  id             uuid primary key default gen_random_uuid(),
  event_id       uuid not null references events(id) on delete cascade,
  ticket_sale_id uuid not null references ticket_sales(id),
  checked_in_at  timestamptz not null default now(),
  checked_in_by  uuid references auth.users(id),
  device_id      text,
  synced_at      timestamptz
);

alter table checkins enable row level security;

-- Only staff can write check-ins (JWT claim 'event_staff' = true)
create policy "checkins: staff insert"
  on checkins for insert
  with check (
    (auth.jwt() -> 'app_metadata' ->> 'event_staff')::boolean = true
    or auth.role() = 'service_role'
  );

-- Organizer can read check-ins for their events
create policy "checkins: organizer read"
  on checkins for select
  using (
    exists (
      select 1 from events e
      where e.id = checkins.event_id
        and e.organizer_user_id = auth.uid()
    )
  );

-- ──────────────────────────────────────────────────────────────────────────────
-- donations
-- ──────────────────────────────────────────────────────────────────────────────
create table if not exists donations (
  id                    uuid primary key default gen_random_uuid(),
  event_id              uuid not null references events(id) on delete cascade,
  attendee_id           uuid references attendees(id),
  amount_cents          integer not null check (amount_cents > 0),
  message               text,
  is_anonymous          boolean not null default false,
  stripe_payment_intent text,
  created_at            timestamptz not null default now()
);

alter table donations enable row level security;

create policy "donations: public read non-anon"
  on donations for select
  using (is_anonymous = false);

create policy "donations: donor read own"
  on donations for select
  using (
    attendee_id in (
      select id from attendees where user_id = auth.uid()
    )
  );

create policy "donations: service insert"
  on donations for insert
  with check (auth.role() = 'service_role');

-- ──────────────────────────────────────────────────────────────────────────────
-- merchandise
-- ──────────────────────────────────────────────────────────────────────────────
create table if not exists merchandise (
  id              uuid primary key default gen_random_uuid(),
  event_id        uuid references events(id) on delete set null,
  name            text not null,
  description     text,
  price_cents     integer not null check (price_cents >= 0),
  image_url       text,
  inventory       integer,
  stripe_price_id text,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

alter table merchandise enable row level security;

create policy "merchandise: public read active"
  on merchandise for select
  using (is_active = true);

create policy "merchandise: organizer manage"
  on merchandise for all
  using (
    event_id is null
    or exists (
      select 1 from events e
      where e.id = merchandise.event_id
        and e.organizer_user_id = auth.uid()
    )
  );

-- ──────────────────────────────────────────────────────────────────────────────
-- merch_orders
-- ──────────────────────────────────────────────────────────────────────────────
create table if not exists merch_orders (
  id                    uuid primary key default gen_random_uuid(),
  attendee_id           uuid references attendees(id),
  merchandise_id        uuid not null references merchandise(id),
  quantity              integer not null default 1 check (quantity > 0),
  total_cents           integer not null default 0,
  stripe_session_id     text unique,
  status                text not null default 'pending'
                          check (status in ('pending','paid','shipped','cancelled')),
  shipping_address      jsonb,
  created_at            timestamptz not null default now()
);

alter table merch_orders enable row level security;

create policy "merch_orders: buyer read"
  on merch_orders for select
  using (
    attendee_id in (
      select id from attendees where user_id = auth.uid()
    )
  );

create policy "merch_orders: service insert"
  on merch_orders for insert
  with check (auth.role() = 'service_role');

-- ──────────────────────────────────────────────────────────────────────────────
-- reviews
-- ──────────────────────────────────────────────────────────────────────────────
create table if not exists reviews (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references events(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  rating     smallint not null check (rating between 1 and 5),
  body       text,
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

alter table reviews enable row level security;

create policy "reviews: public read"
  on reviews for select using (true);

create policy "reviews: authenticated insert"
  on reviews for insert
  with check (auth.uid() = user_id);

create policy "reviews: owner update"
  on reviews for update
  using (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────────────────────────
-- comments
-- ──────────────────────────────────────────────────────────────────────────────
create table if not exists comments (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references events(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  parent_id  uuid references comments(id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now()
);

alter table comments enable row level security;

create policy "comments: public read"
  on comments for select using (true);

create policy "comments: authenticated insert"
  on comments for insert
  with check (auth.uid() = user_id);

create policy "comments: owner delete"
  on comments for delete
  using (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────────────────────────
-- live_streams
-- ──────────────────────────────────────────────────────────────────────────────
create table if not exists live_streams (
  id              uuid primary key default gen_random_uuid(),
  event_id        uuid not null references events(id) on delete cascade,
  mux_stream_id   text,
  mux_playback_id text,
  status          text not null default 'scheduled'
                    check (status in ('scheduled','active','ended')),
  started_at      timestamptz,
  ended_at        timestamptz,
  created_at      timestamptz not null default now()
);

alter table live_streams enable row level security;

create policy "live_streams: public read active"
  on live_streams for select
  using (status in ('active','ended'));

create policy "live_streams: organizer manage"
  on live_streams for all
  using (
    exists (
      select 1 from events e
      where e.id = live_streams.event_id
        and e.organizer_user_id = auth.uid()
    )
  );

-- ──────────────────────────────────────────────────────────────────────────────
-- notifications
-- ──────────────────────────────────────────────────────────────────────────────
create table if not exists notifications (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references auth.users(id) on delete cascade,
  event_id         uuid references events(id) on delete cascade,
  type             text not null,
  title            text not null,
  body             text,
  data             jsonb,
  is_read          boolean not null default false,
  onesignal_id     text,
  created_at       timestamptz not null default now()
);

alter table notifications enable row level security;

create policy "notifications: owner read"
  on notifications for select
  using (user_id = auth.uid());

create policy "notifications: service insert"
  on notifications for insert
  with check (auth.role() = 'service_role');

create policy "notifications: owner update"
  on notifications for update
  using (user_id = auth.uid());

-- ──────────────────────────────────────────────────────────────────────────────
-- analytics_events
-- ──────────────────────────────────────────────────────────────────────────────
create table if not exists analytics_events (
  id         bigint primary key generated always as identity,
  event_id   uuid references events(id) on delete cascade,
  user_id    uuid references auth.users(id) on delete set null,
  session_id text,
  name       text not null,
  properties jsonb,
  occurred_at timestamptz not null default now()
);

alter table analytics_events enable row level security;

-- Only service role writes; organizer reads for their event
create policy "analytics_events: service insert"
  on analytics_events for insert
  with check (auth.role() = 'service_role');

create policy "analytics_events: organizer read"
  on analytics_events for select
  using (
    event_id is null
    or exists (
      select 1 from events e
      where e.id = analytics_events.event_id
        and e.organizer_user_id = auth.uid()
    )
  );

-- ──────────────────────────────────────────────────────────────────────────────
-- Indexes
-- ──────────────────────────────────────────────────────────────────────────────
create index if not exists idx_ticket_types_event_id on ticket_types(event_id);
create index if not exists idx_ticket_sales_event_id on ticket_sales(event_id);
create index if not exists idx_ticket_sales_attendee_id on ticket_sales(attendee_id);
create index if not exists idx_ticket_sales_stripe_session on ticket_sales(stripe_session_id);
create index if not exists idx_checkins_event_id on checkins(event_id);
create index if not exists idx_checkins_ticket_sale_id on checkins(ticket_sale_id);
create index if not exists idx_notifications_user_id on notifications(user_id);
create index if not exists idx_analytics_events_event_id on analytics_events(event_id);

-- ──────────────────────────────────────────────────────────────────────────────
-- updated_at trigger helper
-- ──────────────────────────────────────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_ticket_types_updated_at
  before update on ticket_types
  for each row execute function set_updated_at();

create trigger set_ticket_sales_updated_at
  before update on ticket_sales
  for each row execute function set_updated_at();
