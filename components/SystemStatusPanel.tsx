'use client';
import { useEffect, useState } from 'react';

type Status = {
  appVersion: string;
  nodeVersion: string;
  supabase: { ok: boolean; detail: string };
  openai: { configured: boolean; model: string };
  checkedAt: string;
};

export default function SystemStatusPanel() {
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState('');

  function load() {
    setError('');
    fetch('/api/system-status', { cache: 'no-store' })
      .then(response => response.ok ? response.json() : Promise.reject(new Error('Systemstatus konnte nicht geladen werden.')))
      .then(setStatus)
      .catch(reason => setError(reason instanceof Error ? reason.message : 'Fehler beim Laden.'));
  }

  useEffect(() => { load(); }, []);

  if (error) return <section className="panel empty-state"><h2>Systemstatus</h2><p>{error}</p></section>;
  if (!status) return <section className="panel empty-state"><h2>Systemstatus wird geladen …</h2></section>;

  return <section className="capture-card">
    <div className="capture-heading"><div><span className="step-badge">i</span><h2>Systemstatus</h2></div>
      <button className="secondary-button" onClick={load}>Aktualisieren</button>
    </div>
    <div className="status-grid">
      <div className="status-row"><span>App-Version</span><strong>{status.appVersion}</strong></div>
      <div className="status-row"><span>Node.js (Serverfunktion)</span><strong>{status.nodeVersion}</strong></div>
      <div className="status-row">
        <span>Supabase-Verbindung</span>
        <strong className={status.supabase.ok ? 'quality-good' : 'quality-open'}>{status.supabase.ok ? '● Verbunden' : '● Fehler'}</strong>
      </div>
      {!status.supabase.ok && <p className="field-help">{status.supabase.detail}</p>}
      <div className="status-row">
        <span>OpenAI-Zugang</span>
        <strong className={status.openai.configured ? 'quality-good' : 'quality-open'}>{status.openai.configured ? `● Eingerichtet (${status.openai.model})` : '● Nicht eingerichtet'}</strong>
      </div>
    </div>
    <p className="field-help">Zuletzt geprüft: {new Date(status.checkedAt).toLocaleString('de-DE')}</p>
  </section>;
}
