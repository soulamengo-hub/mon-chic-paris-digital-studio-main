# Deployment – MON CHIC PARIS · Digital Studio 6.4.0 MAIN

1. Neues GitHub-Repository anlegen, empfohlen: `mon-chic-paris-digital-studio-main`.
2. ZIP entpacken. Nicht die ZIP selbst hochladen.
3. Den gesamten entpackten Inhalt in den Root des Repositorys laden.
4. Commit direkt auf `main`:
   `Release 6.4.0 - clean main production baseline`
5. In Supabase sicherstellen, dass beide Migrationen erfolgreich ausgeführt wurden.
6. Neues Vercel-Projekt aus genau diesem Repository importieren.
7. Environment Variables eintragen.
8. Nach dem Deployment `/api/health` öffnen; dort muss `6.4.0` stehen.
