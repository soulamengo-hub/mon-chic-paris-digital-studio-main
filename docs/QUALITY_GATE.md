# MON CHIC PARIS – verbindliches Release Quality Gate

Ein Release ist erst freigegeben, wenn `npm run verify:release` erfolgreich endet.

Geprüft werden insbesondere:
- keine fremden `.ts`/`.tsx`-Dateien im Projekt-Root
- keine Browser-Duplikatnamen wie `page (8).tsx`
- keine ZIP-Dateien im produktiven Projekt
- `app/page.tsx` vorhanden
- jede `page.tsx` enthält echten TypeScript-/React-Code
- keine byte-identischen Routenseiten
- `/`, `/sales` und `/inventory` binden die vorgesehenen Komponenten ein
- TypeScript-Prüfung und Produktions-Build erfolgreich

Zusätzlich vor dem Deployment:
- echter Git-Diff zum letzten funktionierenden Commit
- Vercel Root Directory `./`
- Vercel Node.js 24.x
- `/api/health` und `package.json` mit identischer Version
- Funktionsprüfung: 9 Fotos, KI-Vorschläge, Unterkategorie, SKU, Artikel-DNA, Anlässe, Speichern, Bearbeiten, Löschen und Bildvorschau
