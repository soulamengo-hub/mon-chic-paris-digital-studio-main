# MON CHIC PARIS Digital Studio 6.5.3

## Fashion Intelligence – 9-Foto-Analyse

- Gemeinsame KI-Analyse von bis zu 9 Fotos eines Artikels.
- Die ersten drei Bilder werden mit hoher, die übrigen mit niedriger Detailstufe analysiert.
- Priorisierte Auswertung von Marken-, Größen-, Material- und Pflegeetiketten.
- `MON CHIC` und `MON CHIC PARIS` werden als Produktmarke serverseitig verworfen.
- Erweiterte Markenliste mit verbreiteten Fashion-Marken wie H&M, Zara, Mango, COS und Uniqlo.
- Feldbezogene Konfidenzen und Mindestschwellen für unsichere Angaben.
- Größenfelder, Saison, Maße und sichtbare Mängel können übernommen werden.
- Anlässe werden nur bei hoher Konfidenz übernommen.
- Kategorie und Unterkategorie werden gegen den MON-CHIC-Katalog validiert.
- Eine erkannte gültige Unterkategorie löst automatisch die SKU-Erzeugung aus.
- Health-Endpunkt und Paketversion auf 6.5.3 aktualisiert.

## Deployment

Keine neue Datenbankmigration erforderlich. Nach dem Push auf `main` Vercel neu deployen und `/api/health` auf Version `6.5.3` prüfen.
