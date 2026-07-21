import { NextResponse } from 'next/server';
import { getSupabaseConfig, supabaseHeaders } from '@/lib/supabase';
import { generateQrSvg } from '@/lib/qr';

type ImageRow = { product_id: string };
type Product = {
  id: string; sku: string; brand?: string; subcategory?: string; original_size?: string;
  supplier_reference?: string; status?: string;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const onlyMissingPhotos = searchParams.get('all') !== 'true';

  const { url } = getSupabaseConfig();
  const productsRes = await fetch(`${url}/rest/v1/products?select=id,sku,brand,subcategory,original_size,supplier_reference,status&order=created_at.desc`, {
    headers: supabaseHeaders(), cache: 'no-store',
  });
  if (!productsRes.ok) return new NextResponse(await productsRes.text(), { status: productsRes.status });
  const products = await productsRes.json() as Product[];

  let filtered = products;
  if (onlyMissingPhotos) {
    const imagesRes = await fetch(`${url}/rest/v1/product_images?select=product_id`, { headers: supabaseHeaders(), cache: 'no-store' });
    const images = imagesRes.ok ? await imagesRes.json() as ImageRow[] : [];
    const withPhotos = new Set(images.map(image => image.product_id));
    filtered = products.filter(product => !withPhotos.has(product.id));
  }

  const labels = await Promise.all(filtered.map(async product => ({
    sku: product.sku,
    brand: product.brand || '',
    subcategory: product.subcategory || '',
    size: product.original_size || '',
    supplierReference: product.supplier_reference || '',
    svg: await generateQrSvg(product.sku),
  })));

  return NextResponse.json(labels);
}
