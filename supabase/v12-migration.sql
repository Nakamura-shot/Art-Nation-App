-- Art Nation V12 migration
-- Run this ONCE in Supabase SQL Editor before using the Locations Manager.

alter table locations add column if not exists contact_name text;
alter table locations add column if not exists phone text;
alter table locations add column if not exists email text;
alter table locations add column if not exists notes text;
alter table locations add column if not exists capacity_notes text;
alter table locations add column if not exists maps_url text;
alter table locations add column if not exists default_form_template_id uuid references form_templates(id) on delete set null;

create index if not exists idx_locations_default_form_template
  on locations(default_form_template_id);
