-- MON CHIC PARIS · Digital Studio 6.3.1
-- Änderbare Lagerplätze und Artikelhistorie.
alter table public.products add column if not exists warehouse_rack text;
alter table public.products add column if not exists warehouse_shelf text;
alter table public.products add column if not exists last_inventory_at timestamptz;
alter table public.products add column if not exists last_movement_at timestamptz;

create table if not exists public.product_history (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  event_type text not null default 'Änderung',
  field_name text,
  old_value text,
  new_value text,
  created_at timestamptz not null default now()
);
create index if not exists product_history_product_created_idx on public.product_history(product_id, created_at desc);
alter table public.product_history enable row level security;
drop policy if exists product_history_anon_all on public.product_history;
create policy product_history_anon_all on public.product_history for all to anon using (true) with check (true);
grant select, insert, update, delete on public.product_history to anon;
notify pgrst, 'reload schema';
