-- Art Nation V32 - teacher profile enrichment.
-- Forward-only; review and apply after V31.
alter table teachers add column if not exists bio text;
alter table teachers add column if not exists start_date date;
alter table teachers add column if not exists end_date date;
alter table teachers add column if not exists specialty_notes text;
create table if not exists teacher_age_groups (
  id uuid primary key default gen_random_uuid(), name text not null unique, active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists teacher_age_group_links (
  teacher_id uuid not null references teachers(id) on delete cascade,
  age_group_id uuid not null references teacher_age_groups(id) on delete cascade,
  primary key (teacher_id, age_group_id)
);
alter table teacher_age_groups enable row level security;
alter table teacher_age_group_links enable row level security;
insert into teacher_age_groups(name) values ('Preschool'),('Kids'),('Teens'),('Adults') on conflict (name) do nothing;
