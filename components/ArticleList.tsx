'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

type ImageRow = { public_url: string; sort_order: number };
type Product = {
  id: string;
  sku: string;
  brand?: string;
  category?: string;
  subcategory?: string;
  original_size?: string;
  status?: string;
  sale_price?: number | null;
  occasions?: string[];
  material?: string;
  color?: string;
  secondary_color?: string;
  style_key?: string;
  condition?: string;
  warehouse_location?: string;
  warehouse_rack?: string;
  warehouse_shelf?: string;
  public_title?: string;
  reference_photo_url?: string;
  product_images?: ImageRow[];
};

const qualityFields: Array<keyof Product> = [
  'brand', 'category', 'subcategory', 'original_size', 'material', 'color',
  'style_key', 'condition', 'sale_price', 'warehouse_location',
];

function completeness(item: Product) {
  const completed = qualityFields.filter((field) => {
    const value = item[field];
    return value !== undefined && value !== null && value !== '';
  }).length + ((item.product_images?.length ?? 0) > 0 ? 1 : 0);
  return Math.round((completed / (qualityFields.length + 1)) * 100);
}

function locationLabel(item: Product) {
  return [item.warehouse_location, item.warehouse_rack, item.warehouse_shelf]
    .filter(Boolean)
    .join(' · ');
}

export default function ArticleList({ inventoryMode = false }: { inventoryMode?: boolean }) {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('Alle');
  const [category, setCategory] = useState('Alle');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/products?ts=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(await response.text());
      setItems(await response.json());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Ladefehler');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const categories = useMemo(
    () => Array.from(new Set(items.map((item) => item.category).filter(Boolean) as string[])).sort(),
    [items],
  );
  const statuses = useMemo(
    () => Array.from(new Set(items.map((item) => item.status || 'Entwurf'))).sort(),
    [items],
  );
  const filtered = useMemo(() => items.filter((item) => {
    const haystack = [
      item.sku, item.brand, item.category, item.subcategory, item.material,
      item.color, item.secondary_color, item.original_size, ...(item.occasions || []),
    ].filter(Boolean).join(' ').toLowerCase();
    return (!query || haystack.includes(query.toLowerCase()))
      && (status === 'Alle' || (item.status || 'Entwurf') === status)
      && (category === 'Alle' || item.category === category);
  }), [items, query, status, category]);

  if (loading) return <section className="panel empty-state"><h2>Artikel werden geladen …</h2></section>;
  if (error) return (
    <section className="panel empty-state">
      <h2>Artikel konnten nicht geladen werden</h2><p>{error}</p>
      <button className="primary-button centered-button" onClick={() => void load()}>Erneut laden</button>
    </section>
  );

  return (
    <>
      <section className="catalog-toolbar panel" aria-label="Artikelfilter">
        <div className="catalog-summary">
          <strong>{filtered.length}</strong>
          <span>{inventoryMode ? 'Artikel im Gesamtlager' : `von ${items.length} Artikeln`}</span>
        </div>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="SKU, Marke, Farbe, Größe oder Anlass suchen" />
        <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Status filtern">
          <option>Alle</option>{statuses.map((value) => <option key={value}>{value}</option>)}
        </select>
        <select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Kategorie filtern">
          <option>Alle</option>{categories.map((value) => <option key={value}>{value}</option>)}
        </select>
        <button className="secondary-button refresh-button" onClick={() => void load()}>Aktualisieren</button>
      </section>

      {filtered.length === 0 ? (
        <section className="panel empty-state"><h2>Keine passenden Artikel</h2><p>Bitte Suche oder Filter anpassen.</p></section>
      ) : (
        <section className="article-list-grid" aria-label="Artikelübersicht">
          {filtered.map((item) => {
            const images = [...(item.product_images || [])].sort((a, b) => a.sort_order - b.sort_order);
            const score = completeness(item);
            const location = locationLabel(item);
            return (
              <Link href={`/articles/${item.id}`} className="inventory-card clickable-card" key={item.id}>
                <div className="inventory-media">
                  {images[0]
                    ? <img src={images[0].public_url} alt={item.public_title || item.brand || 'Artikel'} />
                    : item.reference_photo_url
                      ? <div className="inventory-reference-photo"><img src={item.reference_photo_url} alt="Referenzfoto (Lieferant)" /><span className="status-pill">Referenzfoto</span></div>
                      : <div className="inventory-placeholder"><span>MON CHIC</span><small>Kein Produktfoto</small></div>}
                  <div className="inventory-media-badges">
                    <span>{images.length} Foto{images.length === 1 ? '' : 's'}</span>
                    <span className={score >= 80 ? 'quality-good' : 'quality-open'}>DNA {score}%</span>
                  </div>
                </div>
                <div className="inventory-card-body">
                  <div className="inventory-card-topline">
                    <span className="inventory-sku">{item.sku}</span>
                    <span className="status-pill">{item.status || 'Entwurf'}</span>
                  </div>
                  <h2>{item.public_title || [item.brand, item.subcategory || item.category].filter(Boolean).join(' · ') || 'Artikel'}</h2>
                  <p className="inventory-meta">{[item.brand, item.category, item.original_size ? `Größe ${item.original_size}` : null].filter(Boolean).join(' · ')}</p>
                  <div className="inventory-tags">
                    {[item.color, item.secondary_color, item.material].filter(Boolean).slice(0, 3).map((value) => <span key={value}>{value}</span>)}
                  </div>
                  <div className="inventory-facts">
                    <span><b>Anlass</b>{item.occasions?.slice(0, 2).join(' · ') || 'Noch offen'}</span>
                    <span><b>Lager</b>{location || 'Noch offen'}</span>
                  </div>
                  <footer>
                    <strong>{item.sale_price != null ? `${Number(item.sale_price).toFixed(2).replace('.', ',')} €` : 'Preis offen'}</strong>
                    <span className="card-action">Öffnen & bearbeiten →</span>
                  </footer>
                </div>
              </Link>
            );
          })}
        </section>
      )}
    </>
  );
}
