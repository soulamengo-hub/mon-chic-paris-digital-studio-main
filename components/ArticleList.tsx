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
  product_images?: ImageRow[];
};

export default function ArticleList({ inventoryMode = false }: { inventoryMode?: boolean }) {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('Alle');
  const [category, setCategory] = useState('Alle');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/products?ts=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(await response.text());
      setItems(await response.json());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Ladefehler');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const remove = useCallback(async (item: Product) => {
    const label = [item.sku, item.brand, item.subcategory || item.category].filter(Boolean).join(' · ');
    if (!window.confirm(`Artikel „${label || 'ohne Bezeichnung'}“ wirklich löschen?\n\nDie Produktdaten und zugehörigen Fotos werden dauerhaft entfernt.`)) return;

    setDeletingId(item.id);
    setError('');
    try {
      const response = await fetch(`/api/products/${encodeURIComponent(item.id)}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(await response.text());
      setItems(current => current.filter(product => product.id !== item.id));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Der Artikel konnte nicht gelöscht werden.');
    } finally {
      setDeletingId(null);
    }
  }, []);

  const categories = useMemo(
    () => Array.from(new Set(items.map(item => item.category).filter(Boolean) as string[])).sort(),
    [items],
  );
  const statuses = useMemo(
    () => Array.from(new Set(items.map(item => item.status || 'Entwurf'))).sort(),
    [items],
  );
  const filtered = useMemo(
    () => items.filter(item => {
      const haystack = [item.sku, item.brand, item.category, item.subcategory, ...(item.occasions || [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return (
        (!query || haystack.includes(query.toLowerCase())) &&
        (status === 'Alle' || (item.status || 'Entwurf') === status) &&
        (category === 'Alle' || item.category === category)
      );
    }),
    [items, query, status, category],
  );

  if (loading) return <section className="panel empty-state"><h2>Artikel werden geladen …</h2></section>;
  if (error && items.length === 0) return <section className="panel empty-state"><h2>Artikel konnten nicht geladen werden</h2><p>{error}</p><button className="primary-button centered-button" onClick={() => void load()}>Erneut laden</button></section>;

  return <>
    <section className="catalog-toolbar panel">
      <div className="catalog-summary"><strong>{items.length}</strong><span>{inventoryMode ? 'Artikel im Gesamtlager' : 'gespeicherte Artikel'}</span></div>
      <input value={query} onChange={event => setQuery(event.target.value)} placeholder="SKU, Marke, Kategorie oder Anlass suchen" />
      <select value={status} onChange={event => setStatus(event.target.value)}><option>Alle</option>{statuses.map(value => <option key={value}>{value}</option>)}</select>
      <select value={category} onChange={event => setCategory(event.target.value)}><option>Alle</option>{categories.map(value => <option key={value}>{value}</option>)}</select>
      <button className="secondary-button refresh-button" onClick={() => void load()}>Aktualisieren</button>
    </section>

    {error ? <p className="catalog-error" role="alert">{error}</p> : null}

    {filtered.length === 0 ? <section className="panel empty-state"><h2>Keine passenden Artikel</h2></section> :
      <section className="article-list-grid">
        {filtered.map(item => {
          const image = [...(item.product_images || [])].sort((a, b) => a.sort_order - b.sort_order)[0];
          const deleting = deletingId === item.id;
          return <article className="inventory-card" key={item.id}>
            <Link href={`/articles/${item.id}`} className="inventory-card-link" aria-label={`${item.sku || 'Artikel'} öffnen und bearbeiten`}>
              <div className="inventory-image-frame">
                {image ? <img src={image.public_url} alt={`${item.brand || ''} ${item.subcategory || item.category || 'Artikel'}`.trim()} /> : <div className="inventory-placeholder">MON CHIC</div>}
              </div>
              <div className="inventory-card-body">
                <span className="inventory-sku">{item.sku}</span>
                <h2>{[item.brand, item.subcategory || item.category].filter(Boolean).join(' · ') || 'Artikel'}</h2>
                <p className="inventory-meta">{[item.category, item.original_size ? `Größe ${item.original_size}` : null].filter(Boolean).join(' · ')}</p>
                <p>{item.occasions?.slice(0, 3).join(' · ') || 'Keine Anlässe ausgewählt'}</p>
                <footer><strong>{item.sale_price != null ? `${Number(item.sale_price).toFixed(2).replace('.', ',')} €` : 'Preis offen'}</strong><span className="status-pill">{item.status || 'Entwurf'}</span></footer>
                <span className="card-action">Öffnen & bearbeiten →</span>
              </div>
            </Link>
            <button type="button" className="card-delete-button" onClick={() => void remove(item)} disabled={deleting}>
              {deleting ? 'Wird gelöscht …' : 'Artikel löschen'}
            </button>
          </article>;
        })}
      </section>}
  </>;
}
