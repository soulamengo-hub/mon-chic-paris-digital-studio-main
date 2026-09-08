'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArticleIcon, BoxIcon, EuroIcon, SparkIcon, ChartIcon } from './Icons';

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
  purchase_price?: number | null;
  public_title?: string;
  created_at?: string;
  gender?: string;
  product_images?: ImageRow[];
};

type Sale = {
  id: string;
  product_id: string;
  sale_price: number;
  discount?: number;
  shipping_cost?: number;
  sold_at: string;
};

const CATEGORY_CARDS = [
  {
    title: 'Oberteile',
    icon: '⌁',
    href: '/articles?category=Oberteile',
    subs: ['T-Shirt kurzarm', 'T-Shirt langarm', 'T-Shirt ärmellos', 'Top', 'Hemd', 'Bluse', 'Pullover'],
    genders: ['Frau', 'Mann'],
    terms: ['oberteil', 't-shirt', 'top', 'hemd', 'bluse', 'pullover', 'cardigan', 'strickjacke', 'hoodie', 'sweatshirt', 'tunika', 'body'],
  },
  {
    title: 'Kleider',
    icon: '♢',
    href: '/articles?category=Kleider',
    subs: ['Abendkleid', 'Cocktailkleid', 'Sommerkleid', 'Strickkleid', 'Wickelkleid', 'Maxikleid'],
    genders: ['Frau'],
    terms: ['kleid', 'dress'],
  },
  {
    title: 'Hosen & Röcke',
    icon: '⋈',
    href: '/articles?category=Hosen%20%26%20Röcke',
    subs: ['Jeans', 'Stoffhose', 'Shorts', 'Culotte', 'Rock', 'Midi-/Maxirock'],
    genders: ['Frau', 'Mann'],
    terms: ['hose', 'jeans', 'shorts', 'culotte', 'rock', 'leggings', 'bermuda'],
  },
  {
    title: 'Jacken & Mäntel',
    icon: '◇',
    href: '/articles?category=Jacken%20%26%20Mäntel',
    subs: ['Blazer', 'Jacke', 'Mantel', 'Trenchcoat', 'Weste', 'Lederjacke'],
    genders: ['Frau', 'Mann'],
    terms: ['blazer', 'jacke', 'mantel', 'trench', 'weste', 'parka'],
  },
  {
    title: 'Schuhe',
    icon: '⌒',
    href: '/articles?category=Schuhe',
    subs: ['Pumps', 'Stiefel', 'Sneaker', 'Sandalen', 'Loafer', 'Stiefeletten'],
    genders: ['Frau', 'Mann'],
    terms: ['schuh', 'pumps', 'stiefel', 'sneaker', 'sandale', 'loafer', 'stiefelette', 'boot'],
  },
  {
    title: 'Taschen',
    icon: '▱',
    href: '/articles?category=Taschen',
    subs: ['Handtasche', 'Shopper', 'Clutch', 'Umhängetasche', 'Crossbody'],
    genders: ['Frau', 'Mann'],
    terms: ['tasche', 'handtasche', 'shopper', 'clutch', 'crossbody', 'rucksack'],
  },
  {
    title: 'Schmuck & Accessoires',
    icon: '◈',
    href: '/articles?category=Schmuck%20%26%20Accessoires',
    subs: ['Ketten', 'Ringe', 'Ohrringe', 'Armbänder', 'Tücher', 'Gürtel'],
    genders: ['Frau', 'Mann'],
    terms: ['schmuck', 'kette', 'ring', 'ohrring', 'armband', 'tuch', 'schal', 'gürtel', 'accessoire', 'brosche'],
  },
  {
    title: 'Home Living',
    icon: '⌂',
    href: '/articles?category=Home%20Living',
    subs: ['Dekoration', 'Spiegel', 'Lampen', 'Vasen', 'Tassen', 'Espressotassen', 'Teekannen', 'Kaffeekannen', 'Weitere …'],
    genders: [],
    terms: ['home', 'living', 'wohnen', 'spiegel', 'lampe', 'vase', 'kerzenhalter', 'tasse', 'espresso', 'teekanne', 'kaffeekanne', 'dekoration'],
  },
];

function isToday(iso?: string) {
  if (!iso) return false;
  const date = new Date(iso);
  const now = new Date();
  return date.toDateString() === now.toDateString();
}

function isWithinDays(iso: string | undefined, days: number) {
  if (!iso) return false;
  const diffMs = Date.now() - new Date(iso).getTime();
  return diffMs >= 0 && diffMs <= days * 24 * 60 * 60 * 1000;
}

function formatEuro(value: number) {
  return `${value.toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} €`;
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

function normalizeSales(data: unknown): Sale[] {
  if (Array.isArray(data)) return data as Sale[];
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.sales)) return obj.sales as Sale[];
    if (Array.isArray(obj.data)) return obj.data as Sale[];
  }
  return [];
}

function genderCount(products: Product[], gender: 'Frau' | 'Mann') {
  return products.filter((product) => {
    const value = String(product.gender || '').toLowerCase();
    if (gender === 'Frau') return value.includes('frau') || value.includes('damen');
    return value.includes('mann') || value.includes('herren');
  }).length;
}

export default function Dashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/products', { cache: 'no-store' }).then((r) =>
        r.ok ? r.json() : Promise.reject(new Error('Artikel konnten nicht geladen werden.'))
      ),
      fetch('/api/sales', { cache: 'no-store' }).then((r) =>
        r.ok ? r.json() : Promise.reject(new Error('Verkäufe konnten nicht geladen werden.'))
      ),
    ])
      .then(([productsData, salesData]) => {
        setProducts(normalizeProducts(productsData));
        setSales(normalizeSales(salesData));
      })
      .catch((reason) =>
        setError(reason instanceof Error ? reason.message : 'Dashboard konnte nicht geladen werden.')
      )
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const totalArticles = products.length;
    const newLast7Days = products.filter((p) => isWithinDays(p.created_at, 7)).length;
    const inStock = products.filter((p) => p.status !== 'Verkauft' && p.status !== 'Archiv').length;
    const reserved = products.filter((p) => p.status === 'Reserviert').length;
    const returns = products.filter((p) => String(p.status || '').toLowerCase().includes('retour')).length;
    const todaySales = sales.filter((s) => isToday(s.sold_at));
    const revenueToday = todaySales.reduce((sum, s) => sum + Number(s.sale_price || 0), 0);

    const profitToday = todaySales.reduce((sum, sale) => {
      const product = products.find((p) => p.id === sale.product_id);
      const cost = Number(product?.purchase_price || 0);
      return (
        sum +
        Number(sale.sale_price || 0) -
        Number(sale.discount || 0) -
        Number(sale.shipping_cost || 0) -
        cost
      );
    }, 0);

    const recent = [...products]
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
      .slice(0, 5);

    return {
      totalArticles,
      newLast7Days,
      inStock,
      reserved,
      returns,
      todaySalesCount: todaySales.length,
      revenueToday,
      profitToday,
      recent,
    };
  }, [products, sales]);

  const categories = useMemo(
    () =>
      CATEGORY_CARDS.map((card) => {
        const matching = products.filter((product) => {
          const haystack = `${product.category || ''} ${product.subcategory || ''}`.toLowerCase();
          return card.terms.some((term) => haystack.includes(term));
        });

        return {
          ...card,
          count: matching.length,
          women: genderCount(matching, 'Frau'),
          men: genderCount(matching, 'Mann'),
        };
      }),
    [products]
  );

  if (loading) return <div className="empty-state">Dashboard wird geladen …</div>;
  if (error) return <div className="empty-state">Dashboard konnte nicht geladen werden: {error}</div>;

  return (
    <div className="dashboard-layout">
      <div className="dashboard-center">
        <section className="panel welcome-card">
          <div>
            <p className="eyebrow">MON CHIC PARIS · DIGITAL STUDIO</p>
            <h1>Bonjour, Mon Chic</h1>
            <p>Hier ist Ihr aktueller Überblick.</p>
          </div>
          <button className="date-button" type="button">
            Heute <span>⌄</span>
          </button>
        </section>

        <section className="kpi-grid">
          <article className="kpi-card">
            <div className="kpi-icon"><ArticleIcon /></div>
            <div>
              <strong>{stats.totalArticles}</strong>
              <p>Artikel</p>
              <span>+{stats.newLast7Days} neu (7 Tage)</span>
            </div>
          </article>

          <article className="kpi-card">
            <div className="kpi-icon"><BoxIcon /></div>
            <div>
              <strong>{stats.inStock}</strong>
              <p>Im Lager</p>
              <span>{stats.reserved} reserviert</span>
            </div>
          </article>

          <article className="kpi-card">
            <div className="kpi-icon"><EuroIcon /></div>
            <div>
              <strong>{formatEuro(stats.revenueToday)}</strong>
              <p>Umsatz heute</p>
              <span>{stats.todaySalesCount} Verkäufe</span>
            </div>
          </article>

          <article className="kpi-card">
            <div className="kpi-icon"><ChartIcon /></div>
            <div>
              <strong>{formatEuro(stats.profitToday)}</strong>
              <p>Gewinn heute</p>
              <span>nach Einkauf, Rabatt & Versand</span>
            </div>
          </article>
        </section>

        <section className="panel dashboard-category-panel">
          <div className="section-title">
            <div>
              <h2>Kategorien</h2>
              <p>Schnellzugriff auf Ihre Artikel.</p>
            </div>
            <Link href="/articles">Alle Artikel anzeigen</Link>
          </div>

          <div className="dashboard-category-grid">
            {categories.map((card) => (
              <Link href={card.href} className="dashboard-category-card" key={card.title}>
                <div className="dashboard-category-icon">{card.icon}</div>
                <h3>{card.title}</h3>

                <div className="dashboard-category-subs">
                  {card.subs.slice(0, 6).map((sub) => (
                    <span key={sub}>{sub}</span>
                  ))}
                  {card.subs.length > 6 && <span>…</span>}
                </div>

                <strong>{card.count} Artikel</strong>

                {card.genders.length > 0 && (
                  <div className="dashboard-gender-row">
                    {card.genders.includes('Frau') && (
                      <span title="Frau">
                        <img src="/icons/gender-frau.png" alt="Frau" />
                        {card.women > 0 ? card.women : ''}
                      </span>
                    )}
                    {card.genders.includes('Mann') && (
                      <span title="Mann">
                        <img src="/icons/gender-mann.png" alt="Mann" />
                        {card.men > 0 ? card.men : ''}
                      </span>
                    )}
                  </div>
                )}
              </Link>
            ))}
          </div>
        </section>

        <section className="panel recent-panel">
          <div className="section-title">
            <h2>Kürzlich hinzugefügte Artikel</h2>
            <Link href="/articles">Alle anzeigen</Link>
          </div>

          <div className="product-grid">
            {stats.recent.length === 0 ? (
              <p>Noch keine Artikel erfasst.</p>
            ) : (
              stats.recent.map((product) => {
                const image = product.product_images?.[0]?.public_url;
                return (
                  <Link href={`/articles/${product.id}`} className="product-card" key={product.id}>
                    {image ? (
                      <img className="product-image" src={image} alt={product.public_title || product.brand || product.sku} />
                    ) : (
                      <div className="product-image">📦</div>
                    )}
                    <div className="product-body">
                      <h3>{product.public_title || [product.brand, product.subcategory].filter(Boolean).join(' ') || product.sku}</h3>
                      <p>{[product.original_size ? `Gr. ${product.original_size}` : null, product.brand].filter(Boolean).join(' · ')}</p>
                      <strong>{product.sale_price != null ? formatEuro(Number(product.sale_price)) : 'Preis offen'}</strong>
                      <footer>
                        <span>SKU: {product.sku}</span>
                        <span className="status">● {product.status || 'Entwurf'}</span>
                      </footer>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </section>

        <section className="panel ai-banner">
          <div className="ai-banner-icon"><SparkIcon /></div>
          <div>
            <h2>AI Studio</h2>
            <p>Nutzen Sie KI gezielt auf Knopfdruck – ohne automatische Kosten.</p>
          </div>
          <Link href="/ai-studio" className="primary-button">AI Studio öffnen</Link>
        </section>
      </div>

      <aside className="right-column">
        <section className="panel quick-panel">
          <h2>Schnellzugriff</h2>
          <Link href="/articles/new" className="quick-link"><ArticleIcon /><span>Neuen Artikel erfassen</span><b>›</b></Link>
          <Link href="/sales" className="quick-link"><EuroIcon /><span>Verkauf erfassen</span><b>›</b></Link>
          <Link href="/inventory" className="quick-link"><BoxIcon /><span>Bestand importieren</span><b>›</b></Link>
          <Link href="/ai-studio">Alle AI Tools anzeigen</Link>
        </section>

        <section className="panel tasks-panel">
          <h2>Übersicht</h2>
          <div><SparkIcon /><p>{stats.returns} Retouren</p><Link href="/articles">Öffnen</Link></div>
          <div><ArticleIcon /><p>{stats.newLast7Days} neue Artikel</p><Link href="/articles">Anzeigen</Link></div>
          <div><EuroIcon /><p>{stats.todaySalesCount} Verkäufe heute</p><Link href="/sales">Anzeigen</Link></div>
        </section>
      </aside>
    </div>
  );
}
