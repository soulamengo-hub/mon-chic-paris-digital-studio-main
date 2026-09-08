import AppShell from '@/components/AppShell';
import Link from 'next/link';

export default function Page() {
  return (
    <AppShell>
      <div className="page-header">
        <div>
          <p className="eyebrow">MON CHIC PARIS · CONTENT MARKETING</p>
          <h1>Content Studio</h1>
          <p>
            Social-Media-Content zentral erstellen, organisieren und verwalten.
          </p>
        </div>

        <Link
          href="/content-studio/new"
          className="primary-button"
        >
          + Content erstellen
        </Link>
      </div>

      <section className="content-studio-stats">
        <div className="content-stat-card">
          <span>Entwürfe</span>
          <strong>0</strong>
          <small>In Bearbeitung</small>
        </div>

        <div className="content-stat-card">
          <span>Geplant</span>
          <strong>0</strong>
          <small>Zur Veröffentlichung</small>
        </div>

        <div className="content-stat-card">
          <span>Veröffentlicht</span>
          <strong>0</strong>
          <small>Beiträge</small>
        </div>
      </section>

      <section className="content-studio-panel">
        <div className="content-studio-panel-header">
          <div>
            <h2>Meine Inhalte</h2>
            <p>Beiträge für deine Social-Media-Kanäle verwalten.</p>
          </div>

          <div className="content-channel-filters">
            <button type="button" className="active">
              Alle
            </button>

            <button type="button">
              Instagram
            </button>

            <button type="button">
              Facebook
            </button>

            <button type="button">
              Pinterest
            </button>
          </div>
        </div>

        <div className="content-empty-state">
          <div className="content-empty-icon">✦</div>

          <h3>Noch keine Inhalte vorhanden</h3>

          <p>
            Erstelle deinen ersten Beitrag aus einem vorhandenen Artikel
            oder beginne mit einem neuen Content-Entwurf.
          </p>

          <Link
            href="/content-studio/new"
            className="primary-button"
          >
            + Ersten Content erstellen
          </Link>
        </div>
      </section>
    </AppShell>
  );
}