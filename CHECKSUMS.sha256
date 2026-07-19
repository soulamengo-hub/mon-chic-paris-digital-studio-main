'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { categories, type CategoryName } from '@/lib/catalog';
import type { ProductRecord } from '@/lib/types';

const warehouseLocations = ['Boutique','Lager A','Lager B','Schaufenster','Fotoshooting','Versand','Qualitätsprüfung','Reinigung','Retouren','Extern','Sonstiges'];

const occasionGroups = [
  { label: 'Beruf & Alltag', options: ['Business', 'Casual', 'Chic'] },
  { label: 'Elegant & festlich', options: ['Abendgarderobe', 'Cocktail', 'Hochzeit', 'Dinner'] },
  { label: 'Reise & Aktiv', options: ['Urlaub', 'Strand', 'Skiurlaub', 'Sportiv', 'Outdoor'] },
  { label: 'Besondere Anlässe', options: ['Trauerfeier', 'Religiöse Feier', 'Weihnachten', 'Silvester'] },
] as const;

export default function ArticleEditor({ id }: { id: string }) {
  const router = useRouter();
  const [item, setItem] = useState<ProductRecord | null>(null);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/products/${id}`, { cache: 'no-store' })
      .then(async response => {
        if (!response.ok) throw new Error(await response.text());
        return response.json() as Promise<ProductRecord>;
      })
      .then(setItem)
      .catch(error => setMessage(error instanceof Error ? error.message : 'Artikel konnte nicht geladen werden.'));
  }, [id]);

  function update(key: keyof ProductRecord, value: unknown) {
    setItem(previous => previous ? { ...previous, [key]: value } : previous);
  }

  function toggleOccasion(value: string) {
    if (!item) return;
    const current = item.occasions || [];
    update('occasions', current.includes(value) ? current.filter(entry => entry !== value) : [...current, value]);
  }

  async function save() {
    if (!item) return;
    setSaving(true);
    setMessage('');
    const response = await fetch(`/api/products/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    setMessage(response.ok ? 'Änderungen wurden gespeichert.' : await response.text());
    setSaving(false);
  }

  async function remove() {
    if (!item) return;
    if (!confirm(`Artikel ${item.sku} und zugehörige Fotos wirklich löschen?`)) return;
    const response = await fetch(`/api/products/${id}`, { method: 'DELETE' });
    if (response.ok) router.push('/articles');
    else setMessage(await response.text());
  }

  if (!item) return <section className="panel empty-state"><h2>{message || 'Artikel wird geladen …'}</h2></section>;

  return <div className="capture-form">
    <section className="capture-card">
      <div className="capture-heading"><div><span className="step-badge">1</span><h2>Fotos</h2></div><span className="photo-count">{item.product_images?.length || 0} Fotos</span></div>
      <div className="photo-grid">{item.product_images?.map((image, index) => <article className="photo-preview" key={image.public_url}><img src={image.public_url} alt={`Foto ${index + 1}`} /></article>)}</div>
    </section>
    <section className="capture-card">
      <div className="capture-heading"><div><span className="step-badge">2</span><h2>Produktdaten</h2></div></div>
      <div className="form-grid">
        <label>SKU<input value={item.sku} readOnly /><small>Nach dem ersten Speichern unveränderlich.</small></label>
        <label>Status<select value={item.status || 'Entwurf'} onChange={event => update('status', event.target.value)}><option>Entwurf</option><option>Aktiv</option><option>Reserviert</option><option>Verkauft</option><option>Archiv</option></select></label>
        <label>Marke / Designer<input value={item.brand || ''} onChange={event => update('brand', event.target.value)} /></label>
        <label>Kategorie<select value={item.category || ''} onChange={event => { update('category', event.target.value); update('subcategory', ''); }}><option value="">Bitte wählen</option>{Object.keys(categories).map(value => <option key={value}>{value}</option>)}</select></label>
        <label>Unterkategorie<select value={item.subcategory || ''} onChange={event => update('subcategory', event.target.value)} disabled={!item.category}><option value="">{item.category ? 'Bitte wählen' : 'Zuerst Kategorie wählen'}</option>{item.category && categories[item.category as CategoryName]?.map(value => <option key={value}>{value}</option>)}</select></label>
        <label>Saison<select value={item.season || 'Ganzjährig'} onChange={event => update('season', event.target.value)}><option>Ganzjährig</option><option>Frühling</option><option>Sommer</option><option>Herbst</option><option>Winter</option></select></label>
        <label>Originalgröße<input value={item.original_size || ''} onChange={event => update('original_size', event.target.value)} /></label>
        <label>Größensystem<select value={item.size_system || 'DE'} onChange={event => update('size_system', event.target.value)}><option>DE</option><option>FR</option><option>IT</option><option>UK</option><option>US</option><option>One Size</option></select></label>
        <label>DE-Vergleichsgröße<input value={item.de_size || ''} onChange={event => update('de_size', event.target.value)} /></label>
        <label>Internationale Größe<input value={item.international_size || ''} onChange={event => update('international_size', event.target.value)} /></label>
        <label>Hauptfarbe<input value={item.color || ''} onChange={event => update('color', event.target.value)} /></label>
        <label>Nebenfarbe<input value={item.secondary_color || ''} onChange={event => update('secondary_color', event.target.value)} /></label>
        <label>Material<input value={item.material || ''} onChange={event => update('material', event.target.value)} /></label>
        <label>Muster<input value={item.pattern || ''} onChange={event => update('pattern', event.target.value)} /></label>
        <label>Zustand<select value={item.condition || 'Sehr gut'} onChange={event => update('condition', event.target.value)}><option>Neu mit Etikett</option><option>Neuwertig</option><option>Sehr gut</option><option>Gut</option><option>Akzeptabel</option></select></label>
        <label>Epoche<input value={item.era || ''} onChange={event => update('era', event.target.value)} /></label>
        <label>MON-CHIC-Stilrichtung<input value={item.style_key || ''} onChange={event => update('style_key', event.target.value)} /></label>
        <label>Echtheitsstatus<select value={item.authenticity_status || 'Zu prüfen'} onChange={event => update('authenticity_status', event.target.value)}><option>Zu prüfen</option><option>Geprüft</option><option>Authentisch</option><option>Nicht bestätigt</option></select></label>
        <fieldset className="full occasion-fieldset"><legend>Anlässe</legend><div className="occasion-scroll">{occasionGroups.map(group => <section key={group.label} className="occasion-group"><h3>{group.label}</h3><div className="occasion-options">{group.options.map(option => <label key={option} className={`occasion-option${(item.occasions || []).includes(option) ? ' selected' : ''}`}><input type="checkbox" checked={(item.occasions || []).includes(option)} onChange={() => toggleOccasion(option)} /><span>{option}</span></label>)}</div></section>)}</div></fieldset>
        <label>Einkaufspreis (€)<input type="number" min="0" step="0.01" value={item.purchase_price ?? ''} onChange={event => update('purchase_price', event.target.value ? Number(event.target.value) : null)} /></label>
        <label>Verkaufspreis (€)<input type="number" min="0" step="0.01" value={item.sale_price ?? ''} onChange={event => update('sale_price', event.target.value ? Number(event.target.value) : null)} /></label>
        <label>Lagerort<select value={item.warehouse_location || ''} onChange={event => update('warehouse_location', event.target.value)}><option value="">Bitte wählen</option>{warehouseLocations.map(value => <option key={value}>{value}</option>)}</select></label>
        <label>Regal<input value={item.warehouse_rack || ''} onChange={event => update('warehouse_rack', event.target.value)} /></label>
        <label>Fach<input value={item.warehouse_shelf || ''} onChange={event => update('warehouse_shelf', event.target.value)} /></label>
        <label>Letzte Inventur<input type="date" value={item.last_inventory_at ? item.last_inventory_at.slice(0,10) : ''} onChange={event => update('last_inventory_at', event.target.value || null)} /></label>
        <label>Letzte Bewegung<input value={item.last_movement_at ? new Date(item.last_movement_at).toLocaleString('de-DE') : 'Noch keine Bewegung erfasst'} readOnly /></label>
        <label className="full">Maße<textarea value={item.measurements || ''} onChange={event => update('measurements', event.target.value)} /></label>
        <label className="full">Besonderheiten / Mängel<textarea value={item.flaws || ''} onChange={event => update('flaws', event.target.value)} /></label>
        <label className="full internal-field">Interne Notizen 🔒<textarea value={item.internal_notes || item.notes || ''} onChange={event => update('internal_notes', event.target.value)} /></label>
      </div>
    </section>
    <div className="save-bar"><button type="button" className="danger-button" onClick={remove}>Artikel löschen</button><button type="button" className="primary-button" onClick={save} disabled={saving}>{saving ? 'Speichert …' : 'Änderungen speichern'}</button></div>
    {message && <div className={`form-message${message.includes('gespeichert') ? ' success' : ''}`}>{message}</div>}
  </div>;
}
