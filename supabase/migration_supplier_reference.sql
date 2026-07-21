-- MON CHIC PARIS · Digital Studio
-- Referenznummer aus dem Lieferanten-Import (z. B. Remix-Bestellnummer #133357183).
-- Wird beim Massenimport ohne Foto mitgespeichert und später genutzt, um Fotos
-- anhand des Dateinamens automatisch dem richtigen Artikel zuzuordnen.
alter table public.products add column if not exists supplier_reference text;
create index if not exists products_supplier_reference_idx on public.products (supplier_reference);
