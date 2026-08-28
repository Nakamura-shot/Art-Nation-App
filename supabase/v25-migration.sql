-- Art Nation V25 — cPanel IMAP/SMTP email + editable templates
-- Run once after V24 (or after V23 if you skipped the Gmail version).
-- Uses the existing communication_templates table created in V22.

-- Art Nation V25 uses cPanel directly. These tables are independent of Google OAuth.

create table if not exists email_send_log (
  id uuid primary key default gen_random_uuid(),
  email_account_id uuid,
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


insert into communication_templates(name,channel,category,subject,body,active)
select * from (values
 ('Booking Received','email','booking',
  'We received your Art Nation booking — {{event_title}}',
  'Hi {{first_name}},

Thank you for booking {{event_title}} with Art Nation Cebu.

Booking reference: {{booking_reference}}
Date: {{event_date}}
Time: {{event_time}}
Location: {{location}}
Participants: {{quantity}}

We have received your reservation and will update you once your payment has been verified.

See you soon!
Art Nation Cebu',true),

 ('Payment Confirmed','email','payment',
  'Your Art Nation booking is confirmed — {{event_title}}',
  'Hi {{first_name}},

Your payment has been verified and your booking for {{event_title}} is confirmed. 🎨

Booking reference: {{booking_reference}}
Date: {{event_date}}
Time: {{event_time}}
Location: {{location}}
Participants: {{quantity}}

We look forward to painting with you!

Art Nation Cebu',true),

 ('Event Reminder','email','reminder',
  'Reminder: {{event_title}} is coming up',
  'Hi {{first_name}},

Just a friendly reminder about your upcoming Art Nation session.

{{event_title}}
{{event_date}} at {{event_time}}
{{location}}

Please arrive a little early so everyone can get settled before we begin.

See you soon!
Art Nation Cebu',true),

 ('Painting Guide Ready','email','guide',
  'Your Art Nation painting guide is ready',
  'Hi {{first_name}},

Your Art Nation painting guide is ready.

Open your guides here:
{{my_guides_url}}

Happy painting!
Art Nation Cebu',true),

 ('Thank You & Review','email','follow_up',
  'Thank you for painting with Art Nation Cebu!',
  'Hi {{first_name}},

Thank you for joining us for {{event_title}}. We hope you had a wonderful time creating your painting with us.

If you enjoyed your experience, we would really appreciate a Facebook recommendation or review. Your feedback helps more people discover Art Nation Cebu.

Thank you again for painting with us! 🎨

Art Nation Cebu',true),

 ('New Workshops & Special Offers','email','promotion',
  'New workshops from Art Nation Cebu 🎨',
  'Hi {{first_name}},

We have new Art Nation workshops coming up and wanted to share them with you.

{{custom_content}}

We would love to paint with you again.

Art Nation Cebu',true)
) as v(name,channel,category,subject,body,active)
where not exists (
 select 1 from communication_templates t
 where t.channel='email' and t.name=v.name
);

