-- Art Nation V23 — Messenger Connection
-- Run once after V22.

alter table customers add column if not exists messenger_psid text;
alter table customers add column if not exists messenger_connected_at timestamptz;
alter table customers add column if not exists messenger_transactional_opt_in boolean not null default false;
alter table customers add column if not exists messenger_marketing_opt_in boolean not null default false;
alter table customers add column if not exists messenger_consent_at timestamptz;
alter table customers add column if not exists messenger_consent_source text;

create unique index if not exists customers_messenger_psid_unique
on customers(messenger_psid) where messenger_psid is not null;

create table if not exists messenger_connection_tokens (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  customer_id uuid not null references customers(id) on delete cascade,
  booking_id uuid references bookings(id) on delete set null,
  transactional_opt_in boolean not null default true,
  marketing_opt_in boolean not null default false,
  source text,
  expires_at timestamptz not null default (now() + interval '7 days'),
  used_at timestamptz,
  created_at timestamptz not null default now()
);

alter table messenger_connection_tokens enable row level security;

create index if not exists idx_messenger_connection_tokens_customer
on messenger_connection_tokens(customer_id,created_at desc);
create index if not exists idx_messenger_connection_tokens_token
on messenger_connection_tokens(token);

