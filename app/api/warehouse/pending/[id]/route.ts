import { NextResponse } from 'next/server';
import { getSupabaseConfig, supabaseHeaders } from '@/lib/supabase';

const allowedFields = new Set([
  'article_number',
  'warehouse_location',
  'warehouse_area',
  'warehouse_place',
  'warehouse_code',
  'season',
  'brand',
  'source_sheet',
  'source_row',
  'status',
]);

function cleanValue(key: string, value: unknown): unknown {
  if (key === 'source_row') {
    if (value === null || value === undefined || value === '') return null;
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(1, Math.trunc(number)) : null;
  }
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text || null;
}

function sanitize(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const source = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(source)) {
    if (allowedFields.has(key)) result[key] = cleanValue(key, raw);
  }
  return result;
}

export async function GET() {
  const { url } = getSupabaseConfig();
  const res = await fetch(
    `${url}/rest/v1/warehouse_pending_assignments?select=*&order=created_at.desc`,
    { headers: supabaseHeaders(), cache: 'no-store' },
  );
  const text = await res.text();
  if (!res.ok) return new NextResponse(text, { status: res.status });
  return NextResponse.json(JSON.parse(text));
}

export async function POST(request: Request) {
  const body = sanitize(await request.json());
  const articleNumber = String(body.article_number ?? '').trim();
  if (!articleNumber) {
    return NextResponse.json({ error: 'Artikelnummer fehlt.' }, { status: 400 });
  }

  const { url } = getSupabaseConfig();
  const res = await fetch(
    `${url}/rest/v1/warehouse_pending_assignments?on_conflict=article_number`,
    {
      method: 'POST',
      headers: supabaseHeaders({
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=representation',
      }),
      body: JSON.stringify({
        ...body,
        article_number: articleNumber,
        status: body.status ?? 'Offen',
        updated_at: new Date().toISOString(),
      }),
      cache: 'no-store',
    },
  );
  const text = await res.text();
  if (!res.ok) return new NextResponse(text, { status: res.status });
  const rows = JSON.parse(text);
  return NextResponse.json(rows[0] ?? rows, { status: 201 });
}
