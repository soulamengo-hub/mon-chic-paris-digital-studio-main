// MON CHIC PARIS · Digital Studio
// Regelbasierte Größenumrechnung (keine KI) — die Originalgröße bleibt immer
// unverändert gespeichert (original_size). de_size ist eine zusätzlich berechnete
// "tatsächliche" deutsche Größe, damit Suche/Filter über alle Größensysteme
// hinweg konsistent funktionieren. Jederzeit manuell überschreibbar.

// --- Teil 1: Französische Buchstabengrößen (bestätigter Erfahrungswert) ---
// FR XS = DE 2XS, FR S = DE XS, FR M = DE S, FR L = DE M, FR XL = DE L
// D. h. französische Buchstabengrößen liegen genau eine Stufe "über" der
// tatsächlichen deutschen Größe. Gilt für Damenmode (einzige bestätigte Angabe).
const letterScale = ['2XS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'];
const frShift = -1;

function deriveFromFrenchLetter(sizeSystem: string, originalSize: string): string | undefined {
  if (sizeSystem.trim().toUpperCase() !== 'FR') return undefined;
  const normalized = originalSize.trim().toUpperCase();
  const index = letterScale.indexOf(normalized);
  if (index === -1) return undefined;
  const targetIndex = index + frShift;
  if (targetIndex < 0 || targetIndex >= letterScale.length) return undefined;
  return letterScale[targetIndex];
}

// --- Teil 2: Numerische IT/UK/US-Größentabellen, getrennt nach Damen/Herren ---
// Quelle: vom Team bestätigte Umrechnungstabellen. Jede Zeile: DE-Größe, dazu
// passende Buchstabengröße (International), IT, UK, US.
type SizeRow = { de: number; label: string; it: number; uk: number; us: number };

const womenSizeTable: SizeRow[] = [
  { de: 32, label: 'XXS', it: 36, uk: 4, us: 0 },
  { de: 34, label: 'XS', it: 38, uk: 6, us: 2 },
  { de: 36, label: 'S', it: 40, uk: 8, us: 4 },
  { de: 38, label: 'M', it: 42, uk: 10, us: 6 },
  { de: 40, label: 'L', it: 44, uk: 12, us: 8 },
  { de: 42, label: 'XL', it: 46, uk: 14, us: 10 },
  { de: 44, label: 'XXL', it: 48, uk: 16, us: 12 },
  { de: 46, label: '3XL', it: 50, uk: 18, us: 14 },
  { de: 48, label: '4XL', it: 52, uk: 20, us: 16 },
];

const menSizeTable: SizeRow[] = [
  { de: 44, label: 'XS', it: 44, uk: 34, us: 34 },
  { de: 46, label: 'S', it: 46, uk: 36, us: 36 },
  { de: 48, label: 'M', it: 48, uk: 38, us: 38 },
  { de: 50, label: 'L', it: 50, uk: 40, us: 40 },
  { de: 52, label: 'XL', it: 52, uk: 42, us: 42 },
  { de: 54, label: 'XXL', it: 54, uk: 44, us: 44 },
  { de: 56, label: '3XL', it: 56, uk: 46, us: 46 },
  { de: 58, label: '4XL', it: 58, uk: 48, us: 48 },
];

export type Gender = 'Damen' | 'Herren';

function tableFor(gender: Gender | string | undefined): SizeRow[] {
  return gender === 'Herren' ? menSizeTable : womenSizeTable;
}

function deriveFromNumericTable(sizeSystem: string, originalSize: string, gender?: Gender | string): string | undefined {
  const system = sizeSystem.trim().toUpperCase();
  const value = Number(originalSize.trim().replace(',', '.'));
  if (!Number.isFinite(value)) return undefined;
  const table = tableFor(gender);
  let row: SizeRow | undefined;
  if (system === 'IT') row = table.find(r => r.it === value);
  else if (system === 'UK') row = table.find(r => r.uk === value);
  else if (system === 'US') row = table.find(r => r.us === value);
  else if (system === 'DE') row = table.find(r => r.de === value);
  return row?.label;
}

// --- Teil 3: Schuhgrößen, getrennt nach Damen/Herren ---
// Anders als bei Kleidung ist DE/EU/IT bei Schuhen dieselbe Zahl (kein eigenes
// IT-Schema) — nur UK und US weichen ab. Ergebnis ist ebenfalls eine Zahl
// (z. B. "38"), kein Buchstabe.
type ShoeRow = { de: number; uk: number; us: number };

const womenShoeTable: ShoeRow[] = [
  { de: 35, uk: 2.5, us: 5 },
  { de: 36, uk: 3.5, us: 6 },
  { de: 37, uk: 4, us: 6.5 },
  { de: 38, uk: 5, us: 7.5 },
  { de: 39, uk: 6, us: 8.5 },
  { de: 40, uk: 6.5, us: 9 },
  { de: 41, uk: 7.5, us: 10.5 },
  { de: 42, uk: 8, us: 11 },
];

const menShoeTable: ShoeRow[] = [
  { de: 40, uk: 6.5, us: 7.5 },
  { de: 41, uk: 7.5, us: 8.5 },
  { de: 42, uk: 8, us: 9 },
  { de: 43, uk: 9, us: 10 },
  { de: 44, uk: 9.5, us: 10.5 },
  { de: 45, uk: 10.5, us: 11.5 },
  { de: 46, uk: 11, us: 12 },
  { de: 47, uk: 12, us: 13 },
];

// Unterkategorien, für die die Schuhgrößentabelle statt der Kleidergrößentabelle
// gilt (siehe lib/catalog.ts, Kategorie "Schuhe").
const shoeSubcategories = new Set(['Pumps', 'Stiefelette', 'Stiefel', 'Sneaker', 'Loafer', 'Sandalen', 'Ballerina']);

function shoeTableFor(gender: Gender | string | undefined): ShoeRow[] {
  return gender === 'Herren' ? menShoeTable : womenShoeTable;
}

function deriveShoeDeSize(sizeSystem: string, originalSize: string, gender?: Gender | string): string | undefined {
  const system = sizeSystem.trim().toUpperCase();
  const value = Number(originalSize.trim().replace(',', '.'));
  if (!Number.isFinite(value)) return undefined;
  // DE, EU und IT sind bei Schuhen dieselbe Zahl — keine Umrechnung nötig,
  // der Wert selbst ist bereits die DE-Größe.
  if (system === 'DE' || system === 'IT' || system === 'FR') return String(value);
  const table = shoeTableFor(gender);
  let row: ShoeRow | undefined;
  if (system === 'UK') row = table.find(r => r.uk === value);
  else if (system === 'US') row = table.find(r => r.us === value);
  return row ? String(row.de) : undefined;
}

/**
 * Berechnet die tatsächliche DE-Größe aus Größensystem + Originalgröße +
 * Geschlecht + Unterkategorie. Bei Schuh-Unterkategorien (siehe shoeSubcategories)
 * wird die Schuhgrößentabelle verwendet (Ergebnis: Zahl, z. B. "38"), sonst die
 * Kleidergrößentabelle (Ergebnis: Buchstabe, z. B. "S"). Gibt undefined zurück,
 * wenn kein Umrechnungswert bekannt ist — dann bleibt das Feld leer und kann
 * manuell ausgefüllt werden.
 */
export function deriveDeSize(sizeSystem?: string | null, originalSize?: string | null, gender?: Gender | string | null, subcategory?: string | null): string | undefined {
  if (!sizeSystem || !originalSize) return undefined;
  if (subcategory && shoeSubcategories.has(subcategory)) {
    return deriveShoeDeSize(sizeSystem, originalSize, gender ?? undefined);
  }
  return deriveFromFrenchLetter(sizeSystem, originalSize)
    ?? deriveFromNumericTable(sizeSystem, originalSize, gender ?? undefined);
}

/**
 * Sichere Variante für Kontexte ohne bekanntes Geschlecht (z. B. die KI-Analyse-
 * Route): berechnet NUR die geschlechtsunabhängige FR-Buchstaben-Umrechnung für
 * Kleidung. Numerische IT/UK/US-Größen (Kleidung wie Schuhe) würden ohne
 * Geschlecht sonst fälschlich anhand der Damentabelle geraten — das vermeidet
 * diese Funktion bewusst.
 */
export function deriveDeSizeGenderNeutral(sizeSystem?: string | null, originalSize?: string | null): string | undefined {
  if (!sizeSystem || !originalSize) return undefined;
  return deriveFromFrenchLetter(sizeSystem, originalSize);
}
