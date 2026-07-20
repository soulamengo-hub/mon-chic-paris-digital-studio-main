import { NextResponse } from 'next/server';
import { categories, designerSuggestions, colorCatalog } from '@/lib/catalog';
import { supabaseServiceHeaders, getServiceSupabaseConfig } from '@/lib/supabase';
import { estimateCostEur, summarizeBudget, currentMonthStartIso } from '@/lib/ai-budget';

export const runtime = 'nodejs';

const MAX_ANALYSIS_IMAGES = 9;
const MAX_IMAGE_DATA_URL_LENGTH = 3_500_000;
const forbiddenBrands = new Set(['mon chic', 'mon chic paris']);
const allowedOccasions = [
  'Business','Casual','Chic','Abendgarderobe','Cocktail','Hochzeit','Dinner','Urlaub',
  'Strand','Skiurlaub','Sportiv','Outdoor','Trauerfeier','Religiöse Feier','Weihnachten','Silvester',
];
const allowedConditions = ['Neu mit Etikett','Neuwertig','Sehr gut','Gut','Akzeptabel'];
const allowedSeasons = ['Ganzjährig','Frühling','Sommer','Herbst','Winter'];
const allowedSizeSystems = ['DE','FR','IT','UK','US','One Size'];

const categoryNames = Object.keys(categories);
const subcategoryToCategory = new Map<string, string>();
for (const [category, subcategories] of Object.entries(categories)) {
  for (const subcategory of subcategories) subcategoryToCategory.set(subcategory, category);
}

type ConfidenceMap = Partial<Record<
  'brand' | 'category' | 'subcategory' | 'color' | 'secondary_color' | 'material' | 'pattern' |
  'condition' | 'season' | 'original_size' | 'size_system' | 'de_size' | 'international_size' |
  'era' | 'style_key' | 'occasions' | 'measurements' | 'flaws' | 'notes', number
>>;

type AnalysisResult = {
  brand?: string;
  category?: string;
  subcategory?: string;
  color?: string;
  secondary_color?: string;
  color_note?: string;
  material?: string;
  pattern?: string;
  condition?: string;
  season?: string;
  original_size?: string;
  size_system?: string;
  de_size?: string;
  international_size?: string;
  era?: string;
  style_key?: string;
  occasions?: string[];
  measurements?: string;
  flaws?: string;
  notes?: string;
  confidence?: ConfidenceMap;
};

function extractText(payload: unknown): string {
  const data = payload as { output_text?: unknown; output?: Array<{ content?: Array<{ text?: unknown }> }> };
  if (typeof data.output_text === 'string') return data.output_text;
  for (const item of data.output || []) {
    for (const content of item.content || []) {
      if (typeof content.text === 'string') return content.text;
    }
  }
  return '';
}

function cleanString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const cleaned = value.trim().replace(/\s+/g, ' ');
  return cleaned || undefined;
}

function normalizeConfidence(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return Math.max(0, Math.min(1, value > 1 ? value / 100 : value));
}

function confidenceFor(result: AnalysisResult, field: keyof ConfidenceMap): number {
  return normalizeConfidence(result.confidence?.[field]) ?? 0;
}

function parseJson(text: string): AnalysisResult {
  const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('Die KI-Antwort enthielt kein gültiges JSON.');
  const raw = JSON.parse(cleaned.slice(start, end + 1)) as AnalysisResult;
  const result: AnalysisResult = { confidence: {} };

  const rawConfidence = raw.confidence && typeof raw.confidence === 'object' ? raw.confidence : {};
  for (const [key, value] of Object.entries(rawConfidence)) {
    const normalized = normalizeConfidence(value);
    if (normalized !== undefined) result.confidence![key as keyof ConfidenceMap] = normalized;
  }

  const brand = cleanString(raw.brand);
  if (brand && !forbiddenBrands.has(brand.toLowerCase()) && confidenceFor(raw, 'brand') >= 0.72) {
    const knownBrand = designerSuggestions.find(item => item.toLowerCase() === brand.toLowerCase());
    result.brand = knownBrand || brand;
  }

  const subcategory = cleanString(raw.subcategory);
  const inferredCategory = subcategory ? subcategoryToCategory.get(subcategory) : undefined;
  const category = cleanString(raw.category);
  if (inferredCategory && confidenceFor(raw, 'subcategory') >= 0.50) {
    result.subcategory = subcategory;
    result.category = inferredCategory;
  } else if (category && categoryNames.includes(category) && confidenceFor(raw, 'category') >= 0.65) {
    result.category = category;
  }

  const safeFields: Array<keyof Pick<AnalysisResult, 'pattern' | 'era' | 'style_key' | 'notes'>> =
    ['pattern', 'era', 'style_key', 'notes'];
  for (const field of safeFields) {
    const value = cleanString(raw[field]);
    if (value && confidenceFor(raw, field) >= 0.55) result[field] = value;
  }

  // Farbe: nur Werte aus dem kontrollierten Katalog übernehmen (nicht frei erfinden).
  // Ein zusätzlicher Freitext-Hinweis (color_note) darf präziser sein, ersetzt aber
  // nie den kontrollierten Wert.
  function matchColor(value: unknown): string | undefined {
    const cleaned = cleanString(value);
    if (!cleaned) return undefined;
    return colorCatalog.find(name => name.toLowerCase() === cleaned.toLowerCase());
  }
  const color = matchColor(raw.color);
  if (color && confidenceFor(raw, 'color') >= 0.55) result.color = color;
  const secondaryColor = matchColor(raw.secondary_color);
  if (secondaryColor && confidenceFor(raw, 'secondary_color') >= 0.55) result.secondary_color = secondaryColor;
  const colorNote = cleanString(raw.color_note);
  if (colorNote) result.color_note = colorNote;

  const material = cleanString(raw.material);
  if (material && confidenceFor(raw, 'material') >= 0.65) result.material = material;

  const originalSize = cleanString(raw.original_size);
  if (originalSize && confidenceFor(raw, 'original_size') >= 0.72) result.original_size = originalSize;
  const sizeSystem = cleanString(raw.size_system);
  if (sizeSystem && allowedSizeSystems.includes(sizeSystem) && confidenceFor(raw, 'size_system') >= 0.65) result.size_system = sizeSystem;
  const deSize = cleanString(raw.de_size);
  if (deSize && confidenceFor(raw, 'de_size') >= 0.65) result.de_size = deSize;
  const internationalSize = cleanString(raw.international_size);
  if (internationalSize && confidenceFor(raw, 'international_size') >= 0.65) result.international_size = internationalSize;

  const condition = cleanString(raw.condition);
  // Zustand wird nur übernommen, wenn die KI eine Abweichung vom Standard
  // "Sehr gut" erkennt. Ist alles unauffällig, bleibt das Formularfeld unangetastet.
  if (condition && condition !== 'Sehr gut' && allowedConditions.includes(condition) && confidenceFor(raw, 'condition') >= 0.65) {
    result.condition = condition;
  }
  const season = cleanString(raw.season);
  if (season && allowedSeasons.includes(season) && confidenceFor(raw, 'season') >= 0.65) result.season = season;

  if (Array.isArray(raw.occasions) && confidenceFor(raw, 'occasions') >= 0.82) {
    result.occasions = raw.occasions.filter(value => typeof value === 'string' && allowedOccasions.includes(value));
  }

  const measurements = cleanString(raw.measurements);
  if (measurements && confidenceFor(raw, 'measurements') >= 0.78) result.measurements = measurements;
  const flaws = cleanString(raw.flaws);
  if (flaws && confidenceFor(raw, 'flaws') >= 0.7) result.flaws = flaws;

  return result;
}

async function getCurrentBudget() {
  try {
    const { url } = getServiceSupabaseConfig();
    const monthStart = currentMonthStartIso();
    const response = await fetch(
      `${url}/rest/v1/ai_usage_log?select=estimated_cost_eur&created_at=gte.${encodeURIComponent(monthStart)}`,
      { headers: supabaseServiceHeaders(), cache: 'no-store' },
    );
    if (!response.ok) return summarizeBudget(0);
    const rows = await response.json() as Array<{ estimated_cost_eur: number | string }>;
    const spentEur = rows.reduce((sum, row) => sum + Number(row.estimated_cost_eur || 0), 0);
    return summarizeBudget(spentEur);
  } catch {
    // Wenn die Migration/Tabelle noch nicht existiert, blockieren wir nicht,
    // sondern melden ein leeres Budget – die Analyse bleibt weiter nutzbar.
    return summarizeBudget(0);
  }
}

async function logAiUsage(model: string, inputTokens: number, outputTokens: number, estimatedCostEur: number) {
  try {
    const { url } = getServiceSupabaseConfig();
    await fetch(`${url}/rest/v1/ai_usage_log`, {
      method: 'POST',
      headers: { ...supabaseServiceHeaders(), 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ model, input_tokens: inputTokens, output_tokens: outputTokens, estimated_cost_eur: estimatedCostEur }),
    });
  } catch {
    // Protokollierung ist "best effort": ein Fehler hier darf die eigentliche
    // Analyseantwort an den Nutzer nicht verhindern.
  }
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'OPENAI_API_KEY ist in Vercel noch nicht eingerichtet.' }, { status: 503 });
    }

    const body = await request.json() as { imageDataUrls?: unknown };
    if (!Array.isArray(body.imageDataUrls) || body.imageDataUrls.length === 0) {
      return NextResponse.json({ error: 'Für die Analyse wird mindestens ein Bild benötigt.' }, { status: 400 });
    }
    if (body.imageDataUrls.length > MAX_ANALYSIS_IMAGES) {
      return NextResponse.json({ error: `Maximal ${MAX_ANALYSIS_IMAGES} Bilder können gemeinsam analysiert werden.` }, { status: 400 });
    }

    const imageDataUrls = body.imageDataUrls.filter((value): value is string => typeof value === 'string');
    if (imageDataUrls.length !== body.imageDataUrls.length || imageDataUrls.some(url => !url.startsWith('data:image/'))) {
      return NextResponse.json({ error: 'Mindestens eine Bilddatei ist ungültig.' }, { status: 400 });
    }
    if (imageDataUrls.some(url => url.length > MAX_IMAGE_DATA_URL_LENGTH)) {
      return NextResponse.json({ error: 'Mindestens ein Analysebild ist zu groß.' }, { status: 413 });
    }

    // Budget VOR dem eigentlichen (kostenpflichtigen) KI-Aufruf prüfen. Ist das
    // Monatsbudget erreicht, wird OpenAI gar nicht erst kontaktiert.
    const budgetBefore = await getCurrentBudget();
    if (budgetBefore.blocked) {
      return NextResponse.json({ error: 'Das monatliche KI-Budget ist erreicht. Weitere Analysen bitte im nächsten Monat oder nach manueller Freigabe.', budget: budgetBefore }, { status: 402 });
    }

    const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
    const prompt = `Du bist ein vorsichtiger Fashion-Artikel-Assistent für MON CHIC PARIS. Analysiere alle ${imageDataUrls.length} Fotos zusammen als EINEN Artikel.

PRIORITÄT:
1. Lies Markenetiketten und Logos.
2. Lies Größenetiketten.
3. Lies Material- und Pflegeetiketten vollständig.
4. Bestimme erst danach Kategorie, Unterkategorie, Farbe, Muster, Zustand, Saison, Stil, Anlässe, Maße und sichtbare Mängel.

HARTE REGELN:
- "MON CHIC" und "MON CHIC PARIS" sind der Händler und dürfen niemals als Produktmarke ausgegeben werden.
- Keine Marke, Größe, Materialzusammensetzung, Maße oder Mängel erfinden.
- Etikettentext hat Vorrang vor visueller Vermutung.
- Keine Echtheitsbestätigung und keine Preisangabe.
- Unsichere Felder weglassen.
- occasions nur bei hoher Sicherheit auswählen.
- Material darf als genauer Etikettentext ausgegeben werden, z. B. "97 % Baumwolle, 3 % Elasthan".
- Farbe (color, secondary_color) MUSS exakt einer der erlaubten Farbkatalog-Werte sein, keine eigenen Farbnamen erfinden. Wenn die Farbe genauer beschrieben werden kann als der Katalogwert erlaubt (z. B. "Dunkelblau mit roten Streifen"), zusätzlich als color_note angeben – das ersetzt nicht die Katalogfarbe.
- condition NUR angeben, wenn ein sichtbarer Mangel oder eine deutliche Abnutzung erkennbar ist. Ist der Artikel unauffällig, condition weglassen (Standard bleibt "Sehr gut").

Erlaubte Kategorien und Unterkategorien:
${Object.entries(categories).map(([categoryName, values]) => `${categoryName}: ${values.join(', ')}`).join('\n')}
Erlaubte Anlässe: ${allowedOccasions.join(', ')}.
Erlaubte Zustände: ${allowedConditions.join(', ')}.
Erlaubte Saisons: ${allowedSeasons.join(', ')}.
Erlaubte Größensysteme: ${allowedSizeSystems.join(', ')}.
Erlaubter Farbkatalog: ${colorCatalog.join(', ')}.

Antworte ausschließlich als JSON-Objekt. Zulässige Felder:
brand, category, subcategory, color, secondary_color, color_note, material, pattern, condition, season, original_size, size_system, de_size, international_size, era, style_key, occasions, measurements, flaws, notes, confidence.
confidence ist ein Objekt mit denselben Feldnamen und Werten von 0 bis 1. Die Konfidenz muss die tatsächliche Sicherheit widerspiegeln.`;

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        input: [{
          role: 'user',
          content: [
            { type: 'input_text', text: prompt },
            ...imageDataUrls.map((imageUrl, index) => ({
              type: 'input_image',
              image_url: imageUrl,
              detail: index < 3 ? 'high' : 'low',
            })),
          ],
        }],
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      const message = payload?.error?.message || 'OpenAI-Analyse fehlgeschlagen.';
      return NextResponse.json({ error: message }, { status: response.status });
    }
    const text = extractText(payload);
    if (!text) return NextResponse.json({ error: 'Die KI hat keine auswertbare Antwort geliefert.' }, { status: 502 });

    const usageData = payload?.usage as { input_tokens?: number; output_tokens?: number } | undefined;
    const inputTokens = Number(usageData?.input_tokens || 0);
    const outputTokens = Number(usageData?.output_tokens || 0);
    const estimatedCostEur = estimateCostEur(inputTokens, outputTokens);
    await logAiUsage(model, inputTokens, outputTokens, estimatedCostEur);
    const budgetAfter = await getCurrentBudget();

    return NextResponse.json({
      ...parseJson(text),
      image_count: imageDataUrls.length,
      budget: budgetAfter,
      usage: { inputTokens, outputTokens, estimatedCostEur },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'KI-Analyse fehlgeschlagen.' }, { status: 500 });
  }
}
