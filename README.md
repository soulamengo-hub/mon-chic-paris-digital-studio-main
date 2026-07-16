# MON CHIC PARIS · Digital Studio 6.4.0 MAIN

Saubere Hauptversion für das neue zentrale GitHub-Repository.

## Enthalten
- finales MON CHIC PARIS DIGITAL STUDIO Logo
- CI-Navy `#061B49`, Creme `#FDF9F6`, Gold `#C7922D`
- automatische SKU nach Unterkategorie, z. B. `MCP-KL-12345`
- Artikel öffnen, bearbeiten und löschen
- öffentliche Produkttexte getrennt von internen Notizen
- Lagerort, Regal und Fach änderbar
- Lagerhistorie und Inventurdatum
- Excel-/CSV-Import bis 1.000 Zeilen
- Sales-Modul mit Status „Verkauft“

## Supabase vor dem Deployment
1. `supabase/migration_6_3.sql`
2. `supabase/migration_6_3_1_storage_history.sql`

## Vercel
- Root Directory: `./`
- Framework: Next.js
- Node.js: 24.x
- Variablen: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
