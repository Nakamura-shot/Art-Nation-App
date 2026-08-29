-- Art Nation V26 — Messenger Inbox + Direct Replies
-- Run once after V25.

create table if not exists messenger_messages (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete set null,
  psid text not null,
  direction text not null check (direction in ('inbound','outbound')),
  message_mid text,
  message_type text not null default 'text',
  body text,
  raw_payload jsonb,
  status text not null default 'received' check (status in ('received','sent','failed')),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table messenger_messages enable row level security;

create unique index if not exists messenger_messages_mid_unique
on messenger_messages(message_mid) where message_mid is not null;

create index if not exists idx_messenger_messages_customer_created
on messenger_messages(customer_id,created_at desc);

create index if not exists idx_messenger_messages_psid_created
on messenger_messages(psid,created_at desc);

create index if not exists idx_messenger_messages_unread
on messenger_messages(direction,read_at,created_at desc);
