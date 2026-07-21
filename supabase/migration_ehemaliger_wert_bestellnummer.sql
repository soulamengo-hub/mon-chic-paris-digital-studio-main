-- MON CHIC PARIS · Digital Studio
-- Ehemaliger Wert: Preis des Kleidungsstücks beim ursprünglichen Neukauf (z. B. Hersteller-RRP),
-- als Orientierung für den Verkaufspreis. NICHT der von MON CHIC PARIS bezahlte
-- Einkaufspreis (purchase_price bleibt getrennt) und NICHT der aktuelle Verkaufspreis.
alter table public.products add column if not exists original_retail_value numeric(10,2);

-- Eigene Artikel-/Bestellnummer der Quelle (z. B. Remix oder andere Lieferanten),
-- getrennt von supplier_reference (interne MON-CHIC-Charge/Referenz).
alter table public.products add column if not exists supplier_order_number text;
