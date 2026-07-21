-- MON CHIC PARIS · Digital Studio
-- Geschlecht (Damen/Herren) bestimmt, welche Größentabelle für die automatische
-- Größenumrechnung gilt — dieselbe DE-Zahl bedeutet bei Damen und Herren etwas
-- völlig anderes (z. B. DE 44 = XXL bei Damen, aber XS bei Herren).
alter table public.products add column if not exists gender text default 'Damen';
