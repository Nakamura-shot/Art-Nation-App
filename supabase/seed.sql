-- Demo data for the first Art Nation Cebu release.
insert into event_types (id, name) values
('00000000-0000-0000-0000-000000000001', 'Paint & Sip'),
('00000000-0000-0000-0000-000000000002', 'Kids Art'),
('00000000-0000-0000-0000-000000000003', 'Workshop')
on conflict (id) do nothing;

insert into locations (id, name, address) values
('10000000-0000-0000-0000-000000000001', 'Art Nation Cebu', 'Eagle''s Nest Condominium, Canduman, Mandaue City'),
('10000000-0000-0000-0000-000000000002', 'Bambusa Café', 'Liloan, Cebu')
on conflict (id) do nothing;

insert into events (id, title, slug, description, event_type_id) values
('20000000-0000-0000-0000-000000000001', 'Tropical Pop Paint & Sip', 'tropical-pop-paint-and-sip', 'A beginner-friendly guided acrylic session with a bold tropical subject, materials included.', '00000000-0000-0000-0000-000000000001'),
('20000000-0000-0000-0000-000000000002', 'Kids Unicorn Acrylic Workshop', 'kids-unicorn-acrylic', 'A simplified unicorn painting class designed for younger artists.', '00000000-0000-0000-0000-000000000002'),
('20000000-0000-0000-0000-000000000003', 'Café Sunset Paint & Sip', 'cafe-sunset-paint-and-sip', 'Paint a warm tropical sunset in a relaxed café setting.', '00000000-0000-0000-0000-000000000001')
on conflict (id) do nothing;

insert into event_sessions (id,event_id,location_id,starts_at,ends_at,capacity,regular_price,early_bird_price,early_bird_until) values
('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','2026-09-05 14:00:00+08','2026-09-05 18:00:00+08',30,1200,1000,'2026-09-01 23:59:59+08'),
('30000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','2026-09-12 10:00:00+08','2026-09-12 12:00:00+08',18,900,null,null),
('30000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000002','2026-09-19 15:00:00+08','2026-09-19 18:00:00+08',24,1250,1050,'2026-09-14 23:59:59+08')
on conflict (id) do nothing;

insert into form_fields (event_session_id,label,field_key,field_type,required,options,sort_order) values
('30000000-0000-0000-0000-000000000001','Full name','full-name','text',true,null,1),
('30000000-0000-0000-0000-000000000001','Age','age','number',true,null,2),
('30000000-0000-0000-0000-000000000001','Choice of drink','drink','select',true,'["Hot Chocolate","Iced Coffee","Lemonade"]',3),
('30000000-0000-0000-0000-000000000002','Child''s full name','full-name','text',true,null,1),
('30000000-0000-0000-0000-000000000002','Age','age','number',true,null,2),
('30000000-0000-0000-0000-000000000003','Full name','full-name','text',true,null,1),
('30000000-0000-0000-0000-000000000003','Age','age','number',true,null,2),
('30000000-0000-0000-0000-000000000003','Café drink','drink','select',true,'["Americano","Latte","Matcha","Hot Chocolate"]',3);
