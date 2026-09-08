'use client';

import { useEffect, useMemo, useState } from 'react';

type Label = {
  sku: string;
  brand: string;
  category: string;
  subcategory: string;
  size: string;
  color: string;
  season: string;
  supplierReference: string;
  svg: string;
};

function valueOrDash(value: string) {
  return value?.trim() ? value : '—';
}

function LabelCard({ label }: { label: Label }) {
  return (
    <div className="qr-label-card">
      <div
        className="qr-label-code"
        dangerouslySetInnerHTML={{ __html: label.svg }}
      />

      <div className="qr-label-text">
        <span className="qr-label-brand-footer">MON CHIC PARIS</span>
        <strong className="qr-label-sku">{label.sku}</strong>

        <span className="qr-label-size">
          <b>Marke:</b> {valueOrDash(label.brand)}
        </span>

        <span className="qr-label-size">
          <b>Kategorie:</b> {valueOrDash(label.category)}
        </span>

        <span className="qr-label-size">
          <b>Unterkategorie:</b> {valueOrDash(label.subcategory)}
        </span>

        <span className="qr-label-size">
          <b>Größe:</b> {valueOrDash(label.size)}
        </span>

        <span className="qr-label-size">
          <b>Farbe:</b> {valueOrDash(label.color)}
        </span>

        <span className="qr-label-size">
          <b>Saison:</b> {valueOrDash(label.season)}
        </span>
      </div>
    </div>
  );
}

export default function QrLabelSheet() {
  const [labels, setLabels] = useState<Label[]>([]);
  const [selectedSkus, setSelectedSkus] = useState<Set<string>>(new Set());
  const [singleLabel, setSingleLabel] = useState<Label | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [includeAll, setIncludeAll] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadLabels() {
      setLoading(true);
      setError('');

      try {
        const response = await fetch(`/api/qr-labels?all=${includeAll}`, {
          cache: 'no-store',
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(text || 'Etiketten konnten nicht geladen werden.');
        }

        const data = (await response.json()) as Label[];
        if (cancelled) return;

        setLabels(data);
        setSelectedSkus(new Set());
      } catch (reason) {
        if (cancelled) return;
        setLabels([]);
        setSelectedSkus(new Set());
        setError(
          reason instanceof Error ? reason.message : 'Fehler beim Laden.',
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadLabels();

    return () => {
      cancelled = true;
    };
  }, [includeAll]);

  const filteredLabels = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase('de');

    if (!needle) return labels;

    return labels.filter(label => {
      const haystack = [
        label.sku,
        label.brand,
        label.category,
        label.subcategory,
        label.size,
        label.color,
        label.season,
        label.supplierReference,
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('de');

      return haystack.includes(needle);
    });
  }, [labels, search]);

  const selectedLabels = useMemo(
    () => labels.filter(label => selectedSkus.has(label.sku)),
    [labels, selectedSkus],
  );

  const allVisibleSelected =
    filteredLabels.length > 0 &&
    filteredLabels.every(label => selectedSkus.has(label.sku));

  function toggleLabel(sku: string) {
    setSelectedSkus(current => {
      const next = new Set(current);

      if (next.has(sku)) next.delete(sku);
      else next.add(sku);

      return next;
    });
  }

  function selectAllVisible() {
    setSelectedSkus(current => {
      const next = new Set(current);
      filteredLabels.forEach(label => next.add(label.sku));
      return next;
    });
  }

  function clearSelection() {
    setSelectedSkus(new Set());
  }

  function cleanupSinglePrint() {
    document.body.removeAttribute('data-label-print-mode');
    document.getElementById('single-label-page-style')?.remove();
    setSingleLabel(null);
  }

  function printA4() {
    if (selectedLabels.length === 0) return;

    document.body.removeAttribute('data-label-print-mode');
    document.getElementById('single-label-page-style')?.remove();
    setSingleLabel(null);

    requestAnimationFrame(() => window.print());
  }

  function printSingle(label: Label) {
    setSingleLabel(label);

    document.getElementById('single-label-page-style')?.remove();

    const pageStyle = document.createElement('style');
    pageStyle.id = 'single-label-page-style';
    pageStyle.textContent = '@page { size: 50mm 30mm; margin: 0; }';
    document.head.appendChild(pageStyle);

    document.body.setAttribute('data-label-print-mode', 'single');

    const handleAfterPrint = () => {
      cleanupSinglePrint();
      window.removeEventListener('afterprint', handleAfterPrint);
    };

    window.addEventListener('afterprint', handleAfterPrint);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.print();
      });
    });
  }

  return (
    <section className="capture-card qr-label-module">
      <div className="capture-heading no-print qr-label-heading">
        <div>
          <span className="step-badge">▦</span>

          <div>
            <h2>QR-Etiketten drucken</h2>
            <p className="qr-label-subtitle">
              50 × 30 mm · 36 Etiketten pro A4
            </p>
          </div>
        </div>

        <div className="qr-label-heading-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => window.history.back()}
          >
            Abbrechen
          </button>

          <button
            type="button"
            className="primary-button"
            onClick={printA4}
            disabled={selectedLabels.length === 0}
          >
            DIN A4 drucken
          </button>
        </div>
      </div>

      <div className="qr-label-search no-print">
        <span aria-hidden="true">⌕</span>
        <input
          type="search"
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder="Etikett suchen: SKU, Marke, Kategorie, Unterkategorie, Größe, Farbe oder Saison"
          aria-label="Etiketten suchen"
        />

        {search && (
          <button
            type="button"
            className="qr-label-search-clear"
            onClick={() => setSearch('')}
          >
            Suche löschen
          </button>
        )}
      </div>

      <div className="qr-label-toolbar no-print">
        <label className="qr-label-filter">
          <input
            type="checkbox"
            checked={includeAll}
            onChange={event => setIncludeAll(event.target.checked)}
          />

          <span>Auch bereits fotografierte Artikel anzeigen</span>
        </label>

        <div className="qr-label-selection-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={selectAllVisible}
            disabled={filteredLabels.length === 0 || allVisibleSelected}
          >
            Sichtbare auswählen
          </button>

          <button
            type="button"
            className="secondary-button"
            onClick={clearSelection}
            disabled={selectedSkus.size === 0}
          >
            Auswahl aufheben
          </button>
        </div>

        <div className="qr-label-count">
          <strong>{selectedLabels.length}</strong>
          <span>
            ausgewählt · {filteredLabels.length} von {labels.length} sichtbar
          </span>
        </div>
      </div>

      {loading && (
        <p className="no-print qr-label-message">
          Etiketten werden geladen …
        </p>
      )}

      {error && (
        <p className="no-print qr-label-message qr-label-message-error">
          {error}
        </p>
      )}

      {!loading && !error && labels.length === 0 && (
        <p className="no-print qr-label-message">
          Keine passenden Artikel gefunden.
        </p>
      )}

      {!loading &&
        !error &&
        labels.length > 0 &&
        filteredLabels.length === 0 && (
          <p className="no-print qr-label-message">
            Für „{search}“ wurde kein Etikett gefunden.
          </p>
        )}

      {filteredLabels.length > 0 && (
        <div className="qr-label-screen-grid no-print">
          {filteredLabels.map(label => {
            const checked = selectedSkus.has(label.sku);

            return (
              <article
                className={`qr-label-preview ${
                  checked ? 'is-selected' : ''
                }`}
                key={label.sku}
              >
                <label className="qr-label-preview-select">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleLabel(label.sku)}
                  />

                  <span>{checked ? 'Ausgewählt' : 'Auswählen'}</span>
                </label>

                <LabelCard label={label} />

                <button
                  type="button"
                  className="qr-label-single-button"
                  onClick={() => printSingle(label)}
                >
                  1 Etikett drucken
                </button>
              </article>
            );
          })}
        </div>
      )}

      <div className="qr-label-print-sheet">
        {selectedLabels.map(label => (
          <LabelCard key={label.sku} label={label} />
        ))}
      </div>

      <div className="qr-label-single-print" aria-hidden="true">
        {singleLabel && <LabelCard label={singleLabel} />}
      </div>
    </section>
  );
}
