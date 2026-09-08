'use client';

import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { deriveDeSize } from '@/lib/size-conversion';
import { categories, colorCatalog } from '@/lib/catalog';
import { uploadReferencePhoto } from '@/lib/photo-upload';
import { normalizeProductSeason } from '@/lib/website-season';

type Row = Record<string, unknown>;
type Product = Record<string, unknown> & { id?: string; sku?: string };

type CheckStatus = 'Neu' | 'Bereits vorhanden' | 'Mögliche Dublette' | 'Konflikt' | 'Unvollständig';
type Decision = 'Importieren' | 'Überspringen' | 'Prüfen' | 'Entfernen';

type AiSuggestion = {
  category?: string;
  subcategory?: string;
  color?: string;
  color_note?: string;
  material?: string;
  season?: string;
  confidence?: number;
};

type CheckedRow = {
  rowNumber: number;
  originalRow: Row;
  normalized: Record<string, unknown>;
  status: CheckStatus;
  reason: string;
  decision: Decision;
  selected: boolean;
  match?: Product;
  matchScore?: number;
  referencePhoto?: ReferencePhoto;
  aiStatus?: 'Bereit' | 'Analysiert' | 'Übersprungen' | 'Fehler';
  aiSuggestions?: AiSuggestion;
  aiError?: string;
};


type ReferencePhoto = { rowNumber:number; name:string; mimeType:string; dataUrl:string };

function attr(tag:string,name:string){return tag.match(new RegExp(`${name}="([^"]+)"`))?.[1]||'';}
function resolveTarget(base:string,target:string){
  const out:string[]=[]; for(const part of `${base}/${target}`.split('/')){
    if(!part||part==='.') continue; if(part==='..') out.pop(); else out.push(part);
  } return out.join('/');
}
function imageMime(name:string){
  const e=name.split('.').pop()?.toLowerCase();
  return e==='png'?'image/png':e==='gif'?'image/gif':e==='webp'?'image/webp':e==='bmp'?'image/bmp':'image/jpeg';
}
async function dataUrl(blob:Blob):Promise<string>{
  return await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result||''));r.onerror=()=>reject(r.error);r.readAsDataURL(blob);});
}
async function extractReferencePhotos(buffer:ArrayBuffer):Promise<Map<number,ReferencePhoto>>{
  const photos=new Map<number,ReferencePhoto>(); const zip=await JSZip.loadAsync(buffer);
  const wb=await zip.file('xl/workbook.xml')?.async('text');
  const wbRels=await zip.file('xl/_rels/workbook.xml.rels')?.async('text');
  if(!wb||!wbRels) return photos;
  const sheetTag=wb.match(/<sheet\b[^>]*\/?>/)?.[0]||''; const sheetRid=attr(sheetTag,'r:id');
  const wbRel=(wbRels.match(/<Relationship\b[^>]*\/?>/g)||[]).find(t=>attr(t,'Id')===sheetRid);
  if(!wbRel) return photos;
  const sheetPath=resolveTarget('xl',attr(wbRel,'Target')); const sheet=await zip.file(sheetPath)?.async('text'); if(!sheet) return photos;
  const sheetDir=sheetPath.split('/').slice(0,-1).join('/'); const sheetName=sheetPath.split('/').pop()||'';
  const sheetRels=await zip.file(`${sheetDir}/_rels/${sheetName}.rels`)?.async('text'); if(!sheetRels) return photos;
  const drawingTag=sheet.match(/<drawing\b[^>]*\/?>/)?.[0]||''; const drawingRid=attr(drawingTag,'r:id');
  const drawingRel=(sheetRels.match(/<Relationship\b[^>]*\/?>/g)||[]).find(t=>attr(t,'Id')===drawingRid); if(!drawingRel) return photos;
  const drawingPath=resolveTarget(sheetDir,attr(drawingRel,'Target')); const drawing=await zip.file(drawingPath)?.async('text'); if(!drawing) return photos;
  const drawingDir=drawingPath.split('/').slice(0,-1).join('/'); const drawingName=drawingPath.split('/').pop()||'';
  const drawingRels=await zip.file(`${drawingDir}/_rels/${drawingName}.rels`)?.async('text'); if(!drawingRels) return photos;
  const targets=new Map<string,string>();
  for(const t of drawingRels.match(/<Relationship\b[^>]*\/?>/g)||[]){
    if(/\/image$/i.test(attr(t,'Type'))) targets.set(attr(t,'Id'),resolveTarget(drawingDir,attr(t,'Target')));
  }
  const anchors=drawing.match(/<(?:xdr:)?(?:oneCellAnchor|twoCellAnchor)\b[\s\S]*?<\/(?:xdr:)?(?:oneCellAnchor|twoCellAnchor)>/g)||[];
  for(const a of anchors){
    const rm=a.match(/<(?:xdr:)?from>[\s\S]*?<(?:xdr:)?row>(\d+)<\/(?:xdr:)?row>/); const em=a.match(/r:embed="([^"]+)"/);
    if(!rm||!em) continue; const rowNumber=Number(rm[1])+1; const mediaPath=targets.get(em[1]); if(!mediaPath||photos.has(rowNumber)) continue;
    const f=zip.file(mediaPath); if(!f) continue; const bytes=await f.async('uint8array'); const name=mediaPath.split('/').pop()||`reference-${rowNumber}.jpg`;
    const mimeType=imageMime(name); photos.set(rowNumber,{rowNumber,name,mimeType,dataUrl:await dataUrl(new Blob([Uint8Array.from(bytes)],{type:mimeType}))});
  }
  return photos;
}

const subcategoryOptions = Object.values(categories).flat() as string[];

type ImportResult = {
  rowNumber: number;
  status: 'Erfolgreich importiert' | 'Nicht importiert' | 'Übersprungen';
  reason: string;
  sku: string;
  generatedSku: boolean;
  pending?: boolean;
  originalRow: Row;
  checkStatus?: CheckStatus;
  matchSku?: string;
  referencePhotoStatus?: string;
  masterDataBackfillStatus?: string;
  warehousePendingStatus?: string;
};

function text(value: unknown) {
  return String(value ?? '').trim();
}

function norm(value: unknown) {
  return text(value).toLowerCase().replace(/\s+/g, ' ');
}

function numberValue(value: unknown): number | null {
  if (value === '' || value == null) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number(String(value).replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeRow(row: Row) {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key.trim().toLowerCase(), value]),
  );
}

function canonicalColumnKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]/g, '');
}

function rowField(row: Record<string, unknown>, ...keys: string[]) {
  // 1. Exakte/klassische Zuordnung zuerst.
  for (const key of keys) {
    if (row[key] !== undefined && text(row[key]) !== '') return row[key];
  }

  // 2. Robuster Excel-Fallback:
  // Leerzeichen, Punkte, Bindestriche, Schrägstriche und Umlaut-Schreibweisen
  // werden für den Spaltenvergleich ignoriert.
  const wanted = new Set(keys.map(canonicalColumnKey));

  for (const [rawKey, value] of Object.entries(row)) {
    if (text(value) === '') continue;
    if (wanted.has(canonicalColumnKey(rawKey))) return value;
  }

  return '';
}

function supplierOrderNumberFromRow(row: Record<string, unknown>) {
  const direct = text(rowField(
    row,
    'artikel nr bestellung',
    'artikel nr / bestellung',
    'artikel-nr. / bestellung',
    'artikel-nr / bestellung',
    'artikel-nr.',
    'artikel-nr',
    'artikel nr.',
    'artikel nr',
    'artikelnr.',
    'artikelnr',
    'artikelnummer',
    'supplier_order_number',
  ));
  if (direct) return direct;

  // Letzte Sicherheitsstufe: jede Excel-Spalte akzeptieren, deren Überschrift
  // eindeutig nach Artikel + Nr./Nummer aussieht. Referenznummern werden ausgeschlossen.
  for (const [rawKey, value] of Object.entries(row)) {
    const key = canonicalColumnKey(rawKey);
    const v = text(value);
    if (!v) continue;
    if (key.includes('referenz')) continue;

    const looksLikeArticleNumber =
      key.includes('artikel') && (key.includes('nr') || key.includes('nummer'));

    if (looksLikeArticleNumber) return v;
  }

  return '';
}

function firstNonEmpty(...values: unknown[]) {
  for (const value of values) {
    const v = text(value);
    if (v) return v;
  }
  return '';
}

function mergeAiIntoNormalized(normalized: Record<string, unknown>, suggestion: AiSuggestion) {
  const next = { ...normalized };

  // Bestehende Excel-Werte haben immer Vorrang. KI ergänzt nur Lücken.
  if (!text(rowField(next, 'kategorie', 'category')) && suggestion.category) next.kategorie = suggestion.category;
  if (!text(rowField(next, 'unterkategorie', 'subcategory')) && suggestion.subcategory) next.unterkategorie = suggestion.subcategory;
  if (!text(rowField(next, 'farbe', 'color')) && suggestion.color) next.farbe = suggestion.color;
  if (!text(rowField(next, 'farbhinweis', 'color_note')) && suggestion.color_note) next.farbhinweis = suggestion.color_note;
  if (!text(rowField(next, 'material')) && suggestion.material) next.material = suggestion.material;
  if (!text(rowField(next, 'saison', 'season')) && suggestion.season) next.saison = normalizeProductSeason(suggestion.season);

  return next;
}

function productField(product: Product, ...keys: string[]) {
  for (const key of keys) {
    if (product[key] !== undefined && text(product[key]) !== '') return product[key];
  }
  return '';
}

function getRowIdentity(row: Record<string, unknown>) {
  return {
    sku: text(rowField(row, 'sku')),
    reference: text(rowField(row, 'referenznummer', 'referenz', 'supplier_reference')),
    orderNumber: text(rowField(row, 'bestellnummer', 'rechnungsnummer', 'invoice_number')),
    supplierOrderNumber: supplierOrderNumberFromRow(row),
    brand: text(rowField(row, 'marke', 'brand')),
    subcategory: text(rowField(row, 'unterkategorie', 'subcategory')),
    color: text(rowField(row, 'farbe', 'color')),
    size: text(rowField(row, 'größe', 'groesse', 'original_size')),
    purchasePrice: numberValue(rowField(row, 'einkaufspreis', 'purchase_price')),
  };
}

function getProductIdentity(product: Product) {
  return {
    sku: text(productField(product, 'sku')),
    reference: text(productField(product, 'supplier_reference')),
    orderNumber: text(productField(product, 'invoice_number')),
    supplierOrderNumber: text(productField(product, 'supplier_order_number')),
    brand: text(productField(product, 'brand')),
    subcategory: text(productField(product, 'subcategory')),
    color: text(productField(product, 'color')),
    size: text(productField(product, 'original_size', 'size')),
    purchasePrice: numberValue(productField(product, 'purchase_price')),
  };
}

function same(a: unknown, b: unknown) {
  return norm(a) !== '' && norm(a) === norm(b);
}

function sameMoney(a: number | null, b: number | null) {
  return a != null && b != null && Math.abs(a - b) < 0.01;
}

function pendingSkuFromRow(row: Record<string, unknown>, rowNumber: number) {
  const supplierOrderNumber = supplierOrderNumberFromRow(row);
  const reference = text(rowField(row, 'referenznummer', 'referenz', 'supplier_reference'));
  const rawKey = [supplierOrderNumber, reference].filter(Boolean).join('-') || `ROW-${rowNumber}`;
  const cleanKey = rawKey
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

  return `PENDING-${cleanKey || `ROW-${rowNumber}`}`;
}

function analyzeRow(row: Row, rowNumber: number, products: Product[]): CheckedRow {
  const normalized = normalizeRow(row);
  const excel = getRowIdentity(normalized);

  // MON CHIC Regel: Negativer EK = Retoure oder „Nicht im Verkauf“.
  // Diese Zeilen bleiben zur Nachvollziehbarkeit in der Vorprüfung / im Bericht,
  // dürfen aber niemals automatisch in den aktiven Artikelbestand importiert werden.
  if (excel.purchasePrice != null && excel.purchasePrice < 0) {
    return {
      rowNumber, originalRow: row, normalized,
      status: 'Unvollständig',
      reason: `Negativer EK (${excel.purchasePrice.toFixed(2).replace('.', ',')} €): Retoure oder Nicht im Verkauf – nicht in den Artikelbestand importieren.`,
      decision: 'Entfernen', selected: false,
    };
  }

  if (!excel.sku && !excel.reference && !excel.supplierOrderNumber && !excel.subcategory) {
    return {
      rowNumber, originalRow: row, normalized,
      status: 'Unvollständig',
      reason: 'SKU, Referenznummer, Artikel-Nr. und Unterkategorie fehlen.',
      decision: 'Prüfen', selected: false,
    };
  }

  // 1. Stärkster Treffer: SKU
  if (excel.sku) {
    const match = products.find(p => same(getProductIdentity(p).sku, excel.sku));
    if (match) {
      return {
        rowNumber, originalRow: row, normalized,
        status: 'Bereits vorhanden',
        reason: `Eindeutiger SKU-Treffer: ${excel.sku}.`,
        decision: 'Überspringen', selected: false, match, matchScore: 100,
      };
    }
  }

  // 2. Starker Treffer: Lieferanten-/Referenznummer
  if (excel.reference) {
    const refs = products.filter(p => same(getProductIdentity(p).reference, excel.reference));
    if (refs.length === 1) {
      const match = refs[0];
      const app = getProductIdentity(match);
      const contradictions = [
        excel.brand && app.brand && !same(excel.brand, app.brand) ? 'Marke' : '',
        excel.subcategory && app.subcategory && !same(excel.subcategory, app.subcategory) ? 'Unterkategorie' : '',
        excel.color && app.color && !same(excel.color, app.color) ? 'Farbe' : '',
        excel.size && app.size && !same(excel.size, app.size) ? 'Größe' : '',
      ].filter(Boolean);

      if (contradictions.length) {
        return {
          rowNumber, originalRow: row, normalized,
          status: 'Konflikt',
          reason: `Referenznummer ist vorhanden, aber ${contradictions.join(', ')} weicht ab.`,
          decision: 'Prüfen', selected: false, match, matchScore: 95,
        };
      }
      return {
        rowNumber, originalRow: row, normalized,
        status: 'Bereits vorhanden',
        reason: `Eindeutiger Referenz-Treffer: ${excel.reference}.`,
        decision: 'Überspringen', selected: false, match, matchScore: 95,
      };
    }
    if (refs.length > 1) {
      return {
        rowNumber, originalRow: row, normalized,
        status: 'Konflikt',
        reason: `Referenznummer ${excel.reference} ist mehrfach im Bestand vorhanden.`,
        decision: 'Prüfen', selected: false, match: refs[0], matchScore: 90,
      };
    }
  }

  // 3. Artikel-/Bestellnummer
  if (excel.supplierOrderNumber) {
    const matches = products.filter(p => same(getProductIdentity(p).supplierOrderNumber, excel.supplierOrderNumber));
    if (matches.length === 1) {
      const match = matches[0];
      const app = getProductIdentity(match);
      const plausibility = [
        same(excel.brand, app.brand),
        same(excel.subcategory, app.subcategory),
        same(excel.color, app.color),
        same(excel.size, app.size),
      ].filter(Boolean).length;

      if (plausibility >= 2) {
        return {
          rowNumber, originalRow: row, normalized,
          status: 'Bereits vorhanden',
          reason: `Artikel-/Bestellnummer stimmt; ${plausibility} zusätzliche Merkmale passen.`,
          decision: 'Überspringen', selected: false, match, matchScore: 85,
        };
      }
      return {
        rowNumber, originalRow: row, normalized,
        status: 'Mögliche Dublette',
        reason: 'Artikel-/Bestellnummer stimmt, aber zu wenige zusätzliche Merkmale sind eindeutig.',
        decision: 'Prüfen', selected: false, match, matchScore: 75,
      };
    }
    if (matches.length > 1) {
      return {
        rowNumber, originalRow: row, normalized,
        status: 'Konflikt',
        reason: 'Artikel-/Bestellnummer kommt mehrfach im Bestand vor.',
        decision: 'Prüfen', selected: false, match: matches[0], matchScore: 70,
      };
    }
  }

  // 4. Plausibilitätsvergleich: Marke + Unterkategorie + Farbe + Größe + EK.
  let best: { product: Product; score: number; matches: string[] } | null = null;
  for (const product of products) {
    const app = getProductIdentity(product);
    let score = 0;
    const matches: string[] = [];
    if (same(excel.brand, app.brand)) { score += 25; matches.push('Marke'); }
    if (same(excel.subcategory, app.subcategory)) { score += 25; matches.push('Unterkategorie'); }
    if (same(excel.color, app.color)) { score += 15; matches.push('Farbe'); }
    if (same(excel.size, app.size)) { score += 15; matches.push('Größe'); }
    if (sameMoney(excel.purchasePrice, app.purchasePrice)) { score += 10; matches.push('EK'); }
    if (excel.orderNumber && same(excel.orderNumber, app.orderNumber)) { score += 20; matches.push('Bestellnummer'); }
    if (!best || score > best.score) best = { product, score, matches };
  }

  if (best && best.score >= 60) {
    return {
      rowNumber, originalRow: row, normalized,
      status: 'Mögliche Dublette',
      reason: `Ähnlicher Artikel gefunden: ${best.matches.join(' + ')}.`,
      decision: 'Prüfen', selected: false, match: best.product, matchScore: best.score,
    };
  }

  return {
    rowNumber, originalRow: row, normalized,
    status: 'Neu',
    reason: excel.subcategory
      ? 'Kein ausreichender Treffer im vorhandenen Bestand.'
      : 'Kein ausreichender Treffer im vorhandenen Bestand. Unterkategorie fehlt – kann als „Unvollständig“ gespeichert und später nachgetragen werden.',
    decision: 'Importieren', selected: true,
  };
}


type PendingWarehouseAssignment = {
  id: string;
  article_number?: string;
  warehouse_location?: string | null;
  warehouse_area?: string | null;
  warehouse_place?: string | null;
  warehouse_code?: string | null;
  season?: string | null;
  status?: string | null;
};

type WarehousePlaceRecord = {
  id: string;
  warehouse_code?: string | null;
};

async function applyPendingWarehouseAssignment(
  productId: string,
  articleNumber: string,
): Promise<string> {
  const normalizedArticleNumber = text(articleNumber);
  if (!normalizedArticleNumber) return 'Keine Artikel-Nr. für Lagerabgleich';

  const pendingRes = await fetch('/api/warehouse/pending', { cache: 'no-store' });
  if (!pendingRes.ok) {
    throw new Error(
      `Offene Lagerzuordnungen konnten nicht geladen werden: ${(await pendingRes.text()).trim() || `HTTP ${pendingRes.status}`}`,
    );
  }

  const pendingRows = await pendingRes.json() as PendingWarehouseAssignment[];
  const pending = pendingRows.find(entry =>
    text(entry.article_number) === normalizedArticleNumber &&
    norm(entry.status || 'Offen') === 'offen'
  );

  if (!pending) return 'Keine offene Lagerzuordnung vorhanden';

  let warehousePlaceId: string | null = null;
  const warehouseCode = text(pending.warehouse_code);

  if (warehouseCode) {
    const warehouseRes = await fetch('/api/warehouse', { cache: 'no-store' });
    if (!warehouseRes.ok) {
      throw new Error(
        `Lagerplätze konnten nicht geladen werden: ${(await warehouseRes.text()).trim() || `HTTP ${warehouseRes.status}`}`,
      );
    }

    const places = await warehouseRes.json() as WarehousePlaceRecord[];
    let place = places.find(entry => norm(entry.warehouse_code) === norm(warehouseCode));

    if (!place) {
      const createPlaceRes = await fetch('/api/warehouse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warehouse_location: text(pending.warehouse_location) || 'MyPlace',
          warehouse_area: text(pending.warehouse_area) || null,
          warehouse_place: text(pending.warehouse_place) || null,
          warehouse_code: warehouseCode,
          source_sheet: 'Pending-Zuordnung',
          notes: `Automatisch beim Artikelimport für Artikel ${normalizedArticleNumber} angelegt`,
        }),
      });

      if (!createPlaceRes.ok) {
        throw new Error(
          `Lagerplatz ${warehouseCode} konnte nicht angelegt werden: ${(await createPlaceRes.text()).trim() || `HTTP ${createPlaceRes.status}`}`,
        );
      }

      place = await createPlaceRes.json() as WarehousePlaceRecord;
    }

    warehousePlaceId = place.id;
  }

  const patch: Record<string, unknown> = {
    warehouse_location: text(pending.warehouse_location) || undefined,
    warehouse_area: text(pending.warehouse_area) || undefined,
    warehouse_place: text(pending.warehouse_place) || undefined,
    warehouse_code: warehouseCode || undefined,
    warehouse_place_id: warehousePlaceId,
    season: text(pending.season) || undefined,
  };

  const cleanPatch = Object.fromEntries(
    Object.entries(patch).filter(([, value]) => value !== undefined),
  );

  const productPatchRes = await fetch(`/api/products/${encodeURIComponent(productId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cleanPatch),
  });

  if (!productPatchRes.ok) {
    throw new Error(
      `Vorgemerkte Lagerdaten konnten nicht beim Artikel gespeichert werden: ${(await productPatchRes.text()).trim() || `HTTP ${productPatchRes.status}`}`,
    );
  }

  const pendingDoneRes = await fetch(`/api/warehouse/pending/${encodeURIComponent(pending.id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'Erledigt' }),
  });

  if (!pendingDoneRes.ok) {
    throw new Error(
      `Lagerdaten wurden übernommen, aber die Vormerkung konnte nicht als erledigt markiert werden: ${(await pendingDoneRes.text()).trim() || `HTTP ${pendingDoneRes.status}`}`,
    );
  }

  return `Lagerdaten automatisch übernommen${warehouseCode ? ` · ${warehouseCode}` : ''}`;
}

export default function InventoryImport() {
  const [rows, setRows] = useState<Row[]>([]);
  const [checkedRows, setCheckedRows] = useState<CheckedRow[]>([]);
  const [message, setMessage] = useState('');
  const [checking, setChecking] = useState(false);
  const [importing, setImporting] = useState(false);
  const [analyzingAi, setAnalyzingAi] = useState(false);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [sourceFileName, setSourceFileName] = useState('');
  const [filter, setFilter] = useState<'Alle' | 'Neu' | 'Bereits vorhanden' | 'Zu prüfen'>('Alle');
  const [referencePhotos, setReferencePhotos] = useState<Map<number, ReferencePhoto>>(new Map());

  async function read(file: File) {
    setMessage('');
    setResults([]);
    setCheckedRows([]);
    setSourceFileName(file.name);

    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const parsed = XLSX.utils.sheet_to_json<Row>(sheet, { defval: '' });

    let photos = new Map<number, ReferencePhoto>();
    if (/\.xlsx$/i.test(file.name)) {
      try { photos = await extractReferencePhotos(data); }
      catch (error) { console.warn('Referenzfotos konnten nicht ausgelesen werden:', error); }
    }
    setRows(parsed);
    setReferencePhotos(photos);
    setMessage(`${parsed.length} Zeilen erkannt · 🖼️ ${photos.size} eingebettete Referenzfotos erkannt. Bitte jetzt zuerst die Datei vorprüfen.`);
  }

  async function precheck() {
    if (!rows.length) return;
    setChecking(true);
    setMessage('Vorprüfung läuft …');

    try {
      const response = await fetch('/api/products', { cache: 'no-store' });
      if (!response.ok) throw new Error(await response.text() || 'Bestand konnte nicht geladen werden.');
      const data = await response.json();
      const products: Product[] = Array.isArray(data) ? data : [];

      const checked = rows.map((row, index) => {
        const analyzed = analyzeRow(row, index + 2, products);
        return { ...analyzed, referencePhoto: referencePhotos.get(index + 2) };
      });
      setCheckedRows(checked);

      const counts = {
        neu: checked.filter(x => x.status === 'Neu').length,
        vorhanden: checked.filter(x => x.status === 'Bereits vorhanden').length,
        dubletten: checked.filter(x => x.status === 'Mögliche Dublette').length,
        konflikt: checked.filter(x => x.status === 'Konflikt').length,
        unvollstaendig: checked.filter(x => x.status === 'Unvollständig').length,
      };

      setMessage(
        `Vorprüfung abgeschlossen: ${checked.length} geprüft · ${counts.neu} neu · ${counts.vorhanden} bereits vorhanden · ${counts.dubletten} mögliche Dubletten · ${counts.konflikt} Konflikte · ${counts.unvollstaendig} unvollständig.`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? `Vorprüfung fehlgeschlagen: ${error.message}` : 'Vorprüfung fehlgeschlagen.');
    } finally {
      setChecking(false);
    }
  }

  async function analyzeSelectedPhotos() {
    const candidates = checkedRows.filter(item =>
      item.selected &&
      item.decision === 'Importieren' &&
      item.referencePhoto
    );

    if (!candidates.length) {
      setMessage('Für die KI-Analyse ist aktuell kein ausgewählter Artikel mit Referenzfoto vorhanden.');
      return;
    }

    setAnalyzingAi(true);
    setMessage(`KI analysiert ${candidates.length} ausgewählte Referenzfoto(s) …`);

    let analyzed = 0;
    let failed = 0;

    for (const candidate of candidates) {
      try {
        const response = await fetch('/api/ai/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageDataUrls: [candidate.referencePhoto!.dataUrl] }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result?.error || 'KI-Analyse fehlgeschlagen.');

        const suggestion: AiSuggestion = {
          category: firstNonEmpty(result.category),
          subcategory: firstNonEmpty(result.subcategory),
          color: firstNonEmpty(result.color),
          color_note: firstNonEmpty(result.color_note),
          material: firstNonEmpty(result.material),
          season: firstNonEmpty(result.season),
          confidence: typeof result.confidence === 'number' ? result.confidence : undefined,
        };

        setCheckedRows(current => current.map(item => {
          if (item.rowNumber !== candidate.rowNumber) return item;
          return {
            ...item,
            normalized: mergeAiIntoNormalized(item.normalized, suggestion),
            aiStatus: 'Analysiert',
            aiSuggestions: suggestion,
            aiError: undefined,
          };
        }));
        analyzed++;
      } catch (error) {
        failed++;
        const errorText = error instanceof Error ? error.message : 'KI-Analyse fehlgeschlagen.';
        setCheckedRows(current => current.map(item => item.rowNumber === candidate.rowNumber
          ? { ...item, aiStatus: 'Fehler', aiError: errorText }
          : item));
      }
    }

    setMessage(`KI-Fotoanalyse abgeschlossen: ${analyzed} analysiert${failed ? ` · ${failed} Fehler` : ''}. Bestehende Excel-Werte wurden nicht überschrieben.`);
    setAnalyzingAi(false);
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

  function setDecision(rowNumber: number, decision: Decision) {
    setCheckedRows(current => current.map(item => {
      if (item.rowNumber !== rowNumber) return item;
      const ek = getRowIdentity(item.normalized).purchasePrice;
      if (ek != null && ek < 0) {
        return { ...item, decision: 'Entfernen', selected: false };
      }
      return { ...item, decision, selected: decision === 'Importieren' };
    }));
  }

  function selectAllNew() {
    setCheckedRows(current => current.map(item => {
      const ek = getRowIdentity(item.normalized).purchasePrice;
      if (ek != null && ek < 0) return { ...item, decision: 'Entfernen', selected: false };
      return item.status === 'Neu'
        ? { ...item, decision: 'Importieren', selected: true }
        : item;
    }));
  }

  function deselectAll() {
    setCheckedRows(current => current.map(item => {
      const ek = getRowIdentity(item.normalized).purchasePrice;

      // Negativer EK bleibt grundsätzlich ausgeschlossen.
      if (ek != null && ek < 0) {
        return { ...item, selected: false, decision: 'Entfernen' };
      }

      // Bereits vorhandene Artikel bleiben als "überspringen" markiert.
      if (item.status === 'Bereits vorhanden') {
        return { ...item, selected: false, decision: 'Überspringen' };
      }

      // Alle übrigen Zeilen sichtbar abwählen.
      return { ...item, selected: false, decision: 'Entfernen' };
    }));
  }

  function skipAllExisting() {
    setCheckedRows(current => current.map(item => item.status === 'Bereits vorhanden'
      ? { ...item, decision: 'Überspringen', selected: false }
      : item));
  }

  function getExistingMasterDataPatch(item: CheckedRow) {
    if (item.status !== 'Bereits vorhanden' || !item.match?.id) return null;

    const excel = getRowIdentity(item.normalized);
    const patch: Record<string, unknown> = {};

    // Excel ist für diese organisatorischen Felder führend.
    // Es werden ausschließlich LEERE Felder im vorhandenen Artikel ergänzt.
    if (!text(productField(item.match, 'supplier_reference')) && excel.reference) {
      patch.supplier_reference = excel.reference;
    }

    if (!text(productField(item.match, 'supplier_order_number')) && excel.supplierOrderNumber) {
      patch.supplier_order_number = excel.supplierOrderNumber;
    }

    const excelWarehouse = text(rowField(item.normalized, 'lagerort', 'warehouse_location'));
    if (!text(productField(item.match, 'warehouse_location')) && excelWarehouse) {
      patch.warehouse_location = excelWarehouse;
    }

    return Object.keys(patch).length ? patch : null;
  }

  async function backfillExistingMasterData() {
    const existing = checkedRows.filter(
      item => item.status === 'Bereits vorhanden' && item.match?.id,
    );

    let updated = 0;
    let unchanged = 0;
    let failed = 0;
    const statusByRow = new Map<number, string>();

    for (const item of existing) {
      const patch = getExistingMasterDataPatch(item);

      if (!patch || !item.match?.id) {
        unchanged++;
        statusByRow.set(item.rowNumber, 'Stammdaten bereits vollständig');
        continue;
      }

      try {
        const response = await fetch(`/api/products/${item.match.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        });

        if (!response.ok) {
          failed++;
          statusByRow.set(
            item.rowNumber,
            `Nachpflege fehlgeschlagen: ${(await response.text()).trim() || `HTTP ${response.status}`}`,
          );
          continue;
        }

        updated++;
        const labels = [
          patch.supplier_reference !== undefined ? 'Referenznummer' : '',
          patch.supplier_order_number !== undefined ? 'Artikel-Nr./Bestellung' : '',
          patch.warehouse_location !== undefined ? 'Lagerort' : '',
        ].filter(Boolean);

        statusByRow.set(item.rowNumber, `${labels.join(', ')} aus Excel nachgetragen`);

        setCheckedRows(current => current.map(row =>
          row.rowNumber === item.rowNumber && row.match
            ? { ...row, match: { ...row.match, ...patch } }
            : row
        ));
      } catch (error) {
        failed++;
        statusByRow.set(
          item.rowNumber,
          `Nachpflege fehlgeschlagen: ${error instanceof Error ? error.message : 'Technischer Fehler'}`,
        );
      }
    }

    return { updated, unchanged, failed, statusByRow };
  }

  async function runBackfillOnly() {
    setImporting(true);
    setMessage('');

    try {
      const backfill = await backfillExistingMasterData();
      setMessage(
        `Bestehende Artikel geprüft: ${backfill.updated} Stammdatensätze nachgetragen, ${backfill.unchanged} bereits vollständig, ${backfill.failed} Fehler.`,
      );
    } finally {
      setImporting(false);
    }
  }

  async function run() {
    const candidates = checkedRows.filter(item => item.selected && item.decision === 'Importieren');

    setImporting(true);

    // V55C19: Nachpflege-Button oben sichtbar; vorhandene Treffer werden nicht neu importiert.
    // Leere Referenz-/Bestell-/Lagerfelder werden aber sicher aus Excel ergänzt.
    const backfill = await backfillExistingMasterData();

    if (!candidates.length) {
      setMessage(
        `Keine neuen Artikel ausgewählt. Bestehende Artikel geprüft: ${backfill.updated} nachgetragen, ${backfill.unchanged} bereits vollständig, ${backfill.failed} Fehler.`,
      );
      setImporting(false);
      return;
    }

    let ok = 0, failed = 0, skuGenerated = 0, incompleteSaved = 0;
    const nextResults: ImportResult[] = [];

    // Auch übersprungene/geprüfte Zeilen in den Bericht aufnehmen.
    for (const item of checkedRows.filter(x => !x.selected || x.decision !== 'Importieren')) {
      nextResults.push({
        rowNumber: item.rowNumber,
        status: 'Übersprungen',
        reason: `${item.status}: ${item.reason}`,
        sku: text(item.match?.sku),
        generatedSku: false,
        originalRow: item.originalRow,
        checkStatus: item.status,
        matchSku: text(item.match?.sku),
        referencePhotoStatus: item.referencePhoto ? 'In Excel vorhanden' : 'Fehlt in Excel',
        masterDataBackfillStatus: backfill.statusByRow.get(item.rowNumber),
      });
    }

    for (const item of candidates) {
      const row = item.originalRow;
      const normalized = item.normalized;
      const subcategory = text(rowField(normalized, 'unterkategorie', 'subcategory'));
      let sku = text(rowField(normalized, 'sku'));
      let generatedSku = false;
      let isPending = false;

      // Ein Artikel ist beim Import unvollständig, wenn entweder
      // die Unterkategorie oder das Referenzfoto fehlt.
      // Diese Variable gehört bewusst in den Kandidaten-Loop, damit sie
      // während des gesamten Importvorgangs für diese Zeile verfügbar ist.
      const isIncomplete = !subcategory || !item.referencePhoto;

      // Fehlt die Unterkategorie, wird NICHT geraten und der Artikel wird nicht mehr verworfen.
      // Statt einer echten MCP-SKU erhält er eine klar erkennbare technische PENDING-SKU.
      // Die bestehende Supabase-Regel (SKU Pflicht + Unique) bleibt dadurch unverändert erhalten.
      if (!sku && !subcategory) {
        sku = pendingSkuFromRow(normalized, item.rowNumber);
        isPending = true;
      }

      if (!sku && subcategory) {
        const generated = await generateSku(subcategory);
        if (generated) {
          sku = generated;
          generatedSku = true;
          skuGenerated++;
        }
      }

      if (!sku) {
        failed++;
        nextResults.push({
          rowNumber: item.rowNumber,
          status: 'Nicht importiert',
          reason: 'SKU konnte nicht erzeugt werden.',
          sku: '',
          generatedSku: false,
          originalRow: row,
          checkStatus: item.status,
          referencePhotoStatus: item.referencePhoto ? 'In Excel vorhanden' : 'Fehlt in Excel',
        });
        continue;
      }

      const originalSize = text(rowField(normalized, 'größe', 'groesse', 'original_size'));
      const sizeSystem = text(rowField(normalized, 'größensystem', 'groessensystem', 'size_system'));
      const gender = text(rowField(normalized, 'geschlecht', 'gender')) || 'Damen';
      const derivedDeSize = subcategory ? deriveDeSize(sizeSystem, originalSize, gender, subcategory) : '';

      const rawColor = text(rowField(normalized, 'farbe', 'color'));
      const matchedColor = colorCatalog.find(name => name.toLowerCase() === rawColor.toLowerCase());
      const rawColorNote = text(rowField(normalized, 'farbhinweis', 'color_note'));
      const colorNote = matchedColor ? rawColorNote : [rawColor, rawColorNote].filter(Boolean).join(' — ');

      const existingInternalNotes = text(rowField(normalized, 'notiz', 'notizen', 'internal_notes'));
      const pendingNote = isPending
        ? 'IMPORT-HINWEIS: Unvollständiger Artikel. Unterkategorie fehlt; endgültige MCP-SKU und ggf. Referenzfoto später nachtragen.'
        : '';

      const payload = {
        sku,
        brand: text(rowField(normalized, 'marke', 'brand')),
        category: text(rowField(normalized, 'kategorie', 'category')),
        subcategory: subcategory || undefined,
        original_size: originalSize,
        size_system: sizeSystem || undefined,
        de_size: derivedDeSize || undefined,
        gender: gender || undefined,
        color: matchedColor || undefined,
        color_note: colorNote || undefined,
        material: text(rowField(normalized, 'material')),
        season: normalizeProductSeason(rowField(normalized, 'saison', 'season')),
        show_on_website: isIncomplete ? false : true,
        purchase_price: numberValue(rowField(normalized, 'einkaufspreis', 'purchase_price')),
        original_retail_value: numberValue(rowField(normalized, 'ehemaliger wert', 'original_retail_value')),
        supplier_order_number: supplierOrderNumberFromRow(normalized),
        sale_price: numberValue(rowField(normalized, 'verkaufspreis', 'sale_price')),
        flaws: text(rowField(normalized, 'mängel', 'maengel', 'zustand', 'flaws')),
        internal_notes: [existingInternalNotes, pendingNote].filter(Boolean).join('\n'),
        supplier_reference: text(rowField(normalized, 'referenznummer', 'referenz', 'supplier_reference')),
        status: isIncomplete ? 'Unvollständig' : (text(rowField(normalized, 'status')) || 'Entwurf'),
        warehouse_location: text(rowField(normalized, 'lagerort', 'warehouse_location')),
      };

      try {
        const response = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          ok++;
          if (isIncomplete) incompleteSaved++;
          const created = await response.json() as Product;
          let photoStatus = item.referencePhoto ? 'Referenzfoto erkannt, noch nicht gespeichert' : 'Kein Referenzfoto in Excel';
          let photoNote = '';

          if (item.referencePhoto && created.id) {
            try {
              const ext = item.referencePhoto.name.split('.').pop() || 'jpg';
              const blob = await (await fetch(item.referencePhoto.dataUrl)).blob();
              const file = new File(
                [blob],
                `excel-reference-${item.rowNumber}.${ext}`,
                { type: item.referencePhoto.mimeType },
              );

              const publicUrl = await uploadReferencePhoto(file, created.id);

              const patchResponse = await fetch(`/api/products/${created.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reference_photo_url: publicUrl }),
              });

              if (!patchResponse.ok) {
                throw new Error(await patchResponse.text());
              }

              photoStatus = 'Referenzfoto gespeichert';
            } catch (error) {
              photoStatus = 'Referenzfoto konnte nicht gespeichert werden';
              photoNote = error instanceof Error ? error.message : 'Unbekannter Foto-Fehler';
            }
          }

          let warehousePendingStatus = 'Keine offene Lagerzuordnung vorhanden';

          if (created.id) {
            try {
              const articleNumber = supplierOrderNumberFromRow(normalized);
              warehousePendingStatus = await applyPendingWarehouseAssignment(
                created.id,
                articleNumber,
              );
            } catch (error) {
              warehousePendingStatus =
                `Lagerzuordnung fehlgeschlagen: ${error instanceof Error ? error.message : 'Technischer Fehler'}`;
            }
          }

          nextResults.push({
            rowNumber: item.rowNumber,
            status: 'Erfolgreich importiert',
            reason: [
              isIncomplete
                ? (
                    isPending
                      ? 'Als unvollständiger Artikel dauerhaft gespeichert. Technische PENDING-SKU vergeben; Unterkategorie und/oder Referenzfoto später nachtragen.'
                      : 'Artikel mit echter MCP-SKU gespeichert, bleibt aber „Unvollständig“, weil das Referenzfoto fehlt.'
                  )
                : (generatedSku ? 'Import erfolgreich; SKU automatisch vergeben.' : 'Import erfolgreich.'),
              photoNote ? `Referenzfoto: ${photoNote}` : '',
            ].filter(Boolean).join(' '),
            sku,
            generatedSku,
            pending: isPending,
            originalRow: row,
            checkStatus: isIncomplete ? 'Unvollständig' : item.status,
            referencePhotoStatus: photoStatus,
            warehousePendingStatus,
          });
        } else {
          failed++;
          const responseText = await response.text();
          nextResults.push({
            rowNumber: item.rowNumber,
            status: 'Nicht importiert',
            reason: responseText.trim() || `HTTP ${response.status}`,
            sku,
            generatedSku,
            pending: isPending,
            originalRow: row,
            checkStatus: item.status,
          });
        }
      } catch (error) {
        failed++;
        nextResults.push({
          rowNumber: item.rowNumber,
          status: 'Nicht importiert',
          reason: error instanceof Error ? error.message : 'Technischer Importfehler.',
          sku,
          generatedSku,
          pending: isPending,
          originalRow: row,
          checkStatus: item.status,
          referencePhotoStatus: item.referencePhoto ? 'In Excel vorhanden' : 'Fehlt in Excel',
        });
      }
    }

    setResults(nextResults);

    const warehouseApplied = nextResults.filter(
      result => result.warehousePendingStatus?.startsWith('Lagerdaten automatisch übernommen'),
    ).length;
    const warehouseFailed = nextResults.filter(
      result => result.warehousePendingStatus?.startsWith('Lagerzuordnung fehlgeschlagen'),
    ).length;

    setMessage(
      `Import abgeschlossen: ${ok} erfolgreich (${skuGenerated} mit automatisch vergebener MCP-SKU, ${incompleteSaved} als „Unvollständig“ gespeichert), ${failed} nicht importiert. ` +
      `Lager: ${warehouseApplied} vorgemerkte Zuordnung(en) automatisch übernommen${warehouseFailed ? `, ${warehouseFailed} Fehler` : ''}. ` +
      `Bestehende Artikel: ${backfill.updated} Stammdatensätze ergänzt, ${backfill.failed} Fehler.`,
    );
    setImporting(false);
  }

  const checkSummary = useMemo(() => ({
    total: checkedRows.length,
    neu: checkedRows.filter(x => x.status === 'Neu').length,
    vorhanden: checkedRows.filter(x => x.status === 'Bereits vorhanden').length,
    dubletten: checkedRows.filter(x => x.status === 'Mögliche Dublette').length,
    konflikte: checkedRows.filter(x => x.status === 'Konflikt').length,
    unvollstaendig: checkedRows.filter(x => x.status === 'Unvollständig').length,
    selected: checkedRows.filter(x => x.selected && x.decision === 'Importieren').length,
    photos: checkedRows.filter(x => Boolean(x.referencePhoto)).length,
    photosMissing: checkedRows.filter(x => !x.referencePhoto).length,
    zuPruefen: checkedRows.filter(x => x.status === 'Mögliche Dublette' || x.status === 'Konflikt' || x.status === 'Unvollständig').length,
  }), [checkedRows]);

  const filteredRows = useMemo(() => {
    if (filter === 'Alle') return checkedRows;
    if (filter === 'Neu') return checkedRows.filter(x => x.status === 'Neu');
    if (filter === 'Bereits vorhanden') return checkedRows.filter(x => x.status === 'Bereits vorhanden');
    return checkedRows.filter(x => x.status === 'Mögliche Dublette' || x.status === 'Konflikt' || x.status === 'Unvollständig');
  }, [checkedRows, filter]);

  const resultSummary = useMemo(() => ({
    total: results.length,
    successful: results.filter(x => x.status === 'Erfolgreich importiert').length,
    failed: results.filter(x => x.status === 'Nicht importiert').length,
    skipped: results.filter(x => x.status === 'Übersprungen').length,
    generatedSku: results.filter(x => x.status === 'Erfolgreich importiert' && x.generatedSku).length,
    pending: results.filter(x => x.status === 'Erfolgreich importiert' && x.pending).length,
  }), [results]);

  function exportReport() {
    const wb = XLSX.utils.book_new();
    const reportRows = results.length ? results : checkedRows.map(item => ({
      rowNumber: item.rowNumber,
      status: 'Übersprungen' as const,
      reason: `${item.status}: ${item.reason}`,
      sku: text(item.match?.sku),
      generatedSku: false,
      originalRow: item.originalRow,
      checkStatus: item.status,
      matchSku: text(item.match?.sku),
    }));

    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([
        ['MON CHIC PARIS · Import-Prüfbericht'],
        ['Quelldatei', sourceFileName],
        ['Erstellt am', new Date().toLocaleString('de-DE')],
        [],
        ['Gesamt vorgeprüft', checkSummary.total],
        ['Neu', checkSummary.neu],
        ['Bereits vorhanden', checkSummary.vorhanden],
        ['Mögliche Dubletten', checkSummary.dubletten],
        ['Konflikte', checkSummary.konflikte],
        ['Unvollständig', checkSummary.unvollstaendig],
        ['Referenzfotos vorhanden', checkSummary.photos],
        ['Referenzfotos fehlen', checkSummary.photosMissing],
        [],
        ['Erfolgreich importiert', resultSummary.successful],
        ['Davon unvollständig gespeichert', resultSummary.pending],
        ['Nicht importiert', resultSummary.failed],
        ['Übersprungen', resultSummary.skipped],
      ]),
      'Übersicht',
    );

    const toRows = (items: ImportResult[]) => items.map(item => ({
      'Excel-Zeile': item.rowNumber,
      'Vorprüfung': item.checkStatus || '',
      'Import-Status': item.status,
      'Grund / Hinweis': item.reason,
      'App-SKU / Treffer': item.matchSku || item.sku,
      'Technische PENDING-SKU': item.pending ? 'Ja' : 'Nein',
      'SKU automatisch erzeugt': item.generatedSku ? 'Ja' : 'Nein',
      'Referenzfoto-Status': item.referencePhotoStatus || '',
      'Lager-Vormerkung': item.warehousePendingStatus || '',
      ...item.originalRow,
    }));

    const groups: Array<[string, ImportResult[]]> = [
      ['Nicht importiert', reportRows.filter(x => x.status === 'Nicht importiert')],
      ['Erfolgreich importiert', reportRows.filter(x => x.status === 'Erfolgreich importiert')],
      ['Mögliche Dubletten', reportRows.filter(x => x.checkStatus === 'Mögliche Dublette')],
      ['Bereits vorhanden', reportRows.filter(x => x.checkStatus === 'Bereits vorhanden')],
      ['Konflikte', reportRows.filter(x => x.checkStatus === 'Konflikt' || x.checkStatus === 'Unvollständig')],
    ];

    for (const [name, items] of groups) {
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(items.length ? toRows(items) : [{ Hinweis: `Keine Einträge: ${name}.` }]),
        name.slice(0, 31),
      );
    }

    const d = new Date();
    const stamp = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    XLSX.writeFile(wb, `MON_CHIC_Import_Pruefbericht_${stamp}.xlsx`);
  }

  const statusIcon = (status: CheckStatus) =>
    status === 'Neu' ? '🟢' :
    status === 'Bereits vorhanden' ? '🔵' :
    status === 'Mögliche Dublette' ? '🟡' : '🔴';

  return (
    <section className="capture-card import-card">
      <div className="capture-heading">
        <div><span className="step-badge">+</span><h2>Excel-/CSV-Bestand importieren</h2></div>
      </div>

      <p>Die komplette Datei wird gelesen. Vor dem Import wird sie gegen den vorhandenen Artikelbestand geprüft.</p>
      <p className="field-help">
        Bestehende Artikel werden standardmäßig übersprungen. Mögliche Dubletten und Konflikte werden nicht automatisch importiert.
        Erst sichere neue bzw. ausdrücklich ausgewählte Zeilen werden übernommen.
      </p>

      <input
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={e => e.target.files?.[0] && void read(e.target.files[0])}
      />

      {rows.length > 0 && checkedRows.length === 0 && (
        <>
          <div className="table-wrap">
            <table>
              <thead><tr>{Object.keys(rows[0]).slice(0, 8).map(x => <th key={x}>{x}</th>)}</tr></thead>
              <tbody>{rows.slice(0, 5).map((row, i) => (
                <tr key={i}>{Object.values(row).slice(0, 8).map((v, j) => <td key={j}>{String(v)}</td>)}</tr>
              ))}</tbody>
            </table>
          </div>
          <button className="primary-button centered-button" onClick={precheck} disabled={checking}>
            {checking ? 'Vorprüfung läuft …' : 'Datei vorprüfen'}
          </button>
        </>
      )}

      {checkedRows.length > 0 && (
        <>
          <div className="form-message success">
            {checkSummary.total} geprüft · 🖼️ {checkSummary.photos} Referenzfotos vorhanden · ⚠️ {checkSummary.photosMissing} Fotos fehlen ·
            {' '}🟢 {checkSummary.neu} neu · 🔵 {checkSummary.vorhanden} vorhanden ·
            {' '}🟡 {checkSummary.dubletten} mögliche Dubletten · 🔴 {checkSummary.konflikte} Konflikte ·
            {' '}🔴 {checkSummary.unvollstaendig} unvollständig
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '14px 0' }}>
            {([
              ['Alle', checkSummary.total],
              ['Neu', checkSummary.neu],
              ['Bereits vorhanden', checkSummary.vorhanden],
              ['Zu prüfen', checkSummary.zuPruefen],
            ] as const).map(([value, count]) => (
              <button key={value} type="button"
                className={filter === value ? 'primary-button' : 'secondary-button'}
                onClick={() => setFilter(value)} aria-pressed={filter === value}>
                {value === 'Zu prüfen' ? '⚠️ ' : ''}{value} ({count})
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            <button type="button" className="secondary-button" onClick={selectAllNew}>Alle neuen auswählen</button>
            <button type="button" className="secondary-button" onClick={deselectAll}>Alle abwählen</button>
            <button type="button" className="secondary-button" onClick={analyzeSelectedPhotos} disabled={analyzingAi || checkSummary.selected === 0}>
              {analyzingAi ? '✨ KI analysiert …' : '✨ KI-Felder aus Fotos ergänzen'}
            </button>
            <button type="button" className="secondary-button" onClick={exportReport}>Vorprüfbericht als Excel</button>
            <button
              type="button"
              className="primary-button"
              onClick={runBackfillOnly}
              disabled={importing || checkSummary.vorhanden === 0}
            >
              {importing ? 'Bitte warten …' : `${checkSummary.vorhanden} bestehende Artikel nachtragen`}
            </button>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>✓</th><th>Status</th><th>Excel-Zeile</th><th>Referenzfoto</th><th>Referenz</th><th>Artikel-Nr.</th>
                  <th>Marke</th><th>Unterkategorie</th><th>Farbe</th><th>Größe</th><th>EK</th>
                  <th>KI</th><th>Treffer in App</th><th>Grund</th><th>Entscheidung</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map(item => {
                  const id = getRowIdentity(item.normalized);
                  const willBePending = item.selected && item.decision === 'Importieren' && !id.sku && !id.subcategory;
                  const willBeIncomplete = item.selected && item.decision === 'Importieren' && (!id.subcategory || !item.referencePhoto);
                  return (
                    <tr key={item.rowNumber}>
                      <td style={{ textAlign: 'center', minWidth: 92 }}>
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600 }}>
                          <input
                            type="checkbox"
                            checked={item.selected}
                            disabled={(() => {
                              const ek = getRowIdentity(item.normalized).purchasePrice;
                              return ek != null && ek < 0;
                            })()}
                            aria-label={`Excel-Zeile ${item.rowNumber} auswählen`}
                            style={{ width: 24, height: 24, cursor: 'pointer' }}
                            onChange={e => setCheckedRows(current => current.map(x => {
                              if (x.rowNumber !== item.rowNumber) return x;
                              const ek = getRowIdentity(x.normalized).purchasePrice;
                              if (ek != null && ek < 0) {
                                return { ...x, selected: false, decision: 'Entfernen' };
                              }
                              return {
                                ...x,
                                selected: e.target.checked,
                                decision: e.target.checked
                                  ? 'Importieren'
                                  : (x.status === 'Bereits vorhanden' ? 'Überspringen' : 'Entfernen'),
                              };
                            }))}
                          />
                          <span>{item.selected ? 'Ja' : 'Nein'}</span>
                        </label>
                      </td>
                      <td>{statusIcon(item.status)} {item.status}</td>
                      <td>{item.rowNumber}</td>
                      <td>{item.referencePhoto ? (
                        <img src={item.referencePhoto.dataUrl} alt={`Referenzfoto Excel-Zeile ${item.rowNumber}`}
                          style={{ width: 52, height: 68, objectFit: 'contain', borderRadius: 6, border: '1px solid #eadbc8', background: '#fff' }} />
                      ) : <span title="Kein eingebettetes Bild in dieser Excel-Zeile erkannt">⚠️ Foto fehlt</span>}</td>
                      <td>{id.reference || '–'}</td>
                      <td>{id.supplierOrderNumber || '–'}</td>
                      <td>{id.brand || '–'}</td>
                      <td style={{ minWidth: 150 }}>
                        {id.subcategory ? id.subcategory : (
                          <select
                            value=""
                            aria-label={`Unterkategorie für Excel-Zeile ${item.rowNumber} auswählen`}
                            onChange={e => {
                              const value = e.target.value;
                              if (!value) return;
                              setCheckedRows(current => current.map(x => x.rowNumber === item.rowNumber
                                ? { ...x, normalized: { ...x.normalized, unterkategorie: value, subcategory: value } }
                                : x));
                            }}
                          >
                            <option value="">Bitte wählen …</option>
                            {subcategoryOptions.map(option => <option key={option} value={option}>{option}</option>)}
                          </select>
                        )}
                      </td>
                      <td>{id.color || '–'}</td>
                      <td>{id.size || '–'}</td>
                      <td>{id.purchasePrice != null ? `${id.purchasePrice.toFixed(2)} €` : '–'}</td>
                      <td style={{ minWidth: 150 }}>
                        {item.aiStatus === 'Analysiert' ? (
                          <span title={`KI-Vorschläge: ${[
                            item.aiSuggestions?.subcategory, item.aiSuggestions?.color, item.aiSuggestions?.material, item.aiSuggestions?.season
                          ].filter(Boolean).join(' · ')}`}>✅ ergänzt</span>
                        ) : item.aiStatus === 'Fehler' ? (
                          <span title={item.aiError || ''}>⚠️ Fehler</span>
                        ) : item.referencePhoto ? (
                          <span>✨ bereit</span>
                        ) : (
                          <span>–</span>
                        )}
                      </td>
                      <td>{text(item.match?.sku) || '–'}</td>
                      <td>
                        {item.reason}
                        {willBeIncomplete && (
                          <div style={{ marginTop: 5, fontWeight: 700 }}>
                            ⚠️ Wird als „Unvollständig“ gespeichert
                            {!item.referencePhoto && id.subcategory ? ' · Referenzfoto fehlt' : ''}
                          </div>
                        )}
                      </td>
                      <td>
                        {item.status === 'Mögliche Dublette' || item.status === 'Konflikt' || item.status === 'Unvollständig' ? (
                          (() => {
                            const ek = getRowIdentity(item.normalized).purchasePrice;
                            if (ek != null && ek < 0) return <span>Nicht importieren</span>;
                            return (
                              <select value={item.decision} onChange={e => setDecision(item.rowNumber, e.target.value as Decision)}>
                                <option value="Prüfen">Noch prüfen</option>
                                <option value="Importieren">Als neuen Artikel importieren</option>
                                <option value="Überspringen">Bereits vorhanden – nicht importieren</option>
                                <option value="Entfernen">Nicht importieren</option>
                              </select>
                            );
                          })()
                        ) : (
                          <span>{willBeIncomplete ? 'Als unvollständig speichern' : (item.selected ? 'Wird importiert' : 'Nicht ausgewählt')}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="field-help">
            {checkSummary.selected} Artikel sind aktuell zum Import ausgewählt. Neue Artikel ohne Unterkategorie werden nicht mehr verworfen: Sie werden dauerhaft mit Status „Unvollständig“, einer technischen PENDING-SKU und deaktivierter Website-Anzeige gespeichert. Sobald die Unterkategorie später ergänzt wird, kann die endgültige MCP-SKU vergeben werden. Negative EK sind weiterhin gesperrt und werden nicht importiert. Mit „KI-Felder aus Fotos ergänzen“ analysiert die KI nur ausgewählte Zeilen mit Referenzfoto und ergänzt ausschließlich fehlende Angaben; vorhandene Excel-Werte bleiben unverändert. Bereits vorhandene Treffer werden nicht neu importiert; leere Referenznummer, Artikel-Nr./Bestellung und Lagerort werden beim Importlauf automatisch aus Excel nachgetragen.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              className="primary-button centered-button"
              onClick={run}
              disabled={importing || checkSummary.selected === 0}
            >
              {importing ? 'Import läuft …' : `${checkSummary.selected} ausgewählte Artikel importieren`}
            </button>
          </div>
        </>
      )}

      {message && <div className="form-message success">{message}</div>}

      {results.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <p className="field-help">
            {resultSummary.total} protokolliert · {resultSummary.successful} erfolgreich ·
            {' '}{resultSummary.pending} davon unvollständig gespeichert ·
            {' '}{resultSummary.failed} nicht importiert · {resultSummary.skipped} übersprungen
          </p>
          <button type="button" className="secondary-button" onClick={exportReport}>
            Prüfbericht als Excel herunterladen
          </button>
        </div>
      )}
    </section>
  );
}
