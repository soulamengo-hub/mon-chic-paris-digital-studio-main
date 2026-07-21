import { NextResponse } from 'next/server';
import { getSupabaseConfig, supabaseHeaders } from '@/lib/supabase';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sku = searchParams.get('sku')?.trim();
  if (!sku) return NextResponse.json({ error: 'Bitte eine SKU angeben.' }, { status: 400 });

  const { url } = getSupabaseConfig();
  const response = await fetch(`${url}/rest/v1/products?select=id,sku&sku=eq.${encodeURIComponent(sku)}&limit=1`, {
    headers: supabaseHeaders(), cache: 'no-store',
  });
  if (!response.ok) return new NextResponse(await response.text(), { status: response.status });
  const rows = await response.json() as Array<{ id: string; sku: string }>;
  if (rows.length === 0) return NextResponse.json({ error: `Kein Artikel mit SKU „${sku}“ gefunden.` }, { status: 404 });
  return NextResponse.json(rows[0]);
}
