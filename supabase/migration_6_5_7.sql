-- MON CHIC PARIS · Digital Studio 6.5.7
-- Regelbasierte Pflegehinweise, kontrollierter Farb-Freitexthinweis,
-- und ein Protokoll der KI-Nutzung für die monatliche Budgetkontrolle.
-- Sicher wiederholt ausführbar (nur "if not exists"-Anweisungen).

alter table public.products add column if not exists care_instructions text;
alter table public.products add column if not exists color_note text;

create table if not exists public.ai_usage_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  estimated_cost_eur numeric(10,4) not null default 0
);

-- Index für die schnelle Summierung "aktueller Monat".
create index if not exists ai_usage_log_created_at_idx on public.ai_usage_log (created_at);

-- Row Level Security: Diese Tabelle wird ausschließlich über den
-- Service-Role-Key aus serverseitigem Code (app/api/ai/*) gelesen und
-- beschrieben. Der anonyme Client-Schlüssel bekommt keinen Zugriff.
alter table public.ai_usage_log enable row level security;
