'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

type ImageRow = { public_url: string; sort_order: number; content_suitable?: boolean };

type Product = {
  id: string;
  sku: string;
  supplier_reference?: string;
  supplier_order_number?: string;
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
  created_at?: string;
  gender?: string;
};

type SortKey =
  | 'newest'
  | 'oldest'
  | 'price-asc'
  | 'price-desc'
  | 'brand-asc'
  | 'brand-desc'
  | 'category-asc'
  | 'size-asc'
  | 'sku-asc'
  | 'sku-desc'
  | 'status-asc'
  | 'content-first';

const DASHBOARD_GROUPS: Record<string, string[]> = {
  Oberteile: [
    'oberteil', 't-shirt', 'shirt', 'top', 'hemd', 'bluse', 'pullover',
    'cardigan', 'strickjacke', 'hoodie', 'sweatshirt', 'tunika', 'body'
  ],
  Kleider: ['kleid', 'dress'],
  'Hosen & Röcke': ['hose', 'jeans', 'shorts', 'bermuda', 'culotte', 'rock', 'leggings', 'capri'],
  'Jacken & Mäntel': ['blazer', 'jacke', 'mantel', 'trench', 'weste', 'parka', 'coat'],
  Schuhe: ['schuh', 'pumps', 'stiefel', 'sneaker', 'sandale', 'loafer', 'stiefelette', 'boot'],
  Taschen: ['tasche', 'handtasche', 'shopper', 'clutch', 'crossbody', 'rucksack'],
  'Schmuck & Accessoires': [
    'schmuck', 'kette', 'ring', 'ohrring', 'armband', 'tuch', 'schal',
    'gürtel', 'accessoire', 'brosche'
  ],
  'Home Living': [
    'home', 'living', 'wohnen', 'spiegel', 'lampe', 'leuchte', 'vase',
    'kerzenhalter', 'tasse', 'espresso', 'teekanne', 'kaffeekanne', 'dekoration'
  ],
};

function matchesDashboardGroup(item: Product, group: string) {
  const terms = DASHBOARD_GROUPS[group];
  if (!terms) return false;
  const haystack = `${item.category || ''} ${item.subcategory || ''}`.toLowerCase();
  return terms.some((term) => haystack.includes(term));
}

function locationLabel(item: Product) {
  return [item.warehouse_location, item.warehouse_rack, item.warehouse_shelf]
    .filter(Boolean)
    .join(' · ');
}

function euro(value?: number | null) {
  if (value == null) return 'Preis offen';
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(Number(value));
}

function normalizeProducts(data: unknown): Product[] {
  if (Array.isArray(data)) return data as Product[];
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.products)) return obj.products as Product[];
    if (Array.isArray(obj.data)) return obj.data as Product[];
  }
  return [];
}

export default function ArticleList({ inventoryMode = false }: { inventoryMode?: boolean }) {
  const searchParams = useSearchParams();
  const urlCategory = searchParams.get('category') || 'Alle';

  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('Alle');
  const [category, setCategory] = useState(urlCategory);
  const [sortBy, setSortBy] = useState<SortKey>('newest');
  const [selected, setSelected] = useState<Product | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    setCategory(urlCategory);
  }, [urlCategory]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/products?ts=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(await response.text());
      setItems(normalizeProducts(await response.json()));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Ladefehler');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const actualCategories = useMemo(
    () => Array.from(new Set(items.map((item) => item.category).filter(Boolean) as string[])).sort(),
    [items],
  );

  const categoryOptions = useMemo(() => {
    const groups = Object.keys(DASHBOARD_GROUPS);
    return Array.from(new Set([...groups, ...actualCategories]));
  }, [actualCategories]);

  const statuses = useMemo(
    () => Array.from(new Set(items.map((item) => item.status || 'Entwurf'))).sort(),
    [items],
  );

  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase();

    const result = items.filter((item) => {
     const haystack = [
  item.sku,
  item.supplier_reference,
  item.supplier_order_number,
  item.brand,
  item.category,
  item.subcategory,
  item.material,
  item.color,
  item.secondary_color,
  item.original_size,
  ...(item.occasions || []),
]
  .filter(Boolean)
  .join(' ')
  .toLowerCase();

      const queryMatches = !text || haystack.includes(text);
      const statusMatches = status === 'Alle' || (item.status || 'Entwurf') === status;

      let categoryMatches = true;
      if (category !== 'Alle') {
        categoryMatches = DASHBOARD_GROUPS[category]
          ? matchesDashboardGroup(item, category)
          : item.category === category;
      }

      return queryMatches && statusMatches && categoryMatches;
    });

    result.sort((a, b) => {
      switch (sortBy) {
        case 'price-asc':
          return Number(a.sale_price ?? Number.MAX_SAFE_INTEGER) - Number(b.sale_price ?? Number.MAX_SAFE_INTEGER);
        case 'price-desc':
          return Number(b.sale_price ?? -1) - Number(a.sale_price ?? -1);
        case 'brand-asc':
          return String(a.brand || '').localeCompare(String(b.brand || ''), 'de');
        case 'brand-desc':
          return String(b.brand || '').localeCompare(String(a.brand || ''), 'de');
        case 'category-asc':
          return String(a.category || '').localeCompare(String(b.category || ''), 'de');
        case 'size-asc':
          return String(a.original_size || '').localeCompare(String(b.original_size || ''), 'de', { numeric: true });
        case 'sku-asc':
          return String(a.sku || '').localeCompare(String(b.sku || ''), 'de', { numeric: true });
        case 'sku-desc':
          return String(b.sku || '').localeCompare(String(a.sku || ''), 'de', { numeric: true });
        case 'status-asc':
          return String(a.status || '').localeCompare(String(b.status || ''), 'de');
        case 'content-first': {
          const aContent = (a.product_images || []).some(image => Boolean(image.content_suitable));
          const bContent = (b.product_images || []).some(image => Boolean(image.content_suitable));
          return Number(bContent) - Number(aContent);
        }
        case 'oldest':
          return String(a.created_at || '').localeCompare(String(b.created_at || ''));
        case 'newest':
        default:
          return String(b.created_at || '').localeCompare(String(a.created_at || ''));
      }
    });

    return result;
  }, [items, query, status, category, sortBy]);

  async function updateStatus(item: Product, nextStatus: string) {
    setBusyId(item.id);
    setMessage('');
    try {
      const response = await fetch(`/api/products/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!response.ok) throw new Error(await response.text());

      setItems((current) =>
        current.map((product) =>
          product.id === item.id ? { ...product, status: nextStatus } : product
        )
      );
      setMessage(`Status von ${item.sku} wurde auf „${nextStatus}“ geändert.`);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'Status konnte nicht geändert werden.');
    } finally {
      setBusyId(null);
    }
  }

  async function remove(item: Product) {
    if (!confirm(`Artikel ${item.sku} wirklich endgültig löschen?`)) return;

    setBusyId(item.id);
    setMessage('');
    try {
      const response = await fetch(`/api/products/${item.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(await response.text());
      setItems((current) => current.filter((product) => product.id !== item.id));
      setSelected(null);
      setMessage(`Artikel ${item.sku} wurde gelöscht.`);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'Artikel konnte nicht gelöscht werden.');
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return <section className="panel empty-state"><h2>Artikel werden geladen …</h2></section>;
  }

  if (error) {
    return (
      <section className="panel empty-state">
        <h2>Artikel konnten nicht geladen werden</h2>
        <p>{error}</p>
        <button className="primary-button centered-button" onClick={() => void load()}>
          Erneut laden
        </button>
      </section>
    );
  }

  return (
    <>
      <section className="catalog-toolbar catalog-toolbar-v2 panel">
        <div className="catalog-summary">
          <strong>{filtered.length}</strong>
          <span>{inventoryMode ? 'Artikel im Gesamtlager' : `von ${items.length} Artikeln`}</span>
        </div>

        <div className="catalog-search-wrap">
          <span>⌕</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="SKU, Marke, Farbe, Größe oder Anlass suchen"
            aria-label="Artikel suchen"
          />
        </div>

        <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Status filtern">
          <option>Alle</option>
          {statuses.map((value) => <option key={value}>{value}</option>)}
        </select>

        <select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Kategorie filtern">
          <option>Alle</option>
          {categoryOptions.map((value) => <option key={value}>{value}</option>)}
        </select>

        <select value={sortBy} onChange={(event) => setSortBy(event.target.value as SortKey)} aria-label="Sortieren">
          <option value="content-first">★ Content geeignet zuerst</option>
          <option value="newest">Neueste zuerst</option>
          <option value="oldest">Älteste zuerst</option>
          <option value="brand-asc">Marke A–Z</option>
          <option value="brand-desc">Marke Z–A</option>
          <option value="price-asc">Preis aufsteigend</option>
          <option value="price-desc">Preis absteigend</option>
          <option value="category-asc">Kategorie A–Z</option>
          <option value="size-asc">Größe aufsteigend</option>
          <option value="sku-asc">SKU aufsteigend</option>
          <option value="sku-desc">SKU absteigend</option>
          <option value="status-asc">Status A–Z</option>
        </select>

        <button className="secondary-button refresh-button" onClick={() => void load()}>
          Aktualisieren
        </button>
      </section>

      {category !== 'Alle' && (
        <div className="catalog-active-filter">
          <span>Aktiver Filter: <strong>{category}</strong></span>
          <button type="button" onClick={() => setCategory('Alle')}>Filter entfernen ×</button>
        </div>
      )}

      {message && <div className="catalog-message">{message}</div>}

      {filtered.length === 0 ? (
        <section className="panel empty-state">
          <h2>Keine passenden Artikel</h2>
          <p>Bitte Suche oder Filter anpassen.</p>
        </section>
      ) : (
        <section className="article-list-grid article-list-grid-v2" aria-label="Artikelübersicht">
          {filtered.map((item) => {
            const images = [...(item.product_images || [])].sort((a, b) => a.sort_order - b.sort_order);
            const image = images[0]?.public_url;
            const isContentSuitable = images.some(image => Boolean(image.content_suitable));
            const location = locationLabel(item);
            const busy = busyId === item.id;

            return (
              <article className="inventory-card inventory-card-v2" key={item.id}>
                <div className="inventory-card-media-v2">
                  {image ? (
                    <img src={image} alt={item.public_title || item.brand || 'Artikel'} />
                  ) : item.reference_photo_url ? (
                    <img src={item.reference_photo_url} alt="Referenzfoto" className="is-reference" />
                  ) : (
                    <div className="inventory-placeholder">
                      <span>MON CHIC</span>
                      <small>Kein Produktfoto</small>
                    </div>
                  )}
                  <span className={`status-pill status-${item.status || 'Entwurf'}`}>
                    {item.status || 'Entwurf'}
                  </span>
                </div>

                <div className="inventory-card-body inventory-card-body-v2">
                  <span className="inventory-sku">{item.sku}</span>
                  {isContentSuitable && <span className="inventory-content-suitable">★ Content geeignet</span>}
                  <h2>
                    {item.public_title ||
                      [item.brand, item.subcategory || item.category].filter(Boolean).join(' · ') ||
                      'Artikel'}
                  </h2>

                  <p className="inventory-meta">
                    {[item.brand, item.category, item.original_size ? `Größe ${item.original_size}` : null]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>

                  <div className="inventory-tags inventory-tags-v2">
                    {[item.color, item.secondary_color, item.material]
                      .filter(Boolean)
                      .slice(0, 3)
                      .map((value, index) => <span key={`${value}-${index}`}>{value}</span>)}
                  </div>

                  <div className="inventory-card-facts-v2">
                    {location && <span><b>Lager</b>{location}</span>}
                    {item.occasions?.length ? <span><b>Anlass</b>{item.occasions.slice(0, 2).join(' · ')}</span> : null}
                  </div>

                  <div className="inventory-card-price-v2">{euro(item.sale_price)}</div>

                  <div className="inventory-card-actions-v2">
                    <Link href={`/articles/${item.id}`} className="article-action primary-action">
                      Bearbeiten
                    </Link>

                    <button type="button" className="article-action" onClick={() => setSelected(item)}>
                      Details
                    </button>

                    <select
                      className="article-status-select"
                      value={item.status || 'Entwurf'}
                      disabled={busy}
                      onChange={(event) => void updateStatus(item, event.target.value)}
                      aria-label={`Status von ${item.sku} ändern`}
                    >
                      {['Entwurf', 'Aktiv', 'Reserviert', 'Verkauft', 'Retoure', 'Archiv'].map((value) => (
                        <option key={value}>{value}</option>
                      ))}
                    </select>

                    <button
                      type="button"
                      className="article-action danger-action"
                      disabled={busy}
                      onClick={() => void remove(item)}
                    >
                      Löschen
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {selected && (
        <div className="article-detail-backdrop" onMouseDown={() => setSelected(null)}>
          <section className="article-detail-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="article-detail-head">
              <div>
                <small>{selected.sku}</small>
                <h2>{selected.public_title || selected.brand || 'Artikel'}</h2>
              </div>
              <button type="button" onClick={() => setSelected(null)} aria-label="Schließen">×</button>
            </div>

            <div className="article-detail-grid">
              <span><b>Marke</b>{selected.brand || '—'}</span>
              <span><b>Kategorie</b>{selected.category || '—'}</span>
              <span><b>Unterkategorie</b>{selected.subcategory || '—'}</span>
              <span><b>Größe</b>{selected.original_size || '—'}</span>
              <span><b>Farbe</b>{selected.color || '—'}</span>
              <span><b>Material</b>{selected.material || '—'}</span>
              <span><b>Zustand</b>{selected.condition || '—'}</span>
              <span><b>Status</b>{selected.status || 'Entwurf'}</span>
              <span><b>Preis</b>{euro(selected.sale_price)}</span>
              <span><b>Lager</b>{locationLabel(selected) || '—'}</span>
            </div>

            <div className="article-detail-actions">
              <Link href={`/articles/${selected.id}`} className="primary-button">Bearbeiten</Link>
              <button type="button" className="danger-button" onClick={() => void remove(selected)}>
                Endgültig löschen
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
