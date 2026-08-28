-- Art Nation V16 migration
-- Run this ONCE in Supabase SQL Editor after V15.

alter table customers add column if not exists portal_token text;
update customers set portal_token = encode(gen_random_bytes(20),'hex') where portal_token is null;
alter table customers alter column portal_token set default encode(gen_random_bytes(20),'hex');
create unique index if not exists idx_customers_portal_token on customers(portal_token);

alter table guides add column if not exists access_mode text not null default 'public';
do $$
begin
  if not exists (select 1 from pg_constraint where conname='guides_access_mode_check') then
    alter table guides add constraint guides_access_mode_check check (access_mode in ('public','restricted'));
  end if;
end $$;

create table if not exists guide_activation_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  guide_id uuid not null references guides(id) on delete cascade,
  label text,
  max_uses integer not null default 1 check (max_uses > 0),
  uses integer not null default 0 check (uses >= 0),
  expires_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists guide_activation_redemptions (
  id uuid primary key default gen_random_uuid(),
  activation_code_id uuid not null references guide_activation_codes(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  redeemed_at timestamptz not null default now(),
  unique(activation_code_id, customer_id)
);

alter table guide_activation_codes enable row level security;
alter table guide_activation_redemptions enable row level security;

create index if not exists idx_activation_codes_guide on guide_activation_codes(guide_id);
create index if not exists idx_activation_codes_code on guide_activation_codes(code);
create index if not exists idx_guide_access_customer on customer_guide_access(customer_id);
