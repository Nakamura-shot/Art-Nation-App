-- Art Nation Cebu booking + guide platform starter schema
create extension if not exists pgcrypto;

create table locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table event_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text,
  event_type_id uuid references event_types(id),
  guide_id uuid,
  created_at timestamptz not null default now()
);

create table event_sessions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  location_id uuid not null references locations(id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  capacity integer not null check (capacity > 0),
  regular_price numeric(10,2) not null,
  early_bird_price numeric(10,2),
  early_bird_until timestamptz,
  active boolean not null default true
);

create table form_fields (
  id uuid primary key default gen_random_uuid(),
  event_session_id uuid not null references event_sessions(id) on delete cascade,
  label text not null,
  field_key text not null,
  field_type text not null check (field_type in ('text','number','select','checkbox','textarea')),
  required boolean not null default false,
  options jsonb,
  sort_order integer not null default 0
);

create table customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  phone text,
  marketing_opt_in boolean not null default false,
  created_at timestamptz not null default now()
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id),
  status text not null default 'payment_pending',
  total numeric(10,2) not null default 0,
  created_at timestamptz not null default now()
);

create table bookings (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  event_session_id uuid not null references event_sessions(id),
  quantity integer not null check (quantity > 0),
  unit_price numeric(10,2) not null,
  status text not null default 'payment_pending',
  created_at timestamptz not null default now()
);

create table participants (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  participant_no integer not null,
  answers jsonb not null default '{}'::jsonb
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  method text not null,
  amount numeric(10,2) not null,
  receipt_path text,
  status text not null default 'pending_review',
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create table coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_type text not null check (discount_type in ('fixed','percent')),
  discount_value numeric(10,2) not null,
  valid_from timestamptz,
  valid_until timestamptz,
  max_uses integer,
  active boolean not null default true
);

create table guides (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text,
  difficulty text,
  estimated_minutes integer,
  created_at timestamptz not null default now()
);

create table guide_steps (
  id uuid primary key default gen_random_uuid(),
  guide_id uuid not null references guides(id) on delete cascade,
  step_no integer not null,
  title text not null,
  instructions text,
  image_path text,
  video_url text,
  technique_id uuid
);

create table techniques (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  instructions text,
  image_path text,
  video_url text
);

create table customer_guide_access (
  customer_id uuid not null references customers(id) on delete cascade,
  guide_id uuid not null references guides(id) on delete cascade,
  source text not null,
  granted_at timestamptz not null default now(),
  primary key (customer_id, guide_id)
);

-- Private receipt bucket. Files are accessed only through short-lived signed URLs in the admin UI.
insert into storage.buckets (id, name, public)
values ('payment-receipts', 'payment-receipts', false)
on conflict (id) do nothing;

-- The application talks to these tables through server-side routes using the service role.
-- RLS blocks direct browser access by default.
alter table locations enable row level security;
alter table event_types enable row level security;
alter table events enable row level security;
alter table event_sessions enable row level security;
alter table form_fields enable row level security;
alter table customers enable row level security;
alter table orders enable row level security;
alter table bookings enable row level security;
alter table participants enable row level security;
alter table payments enable row level security;
alter table coupons enable row level security;
alter table guides enable row level security;
alter table guide_steps enable row level security;
alter table techniques enable row level security;
alter table customer_guide_access enable row level security;

create index if not exists idx_event_sessions_starts on event_sessions(starts_at);
create index if not exists idx_bookings_session on bookings(event_session_id);
create index if not exists idx_bookings_order on bookings(order_id);
create index if not exists idx_payments_order on payments(order_id);
