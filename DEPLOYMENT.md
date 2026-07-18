# Deployment – MON CHIC PARIS · Digital Studio 6.5.5

## Wichtig: keine Dateimischung
Den Inhalt dieses Pakets als vollständigen Projektstand verwenden. Alte Dateien nicht mit dem neuen Stand zusammenkopieren.

Empfohlenes Vorgehen mit GitHub Desktop:
1. Repository `soulamengo-hub/mon-chic-paris-digital-studio-main` lokal klonen.
2. Im lokalen Repository alle Projektdateien außer dem versteckten Ordner `.git` entfernen.
3. Den vollständigen Inhalt dieses entpackten Pakets in den Repository-Ordner kopieren.
4. Prüfen, dass `package.json` die Version `6.5.5` enthält.
5. Commit: `Release 6.5.5 - Hotfix Artikel-DNA und sichere Artikelansicht`
6. Auf `main` pushen.
7. Vercel-Deployment abwarten.
8. `/api/health` öffnen; dort muss `6.5.5` stehen.
9. Artikel-Neuanlage prüfen: 9 Fotos, Artikel-DNA und Anlässe müssen sichtbar sein.
10. Artikelliste prüfen: vollständige Vorschaubilder und Löschfunktion.

Keine neue Supabase-Migration ausführen.
