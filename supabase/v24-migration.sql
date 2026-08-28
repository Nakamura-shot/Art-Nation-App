-- Art Nation V24 — Gmail / Google Workspace email
-- Run once after V23.

create table if not exists email_accounts (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'google',
  email_address text not null unique,
  display_name text,
  refresh_token_encrypted text not null,
  scopes text,
  active boolean not null default true,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table email_accounts enable row level security;

create table if not exists email_send_log (
  id uuid primary key default gen_random_uuid(),
  email_account_id uuid references email_accounts(id) on delete set null,
  customer_id uuid references customers(id) on delete set null,
  booking_id uuid references bookings(id) on delete set null,
  gmail_message_id text,
  gmail_thread_id text,
  recipient text not null,
  subject text,
  body text not null,
  status text not null default 'sent',
  created_at timestamptz not null default now()
);

alter table email_send_log enable row level security;
create index if not exists idx_email_send_log_customer on email_send_log(customer_id,created_at desc);
create index if not exists idx_email_send_log_thread on email_send_log(gmail_thread_id);

