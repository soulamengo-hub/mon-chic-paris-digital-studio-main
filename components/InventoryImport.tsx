'use client';
import { useState } from 'react';
import * as XLSX from 'xlsx';
import { deriveDeSize } from '@/lib/size-conversion';
import { colorCatalog } from '@/lib/catalog';

type Row = Record<string, unknown>;

export default function InventoryImport() {
  const [rows, setRows] = useState<Row[]>([]);
  const [message, setMessage] = useState('');
  const [importing, setImporting] = useState(false);

  async function read(file: File) {
    setMessage('');
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const parsed = XLSX.utils.sheet_to_json<Row>(sheet, { defval: '' }).slice(0, 1000);
    setRows(parsed);
    setMessage(`${parsed.length} Zeilen erkannt. Bitte Vorschau prüfen.`);
  }

  async function generateSku(subcategory: string): Promise<string | null> {
    if (!subcategory) return null;
    try {
      const response = await fetch('/api/sku', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subcategory }),
      });
      if (!response.ok) return null;
      const data = await response.json() as { sku?: string };
      return data.sku || null;
    } catch {
      return null;
    }
  }

  async function run() {
    setImporting(true);
    let ok = 0, failed = 0, skuGenerated = 0;
    for (const row of rows) {
      const normalized = Object.fromEntries(Object.entries(row).map(([key, value]) => [key.trim().toLowerCase(), value]));
      const subcategory = String(normalized.unterkategorie || normalized.subcategory || '');
      let sku = String(normalized.sku || '');

      // Genau der Workflow "Liste rein, Artikel-Entwurf raus, SKU vergibt die App":
      // Fehlt die SKU in der Datei, wird sie automatisch nach dem bestehenden
      // Schema erzeugt (z. B. KL-0042 für Kleid) – dieselbe Vergabe wie bei der
      // manuellen Artikelaufnahme, nur hier für den Massenimport.
      if (!sku && subcategory) {
        const generated = await generateSku(subcategory);
        if (generated) { sku = generated; skuGenerated++; }
      }
      if (!sku) { failed++; continue; }

      const originalSize = String(normalized.größe || normalized.groesse || normalized.original_size || '');
      const sizeSystem = String(normalized.größensystem || normalized.groessensystem || normalized.size_system || '');
      const gender = String(normalized.geschlecht || normalized.gender || 'Damen');
      const derivedDeSize = deriveDeSize(sizeSystem, originalSize, gender, subcategory);

      // Farbe: nur Werte aus dem kontrollierten Katalog als "color" übernehmen
      // (Suche/Filter bleiben konsistent). Passt der Eintrag aus der Datei nicht
      // exakt, geht der Originaltext NICHT verloren, sondern landet als
      // Farbhinweis/Prüf-Notiz — genau wie bei euren handschriftlichen
      // "Farbe stimmt nicht, ist eigentlich ..."-Vermerken.
      const rawColor = String(normalized.farbe || normalized.color || '').trim();
      const matchedColor = colorCatalog.find(name => name.toLowerCase() === rawColor.toLowerCase());
      const rawColorNote = String(normalized.farbhinweis || normalized.color_note || '').trim();
      const colorNote = matchedColor ? rawColorNote : [rawColor, rawColorNote].filter(Boolean).join(' — ');

      const payload = {
        sku,
        brand: String(normalized.marke || normalized.brand || ''),
        category: String(normalized.kategorie || normalized.category || ''),
        subcategory,
        original_size: originalSize,
        size_system: sizeSystem || undefined,
        de_size: derivedDeSize || undefined,
        gender: gender || undefined,
        color: matchedColor || undefined,
        color_note: colorNote || undefined,
        material: String(normalized.material || ''),
        season: String(normalized.saison || normalized.season || ''),
        purchase_price: normalized.einkaufspreis ? Number(normalized.einkaufspreis) : null,
        original_retail_value: normalized['ehemaliger wert'] ? Number(normalized['ehemaliger wert']) : null,
        supplier_order_number: String(normalized['artikel nr bestellung'] || normalized['artikel nr / bestellung'] || normalized.supplier_order_number || ''),
        sale_price: normalized.verkaufspreis ? Number(normalized.verkaufspreis) : null,
        flaws: String(normalized.mängel || normalized.maengel || normalized.zustand || ''),
        internal_notes: String(normalized.notiz || normalized.notizen || normalized.internal_notes || ''),
        // Referenznummer des Lieferanten (z. B. Remix-Bestellnummer) — wird nicht im
        // Formular angezeigt, dient nur der späteren automatischen Foto-Zuordnung.
        supplier_reference: String(normalized.referenznummer || normalized.referenz || normalized.supplier_reference || ''),
        // Ohne Fotos noch nicht komplett — bewusst als Entwurf angelegt. Die
        // Artikelübersicht zeigt fehlende Fotos automatisch als "Kein Produktfoto"
        // an, bis jemand Fotos ergänzt und ggf. per KI analysiert.
        status: String(normalized.status || 'Entwurf'),
        warehouse_location: String(normalized.lagerort || ''),
      };
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      response.ok ? ok++ : failed++;
    }
    setMessage(`Import abgeschlossen: ${ok} erfolgreich (davon ${skuGenerated} mit automatisch vergebener SKU), ${failed} übersprungen/fehlerhaft.`);
    setImporting(false);
  }

  return <section className="capture-card import-card">
    <div className="capture-heading"><div><span className="step-badge">+</span><h2>Excel-/CSV-Bestand importieren</h2></div></div>

    <p>Bis zu 1.000 Zeilen. Unterstützte Spalten: SKU (optional — wird bei fehlender Angabe automatisch nach Unterkategorie vergeben, z. B. KL für Kleid), Marke, Kategorie, Unterkategorie, Größe, Größensystem (DE/FR/IT/UK/US), Geschlecht (Damen/Herren — bestimmt die Größentabelle), Farbe, Farbhinweis, Material, Saison, Einkaufspreis, Ehemaliger Wert, Verkaufspreis, Mängel/Zustand, Notiz, Status, Lagerort, Referenznummer, Artikel Nr Bestellung.</p>
    <p className="field-help">Bei Größensystem „FR“ wird die tatsächliche DE-Größe automatisch berechnet (FR S → DE XS usw.). Passt die Farbe nicht exakt zum Katalog (Schwarz, Weiß, Beige, Braun, Blau, Rot, Grün, Grau, Rosa, Violett, Gold, Silber, Mehrfarbig), wird sie nicht verworfen, sondern als Farbhinweis zum manuellen Prüfen gespeichert. Referenznummer (z. B. eure Remix-Bestellnummer) wird gespeichert, aber nicht im Formular angezeigt — sie dient später der automatischen Foto-Zuordnung nach Dateiname (z. B. „122222-1.jpg“, „122222-2.jpg“).</p>
    <p className="field-help">Artikel ohne Fotos werden trotzdem angelegt (als Entwurf) und erscheinen in der Artikelübersicht mit dem Hinweis „Kein Produktfoto“, bis jemand Fotos ergänzt.</p>
    <input type="file" accept=".xlsx,.xls,.csv" onChange={e => e.target.files?.[0] && void read(e.target.files[0])} />
    {rows.length > 0 && <>
      <div className="table-wrap"><table><thead><tr>{Object.keys(rows[0]).slice(0, 8).map(x => <th key={x}>{x}</th>)}</tr></thead>
        <tbody>{rows.slice(0, 5).map((row, i) => <tr key={i}>{Object.values(row).slice(0, 8).map((v, j) => <td key={j}>{String(v)}</td>)}</tr>)}</tbody>
      </table></div>
      <button className="primary-button centered-button" onClick={run} disabled={importing}>{importing ? 'Import läuft …' : 'Geprüfte Zeilen importieren'}</button>
    </>}
    {message && <div className="form-message success">{message}</div>}
  </section>;
}
