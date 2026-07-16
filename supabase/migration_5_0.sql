-- MON CHIC PARIS · Digital Studio 5.0
-- Safe to run repeatedly. Designed for an existing or empty Supabase project.

create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  sku text unique not null,
  brand text,
  category text,
  subcategory text,
  season text default 'Ganzjährig',
  size text,
  original_size text,
  size_system text,
  de_size text,
  international_size text,
  color text,
  secondary_color text,
  material text,
  pattern text,
  condition text,
  era text,
  style_key text,
  authenticity_status text,
  purchase_price numeric(12,2),
  sale_price numeric(12,2),
  occasions text[] not null default '{}',
  measurements text,
  flaws text,
  notes text,
  status text default 'Entwurf',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products add column if not exists subcategory text;
alter table public.products add column if not exists original_size text;
alter table public.products add column if not exists size_system text;
alter table public.products add column if not exists de_size text;
alter table public.products add column if not exists international_size text;
alter table public.products add column if not exists secondary_color text;
alter table public.products add column if not exists pattern text;
alter table public.products add column if not exists era text;
alter table public.products add column if not exists style_key text;
alter table public.products add column if not exists authenticity_status text;
alter table public.products add column if not exists occasions text[] not null default '{}';
alter table public.products add column if not exists measurements text;
alter table public.products add column if not exists flaws text;
alter table public.products add column if not exists status text default 'Entwurf';
alter table public.products add column if not exists updated_at timestamptz not null default now();

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null unique,
  public_url text not null,
  file_name text,
  mime_type text,
  size_bytes bigint,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists product_images_product_sort_idx on public.product_images(product_id, sort_order);

alter table public.products enable row level security;
alter table public.product_images enable row level security;

drop policy if exists products_select_internal on public.products;
drop policy if exists products_insert_internal on public.products;
drop policy if exists products_update_internal on public.products;
drop policy if exists products_delete_internal on public.products;
create policy products_select_internal on public.products for select to anon using (true);
create policy products_insert_internal on public.products for insert to anon with check (true);
create policy products_update_internal on public.products for update to anon using (true) with check (true);
create policy products_delete_internal on public.products for delete to anon using (true);

drop policy if exists product_images_select_internal on public.product_images;
drop policy if exists product_images_insert_internal on public.product_images;
drop policy if exists product_images_update_internal on public.product_images;
drop policy if exists product_images_delete_internal on public.product_images;
create policy product_images_select_internal on public.product_images for select to anon using (true);
create policy product_images_insert_internal on public.product_images for insert to anon with check (true);
create policy product_images_update_internal on public.product_images for update to anon using (true) with check (true);
create policy product_images_delete_internal on public.product_images for delete to anon using (true);

grant select, insert, update, delete on public.products, public.product_images to anon;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 8388608, array['image/jpeg','image/png','image/webp','image/heic','image/heif'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists product_images_storage_select on storage.objects;
drop policy if exists product_images_storage_insert on storage.objects;
drop policy if exists product_images_storage_update on storage.objects;
drop policy if exists product_images_storage_delete on storage.objects;
create policy product_images_storage_select on storage.objects for select to anon using (bucket_id = 'product-images');
create policy product_images_storage_insert on storage.objects for insert to anon with check (bucket_id = 'product-images');
create policy product_images_storage_update on storage.objects for update to anon using (bucket_id = 'product-images') with check (bucket_id = 'product-images');
create policy product_images_storage_delete on storage.objects for delete to anon using (bucket_id = 'product-images');

notify pgrst, 'reload schema';
