import { NextResponse } from 'next/server';
import { getSupabaseConfig, supabaseHeaders } from '@/lib/supabase';

type Context = { params: Promise<{ id: string }> };

const allowedFields = new Set([
  'warehouse_location',
  'warehouse_area',
  'warehouse_place',
  'warehouse_code',
  'storage_type',
  'container_name',
  'container_quantity',
  'dimensions',
  'source_sheet',
  'notes',
]);

function cleanValue(key: string, value: unknown): unknown {
  if (key === 'container_quantity') {
    if (value === null || value === undefined || value === '') return null;
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(0, Math.trunc(number)) : null;
  }

  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text || null;
}

export async function GET(_: Request, { params }: Context) {
  const { id } = await params;
  const { url } = getSupabaseConfig();

  const res = await fetch(
    `${url}/rest/v1/warehouse_places?id=eq.${encodeURIComponent(id)}&select=*`,
    {
      headers: supabaseHeaders(),
      cache: 'no-store',
    },
  );

  const text = await res.text();

  if (!res.ok) {
    return new NextResponse(text, { status: res.status });
  }

  const row = JSON.parse(text)[0];

  if (!row) {
    return NextResponse.json(
      { error: 'Lagerplatz nicht gefunden.' },
      { status: 404 },
    );
  }

  return NextResponse.json(row);
}

export async function PATCH(request: Request, { params }: Context) {
  const { id } = await params;
  const raw = (await request.json()) as Record<string, unknown>;
  const patch: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(raw)) {
    if (!allowedFields.has(key)) continue;
    patch[key] = cleanValue(key, value);
  }

  if (patch.warehouse_location === null) {
    patch.warehouse_location = 'MyPlace';
  }

  patch.updated_at = new Date().toISOString();
  const { url } = getSupabaseConfig();

  const res = await fetch(
    `${url}/rest/v1/warehouse_places?id=eq.${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      headers: supabaseHeaders({
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      }),
      body: JSON.stringify(patch),
      cache: 'no-store',
    },
  );

  const text = await res.text();

  if (!res.ok) {
    return new NextResponse(text, { status: res.status });
  }

  const row = JSON.parse(text)[0];

  if (!row) {
    return NextResponse.json(
      { error: 'Lagerplatz nicht gefunden.' },
      { status: 404 },
    );
  }

  return NextResponse.json(row);
}

export async function DELETE(_: Request, { params }: Context) {
  const { id } = await params;
  const { url } = getSupabaseConfig();

  const res = await fetch(
    `${url}/rest/v1/warehouse_places?id=eq.${encodeURIComponent(id)}`,
    {
      method: 'DELETE',
      headers: supabaseHeaders({
        Prefer: 'return=minimal',
      }),
      cache: 'no-store',
    },
  );

  if (!res.ok) {
    return new NextResponse(await res.text(), { status: res.status });
  }

  return NextResponse.json({ ok: true });
}
