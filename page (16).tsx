import { NextResponse } from 'next/server';
import { getSupabaseConfig, supabaseHeaders } from '@/lib/supabase';
import { skuCodes } from '@/lib/catalog';

export async function POST(request: Request) {
  try {
    const { subcategory } = await request.json() as { subcategory?: string };
    const code = subcategory ? skuCodes[subcategory] : undefined;
    if (!subcategory || !code) return NextResponse.json({ error: 'Bitte eine gültige Unterkategorie wählen.' }, { status: 400 });
    const { url } = getSupabaseConfig();
    const response = await fetch(`${url}/rest/v1/rpc/next_product_sku`, {
      method: 'POST',
      headers: supabaseHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ category_code: code }),
      cache: 'no-store',
    });
    const text = await response.text();
    if (!response.ok) return new NextResponse(text, { status: response.status });
    return NextResponse.json({ sku: JSON.parse(text) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'SKU konnte nicht erzeugt werden.' }, { status: 500 });
  }
}
