import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

type AnalysisResult = {
  brand?: string;
  category?: string;
  subcategory?: string;
  color?: string;
  secondary_color?: string;
  material?: string;
  pattern?: string;
  condition?: string;
  era?: string;
  style_key?: string;
  occasions?: string[];
  notes?: string;
};

const allowedOccasions = [
  'Business','Casual','Chic','Abendgarderobe','Cocktail','Hochzeit','Dinner','Urlaub',
  'Strand','Skiurlaub','Sportiv','Outdoor','Trauerfeier','Religiöse Feier','Weihnachten','Silvester',
];

function extractText(payload: any): string {
  if (typeof payload?.output_text === 'string') return payload.output_text;
  for (const item of payload?.output || []) {
    for (const content of item?.content || []) {
      if (typeof content?.text === 'string') return content.text;
    }
  }
  return '';
}

function parseJson(text: string): AnalysisResult {
  const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('Die KI-Antwort enthielt kein gültiges JSON.');
  const result = JSON.parse(cleaned.slice(start, end + 1)) as AnalysisResult;
  if (Array.isArray(result.occasions)) {
    result.occasions = result.occasions.filter(value => allowedOccasions.includes(value));
  }
  return result;
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'OPENAI_API_KEY ist in Vercel noch nicht eingerichtet.' }, { status: 503 });
    }
    const { imageDataUrl } = await request.json() as { imageDataUrl?: string };
    if (!imageDataUrl?.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Für die Analyse wird ein Bild benötigt.' }, { status: 400 });
    }
    if (imageDataUrl.length > 3_500_000) {
      return NextResponse.json({ error: 'Das Analysebild ist zu groß.' }, { status: 413 });
    }

    const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input: [{
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: `Analysiere das Modefoto für MON CHIC PARIS. Antworte ausschließlich als JSON-Objekt mit den optionalen Schlüsseln brand, category, subcategory, color, secondary_color, material, pattern, condition, era, style_key, occasions und notes. category muss möglichst einer dieser Werte sein: Bekleidung, Taschen, Schuhe, Accessoires. occasions darf nur Werte aus dieser Liste enthalten: ${allowedOccasions.join(', ')}. Nutze vorsichtige Formulierungen; bei unsicheren Angaben Feld weglassen. Keine Echtheitsbestätigung abgeben.`,
            },
            { type: 'input_image', image_url: imageDataUrl, detail: 'low' },
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
    return NextResponse.json(parseJson(text));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'KI-Analyse fehlgeschlagen.' }, { status: 500 });
  }
}
