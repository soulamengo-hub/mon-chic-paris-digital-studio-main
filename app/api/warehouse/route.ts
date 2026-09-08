import { NextResponse } from 'next/server';
import { getSupabaseConfig, supabaseHeaders } from '@/lib/supabase';

type WarehousePlaceInput = {
  warehouse_location?: string | null;
  warehouse_area?: string | null;
  warehouse_place?: string | null;
  warehouse_code?: string | null;
  storage_type?: string | null;
  container_name?: string | null;
  container_quantity?: number | null;
  dimensions?: string | null;
  source_sheet?: string | null;
  notes?: string | null;
};

function cleanText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text || null;
}

function cleanQuantity(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.trunc(number)) : null;
}

function sanitizeWarehousePlace(raw: Record<string, unknown>): WarehousePlaceInput {
  return {
    warehouse_location: cleanText(raw.warehouse_location) ?? 'MyPlace',
    warehouse_area: cleanText(raw.warehouse_area),
    warehouse_place: cleanText(raw.warehouse_place),
    warehouse_code: cleanText(raw.warehouse_code),
    storage_type: cleanText(raw.storage_type),
    container_name: cleanText(raw.container_name),
    container_quantity: cleanQuantity(raw.container_quantity),
    dimensions: cleanText(raw.dimensions),
    source_sheet: cleanText(raw.source_sheet),
    notes: cleanText(raw.notes),
  };
}

export async function GET() {
  const { url } = getSupabaseConfig();

  const res = await fetch(
    `${url}/rest/v1/warehouse_places?select=*&order=warehouse_location.asc,warehouse_area.asc,warehouse_place.asc,warehouse_code.asc`,
    {
      headers: supabaseHeaders(),
      cache: 'no-store',
    },
  );

  const text = await res.text();

  if (!res.ok) {
    return new NextResponse(text, { status: res.status });
  }

  return NextResponse.json(JSON.parse(text));
}

export async function POST(request: Request) {
  const raw = (await request.json()) as Record<string, unknown>;
  const body = sanitizeWarehousePlace(raw);

  if (
    !body.warehouse_area &&
    !body.warehouse_place &&
    !body.warehouse_code &&
    !body.storage_type &&
    !body.container_name
  ) {
    return NextResponse.json(
      { error: 'Bitte mindestens Bereich, Lagerplatz, Lagerbezeichnung oder Box/Kleiderstange angeben.' },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();
  const { url } = getSupabaseConfig();

  const res = await fetch(`${url}/rest/v1/warehouse_places`, {
    method: 'POST',
    headers: supabaseHeaders({
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    }),
    body: JSON.stringify({
      ...body,
      created_at: now,
      updated_at: now,
    }),
    cache: 'no-store',
  });

  const text = await res.text();

  if (!res.ok) {
    return new NextResponse(text, { status: res.status });
  }

  return NextResponse.json(JSON.parse(text)[0], { status: 201 });
}
