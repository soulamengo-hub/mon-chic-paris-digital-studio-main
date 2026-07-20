'use client';
import { useEffect, useState } from 'react';

type BudgetSummary = { budgetEur: number; spentEur: number; remainingEur: number; percent: number; warning: boolean; blocked: boolean };

export default function AiBudgetPanel() {
  const [budget, setBudget] = useState<BudgetSummary | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/ai/budget', { cache: 'no-store' })
      .then(response => { if (!response.ok) throw new Error('Budget konnte nicht geladen werden.'); return response.json(); })
      .then(setBudget)
      .catch(() => setError('KI-Budget konnte nicht geladen werden. Bitte Supabase-Migration 6.5.7 prüfen.'));
  }, []);

  if (error) return <section className="panel empty-state"><h2>KI-Budget</h2><p>{error}</p></section>;
  if (!budget) return <section className="panel empty-state"><h2>KI-Budget wird geladen …</h2></section>;

  return (
    <section className="capture-card">
      <div className="capture-heading"><div><span className="step-badge">€</span><h2>KI-Budget im laufenden Monat</h2></div></div>
      <div className={`ai-budget-card${budget.warning ? ' warning' : ''}${budget.blocked ? ' blocked' : ''}`}>
        <div>
          <strong>{budget.spentEur.toFixed(2)} € von {budget.budgetEur.toFixed(2)} €</strong>
          <span>Noch {budget.remainingEur.toFixed(2)} € verfügbar in diesem Monat.</span>
        </div>
        <div className="ai-budget-track"><span style={{ width: `${budget.percent}%` }} /></div>
        {budget.blocked && <small>Das Monatsbudget ist erreicht. Weitere KI-Analysen sind erst im nächsten Monat wieder automatisch möglich.</small>}
        {!budget.blocked && budget.warning && <small>Achtung: Eine der Warnstufen (15 €, 20 € oder 23 €) wurde bereits erreicht.</small>}
      </div>
      <p className="field-help">Zählt jeden erfolgreichen Aufruf von „Alle Fotos analysieren". Geöffnete oder bearbeitete Artikel lösen keine KI-Kosten aus.</p>
    </section>
  );
}
