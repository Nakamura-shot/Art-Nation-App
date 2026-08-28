-- Art Nation V22 migration
-- Run once after V21.

alter table customers add column if not exists messenger_name text;
alter table customers add column if not exists messenger_url text;

create table if not exists communication_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  channel text not null default 'messenger' check (channel in ('messenger','email','sms')),
  category text,
  subject text,
  body text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists communication_log (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete set null,
  booking_id uuid references bookings(id) on delete set null,
  template_id uuid references communication_templates(id) on delete set null,
  channel text not null check (channel in ('messenger','email','sms')),
  destination text,
  message_body text not null,
  status text not null default 'prepared' check (status in ('prepared','sent_manual','sent','failed')),
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

alter table communication_templates enable row level security;
alter table communication_log enable row level security;

create index if not exists idx_communication_log_customer on communication_log(customer_id,created_at desc);
create index if not exists idx_communication_log_booking on communication_log(booking_id,created_at desc);

insert into communication_templates(name,channel,category,body)
select * from (values
 ('Payment Confirmed','messenger','payment','Hi {{first_name}}! 🎨 Your payment for {{event_title}} has been confirmed. Your booking reference is {{booking_reference}} for {{quantity}} participant(s). We look forward to painting with you at {{location}} on {{event_date}}.'),
 ('Event Reminder','messenger','reminder','Hi {{first_name}}! Just a friendly reminder about {{event_title}} at {{location}} on {{event_date}} at {{event_time}}. Please arrive a little early so we can get everyone settled before we begin. 🎨 See you soon!'),
 ('Guide Ready','messenger','guide','Hi {{first_name}}! 🎨 Your Art Nation painting guide for {{event_title}} is ready. You can access your guides here: {{my_guides_url}}'),
 ('Review Request','messenger','follow_up','Hi {{first_name}}! Thank you for joining {{event_title}}. We hope you had a wonderful time painting with us! 🎨 If you enjoyed the experience, we’d really appreciate a Facebook recommendation or review. Thank you for supporting Art Nation Cebu!'),
 ('Manual Registration Follow-up','messenger','booking','Hi {{first_name}}! We noticed your registration for {{event_title}} is not yet complete. If it’s more convenient, we can help register you manually. Just reply here and we’ll assist you. 🎨')
) as v(name,channel,category,body)
where not exists (select 1 from communication_templates);
