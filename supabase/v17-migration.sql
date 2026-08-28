-- Art Nation V17 migration
-- Run this ONCE in Supabase SQL Editor after V16.

alter table participants add column if not exists guide_email text;


alter table bookings add column if not exists reference text;
update bookings
set reference = upper(substr(replace(id::text,'-',''),1,8))
where reference is null;
alter table bookings alter column reference set default upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
create unique index if not exists idx_bookings_reference on bookings(reference);


create table if not exists guide_entitlements (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references bookings(id) on delete cascade,
  participant_id uuid references participants(id) on delete cascade,
  participant_no integer,
  guide_id uuid not null references guides(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  assigned_email text,
  claim_code text not null unique default encode(gen_random_bytes(16),'hex'),
  status text not null default 'unclaimed' check (status in ('unclaimed','assigned','claimed','revoked')),
  source text not null default 'booking',
  created_at timestamptz not null default now(),
  claimed_at timestamptz
);

create unique index if not exists idx_entitlement_participant_guide
  on guide_entitlements(participant_id, guide_id)
  where participant_id is not null;
create index if not exists idx_entitlement_booking on guide_entitlements(booking_id);
create index if not exists idx_entitlement_customer on guide_entitlements(customer_id);
alter table guide_entitlements enable row level security;

create table if not exists event_guide_access_codes (
  id uuid primary key default gen_random_uuid(),
  event_session_id uuid not null references event_sessions(id) on delete cascade,
  guide_id uuid not null references guides(id) on delete cascade,
  code text not null unique,
  label text,
  starts_at timestamptz,
  expires_at timestamptz not null,
  max_claims integer,
  claims integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists event_guide_access_claims (
  id uuid primary key default gen_random_uuid(),
  access_code_id uuid not null references event_guide_access_codes(id) on delete cascade,
  entitlement_id uuid not null references guide_entitlements(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  claimed_at timestamptz not null default now(),
  unique(access_code_id, entitlement_id)
);

alter table event_guide_access_codes enable row level security;
alter table event_guide_access_claims enable row level security;
create index if not exists idx_event_access_session on event_guide_access_codes(event_session_id);
create index if not exists idx_event_access_code on event_guide_access_codes(code);
