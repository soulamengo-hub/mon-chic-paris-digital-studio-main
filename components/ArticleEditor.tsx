'use client';

import { useEffect, useState, type ClipboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { UploadIcon } from './Icons';
import { categories, colorCatalog, styleCatalog, type CategoryName } from '@/lib/catalog';
import { deriveCareInstructions } from '@/lib/care-instructions';
import { deriveDeSize } from '@/lib/size-conversion';
import { uploadProductPhoto, uploadReferencePhoto } from '@/lib/photo-upload';
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
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [uploadingReference, setUploadingReference] = useState(false);

  function reload() {
    return fetch(`/api/products/${id}`, { cache: 'no-store' })
      .then(async response => {
        if (!response.ok) throw new Error(await response.text());
        return response.json() as Promise<ProductRecord>;
      })
      .then(setItem)
      .catch(error => setMessage(error instanceof Error ? error.message : 'Artikel konnte nicht geladen werden.'));
  }

  useEffect(() => { void reload(); }, [id]);

  async function addPhotos(fileList: FileList | null) {
    if (!fileList || !item) return;
    const files = Array.from(fileList).filter(file => file.type.startsWith('image/'));
    const startIndex = item.product_images?.length || 0;
    setUploadingPhotos(true);
    setMessage('');
    try {
      for (let index = 0; index < files.length; index += 1) {
        await uploadProductPhoto(files[index], id, startIndex + index);
      }
      await reload();
      setMessage(`${files.length} Foto(s) hinzugefügt.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Foto-Upload fehlgeschlagen.');
    } finally {
      setUploadingPhotos(false);
    }
  }

  async function setReferencePhoto(file: File | null) {
    if (!file || !item) return;
    setUploadingReference(true);
    setMessage('');
    try {
      const publicUrl = await uploadReferencePhoto(file, id);
      const response = await fetch(`/api/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference_photo_url: publicUrl }),
      });
      if (!response.ok) throw new Error(await response.text());
      setItem(previous => previous ? { ...previous, reference_photo_url: publicUrl } : previous);
      setMessage('Referenzfoto gespeichert.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Referenzfoto-Upload fehlgeschlagen.');
    } finally {
      setUploadingReference(false);
    }
  }

  function handleReferencePhotoPaste(event: ClipboardEvent) {
    const clipboardItem = Array.from(event.clipboardData?.items || []).find(entry => entry.type.startsWith('image/'));
    const file = clipboardItem?.getAsFile();
    if (file) {
      event.preventDefault();
      void setReferencePhoto(file);
    }
  }

  async function removeReferencePhoto() {
    if (!item) return;
    const response = await fetch(`/api/products/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reference_photo_url: null }),
    });
    if (response.ok) setItem(previous => previous ? { ...previous, reference_photo_url: undefined } : previous);
    else setMessage(await response.text());
  }

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
      <label className="upload-zone"><UploadIcon /><span>{uploadingPhotos ? 'Fotos werden hochgeladen …' : 'Weitere Fotos hinzufügen (werden von der KI analysierbar)'}</span><input type="file" accept="image/*" multiple disabled={uploadingPhotos} onChange={event => { void addPhotos(event.target.files); event.target.value = ''; }} /></label>
    </section>
    <section className="capture-card">
      <div className="capture-heading"><div><span className="step-badge">↺</span><h2>Referenzfoto (Lieferant)</h2></div></div>
      <p className="field-help">Katalog-/Lieferantenfoto (z. B. von Remix) — dauerhafte Fotokartei zum Vergleich. Wird NIE von der KI analysiert und zählt nicht als Artikelfoto.</p>
      {item.reference_photo_url
        ? <div className="photo-grid"><article className="photo-preview"><img src={item.reference_photo_url} alt="Referenzfoto" /><div><button type="button" className="remove" onClick={() => void removeReferencePhoto()}>Entfernen</button></div></article></div>
        : <label className="upload-zone" tabIndex={0} onPaste={handleReferencePhotoPaste}><UploadIcon /><span>{uploadingReference ? 'Wird hochgeladen …' : 'Referenzfoto hochladen — oder hier klicken und Bild einfügen (Strg+V)'}</span><input type="file" accept="image/*" disabled={uploadingReference} onChange={event => { void setReferencePhoto(event.target.files?.[0] || null); event.target.value = ''; }} /></label>}
    </section>
    <section className="capture-card">
      <div className="capture-heading"><div><span className="step-badge">2</span><h2>Produktdaten</h2></div></div>
      <div className="form-grid">
        <label>SKU<input value={item.sku} readOnly /><small>Nach dem ersten Speichern unveränderlich.</small></label>
        <label>Status<select value={item.status || 'Entwurf'} onChange={event => update('status', event.target.value)}><option>Entwurf</option><option>Aktiv</option><option>Reserviert</option><option>Verkauft</option><option>Archiv</option></select></label>
        <label>Marke / Designer<input value={item.brand || ''} onChange={event => update('brand', event.target.value)} /></label>
        <label>Kategorie<select value={item.category || ''} onChange={event => { update('category', event.target.value); update('subcategory', ''); }}><option value="">Bitte wählen</option>{Object.keys(categories).map(value => <option key={value}>{value}</option>)}</select></label>
        <label>Unterkategorie<select value={item.subcategory || ''} onChange={event => { const value = event.target.value; setItem(previous => { if (!previous) return previous; const derived = deriveDeSize(previous.size_system, previous.original_size, previous.gender, value); return { ...previous, subcategory: value, ...(derived ? { de_size: derived } : {}) }; }); }} disabled={!item.category}><option value="">{item.category ? 'Bitte wählen' : 'Zuerst Kategorie wählen'}</option>{item.category && categories[item.category as CategoryName]?.map(value => <option key={value}>{value}</option>)}</select></label>
        <label>Saison<select value={item.season || 'Ganzjährig'} onChange={event => update('season', event.target.value)}><option>Ganzjährig</option><option>Frühling</option><option>Sommer</option><option>Herbst</option><option>Winter</option><option>Frühling-Sommer</option><option>Frühling-Herbst</option><option>Herbst-Winter</option></select></label>
        <label>Geschlecht<select value={item.gender || 'Damen'} onChange={event => { const value = event.target.value; setItem(previous => { if (!previous) return previous; const derived = deriveDeSize(previous.size_system, previous.original_size, value, previous.subcategory); return { ...previous, gender: value, ...(derived ? { de_size: derived } : {}) }; }); }}><option>Damen</option><option>Herren</option></select></label>
        <label>Originalgröße<input value={item.original_size || ''} onChange={event => { const value = event.target.value; setItem(previous => { if (!previous) return previous; const derived = deriveDeSize(previous.size_system, value, previous.gender, previous.subcategory); return { ...previous, original_size: value, ...(derived ? { de_size: derived } : {}) }; }); }} /></label>
        <label>Größensystem<select value={item.size_system || 'DE'} onChange={event => { const value = event.target.value; setItem(previous => { if (!previous) return previous; const derived = deriveDeSize(value, previous.original_size, previous.gender, previous.subcategory); return { ...previous, size_system: value, ...(derived ? { de_size: derived } : {}) }; }); }}><option>DE</option><option>FR</option><option>IT</option><option>UK</option><option>US</option><option>One Size</option></select></label>
        <label>DE-Vergleichsgröße<input value={item.de_size || ''} onChange={event => update('de_size', event.target.value)} /><small>Bei FR (Damen) und bei IT/UK/US-Zahlengrößen automatisch berechnet, sonst manuell eintragen.</small></label>
        <label>Internationale Größe<input value={item.international_size || ''} onChange={event => update('international_size', event.target.value)} /></label>
        <label>Hauptfarbe<select value={item.color || ''} onChange={event => update('color', event.target.value)}><option value="">Bitte wählen</option>{colorCatalog.map(c => <option key={c}>{c}</option>)}</select></label>
        <label>Nebenfarbe<select value={item.secondary_color || ''} onChange={event => update('secondary_color', event.target.value)}><option value="">Keine</option>{colorCatalog.map(c => <option key={c}>{c}</option>)}</select></label>
        <label>Farbhinweis (optional)<input value={item.color_note || ''} onChange={event => update('color_note', event.target.value)} placeholder="z. B. Dunkelblau mit roten Streifen" /></label>
        <label>Material<input value={item.material || ''} onChange={event => { const value = event.target.value; setItem(previous => previous ? { ...previous, material: value, care_instructions: previous.care_instructions ? previous.care_instructions : deriveCareInstructions(value) } : previous); }} /></label>
        <label className="full">Pflegehinweise<textarea value={item.care_instructions || ''} onChange={event => update('care_instructions', event.target.value)} placeholder={deriveCareInstructions(item.material) || 'Bitte Pflegeetikett beachten.'} /><small>Regelbasiert aus dem Material abgeleitet, kann angepasst werden.</small></label>
        <label>Muster<input value={item.pattern || ''} onChange={event => update('pattern', event.target.value)} /></label>
        <label>Zustand<select value={item.condition || 'Sehr gut'} onChange={event => update('condition', event.target.value)}><option>Neu mit Etikett</option><option>Neuwertig</option><option>Sehr gut</option><option>Gut</option><option>Akzeptabel</option></select></label>
        <label>Epoche<input value={item.era || ''} onChange={event => update('era', event.target.value)} /></label>
        <label>MON-CHIC-Stilrichtung<select value={item.style_key || ''} onChange={event => update('style_key', event.target.value)}><option value="">Bitte wählen</option>{styleCatalog.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}</select></label>
        <label>Echtheitsstatus<select value={item.authenticity_status || 'Zu prüfen'} onChange={event => update('authenticity_status', event.target.value)}><option>Zu prüfen</option><option>Geprüft</option><option>Authentisch</option><option>Nicht bestätigt</option></select></label>
        <fieldset className="full occasion-fieldset"><legend>Anlässe</legend><div className="occasion-scroll">{occasionGroups.map(group => <section key={group.label} className="occasion-group"><h3>{group.label}</h3><div className="occasion-options">{group.options.map(option => <label key={option} className={`occasion-option${(item.occasions || []).includes(option) ? ' selected' : ''}`}><input type="checkbox" checked={(item.occasions || []).includes(option)} onChange={() => toggleOccasion(option)} /><span>{option}</span></label>)}</div></section>)}</div></fieldset>
        <label>Einkaufspreis (€)<input type="number" min="0" step="0.01" value={item.purchase_price ?? ''} onChange={event => update('purchase_price', event.target.value ? Number(event.target.value) : null)} /><small>Was MON CHIC PARIS für dieses Vintage-Stück bezahlt hat.</small></label>
        <label>Ehemaliger Wert (€)<input type="number" min="0" step="0.01" value={item.original_retail_value ?? ''} onChange={event => update('original_retail_value', event.target.value ? Number(event.target.value) : null)} /><small>Preis beim ursprünglichen Neukauf — als Orientierung für den Verkaufspreis, nicht der heutige Einkaufspreis.</small></label>
        <label>Referenznummer (intern)<input value={item.supplier_reference || ''} onChange={event => update('supplier_reference', event.target.value)} placeholder="z. B. 8912368-1" /></label>
        <label>Artikel-Nr. / Bestellung<input value={item.supplier_order_number || ''} onChange={event => update('supplier_order_number', event.target.value)} placeholder="z. B. 133357183" /></label>
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
