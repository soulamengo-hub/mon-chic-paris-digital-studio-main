'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArticleIcon, BoxIcon, CalendarIcon, EuroIcon, SparkIcon, ChartIcon } from './Icons';

type ImageRow = { public_url: string; sort_order: number };
type Product = {
  id: string; sku: string; brand?: string; category?: string; subcategory?: string;
  original_size?: string; status?: string; sale_price?: number | null; purchase_price?: number | null;
  public_title?: string; created_at?: string; product_images?: ImageRow[];
};
type Sale = { id: string; product_id: string; sale_price: number; discount?: number; shipping_cost?: number; sold_at: string };

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
  return `${value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

export default function Dashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/products', { cache: 'no-store' }).then(r => r.ok ? r.json() : Promise.reject(new Error('Artikel konnten nicht geladen werden.'))),
      fetch('/api/sales', { cache: 'no-store' }).then(r => r.ok ? r.json() : Promise.reject(new Error('Verkäufe konnten nicht geladen werden.'))),
    ]).then(([productsData, salesData]) => {
      setProducts(productsData);
      setSales(salesData);
    }).catch(reason => setError(reason instanceof Error ? reason.message : 'Dashboard konnte nicht geladen werden.'))
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const totalArticles = products.length;
    const newLast7Days = products.filter(p => isWithinDays(p.created_at, 7)).length;
    const inStock = products.filter(p => p.status !== 'Verkauft' && p.status !== 'Archiv').length;
    const reserved = products.filter(p => p.status === 'Reserviert').length;
    const todaySales = sales.filter(s => isToday(s.sold_at));
    const revenueToday = todaySales.reduce((sum, s) => sum + Number(s.sale_price || 0), 0);
    const profitToday = todaySales.reduce((sum, s) => {
      const product = products.find(p => p.id === s.product_id);
      const cost = Number(product?.purchase_price || 0);
      return sum + Number(s.sale_price || 0) - Number(s.discount || 0) - Number(s.shipping_cost || 0) - cost;
    }, 0);
    const recent = [...products].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')).slice(0, 5);
    return { totalArticles, newLast7Days, inStock, reserved, todaySalesCount: todaySales.length, revenueToday, profitToday, recent };
  }, [products, sales]);

  if (loading) return <div className="dashboard-layout"><section className="dashboard-center"><section className="panel empty-state"><h2>Dashboard wird geladen …</h2></section></section></div>;
  if (error) return <div className="dashboard-layout"><section className="dashboard-center"><section className="panel empty-state"><h2>Dashboard konnte nicht geladen werden</h2><p>{error}</p></section></section></div>;

  return <div className="dashboard-layout">
    <section className="dashboard-center">
      <div className="welcome-card panel">
        <div><p className="eyebrow">✦</p><h1>Willkommen zurück, Mon Chic</h1><p>Hier ist Ihr aktueller Überblick.</p></div>
        <button className="date-button"><CalendarIcon /> Heute <span>⌄</span></button>
      </div>
      <div className="kpi-grid">
        <div className="kpi-card"><span className="kpi-icon"><ArticleIcon /></span><div><strong>{stats.totalArticles}</strong><p>Artikel</p><a>+{stats.newLast7Days} neu (7 Tage)</a></div></div>
        <div className="kpi-card"><span className="kpi-icon"><BoxIcon /></span><div><strong>{stats.inStock}</strong><p>Im Lager</p><a>{stats.reserved} reserviert</a></div></div>
        <div className="kpi-card"><span className="kpi-icon"><EuroIcon /></span><div><strong>{formatEuro(stats.revenueToday)}</strong><p>Umsatz (Heute)</p><a>{stats.todaySalesCount} Verkäufe</a></div></div>
        <div className="kpi-card"><span className="kpi-icon"><ChartIcon /></span><div><strong>{formatEuro(stats.profitToday)}</strong><p>Gewinn (Heute)</p><a>nach Einkaufspreis, Rabatt, Versand</a></div></div>
      </div>
      <section className="panel recent-panel">
        <div className="section-title"><h2>Kürzlich hinzugefügte Artikel</h2><Link href="/articles">Alle anzeigen</Link></div>
        {stats.recent.length === 0 ? <p>Noch keine Artikel erfasst.</p> : <div className="product-grid">
          {stats.recent.map(p => {
            const image = p.product_images?.[0]?.public_url;
            return <Link href={`/articles/${p.id}`} className="product-card" key={p.id}>
              {image ? <div className="product-image"><img src={image} alt={p.public_title || p.brand || p.sku} /></div> : <div className="product-image">📦</div>}
              <div className="product-body">
                <h3>{p.public_title || [p.brand, p.subcategory].filter(Boolean).join(' ') || p.sku}</h3>
                <p>{[p.original_size ? `Gr. ${p.original_size}` : null, p.brand].filter(Boolean).join(' · ')}</p>
                <strong>{p.sale_price != null ? formatEuro(Number(p.sale_price)) : 'Preis offen'}</strong>
                <footer><span>SKU: {p.sku}</span><span className="status">● {p.status || 'Entwurf'}</span></footer>
              </div>
            </Link>;
          })}
        </div>}
      </section>
      <section className="ai-banner panel"><span className="ai-banner-icon"><SparkIcon /></span><div><h2>AI Studio</h2><p>Nutzen Sie KI gezielt auf Knopfdruck – ohne automatische Kosten.</p></div><Link href="/ai-studio" className="primary-button"><SparkIcon /> AI Studio öffnen</Link></section>
    </section>
    <aside className="right-column">
      <section className="panel quick-panel">
        <h2>Schnellzugriff</h2>
        <Link href="/articles/new" className="quick-link"><SparkIcon /><span>Neuen Artikel erfassen</span><b>›</b></Link>
        <Link href="/sales" className="quick-link"><EuroIcon /><span>Verkauf erfassen</span><b>›</b></Link>
        <Link href="/inventory" className="quick-link"><BoxIcon /><span>Bestand importieren</span><b>›</b></Link>
        <Link href="/ai-studio">Alle AI Tools anzeigen</Link>
      </section>
    </aside>
  </div>;
}
