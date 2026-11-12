-- Art Nation V29 - artwork tracing outline media
-- Forward-only and intentionally separate from the applied V28 migration.
alter table artworks add column if not exists outline_path text;
