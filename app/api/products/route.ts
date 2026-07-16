import { NextResponse } from 'next/server';
import { getSupabaseConfig, supabaseHeaders } from '@/lib/supabase';
import type { ProductInput } from '@/lib/types';

type ProductRow = Record<string, unknown> & { id: string };
type ImageRow = { product_id: string; public_url: string; sort_order: number };

export async function GET() {
  try {
    const { url } = getSupabaseConfig();
    const headers = supabaseHeaders();

    const productsResponse = await fetch(
      `${url}/rest/v1/products?select=*&order=created_at.desc&limit=250`,
      { headers, cache: 'no-store' },
    );
    const productsText = await productsResponse.text();
    if (!productsResponse.ok) return new NextResponse(productsText, { status: productsResponse.status });

    const products = JSON.parse(productsText) as ProductRow[];
    if (products.length === 0) return NextResponse.json([]);

    const ids = products.map(product => product.id).filter(Boolean);
    let images: ImageRow[] = [];

    if (ids.length > 0) {
      const encodedIds = ids.map(id => `"${String(id).replace(/"/g, '')}"`).join(',');
      const imagesResponse = await fetch(
        `${url}/rest/v1/product_images?select=product_id,public_url,sort_order&product_id=in.(${encodeURIComponent(encodedIds)})&order=sort_order.asc`,
        { headers, cache: 'no-store' },
      );
      if (imagesResponse.ok) images = (await imagesResponse.json()) as ImageRow[];
    }

    const imagesByProduct = new Map<string, ImageRow[]>();
    for (const image of images) {
      const current = imagesByProduct.get(image.product_id) ?? [];
      current.push(image);
      imagesByProduct.set(image.product_id, current);
    }

    return NextResponse.json(
      products.map(product => ({
        ...product,
        product_images: imagesByProduct.get(product.id) ?? [],
      })),
      { headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unbekannter Fehler' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ProductInput;
    if (!body.sku?.trim()) return NextResponse.json({ error: 'SKU ist erforderlich.' }, { status: 400 });
    const { url } = getSupabaseConfig();
    const response = await fetch(`${url}/rest/v1/products`, {
      method: 'POST',
      headers: supabaseHeaders({ 'Content-Type': 'application/json', Prefer: 'return=representation' }),
      body: JSON.stringify({ ...body, sku: body.sku.trim(), updated_at: new Date().toISOString() }),
      cache: 'no-store',
    });
    const text = await response.text();
    if (!response.ok) return new NextResponse(text, { status: response.status });
    const rows = JSON.parse(text) as Array<Record<string, unknown>>;
    return NextResponse.json(rows[0]);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unbekannter Fehler' }, { status: 500 });
  }
}
