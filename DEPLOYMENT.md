# Deployment – MON CHIC PARIS · Digital Studio 6.4.2

1. ZIP entpacken. Nicht die ZIP selbst hochladen.
2. Den gesamten entpackten Inhalt in den Root des zentralen GitHub-Repositorys laden.
3. Commit direkt auf `main`: `Release 6.4.2 - safe product save and smart suggestions`
4. In Supabase sicherstellen, dass `migration_6_3.sql` und `migration_6_3_1_storage_history.sql` ausgeführt wurden.
5. Vercel aus genau diesem Repository deployen.
6. Environment Variables prüfen: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
7. Nach dem Deployment `/api/health` öffnen; dort muss `6.4.2` stehen.
8. Einen bestehenden Artikel öffnen, Marke oder Lagerort ändern und speichern.
9. Einen neuen Artikel anlegen und prüfen, ob gespeicherte Marken, Materialien, Farben und Lagerorte vorgeschlagen werden.
