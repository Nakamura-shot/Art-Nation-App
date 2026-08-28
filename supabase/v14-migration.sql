-- Art Nation V14 migration
-- Run this ONCE in Supabase SQL Editor after V12.

alter table locations add column if not exists slug text;
alter table locations add column if not exists public_description text;
alter table locations add column if not exists image_path text;
alter table locations add column if not exists website_url text;
alter table locations add column if not exists opening_hours text;

update locations
set slug = lower(regexp_replace(regexp_replace(name,'[^A-Za-z0-9]+','-','g'),'(^-|-$)','','g'))
where slug is null or slug = '';

create unique index if not exists idx_locations_slug on locations(slug);

create table if not exists location_menu_items (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references locations(id) on delete cascade,
  name text not null,
  description text,
  price numeric(10,2),
  image_path text,
  category text,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table location_menu_items enable row level security;
create index if not exists idx_location_menu_location on location_menu_items(location_id, sort_order);

insert into storage.buckets (id,name,public)
values ('location-images','location-images',true)
on conflict (id) do update set public=true;

insert into storage.buckets (id,name,public)
values ('menu-images','menu-images',true)
on conflict (id) do update set public=true;
