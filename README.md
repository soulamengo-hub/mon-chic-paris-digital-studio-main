# MON CHIC PARIS · Digital Studio 6.5.5

Produktionsstand mit Fashion Intelligence und vollständiger Artikel-DNA.

## Enthalten
- gemeinsame KI-Analyse von bis zu 9 Produktfotos
- priorisierte Erkennung von Marke, Größe und Materialetiketten
- vollständige Artikel-DNA mit Kategorie, Unterkategorie, Größen, Material, Muster, Saison, Maßen, Mängeln und Anlässen
- automatische SKU-Erzeugung nach gültiger Unterkategorie
- Artikel öffnen, bearbeiten und mit Sicherheitsabfrage löschen
- vollständige Produktdarstellung in der Artikelliste durch `object-fit: contain`
- Lagerverwaltung, Sales, CRM, Content Studio, Finance und Analytics

## Deployment
- GitHub-Branch: `main`
- Vercel Root Directory: `./`
- Node.js: `24.x`
- keine neue Supabase-Migration für 6.5.5 erforderlich

Nach dem Deployment muss `/api/health` die Version `6.5.5` melden.
