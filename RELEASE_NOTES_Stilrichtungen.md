# MON CHIC PARIS · Digital Studio — Stilrichtungen (MC-04-04)

## Neu
- **MON-CHIC-Stilrichtung** ist jetzt ein kontrolliertes Dropdown mit den 9 in MC-04-04 definierten Stilrichtungen (Parisian Classic, Quiet Elegance, Boho Romantic, Vintage Floral, Rock Chic, Casual Sport, Minimalist, Preppy Academia, Evening Glam) — vorher ein freies Textfeld ohne Einschränkung.
- Anzeige im Dropdown ohne Buchstaben-Code, z. B. „Parisian Classic (Classique Parisien)"; gespeichert wird intern der sprachneutrale Schlüssel (z. B. `parisian_classic`) in der bestehenden `style_key`-Spalte.
- **KI-Unterstützung**: Die Bildanalyse schlägt jetzt gezielt eine der 9 Stilrichtungen vor (analog zur bereits bestehenden Anlässe- und Farbkatalog-Logik). Die KI kann keine eigenen, nicht katalogisierten Stilbezeichnungen mehr erzeugen — Vorschlag muss exakt einem der 9 Katalogwerte entsprechen, sonst wird er verworfen.
- Gilt für Artikelaufnahme **und** Artikel-Editor.

## Kein Migrationsschritt nötig
Die Spalte `style_key` existiert bereits seit `migration_5_0.sql`. Es wird nur die Werteliste eingeschränkt (Anwendungsebene), keine Datenbankänderung erforderlich.

## Noch nicht umgesetzt (aus MC-04-04, für spätere Phasen)
Die restlichen Kapitel des Dokuments (Designer-Level × Stil-Plausibilitätsmatrix, Artikel-DNA-Erweiterung, Schaufenster-Auto-Cluster, Verfügbarkeits-Anfrage, Multi-Channel-Statuspflege, Ähnlichkeits-Benachrichtigung) sind laut Phasenplan (Kapitel 11) spätere Ausbaustufen und bewusst nicht Teil dieser Änderung.
