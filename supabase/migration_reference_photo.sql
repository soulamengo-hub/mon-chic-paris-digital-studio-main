-- MON CHIC PARIS · Digital Studio
-- Referenzfoto des Lieferanten (z. B. Remix-Katalogfoto) als dauerhafte
-- "Fotokartei" — getrennt von den echten, KI-analysierten Artikelfotos.
alter table public.products add column if not exists reference_photo_url text;
