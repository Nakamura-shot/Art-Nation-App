-- Art Nation V30 - teacher, capability, availability and staffing foundation.
-- Forward-only; review and apply separately after V29.
create table if not exists teachers (
  id uuid primary key default gen_random_uuid(), full_name text not null,
  profile_image_path text, email text, phone text,
  engagement_type text not null default 'freelance' check (engagement_type in ('permanent','part_time','freelance')),
  active boolean not null default true, can_lead boolean not null default false,
  can_assist boolean not null default true, notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists teacher_capabilities (
  id uuid primary key default gen_random_uuid(), name text not null unique, active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists teacher_capability_links (
  teacher_id uuid not null references teachers(id) on delete cascade,
  capability_id uuid not null references teacher_capabilities(id) on delete cascade,
  primary key (teacher_id, capability_id)
);
create table if not exists teacher_availability (
  id uuid primary key default gen_random_uuid(), teacher_id uuid not null references teachers(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6), start_time time not null, end_time time not null,
  timezone text not null default 'Asia/Manila', notes text, active boolean not null default true,
  check (end_time > start_time)
);
create table if not exists event_session_teacher_assignments (
  id uuid primary key default gen_random_uuid(), event_session_id uuid not null references event_sessions(id) on delete cascade,
  teacher_id uuid not null references teachers(id) on delete restrict,
  role text not null default 'assistant' check (role in ('lead','assistant')),
  status text not null default 'assigned' check (status in ('applied','proposed','assigned','declined','withdrawn','removed')),
  notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index if not exists idx_session_one_lead_teacher on event_session_teacher_assignments(event_session_id) where role = 'lead' and status <> 'removed';
create unique index if not exists idx_session_teacher_unique on event_session_teacher_assignments(event_session_id, teacher_id) where status <> 'removed';
create index if not exists idx_teacher_assignments_teacher on event_session_teacher_assignments(teacher_id);
create index if not exists idx_teacher_assignments_session on event_session_teacher_assignments(event_session_id);
alter table teachers enable row level security;
alter table teacher_capabilities enable row level security;
alter table teacher_capability_links enable row level security;
alter table teacher_availability enable row level security;
alter table event_session_teacher_assignments enable row level security;
insert into teacher_capabilities(name) values ('Acrylic'),('Watercolor'),('Kids'),('Glow / fluorescent'),('Silk printing'),('Clay') on conflict (name) do nothing;
