'use client';

import { useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';

type Product = {
  id: string;
  sku?: string;
  brand?: string;
  supplier_order_number?: string;
  supplier_reference?: string;
  season?: string;
  warehouse_location?: string;
  warehouse_area?: string;
  warehouse_place?: string;
  warehouse_code?: string;
  warehouse_place_id?: string | null;
};

type WarehousePlace = {
  id: string;
  warehouse_location?: string | null;
  warehouse_area?: string | null;
  warehouse_place?: string | null;
  warehouse_code?: string | null;
};

type ParsedRow = {
  key: string;
  sheet: string;
  excelRow: number;
  articleNumber: string;
  warehouseLocation: string;
  warehouseArea: string;
  warehousePlace: string;
  warehouseCode: string;
  season: string;
  brand: string;
};

type MatchKind = 'matched' | 'conflict' | 'not_found' | 'manual_review' | 'duplicate_match';

type PreviewRow = ParsedRow & {
  kind: MatchKind;
  product?: Product;
  conflicts: string[];
  decision: 'keep_app' | 'use_excel';
};

const FONT = 'Arial, Helvetica, sans-serif';

function clean(value: unknown): string {
  return value == null ? '' : String(value).trim();
}

function normalize(value: unknown): string {
  return clean(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function same(a: unknown, b: unknown): boolean {
  return clean(a).toLowerCase() === clean(b).toLowerCase();
}

function isBlank(value: unknown): boolean {
  return clean(value) === '';
}

function isNumericArticle(value: string): boolean {
  return /^\d+$/.test(value.trim());
}

function normalizeSeason(value: unknown): string {
  const raw = clean(value);
  if (!raw) return '';

  const key = raw
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[–—]/g, '-');

  const map: Record<string, string> = {
    'frühling': 'Frühling',
    'fruhling': 'Frühling',
    'sommer': 'Sommer',
    'herbst': 'Herbst',
    'winter': 'Winter',
    'ganzjährig': 'Ganzjährig',
    'ganzjahrig': 'Ganzjährig',
    'frühling/sommer': 'Frühling-Sommer',
    'fruhling/sommer': 'Frühling-Sommer',
    'frühling-sommer': 'Frühling-Sommer',
    'fruhling-sommer': 'Frühling-Sommer',
    'frühling/herbst': 'Frühling-Herbst',
    'fruhling/herbst': 'Frühling-Herbst',
    'frühling-herbst': 'Frühling-Herbst',
    'fruhling-herbst': 'Frühling-Herbst',
    'herbst/winter': 'Herbst-Winter',
    'herbst-winter': 'Herbst-Winter',
  };

  return map[key] ?? raw;
}

function valuesDifferent(current: unknown, incoming: unknown): boolean {
  if (isBlank(incoming) || isBlank(current)) return false;
  return !same(current, incoming);
}

function statusLabel(kind: MatchKind) {
  switch (kind) {
    case 'matched': return 'Gefunden';
    case 'conflict': return 'Konflikt';
    case 'not_found': return 'Nicht gefunden';
    case 'manual_review': return 'Manuell prüfen';
    case 'duplicate_match': return 'Mehrere Treffer';
  }
}

function detectHeaderRow(rows: unknown[][]): number {
  for (let i = 0; i < Math.min(rows.length, 20); i += 1) {
    const normalized = rows[i].map(normalize);
    const ok =
      normalized.includes('lagerort') &&
      normalized.includes('wo') &&
      normalized.includes('lagerplatz') &&
      normalized.includes('lagerbezeichnung') &&
      normalized.some(h => h === 'artikel' || h === 'artikelnr' || h === 'artikelnummer');
    if (ok) return i;
  }
  return -1;
}

function columnIndex(headers: unknown[], aliases: string[]): number {
  const normalized = headers.map(normalize);
  for (const alias of aliases) {
    const idx = normalized.indexOf(normalize(alias));
    if (idx >= 0) return idx;
  }
  return -1;
}

function cell(row: unknown[], index: number): string {
  return index >= 0 ? clean(row[index]) : '';
}

function parseWorkbook(buffer: ArrayBuffer) {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const parsed: ParsedRow[] = [];
  const freeFormSheets: string[] = [];
  const emptySheets: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      raw: false,
      defval: '',
    });

    const nonEmpty = rows.some(row => row.some(value => clean(value) !== ''));
    if (!nonEmpty) {
      emptySheets.push(sheetName);
      continue;
    }

    const headerRow = detectHeaderRow(rows);
    if (headerRow < 0) {
      freeFormSheets.push(sheetName);
      continue;
    }

    const headers = rows[headerRow];
    const idxLocation = columnIndex(headers, ['Lagerort']);
    const idxArea = columnIndex(headers, ['Wo']);
    const idxPlace = columnIndex(headers, ['Lagerplatz']);
    const idxCode = columnIndex(headers, ['Lagerbezeichnung']);
    const idxArticle = columnIndex(headers, ['Artikel Nr', 'Artikel', 'Artikelnummer']);
    const idxSeason = columnIndex(headers, ['Saison']);
    const idxBrand = columnIndex(headers, ['Marke']);

    for (let r = headerRow + 1; r < rows.length; r += 1) {
      const row = rows[r];
      const articleNumber = cell(row, idxArticle);
      const warehouseLocation = cell(row, idxLocation);
      const warehouseArea = cell(row, idxArea);
      const warehousePlace = cell(row, idxPlace);
      const warehouseCode = cell(row, idxCode);

      // Nur Zeilen mit einer echten Artikelangabe gehören in die Artikel-Vorprüfung.
      // Vorbereitete Lagerplätze mit Lagercode/-platz, aber ohne Artikelnummer,
      // werden bewusst ignoriert und nicht als "Manuell prüfen" gezählt.
      if (!articleNumber) continue;

      parsed.push({
        key: `${sheetName}-${r + 1}`,
        sheet: sheetName,
        excelRow: r + 1,
        articleNumber,
        warehouseLocation,
        warehouseArea,
        warehousePlace,
        warehouseCode,
        season: normalizeSeason(cell(row, idxSeason)),
        brand: cell(row, idxBrand),
      });
    }
  }

  return { rows: parsed, freeFormSheets, emptySheets };
}

function uniqueProducts(products: Product[]): Product[] {
  const map = new Map<string, Product>();
  for (const p of products) map.set(p.id, p);
  return [...map.values()];
}

function buildPreview(parsedRows: ParsedRow[], products: Product[]): PreviewRow[] {
  const byOrder = new Map<string, Product[]>();
  const byReference = new Map<string, Product[]>();

  for (const product of products) {
    const order = clean(product.supplier_order_number);
    const reference = clean(product.supplier_reference);
    if (order) byOrder.set(order, [...(byOrder.get(order) ?? []), product]);
    if (reference) byReference.set(reference, [...(byReference.get(reference) ?? []), product]);
  }

  return parsedRows.map(row => {
    if (!row.articleNumber || !isNumericArticle(row.articleNumber)) {
      return { ...row, kind: 'manual_review', conflicts: [], decision: 'keep_app' };
    }

    const matches = uniqueProducts([
      ...(byOrder.get(row.articleNumber) ?? []),
      ...(byReference.get(row.articleNumber) ?? []),
    ]);

    if (matches.length === 0) {
      return { ...row, kind: 'not_found', conflicts: [], decision: 'keep_app' };
    }
    if (matches.length > 1) {
      return { ...row, kind: 'duplicate_match', conflicts: [], decision: 'keep_app' };
    }

    const product = matches[0];
    const conflicts: string[] = [];
    if (valuesDifferent(product.warehouse_location, row.warehouseLocation)) conflicts.push('Lagerort');
    if (valuesDifferent(product.warehouse_area, row.warehouseArea)) conflicts.push('Wo');
    if (valuesDifferent(product.warehouse_place, row.warehousePlace)) conflicts.push('Lagerplatz');
    if (valuesDifferent(product.warehouse_code, row.warehouseCode)) conflicts.push('Lagerbezeichnung');
    if (valuesDifferent(product.season, row.season)) conflicts.push('Saison');

    return {
      ...row,
      kind: conflicts.length ? 'conflict' : 'matched',
      product,
      conflicts,
      decision: 'keep_app',
    };
  });
}

function targetValue(current: unknown, incoming: string, decision: 'keep_app' | 'use_excel') {
  if (!incoming) return current ?? null;
  if (isBlank(current)) return incoming;
  if (same(current, incoming)) return current;
  return decision === 'use_excel' ? incoming : current;
}

export default function WarehouseImport() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [filename, setFilename] = useState('');
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [freeFormSheets, setFreeFormSheets] = useState<string[]>([]);
  const [emptySheets, setEmptySheets] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const counts = useMemo(() => ({
    total: preview.length,
    matched: preview.filter(r => r.kind === 'matched').length,
    conflicts: preview.filter(r => r.kind === 'conflict').length,
    notFound: preview.filter(r => r.kind === 'not_found').length,
    manual: preview.filter(r => r.kind === 'manual_review' || r.kind === 'duplicate_match').length,
    importable: preview.filter(r => r.kind === 'matched' || r.kind === 'conflict').length,
  }), [preview]);

  async function handleFile(file: File) {
    setLoading(true);
    setError('');
    setMessage('');
    setPreview([]);
    setFilename(file.name);

    try {
      const parsed = parseWorkbook(await file.arrayBuffer());
      const productsRes = await fetch('/api/products', { cache: 'no-store' });
      if (!productsRes.ok) throw new Error('Die vorhandenen Artikel konnten nicht geladen werden.');
      const products = await productsRes.json() as Product[];
      setPreview(buildPreview(parsed.rows, products));
      setFreeFormSheets(parsed.freeFormSheets);
      setEmptySheets(parsed.emptySheets);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Die Lagerdatei konnte nicht geprüft werden.');
    } finally {
      setLoading(false);
    }
  }

  function setDecision(key: string, decision: 'keep_app' | 'use_excel') {
    setPreview(current => current.map(row => row.key === key ? { ...row, decision } : row));
  }

  async function ensureWarehousePlace(row: PreviewRow, places: WarehousePlace[]) {
    if (!row.warehouseCode) return null;
    const existing = places.find(place => same(place.warehouse_code, row.warehouseCode));
    if (existing) return existing;

    const res = await fetch('/api/warehouse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        warehouse_location: row.warehouseLocation || 'MyPlace',
        warehouse_area: row.warehouseArea || null,
        warehouse_place: row.warehousePlace || null,
        warehouse_code: row.warehouseCode,
        source_sheet: row.sheet,
        notes: 'Aus Lager-Excel importiert',
      }),
    });
    if (!res.ok) throw new Error(`Lagerplatz ${row.warehouseCode} konnte nicht angelegt werden.`);
    const created = await res.json() as WarehousePlace;
    places.push(created);
    return created;
  }

  async function executeImport() {
    const rows = preview.filter(r => (r.kind === 'matched' || r.kind === 'conflict') && r.product);
    if (!rows.length) {
      setError('Es gibt keine eindeutig zugeordneten Artikel zum Importieren.');
      return;
    }

    setImporting(true);
    setError('');
    setMessage('');

    try {
      const warehouseRes = await fetch('/api/warehouse', { cache: 'no-store' });
      if (!warehouseRes.ok) throw new Error('Die vorhandenen Lagerplätze konnten nicht geladen werden.');
      const places = await warehouseRes.json() as WarehousePlace[];

      let updated = 0;
      let createdPlaces = 0;
      let pendingSaved = 0;

      const pendingRows = preview.filter(
        row => row.kind === 'not_found' && isNumericArticle(row.articleNumber),
      );

      for (const row of pendingRows) {
        const pendingRes = await fetch('/api/warehouse/pending', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            article_number: row.articleNumber,
            warehouse_location: row.warehouseLocation || 'MyPlace',
            warehouse_area: row.warehouseArea || null,
            warehouse_place: row.warehousePlace || null,
            warehouse_code: row.warehouseCode || null,
            season: row.season || null,
            brand: row.brand || null,
            source_sheet: row.sheet,
            source_row: row.excelRow,
            status: 'Offen',
          }),
        });

        if (!pendingRes.ok) {
          const pendingText = await pendingRes.text();
          throw new Error(
            `Offene Lagerzuordnung ${row.articleNumber} konnte nicht gespeichert werden: ${pendingText}`,
          );
        }

        pendingSaved += 1;
      }

      for (const row of rows) {
        const product = row.product!;
        const before = places.length;
        const place = await ensureWarehousePlace(row, places);
        if (places.length > before) createdPlaces += 1;

        const patch: Record<string, unknown> = {
          warehouse_location: targetValue(product.warehouse_location, row.warehouseLocation, row.decision),
          warehouse_area: targetValue(product.warehouse_area, row.warehouseArea, row.decision),
          warehouse_place: targetValue(product.warehouse_place, row.warehousePlace, row.decision),
          warehouse_code: targetValue(product.warehouse_code, row.warehouseCode, row.decision),
        };

        if (place && same(place.warehouse_code, patch.warehouse_code)) {
          patch.warehouse_place_id = place.id;
        }
        // Saison-Konflikt: Bei „Excel übernehmen“ gilt ausdrücklich der Excel-Wert.
        // Bei „App behalten“ bleibt ein vorhandener App-Wert unverändert;
        // ist die Saison in der App leer, darf Excel sie ergänzen.
        if (row.season) {
          if (row.decision === 'use_excel') {
            patch.season = row.season;
          } else {
            patch.season = isBlank(product.season) ? row.season : product.season;
          }
        }

        const updateRes = await fetch(`/api/products/${encodeURIComponent(product.id)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        });
        if (!updateRes.ok) {
          const text = await updateRes.text();
          throw new Error(`Artikel ${row.articleNumber} konnte nicht aktualisiert werden: ${text}`);
        }
        updated += 1;
      }

      setMessage(
        `${updated} Artikel aktualisiert. ` +
        `${pendingSaved} Lagerzuordnungen vorgemerkt. ` +
        `${createdPlaces} neue Lagerplätze angelegt.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Der Lagerimport konnte nicht abgeschlossen werden.');
    } finally {
      setImporting(false);
    }
  }

  return (
    <section style={{ fontFamily: FONT, marginTop: 24, marginBottom: 28, border: '1px solid #E7DED1', borderRadius: 18, background: '#FFFFFF', overflow: 'hidden' }}>
      <div style={{ padding: '22px 24px', background: '#FAF6F0', borderBottom: '1px solid #E7DED1' }}>
        <div style={{ fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#BEA175', fontWeight: 700, marginBottom: 6 }}>Excel · Vorprüfung</div>
        <h2 style={{ margin: 0, color: '#1F3A5F', fontSize: 23, fontFamily: FONT }}>Lagerdatei importieren</h2>
        <p style={{ margin: '8px 0 0', color: '#5D534B', fontSize: 14, lineHeight: 1.55, maxWidth: 860 }}>
          Die Datei wird zuerst geprüft. Artikel werden nur aktualisiert – niemals neu angelegt. Vorhandene Lagerangaben werden nicht automatisch überschrieben.
        </p>
      </div>

      <div style={{ padding: 24 }}>
        <input ref={inputRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={e => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.currentTarget.value = '';
        }} />

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <button type="button" onClick={() => inputRef.current?.click()} disabled={loading || importing}
            style={{ fontFamily: FONT, border: 0, borderRadius: 10, padding: '11px 16px', background: '#1F3A5F', color: '#FFFFFF', fontWeight: 700, cursor: 'pointer' }}>
            {loading ? 'Datei wird geprüft …' : 'Lagerdatei auswählen'}
          </button>
          {filename && <span style={{ fontSize: 14, color: '#5D534B' }}>{filename}</span>}
        </div>

        {error && <div style={{ marginTop: 16, padding: '12px 14px', borderRadius: 10, background: '#FFF1F1', color: '#8A2D2D', fontSize: 14 }}>{error}</div>}
        {message && <div style={{ marginTop: 16, padding: '12px 14px', borderRadius: 10, background: '#F3F7F3', color: '#35553A', fontSize: 14 }}>{message}</div>}

        {preview.length > 0 && <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))', gap: 10, marginTop: 20 }}>
            {[
              ['Zeilen', counts.total], ['Gefunden', counts.matched], ['Konflikte', counts.conflicts], ['Nicht gefunden', counts.notFound], ['Manuell prüfen', counts.manual],
            ].map(([label, value]) => <div key={String(label)} style={{ border: '1px solid #E7DED1', borderRadius: 12, padding: '12px 14px' }}>
              <div style={{ color: '#8B7D70', fontSize: 12 }}>{label}</div>
              <div style={{ color: '#1F3A5F', fontSize: 21, fontWeight: 700, marginTop: 3 }}>{value}</div>
            </div>)}
          </div>

          {(freeFormSheets.length > 0 || emptySheets.length > 0) && <div style={{ marginTop: 14, padding: '11px 13px', borderRadius: 10, background: '#FAF6F0', color: '#5D534B', fontSize: 13 }}>
            {freeFormSheets.length > 0 && <div>Separat/manuell zu prüfen: <strong>{freeFormSheets.join(', ')}</strong>.</div>}
            {emptySheets.length > 0 && <div>Leere Tabellenblätter ignoriert: <strong>{emptySheets.join(', ')}</strong>.</div>}
          </div>}

          <div style={{ overflowX: 'auto', marginTop: 18 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1050, fontFamily: FONT, fontSize: 13 }}>
              <thead><tr style={{ background: '#FAF6F0', color: '#1F3A5F' }}>
                {['Status','Blatt','Artikel','Marke','Lagerort','Wo','Lagerplatz','Lagerbezeichnung','Konflikt','Entscheidung'].map(h =>
                  <th key={h} style={{ textAlign: 'left', padding: '10px 9px', borderBottom: '1px solid #E7DED1', whiteSpace: 'nowrap' }}>{h}</th>)}
              </tr></thead>
              <tbody>{preview.map(row => <tr key={row.key}>
                <td style={{ padding: 9, borderBottom: '1px solid #EFE8DE' }}><strong>{statusLabel(row.kind)}</strong></td>
                <td style={{ padding: 9, borderBottom: '1px solid #EFE8DE' }}>{row.sheet}<div style={{ color: '#9A8C80', fontSize: 11 }}>Zeile {row.excelRow}</div></td>
                <td style={{ padding: 9, borderBottom: '1px solid #EFE8DE' }}>{row.articleNumber || '–'}{row.product?.sku && <div style={{ color: '#9A8C80', fontSize: 11 }}>{row.product.sku}</div>}</td>
                <td style={{ padding: 9, borderBottom: '1px solid #EFE8DE' }}>{row.brand || row.product?.brand || '–'}</td>
                <td style={{ padding: 9, borderBottom: '1px solid #EFE8DE' }}>{row.warehouseLocation || '–'}</td>
                <td style={{ padding: 9, borderBottom: '1px solid #EFE8DE' }}>{row.warehouseArea || '–'}</td>
                <td style={{ padding: 9, borderBottom: '1px solid #EFE8DE' }}>{row.warehousePlace || '–'}</td>
                <td style={{ padding: 9, borderBottom: '1px solid #EFE8DE' }}>{row.warehouseCode || '–'}</td>
                <td style={{ padding: 9, borderBottom: '1px solid #EFE8DE' }}>{row.conflicts.length ? row.conflicts.join(', ') : '–'}</td>
                <td style={{ padding: 9, borderBottom: '1px solid #EFE8DE' }}>{row.kind === 'conflict' ?
                  <select value={row.decision} onChange={e => setDecision(row.key, e.target.value as 'keep_app' | 'use_excel')}
                    style={{ fontFamily: FONT, border: '1px solid #D9CDBF', borderRadius: 8, padding: '7px 8px', background: '#FFFFFF' }}>
                    <option value="keep_app">App behalten</option><option value="use_excel">Excel übernehmen</option>
                  </select> : row.kind === 'matched' ? 'Automatisch ergänzen' : <span style={{ color: '#8B7D70' }}>Kein Import</span>}</td>
              </tr>)}</tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginTop: 18 }}>
            <div style={{ fontSize: 13, color: '#6D6259' }}>
              Direkt importierbar: <strong>{counts.importable}</strong> Artikel.{' '}
              Nicht gefundene numerische Artikel werden als offene Lagerzuordnung vorgemerkt.
              Manuelle Prüffälle bleiben unverändert.
            </div>
            <button type="button" onClick={() => void executeImport()} disabled={importing || counts.importable === 0}
              style={{ fontFamily: FONT, border: 0, borderRadius: 10, padding: '11px 16px', background: '#BEA175', color: '#32251D', fontWeight: 700, cursor: 'pointer', opacity: importing || counts.importable === 0 ? 0.6 : 1 }}>
              {importing ? 'Lagerdaten werden übernommen …' : 'Geprüfte Lagerdaten übernehmen'}
            </button>
          </div>
        </>}
      </div>
    </section>
  );
}
