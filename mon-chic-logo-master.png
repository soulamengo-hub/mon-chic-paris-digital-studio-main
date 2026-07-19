import Link from 'next/link';
import { ArticleIcon, BoxIcon, CalendarIcon, EuroIcon, SparkIcon, ChartIcon } from './Icons';

const products = [
  { title: 'Max Mara Mantel', meta: 'Gr. 38 · Beige', price: '320,00 €', id: '1001', image: '🧥' },
  { title: 'Chanel Classic Bag', meta: 'One Size · Schwarz', price: '2.450,00 €', id: '1002', image: '👜' },
  { title: 'Hermès Seidentuch', meta: 'One Size · Blau/Gold', price: '275,00 €', id: '1003', image: '🧣' },
  { title: 'Prada Stiefeletten', meta: 'Gr. 39 · Schwarz', price: '480,00 €', id: '1004', image: '👢' },
  { title: 'Sandro Bluse', meta: 'Gr. 36 · Creme', price: '95,00 €', id: '1005', image: '👚' },
];

export default function Dashboard() {
  return <div className="dashboard-layout">
    <section className="dashboard-center">
      <div className="welcome-card panel">
        <div><p className="eyebrow">✦</p><h1>Willkommen zurück, Mon Chic</h1><p>Hier ist Ihr aktueller Überblick.</p></div>
        <button className="date-button"><CalendarIcon /> Heute <span>⌄</span></button>
      </div>
      <div className="kpi-grid">
        <div className="kpi-card"><span className="kpi-icon"><ArticleIcon /></span><div><strong>128</strong><p>Artikel</p><a>+12 neu</a></div></div>
        <div className="kpi-card"><span className="kpi-icon"><BoxIcon /></span><div><strong>34</strong><p>Im Lager</p><a>3 niedrig</a></div></div>
        <div className="kpi-card"><span className="kpi-icon"><EuroIcon /></span><div><strong>7.458 €</strong><p>Umsatz (Heute)</p><a>+18,5%</a></div></div>
        <div className="kpi-card"><span className="kpi-icon"><ChartIcon /></span><div><strong>1.247 €</strong><p>Gewinn (Heute)</p><a>+21,3%</a></div></div>
      </div>
      <section className="panel recent-panel">
        <div className="section-title"><h2>Kürzlich hinzugefügte Artikel</h2><Link href="/articles">Alle anzeigen</Link></div>
        <div className="product-grid">
          {products.map(p => <article className="product-card" key={p.id}><div className="product-image">{p.image}</div><div className="product-body"><h3>{p.title}</h3><p>{p.meta}</p><strong>{p.price}</strong><footer><span>ID: {p.id}</span><span className="status">● Aktiv</span></footer></div></article>)}
        </div>
      </section>
      <section className="ai-banner panel"><span className="ai-banner-icon"><SparkIcon /></span><div><h2>AI Studio</h2><p>Nutzen Sie KI gezielt auf Knopfdruck – ohne automatische Kosten.</p></div><Link href="/ai-studio" className="primary-button"><SparkIcon /> AI Studio öffnen</Link></section>
    </section>
    <aside className="right-column">
      <section className="panel quick-panel"><h2>AI Studio – Schnellzugriff</h2>{['Artikel analysieren','Beschreibung erstellen','SEO optimieren','Übersetzen','Preisvorschlag'].map(x=><button key={x}><SparkIcon /><span>{x}</span><b>›</b></button>)}<Link href="/ai-studio">Alle AI Tools anzeigen</Link></section>
      <section className="panel tasks-panel"><h2>Aufgaben</h2>{[['Neue Kollektion fotografieren','Heute'],['Artikel #1002 Beschreibung','Heute'],['Lagerbestand überprüfen','Morgen'],['Monatsabschluss erstellen','30. Mai'],['Rechnungen prüfen','31. Mai']].map(([a,b])=><div key={a}><span>✓</span><p>{a}</p><a>{b}</a></div>)}<Link href="#">Alle Aufgaben anzeigen</Link></section>
    </aside>
  </div>;
}
