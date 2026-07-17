import Image from 'next/image';
import Link from 'next/link';
import { getSupabaseConfig, supabaseHeaders } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

type ImageRow = { public_url: string; sort_order: number };
type Product = {
  id: string; sku: string; brand?: string; category?: string; subcategory?: string;
  sale_price?: number; occasions?: string[]; product_images?: ImageRow[];
};

async function loadProducts(): Promise<Product[]> {
  try {
    const { url } = getSupabaseConfig();
    const response = await fetch(`${url}/rest/v1/products?select=id,sku,brand,category,subcategory,sale_price,occasions,product_images(public_url,sort_order)&status=eq.Aktiv&order=created_at.desc&limit=60`, {
      headers: supabaseHeaders(), cache: 'no-store',
    });
    if (!response.ok) return [];
    return response.json();
  } catch {
    return [];
  }
}

export default async function ShowcasePage() {
  const products = await loadProducts();
  return <main className="showcase-page">
    <header className="showcase-header">
      <div className="showcase-brand"><Image src="/mon-chic-logo.png" width={105} height={95} alt="MON CHIC PARIS" priority/><div><strong>MON CHIC PARIS</strong><span>DIGITAL SHOWCASE</span></div></div>
      <Link href="/" className="showcase-admin-link">Zum Digital Studio</Link>
    </header>
    <section className="showcase-hero"><p>MON CHIC PARIS</p><h1>Ihre persönliche Vintage- und Designerwelt</h1><span>Das Schaufenster entwickelt sich mit jeder Kollektion weiter. Unsere KI präsentiert automatisch passende Vintage- und Designerstücke – inspirierend, aktuell und einzigartig.</span></section>
    {products.length ? <section className="showcase-grid">{products.map(product => {
      const image=[...(product.product_images||[])].sort((a,b)=>a.sort_order-b.sort_order)[0];
      return <article className="showcase-card" key={product.id}>
        {image ? <img src={image.public_url} alt={`${product.brand||''} ${product.subcategory||product.category||'Artikel'}`}/> : <div className="showcase-placeholder">MON CHIC</div>}
        <div><small>{product.sku}</small><h2>{[product.brand,product.subcategory||product.category].filter(Boolean).join(' · ')||'Ausgewähltes Stück'}</h2><p>{product.occasions?.slice(0,4).join(' · ')||'Parisian Vintage'}</p><strong>{product.sale_price!=null?`${Number(product.sale_price).toFixed(2).replace('.',',')} €`:'Preis auf Anfrage'}</strong></div>
      </article>;
    })}</section> : <section className="showcase-empty"><h2>Jedes Stück erzählt seine eigene Geschichte.</h2><p>Entdecken Sie Vintage- und Designerstücke, die Stil, Qualität und Individualität verbinden.</p></section>}
  </main>;
}
