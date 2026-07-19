import { NextResponse } from 'next/server';
import { getSupabaseConfig, supabaseHeaders } from '@/lib/supabase';
import { sanitizeProductInput } from '@/lib/product-fields';

export async function GET() {
  const { url } = getSupabaseConfig();
  const productsRes = await fetch(`${url}/rest/v1/products?select=*&order=created_at.desc`, { headers: supabaseHeaders(), cache: 'no-store' });
  if (!productsRes.ok) return new NextResponse(await productsRes.text(), { status: productsRes.status });
  const products = await productsRes.json() as Array<Record<string, unknown>>;
  const imagesRes = await fetch(`${url}/rest/v1/product_images?select=*&order=sort_order.asc`, { headers: supabaseHeaders(), cache: 'no-store' });
  const images = imagesRes.ok ? await imagesRes.json() as Array<Record<string, unknown>> : [];
  return NextResponse.json(products.map(product => ({ ...product, product_images: images.filter(image => image.product_id === product.id) })));
}

export async function POST(request: Request) {
  const raw = await request.json();
  const body = sanitizeProductInput(raw, { allowSku: true });
  if (!body.sku) return NextResponse.json({ error: 'SKU fehlt.' }, { status: 400 });
  const { url } = getSupabaseConfig();
  const response = await fetch(`${url}/rest/v1/products`, {
    method: 'POST',
    headers: supabaseHeaders({ 'Content-Type': 'application/json', Prefer: 'return=representation' }),
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  const text = await response.text();
  if (!response.ok) return new NextResponse(text, { status: response.status });
  return NextResponse.json(JSON.parse(text)[0], { status: 201 });
}
