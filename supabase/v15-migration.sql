-- Art Nation V15 migration
-- Run this ONCE in Supabase SQL Editor after V14.

alter table guides add column if not exists cover_image_path text;
alter table guides add column if not exists canvas_size text;
alter table guides add column if not exists materials text;
alter table guides add column if not exists active boolean not null default true;
alter table guides add column if not exists updated_at timestamptz not null default now();

alter table techniques add column if not exists short_description text;
alter table techniques add column if not exists category text;
alter table techniques add column if not exists active boolean not null default true;
alter table techniques add column if not exists updated_at timestamptz not null default now();

alter table guide_steps add column if not exists sort_order integer;
update guide_steps set sort_order = step_no where sort_order is null;
alter table guide_steps alter column sort_order set default 0;

insert into storage.buckets (id,name,public)
values ('guide-media','guide-media',true)
on conflict (id) do update set public=true;

insert into storage.buckets (id,name,public)
values ('technique-media','technique-media',true)
on conflict (id) do update set public=true;


-- Add the relationships that the original starter schema intentionally left loose.
do $$
begin
  if not exists (select 1 from pg_constraint where conname='events_guide_id_fkey') then
    alter table events add constraint events_guide_id_fkey foreign key (guide_id) references guides(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname='guide_steps_technique_id_fkey') then
    alter table guide_steps add constraint guide_steps_technique_id_fkey foreign key (technique_id) references techniques(id) on delete set null;
  end if;
end $$;

create index if not exists idx_guides_active on guides(active);
create index if not exists idx_techniques_active on techniques(active);
create index if not exists idx_guide_steps_sort on guide_steps(guide_id,sort_order);

-- Helpful starter techniques. Safe to run repeatedly.
insert into techniques(title,slug,short_description,category,instructions,active)
values
('Background Wash','background-wash','A thin, transparent first layer used to establish colour and mood.','Foundations',
'Use a large brush and a small amount of diluted acrylic paint. Work quickly across the surface so the layer stays soft and even. Keep the paint transparent enough that the drawing remains visible.',true),
('Blending','blending','Smoothly transition between two colours while the paint is still workable.','Colour',
'Place the two colours beside each other, then use a clean or lightly loaded brush to work across the join with gentle overlapping strokes. Avoid overworking the paint.',true),
('Shading','shading','Create depth by adding darker values away from the light source.','Light & Form',
'Identify where the light is coming from. Mix a darker version of the local colour and place it on the side facing away from the light. Keep the darkest values for the deepest shadows.',true),
('Highlights','highlights','Add the lightest accents to make forms look dimensional and lively.','Light & Form',
'Use a lighter version of the local colour and apply it sparingly to areas facing the light. Save the brightest highlights for the final stage.',true),
('Dry Brushing','dry-brushing','Use very little paint to create broken, textured marks.','Texture',
'Load a small amount of paint, wipe most of it off on tissue, then drag the brush lightly across the surface so the texture of the canvas catches the paint.',true)
on conflict (slug) do nothing;
