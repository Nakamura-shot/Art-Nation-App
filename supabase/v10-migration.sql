-- Art Nation V10 migration
-- Run this ONCE in Supabase SQL Editor before starting V10.

alter table events
  add column if not exists cover_image_path text;

create table if not exists form_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists form_template_fields (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references form_templates(id) on delete cascade,
  label text not null,
  field_key text not null,
  field_type text not null check (field_type in ('text','number','select','checkbox','textarea')),
  required boolean not null default false,
  options jsonb,
  sort_order integer not null default 0
);

alter table form_templates enable row level security;
alter table form_template_fields enable row level security;

insert into storage.buckets (id,name,public)
values ('event-covers','event-covers',true)
on conflict (id) do update set public=true;

-- Starter reusable Paint & Sip form.
do $$
declare t uuid;
begin
  if not exists (select 1 from form_templates where name='Default Paint & Sip Form') then
    insert into form_templates(name,is_default) values ('Default Paint & Sip Form',true) returning id into t;
    insert into form_template_fields(template_id,label,field_key,field_type,required,options,sort_order)
    values
      (t,'Age','age','number',true,null,0),
      (t,'Choice of drink','drink','select',true,'["Hot Chocolate","Iced Coffee"]'::jsonb,1);
  end if;
end $$;
