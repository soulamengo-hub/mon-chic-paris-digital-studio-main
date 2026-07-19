# Deployment 6.5.6

1. Dieses Paket als vollständigen Projektstand verwenden, nicht mit alten Dateien mischen.
2. Im lokalen Git-Repository alle Projektdateien außer `.git` entfernen.
3. Den vollständigen Inhalt dieses Pakets hineinkopieren.
4. Commit: `Release 6.5.6 - Stabilität Unterkategorie SKU Feldarchitektur`
5. Auf `main` pushen und Vercel-Deployment abwarten.
6. `/api/health` prüfen; dort muss `6.5.6` stehen.
7. Neuen Artikel mit mehreren Fotos testen, KI-Vorschläge übernehmen und kontrollieren, dass Unterkategorie und SKU gesetzt werden.

Keine neue Supabase-Migration ausführen.
