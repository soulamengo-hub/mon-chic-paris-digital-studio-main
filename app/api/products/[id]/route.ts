import { NextResponse } from 'next/server';
import { getSupabaseConfig, supabaseHeaders } from '@/lib/supabase';
import type { ProductInput } from '@/lib/types';
import { sanitizeProductInput } from '@/lib/product-fields';

type Context = { params: Promise<{ id: string }> };
export async function GET(_: Request, { params }: Context) {
  const { id } = await params; const { url } = getSupabaseConfig(); const headers = supabaseHeaders();
  const [productRes, imagesRes] = await Promise.all([
    fetch(`${url}/rest/v1/products?id=eq.${encodeURIComponent(id)}&select=*`, { headers, cache:'no-store' }),
    fetch(`${url}/rest/v1/product_images?product_id=eq.${encodeURIComponent(id)}&select=*&order=sort_order.asc`, { headers, cache:'no-store' }),
  ]);
  if (!productRes.ok) return new NextResponse(await productRes.text(), {status:productRes.status});
  const rows = await productRes.json(); if (!rows[0]) return NextResponse.json({error:'Artikel nicht gefunden.'},{status:404});
  return NextResponse.json({...rows[0], product_images: imagesRes.ok ? await imagesRes.json() : []});
}
export async function PATCH(request: Request, { params }: Context) {
  const { id } = await params;
  const rawBody = await request.json();
  const body = sanitizeProductInput(rawBody, { allowSku: false });
  const { url } = getSupabaseConfig();
  const headers = supabaseHeaders();
  const currentRes = await fetch(`${url}/rest/v1/products?id=eq.${encodeURIComponent(id)}&select=*`, { headers, cache: 'no-store' });
  const currentRows = currentRes.ok ? await currentRes.json() as Array<Record<string, unknown>> : [];
  const current = currentRows[0] || {};
  const warehouseChanged = ['warehouse_location','warehouse_rack','warehouse_shelf'].some(key => body[key as keyof ProductInput] !== undefined && body[key as keyof ProductInput] !== current[key]);
  const now = new Date().toISOString();
  const patchBody = { ...body, updated_at: now, ...(warehouseChanged ? { last_movement_at: now } : {}) };
  const res = await fetch(`${url}/rest/v1/products?id=eq.${encodeURIComponent(id)}`, {
    method:'PATCH',
    headers:supabaseHeaders({'Content-Type':'application/json',Prefer:'return=representation'}),
    body:JSON.stringify(patchBody),
    cache:'no-store',
  });
  const text=await res.text();
  if(!res.ok) return new NextResponse(text,{status:res.status});
  const updated = JSON.parse(text)[0];
  const changes = Object.entries(body).filter(([key, value]) => value !== undefined && value !== current[key]).map(([key, value]) => ({ field_name:key, old_value: current[key] == null ? null : String(current[key]), new_value: value == null ? null : String(value) }));
  if (changes.length) {
    await fetch(`${url}/rest/v1/product_history`, {
      method:'POST',
      headers:supabaseHeaders({'Content-Type':'application/json',Prefer:'return=minimal'}),
      body:JSON.stringify(changes.map(change => ({ product_id:id, event_type: warehouseChanged && ['warehouse_location','warehouse_rack','warehouse_shelf'].includes(change.field_name) ? 'Lagerbewegung' : 'Änderung', ...change }))),
      cache:'no-store',
    });
  }
  return NextResponse.json(updated);
}
export async function DELETE(_: Request, { params }: Context) {
  const { id } = await params; const { url } = getSupabaseConfig(); const headers=supabaseHeaders();
  const imagesRes=await fetch(`${url}/rest/v1/product_images?product_id=eq.${encodeURIComponent(id)}&select=storage_path`,{headers,cache:'no-store'});
  const images=imagesRes.ok?await imagesRes.json() as Array<{storage_path:string}>:[];
  for(const image of images){ const encoded=image.storage_path.split('/').map(encodeURIComponent).join('/'); await fetch(`${url}/storage/v1/object/product-images/${encoded}`,{method:'DELETE',headers}); }
  const res=await fetch(`${url}/rest/v1/products?id=eq.${encodeURIComponent(id)}`,{method:'DELETE',headers:supabaseHeaders({Prefer:'return=minimal'}),cache:'no-store'});
  if(!res.ok)return new NextResponse(await res.text(),{status:res.status}); return NextResponse.json({ok:true});
}
