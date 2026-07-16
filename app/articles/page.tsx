import AppShell from '@/components/AppShell';
import ArticleList from '@/components/ArticleList';
import Link from 'next/link';
export default function ArticlesPage(){return <AppShell><div className="page-header split"><div><p className="eyebrow">INVENTAR</p><h1>Artikel</h1><p>Verwalten Sie Bestand, Status, Preise und Produktfotos.</p></div><Link href="/articles/new" className="primary-button">+ Neuer Artikel</Link></div><ArticleList/></AppShell>}
