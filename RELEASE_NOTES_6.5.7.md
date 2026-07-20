# MON CHIC PARIS · Digital Studio 6.5.7

## KI-Rollenverteilung geschärft
Die KI schlägt vor, der Nutzer bestätigt oder korrigiert. Kein Feld wird ungeprüft automatisch gespeichert.

- **KI unterstützt weiterhin:** Marke, Material, Farbe (aus kontrolliertem Katalog), Kategorie/Unterkategorie (gegen den bestehenden Katalog geprüft, keine Freitexte), Größe (Originalformat bleibt erhalten), Stil, Anlässe, sichtbare Besonderheiten.
- **Zustand:** wird nur noch vorgeschlagen, wenn die KI eine echte Auffälligkeit erkennt. Ohne Befund bleibt der Standard „Sehr gut" unverändert.
- **Regelbasiert, ohne KI-Kosten:** Unterkategorie- und SKU-Vergabe (bereits zuvor regelbasiert), neu jetzt auch **Pflegehinweise** – automatisch aus dem Materialtext abgeleitet, im Formular jederzeit überschreibbar.

## Kontrollierter Farbkatalog
Haupt- und Nebenfarbe sind jetzt Auswahlfelder aus einem festen Katalog (Schwarz, Weiß, Beige, Braun, Blau, Rot, Grün, Grau, Rosa, Violett, Gold, Silber, Mehrfarbig). Ein zusätzliches Freitextfeld „Farbhinweis" erlaubt genauere Beschreibungen (z. B. „Dunkelblau mit roten Streifen"), ohne den kontrollierten Wert zu ersetzen.

## KI-Budgetkontrolle (Ziel: ca. 25 €/Monat)
Die Budget-Anzeige im Formular war bisher unbeabsichtigt tot verdrahtet (State wurde nie befüllt). Das ist jetzt vollständig behoben:

- Neue Route `/api/ai/budget` liefert den aktuellen Monatsverbrauch.
- `/api/ai/analyze` prüft das Budget **vor** dem eigentlichen (kostenpflichtigen) OpenAI-Aufruf – bei erreichtem Limit wird OpenAI gar nicht erst kontaktiert.
- Jede erfolgreiche Analyse wird mit geschätzten Kosten in der neuen Tabelle `ai_usage_log` protokolliert (Migration `migration_6_5_7.sql`).
- Warnstufen bei 15 €, 20 € und 23 €; ab 25 € keine automatische Analyse mehr, bis der Nutzer sie im nächsten Monat wieder freigibt.
- Neue Übersicht unter **Einstellungen** zeigt den laufenden Monatsverbrauch, unabhängig vom Artikelformular.

## Bereits vorher korrekt umgesetzt (zur Klarstellung)
- Ein KI-Aufruf pro Artikel (alle Fotos gemeinsam), nicht ein Aufruf pro Feld.
- Kategorie/Unterkategorie wurden schon zuvor gegen den bestehenden Katalog geprüft, keine KI-Freitexte.
- Nur die ersten drei Fotos werden in hoher Detailstufe an die KI gesendet, der Rest in niedriger.
- Keine automatische Analyse beim Öffnen oder Bearbeiten eines Artikels – nur über den Button „Alle Fotos analysieren".

## Migration
Bitte `supabase/migration_6_5_7.sql` einmalig im Supabase-Projekt ausführen (sicher wiederholbar).

## Neue/geänderte Umgebungsvariablen (optional, mit sinnvollen Standardwerten)
`AI_MONTHLY_BUDGET_EUR`, `AI_USD_TO_EUR_RATE`, `AI_INPUT_COST_PER_1K_USD`, `AI_OUTPUT_COST_PER_1K_USD` – siehe `.env.example`.
