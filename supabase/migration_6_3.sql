-- MON CHIC PARIS · Digital Studio 6.3
-- SKU-Sequenz, öffentliche/interne Felder und Sales.
create sequence if not exists public.product_sku_seq start with 12345 increment by 1;

create or replace function public.next_product_sku(category_code text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare n bigint;
begin
  if category_code is null or category_code !~ '^[A-Z]{2}$' then
    raise exception 'Ungültiger SKU-Code';
  end if;
  n := nextval('public.product_sku_seq');
  return 'MCP-' || category_code || '-' || lpad(n::text, 5, '0');
end;
$$;
grant execute on function public.next_product_sku(text) to anon;

alter table public.products add column if not exists public_title text;
alter table public.products add column if not exists public_description text;
alter table public.products add column if not exists internal_notes text;
alter table public.products add column if not exists warehouse_location text;

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  sku text not null,
  channel text not null default 'Boutique',
  sale_price numeric(12,2) not null,
  discount numeric(12,2) not null default 0,
  shipping_cost numeric(12,2) not null default 0,
  payment_method text,
  buyer_name text,
  sold_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now()
);
alter table public.sales enable row level security;
drop policy if exists sales_anon_all on public.sales;
create policy sales_anon_all on public.sales for all to anon using (true) with check (true);
grant select, insert, update, delete on public.sales to anon;
notify pgrst, 'reload schema';
