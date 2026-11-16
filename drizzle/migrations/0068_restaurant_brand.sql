begin;
alter table public.restaurants add column brand_context jsonb not null default '{}'::jsonb;
alter table public.restaurants add constraint brand_context_size check (octet_length(brand_context::text)<=6000);
commit;
