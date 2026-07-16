-- MON CHIC PARIS · Digital Studio 5.1
-- Sichere Ergänzung für eine bereits bestehende Datenbank.

alter table public.products
  add column if not exists occasions text[] not null default '{}';

comment on column public.products.occasions is
  'Mehrfachauswahl für Website-Filter, z. B. Business, Casual, Hochzeit oder Urlaub.';

notify pgrst, 'reload schema';
