import AppShell from '@/components/AppShell';
import ArticleList from '@/components/ArticleList';
import Link from 'next/link';

export default function ArticlesPage() {
  return (
    <AppShell>
      <div className="page-header split article-page-header">
        <div>
          <p className="eyebrow">MON CHIC PARIS · ARTIKEL-DNA</p>
          <h1>Artikel</h1>
          <p>Produkte pflegen, KI-Vorschläge prüfen und Bestand sicher verwalten.</p>
        </div>
        <Link href="/articles/new" className="primary-button">+ Neuen Artikel anlegen</Link>
      </div>
      <ArticleList />
    </AppShell>
  );
}
