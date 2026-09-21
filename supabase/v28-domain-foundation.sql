-- Art Nation V28 - additive domain foundation
-- Safe to run against the existing production schema. No existing tables or
-- rows are dropped or renamed; current events and bookings remain authoritative.

create table if not exists artworks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text,
  cover_image_path text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_artworks_active on artworks(active);

-- Existing painting-library guides are the initial canonical artwork records.
insert into artworks (title, slug, description, cover_image_path)
select g.title, g.slug, g.description, g.cover_image_path
from guides g
where not exists (select 1 from artworks a where a.slug = g.slug);

alter table guides add column if not exists artwork_id uuid references artworks(id) on delete set null;
update guides g
set artwork_id = a.id
from artworks a
where g.artwork_id is null and a.slug = g.slug;
create index if not exists idx_guides_artwork on guides(artwork_id);

alter table events add column if not exists artwork_id uuid references artworks(id) on delete set null;
alter table event_sessions add column if not exists service_id uuid;
alter table event_sessions add column if not exists artwork_id uuid references artworks(id) on delete set null;

update events e
set artwork_id = a.id
from guides g
join artworks a on a.id = g.artwork_id
where e.artwork_id is null and e.guide_id = g.id;

update event_sessions s
set artwork_id = e.artwork_id
from events e
where s.artwork_id is null and s.event_id = e.id;

create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  category text not null default 'other',
  description text,
  default_duration_minutes integer check (default_duration_minutes is null or default_duration_minutes > 0),
  default_price numeric(10,2) check (default_price is null or default_price >= 0),
  default_capacity integer check (default_capacity is null or default_capacity > 0),
  booking_behavior text not null default 'event_booking',
  artwork_selection text not null default 'optional',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint services_booking_behavior_check check (booking_behavior in ('event_booking','lesson','private_request','enquiry')),
  constraint services_artwork_selection_check check (artwork_selection in ('none','optional','required'))
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'event_sessions_service_id_fkey') then
    alter table event_sessions
      add constraint event_sessions_service_id_fkey
      foreign key (service_id) references services(id) on delete set null;
  end if;
end $$;

create index if not exists idx_event_sessions_service on event_sessions(service_id);
create index if not exists idx_event_sessions_artwork on event_sessions(artwork_id);
create index if not exists idx_events_artwork on events(artwork_id);

create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  student_type text not null default 'child',
  date_of_birth date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint students_type_check check (student_type in ('child','teenager','adult'))
);

create table if not exists student_guardians (
  student_id uuid not null references students(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  relationship text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (student_id, customer_id)
);

create index if not exists idx_student_guardians_customer on student_guardians(customer_id);
create unique index if not exists idx_student_guardians_one_primary
  on student_guardians(student_id)
  where is_primary = true;

create table if not exists lesson_packages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  lesson_count integer not null default 10 check (lesson_count > 0),
  price numeric(10,2) not null default 0 check (price >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists student_enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete restrict,
  purchaser_customer_id uuid references customers(id) on delete set null,
  package_id uuid not null references lesson_packages(id) on delete restrict,
  purchased_at timestamptz not null default now(),
  credits_purchased integer not null check (credits_purchased > 0),
  price_paid numeric(10,2) not null default 0 check (price_paid >= 0),
  order_id uuid references orders(id) on delete set null,
  status text not null default 'active',
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  constraint student_enrollments_status_check check (status in ('pending','active','completed','expired','cancelled'))
);

create index if not exists idx_student_enrollments_student on student_enrollments(student_id, status);
create index if not exists idx_student_enrollments_purchaser on student_enrollments(purchaser_customer_id);
create index if not exists idx_student_enrollments_order on student_enrollments(order_id);

create table if not exists lesson_credit_transactions (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references student_enrollments(id) on delete cascade,
  credit_delta integer not null check (credit_delta <> 0),
  transaction_type text not null,
  note text,
  idempotency_key text unique,
  created_at timestamptz not null default now(),
  constraint lesson_credit_transactions_type_check check (transaction_type in (
    'package_purchase', 'lesson_attendance', 'cancellation_charge',
    'no_show_charge', 'manual_adjustment', 'bonus', 'refund', 'reversal', 'correction'
  ))
);

create index if not exists idx_lesson_credit_transactions_enrollment
  on lesson_credit_transactions(enrollment_id, created_at);
create unique index if not exists idx_lesson_credit_transactions_opening
  on lesson_credit_transactions(enrollment_id)
  where transaction_type = 'package_purchase';

alter table artworks enable row level security;
alter table services enable row level security;
alter table students enable row level security;
alter table student_guardians enable row level security;
alter table lesson_packages enable row level security;
alter table student_enrollments enable row level security;
alter table lesson_credit_transactions enable row level security;

-- Initial package definition for the current operating model.
insert into lesson_packages (name, lesson_count, price)
select 'Standard Art Lessons - 10 Lessons', 10, 6000.00
where not exists (select 1 from lesson_packages where lesson_count = 10 and name = 'Standard Art Lessons - 10 Lessons');
