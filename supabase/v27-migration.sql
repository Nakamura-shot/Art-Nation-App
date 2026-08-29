-- Art Nation V27 — Customer accounts, saved participants and participant Messenger invites
-- Run once after V26.

-- Link the public CRM customer to a Supabase Auth user when that customer chooses to log in.
alter table customers add column if not exists auth_user_id uuid;
create unique index if not exists customers_auth_user_id_unique
on customers(auth_user_id) where auth_user_id is not null;

-- Participant identity is now standardised: adults need only a name; children also need an age.
alter table participants add column if not exists full_name text;
alter table participants add column if not exists is_child boolean not null default false;
alter table participants add column if not exists age integer;
alter table participants add column if not exists customer_id uuid references customers(id) on delete set null;

-- Best-effort backfill for old bookings that stored these values inside answers JSON.
update participants
set full_name = coalesce(full_name, nullif(answers->>'full-name',''), nullif(answers->>'full_name',''), nullif(answers->>'name',''))
where full_name is null;

create index if not exists idx_participants_customer on participants(customer_id);
create index if not exists idx_participants_booking on participants(booking_id,participant_no);

-- People a logged-in customer regularly books for.
create table if not exists saved_participants (
  id uuid primary key default gen_random_uuid(),
  owner_customer_id uuid not null references customers(id) on delete cascade,
  linked_customer_id uuid references customers(id) on delete set null,
  full_name text not null,
  is_child boolean not null default false,
  age integer,
  last_used_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint saved_participant_child_age check ((is_child = false and age is null) or (is_child = true and age between 1 and 17))
);

alter table saved_participants enable row level security;
create index if not exists idx_saved_participants_owner on saved_participants(owner_customer_id,last_used_at desc);
create index if not exists idx_saved_participants_linked on saved_participants(linked_customer_id);

-- A Messenger connection token may now belong to an invited adult participant before that
-- participant has their own CRM customer record.
alter table messenger_connection_tokens alter column customer_id drop not null;
alter table messenger_connection_tokens add column if not exists participant_id uuid references participants(id) on delete cascade;
create index if not exists idx_messenger_connection_tokens_participant on messenger_connection_tokens(participant_id,created_at desc);

-- Full name / child age are now first-class participant fields in the booking form.
-- Remove redundant old generic age/sex/gender/name intake questions from existing event forms.
delete from form_fields
where lower(replace(field_key,'_','-')) in ('full-name','participant-name','participant-age','age','sex','gender')
   or lower(trim(label)) in ('full name','participant name','age','sex','gender');
