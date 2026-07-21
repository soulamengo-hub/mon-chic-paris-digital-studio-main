'use client';
import { useEffect, useState } from 'react';

type Label = { sku: string; brand: string; subcategory: string; size: string; supplierReference: string; svg: string };

export default function QrLabelSheet() {
  const [labels, setLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [includeAll, setIncludeAll] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError('');
    fetch(`/api/qr-labels?all=${includeAll}`, { cache: 'no-store' })
      .then(response => response.ok ? response.json() : Promise.reject(new Error('Etiketten konnten nicht geladen werden.')))
      .then(setLabels)
      .catch(reason => setError(reason instanceof Error ? reason.message : 'Fehler beim Laden.'))
      .finally(() => setLoading(false));
  }, [includeAll]);

  return <section className="capture-card">
    <div className="capture-heading no-print">
      <div><span className="step-badge">▦</span><h2>QR-Etiketten drucken</h2></div>
      <button className="primary-button" onClick={() => window.print()} disabled={labels.length === 0}>Drucken</button>
    </div>
    <label className="no-print" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
      <input type="checkbox" checked={includeAll} onChange={e => setIncludeAll(e.target.checked)} />
      Auch bereits fotografierte Artikel mit ausdrucken
    </label>
    {loading && <p className="no-print">Etiketten werden geladen …</p>}
    {error && <p className="no-print">{error}</p>}
    {!loading && !error && labels.length === 0 && <p className="no-print">Keine passenden Artikel gefunden — alle Artikel haben bereits Fotos, oder es wurden noch keine Artikel angelegt.</p>}
    {labels.length > 0 && <div className="qr-label-grid">
      {labels.map(label => (
        <div className="qr-label-card" key={label.sku}>
          <div className="qr-label-code" dangerouslySetInnerHTML={{ __html: label.svg }} />
          <div className="qr-label-text">
            <strong>{label.sku}</strong>
            <span>{[label.brand, label.subcategory].filter(Boolean).join(' · ')}</span>
            {label.size && <span>Größe {label.size}</span>}
            {label.supplierReference && <span>Ref. {label.supplierReference}</span>}
          </div>
        </div>
      ))}
    </div>}
  </section>;
}
