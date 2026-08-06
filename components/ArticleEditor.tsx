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

type AiDraft = Partial<ProductRecord> & { confidence?: Record<string, number> };
type AiBudget = { budgetEur: number; spentEur: number; remainingEur: number; percent: number; warning: boolean; blocked: boolean };
type AiUsage = { inputTokens: number; outputTokens: number; estimatedCostEur: number };

const aiFields: Array<{ key: keyof ProductRecord; label: string }> = [
  { key: 'brand', label: 'Marke' }, { key: 'origin', label: 'Herkunft' },
  { key: 'category', label: 'Kategorie' },
  { key: 'subcategory', label: 'Unterkategorie' }, { key: 'color', label: 'Hauptfarbe' },
  { key: 'secondary_color', label: 'Nebenfarbe' }, { key: 'color_note', label: 'Farbhinweis' },
  { key: 'material', label: 'Material' },
  { key: 'pattern', label: 'Muster' }, { key: 'condition', label: 'Zustand' },
  { key: 'season', label: 'Saison' }, { key: 'original_size', label: 'Originalgröße' },
  { key: 'size_system', label: 'Größensystem' }, { key: 'de_size', label: 'DE-Größe' },
  { key: 'international_size', label: 'Internationale Größe' }, { key: 'era', label: 'Epoche' },
  { key: 'style_key', label: 'Stilrichtung' }, { key: 'measurements', label: 'Maße' },
  { key: 'flaws', label: 'Mängel' }, { key: 'notes', label: 'Weitere Eigenschaften' },
  { key: 'public_description', label: 'Artikelbeschreibung' },
];

export default function ArticleEditor({ id }: { id: string }) {
  const router = useRouter();
  const [item, setItem] = useState<ProductRecord | null>(null);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [uploadingReference, setUploadingReference] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiDraft, setAiDraft] = useState<AiDraft | null>(null);
  const [aiBudget, setAiBudget] = useState<AiBudget | null>(null);
  const [aiUsage, setAiUsage] = useState<AiUsage | null>(null);

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

  useEffect(() => {
    fetch('/api/ai/budget', { cache: 'no-store' })
      .then(response => response.ok ? response.json() : null)
      .then(data => { if (data) setAiBudget(data); })
      .catch(() => {});
  }, []);

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

  async function photoUrlToAnalysisDataUrl(url: string) {
    const response = await fetch(url);
    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob);
    const maxEdge = 1200;
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Bild konnte nicht für die Analyse vorbereitet werden.');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return canvas.toDataURL('image/jpeg', 0.78);
  }

  async function analyzeAllPhotos() {
    if (!item || !item.product_images?.length) {
      setMessage('Für die Analyse werden Fotos benötigt. Bitte zuerst Fotos hochladen.');
      return;
    }
    setAnalyzing(true);
    setMessage('');
    try {
      const images = item.product_images.slice(0, 9);
      const imageDataUrls = await Promise.all(images.map(image => photoUrlToAnalysisDataUrl(image.public_url)));
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageDataUrls }),
      });
      const result = await response.json();
      if (result.budget) setAiBudget(result.budget);
      if (!response.ok) throw new Error(result.error || 'KI-Analyse fehlgeschlagen.');
      if (result.usage) setAiUsage(result.usage);
      setAiDraft({
        brand: result.brand, origin: result.origin, category: result.category, subcategory: result.subcategory,
        color: result.color, secondary_color: result.secondary_color, color_note: result.color_note,
        material: result.material, pattern: result.pattern, condition: result.condition, season: result.season,
        original_size: result.original_size, size_system: result.size_system, de_size: result.de_size,
        international_size: result.international_size, era: result.era, style_key: result.style_key,
        occasions: result.occasions, measurements: result.measurements, flaws: result.flaws, notes: result.notes,
        public_description: result.public_description,
        confidence: result.confidence,
      });
      setMessage(`KI-Analyse von ${result.image_count || images.length} Foto(s) abgeschlossen. Vorschläge bitte prüfen.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'KI-Analyse fehlgeschlagen.');
    } finally {
      setAnalyzing(false);
    }
  }

  function applyAiField(key: keyof ProductRecord) {
    if (!aiDraft) return;
    const value = aiDraft[key];
    if (value === undefined || value === null) return;
    if (key === 'material' && typeof value === 'string') {
      setItem(previous => previous ? { ...previous, material: value, care_instructions: previous.care_instructions ? previous.care_instructions : deriveCareInstructions(value) } : previous);
      return;
    }
    if (key === 'subcategory' && typeof value === 'string') {
      const inferredCategory = Object.entries(categories).find(([, values]) => (values as readonly string[]).includes(value))?.[0];
      setItem(previous => {
        if (!previous) return previous;
        const derived = deriveDeSize(previous.size_system, previous.original_size, previous.gender, value);
        return { ...previous, subcategory: value, ...(inferredCategory ? { category: inferredCategory } : {}), ...(derived ? { de_size: derived } : {}) };
      });
      return;
    }
    update(key, value);
  }

  function applyAllAiSuggestions() {
    if (!aiDraft) return;
    const { confidence: _confidence, ...suggestions } = aiDraft;
    const validSuggestions = Object.fromEntries(Object.entries(suggestions).filter(([, value]) => value !== undefined && value !== null && value !== ''));
    const subcategory = typeof suggestions.subcategory === 'string' ? suggestions.subcategory : '';
    const inferredCategory = subcategory ? Object.entries(categories).find(([, values]) => (values as readonly string[]).includes(subcategory))?.[0] : undefined;
    const materialSuggestion = typeof suggestions.material === 'string' ? suggestions.material : undefined;
    setItem(previous => {
      if (!previous) return previous;
      const nextSizeSystem = typeof suggestions.size_system === 'string' ? suggestions.size_system : previous.size_system;
      const nextOriginalSize = typeof suggestions.original_size === 'string' ? suggestions.original_size : previous.original_size;
      const derived = deriveDeSize(nextSizeSystem, nextOriginalSize, previous.gender, subcategory || previous.subcategory);
      return {
        ...previous,
        ...validSuggestions,
        ...(inferredCategory ? { category: inferredCategory } : {}),
        ...(materialSuggestion ? { care_instructions: previous.care_instructions ? previous.care_instructions : deriveCareInstructions(materialSuggestion) } : {}),
        ...(derived ? { de_size: derived } : {}),
      } as ProductRecord;
    });
    setMessage('KI-Vorschläge wurden übernommen. Bitte vor dem Speichern prüfen.');
  }

  function confidenceLabel(key: string) {
    const value = aiDraft?.confidence?.[key];
    if (value === undefined) return 'Nicht bewertet';
    if (value >= 0.9) return `Sehr sicher · ${Math.round(value * 100)} %`;
    if (value >= 0.7) return `Prüfen · ${Math.round(value * 100)} %`;
    return `Unsicher · ${Math.round(value * 100)} %`;
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
      <div className="capture-heading capture-heading--major"><div className="capture-heading-main"><span className="step-badge">1.</span><h2>Fotos</h2></div><span className="photo-count">{item.product_images?.length || 0} Fotos</span></div>
      <div className="photo-grid">{item.product_images?.map((image, index) => <article className="photo-preview" key={image.public_url}><img src={image.public_url} alt={`Foto ${index + 1}`} /></article>)}</div>
      <label className="upload-zone"><UploadIcon /><span>{uploadingPhotos ? 'Fotos werden hochgeladen …' : 'Weitere Fotos hinzufügen (werden von der KI analysierbar)'}</span><input type="file" accept="image/*" multiple disabled={uploadingPhotos} onChange={event => { void addPhotos(event.target.files); event.target.value = ''; }} /></label>
    </section>

    <section className="capture-card">
      <div className="capture-heading capture-heading--major"><div className="capture-heading-main"><span className="step-badge plain">✦</span><h2>KI-Analyse</h2></div><button type="button" className="ai-analysis-button" onClick={analyzeAllPhotos} disabled={analyzing || !item.product_images?.length || Boolean(aiBudget?.blocked)}>{analyzing ? 'KI analysiert …' : aiBudget?.blocked ? 'KI-Budget erreicht' : '✦ Alle Fotos analysieren'}</button></div>
      <p className="field-help">Analysiert die bereits hochgeladenen Artikelfotos. Nichts wird automatisch gespeichert — Vorschläge müssen einzeln oder gesammelt übernommen und vor dem Speichern geprüft werden. Die SKU bleibt in jedem Fall unverändert.</p>
      {aiBudget && <div className={`ai-budget-card${aiBudget.warning ? ' warning' : ''}${aiBudget.blocked ? ' blocked' : ''}`}>
        <div><strong>KI-Budget im laufenden Monat</strong><span>{aiBudget.spentEur.toFixed(3)} € von {aiBudget.budgetEur.toFixed(2)} € · noch {aiBudget.remainingEur.toFixed(2)} €</span></div>
        <div className="ai-budget-track"><span style={{width: `${aiBudget.percent}%`}} /></div>
        {aiUsage && <small>Letzte Analyse: ca. {aiUsage.estimatedCostEur.toFixed(4)} € · {aiUsage.inputTokens + aiUsage.outputTokens} Tokens</small>}
      </div>}
      {aiDraft && <section className="ai-draft-panel">
        <div className="ai-draft-heading"><div><strong>Mon Chic AI – Vorschläge</strong><span>Nichts wird automatisch gespeichert.</span></div><button type="button" className="secondary-button" onClick={applyAllAiSuggestions}>Alle übernehmen</button></div>
        <div className="ai-suggestion-grid">
          {aiFields.filter(fieldItem => { const value = aiDraft[fieldItem.key]; return value !== undefined && value !== null && value !== ''; }).map(fieldItem => (
            <article key={fieldItem.key} className="ai-suggestion">
              <div><small>{fieldItem.label}</small><strong>{Array.isArray(aiDraft[fieldItem.key]) ? (aiDraft[fieldItem.key] as string[]).join(', ') : String(aiDraft[fieldItem.key])}</strong><span>{confidenceLabel(String(fieldItem.key))}</span></div>
              <button type="button" onClick={() => applyAiField(fieldItem.key)}>Übernehmen</button>
            </article>
          ))}
        </div>
      </section>}
    </section>

    <section className="capture-card" style={{maxWidth: 340}}>
      <div className="capture-heading capture-heading--major"><div className="capture-heading-main"><span className="step-badge plain">↺</span><h2>Referenzfoto</h2></div></div>
      <p className="field-help">Katalog-/Lieferantenfoto — dauerhafte Fotokartei zum Vergleich. Wird NIE von der KI analysiert.</p>
      {item.reference_photo_url
        ? <div className="reference-photo-row">
            <div className="reference-photo-thumb"><img src={item.reference_photo_url} alt="Referenzfoto" /></div>
            <div className="reference-photo-info"><strong>Vorhanden</strong><button type="button" className="remove-link" onClick={() => void removeReferencePhoto()}>Entfernen</button></div>
          </div>
        : <label className="reference-photo-row" tabIndex={0} onPaste={handleReferencePhotoPaste}>
            <span className="reference-upload-mini"><UploadIcon /></span>
            <span className="reference-photo-info"><strong>{uploadingReference ? 'Wird hochgeladen …' : 'Hochladen'}</strong>Klicken oder Strg+V</span>
            <input type="file" accept="image/*" disabled={uploadingReference} onChange={event => { void setReferencePhoto(event.target.files?.[0] || null); event.target.value = ''; }} style={{display:'none'}} />
          </label>}
    </section>

    <section className="capture-card">
      <div className="capture-heading capture-heading--major"><div className="capture-heading-main"><span className="step-badge">2.</span><h2>Produktdaten</h2></div></div>

      <div className="subcard">
        <div className="subcard-header">
          <div className="subcard-header-left">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M8 4v5"/></svg>
            <h3>Basisdaten</h3>
          </div>
          <span className={`status-badge status-${item.status || 'Entwurf'}`}>{item.status || 'Entwurf'}</span>
        </div>
        <div className="form-grid">
          <label>SKU<input value={item.sku} readOnly /><small>Nach dem ersten Speichern unveränderlich.</small></label>
          <label>Status<select value={item.status || 'Entwurf'} onChange={event => update('status', event.target.value)}><option>Entwurf</option><option>Aktiv</option><option>Reserviert</option><option>Verkauft</option><option>Archiv</option></select></label>
          <label>Marke / Designer<input value={item.brand || ''} onChange={event => update('brand', event.target.value)} /></label>
          <label>Herkunft<input value={item.origin || ''} onChange={event => update('origin', event.target.value)} placeholder="z. B. Frankreich" /></label>
          <label>Kategorie<select value={item.category || ''} onChange={event => { update('category', event.target.value); update('subcategory', ''); }}><option value="">Bitte wählen</option>{Object.keys(categories).map(value => <option key={value}>{value}</option>)}</select></label>
          <label>Unterkategorie<select value={item.subcategory || ''} onChange={event => { const value = event.target.value; setItem(previous => { if (!previous) return previous; const derived = deriveDeSize(previous.size_system, previous.original_size, previous.gender, value); return { ...previous, subcategory: value, ...(derived ? { de_size: derived } : {}) }; }); }} disabled={!item.category}><option value="">{item.category ? 'Bitte wählen' : 'Zuerst Kategorie wählen'}</option>{item.category && categories[item.category as CategoryName]?.map(value => <option key={value}>{value}</option>)}</select></label>
          <label>Saison<select value={item.season || 'Ganzjährig'} onChange={event => update('season', event.target.value)}><option>Ganzjährig</option><option>Frühling</option><option>Sommer</option><option>Herbst</option><option>Winter</option><option>Frühling-Sommer</option><option>Frühling-Herbst</option><option>Herbst-Winter</option></select></label>
          <label>Geschlecht<select value={item.gender || 'Damen'} onChange={event => { const value = event.target.value; setItem(previous => { if (!previous) return previous; const derived = deriveDeSize(previous.size_system, previous.original_size, value, previous.subcategory); return { ...previous, gender: value, ...(derived ? { de_size: derived } : {}) }; }); }}><option>Damen</option><option>Herren</option></select></label>
        </div>
      </div>

      <div className="subcard">
        <div className="subcard-header">
          <div className="subcard-header-left">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 6h16M4 12h16M4 18h10"/></svg>
            <h3>Beschreibung</h3>
          </div>
        </div>
        <div className="form-grid">
          <label className="full">Artikelbeschreibung<textarea value={item.public_description || ''} onChange={event => update('public_description', event.target.value)} placeholder="Fließtext für Website/Schaufenster" /><small>Öffentlich sichtbar für Kunden.</small></label>
          <label className="full">Weitere Eigenschaften<textarea value={item.notes || ''} onChange={event => update('notes', event.target.value)} placeholder="z. B. Applikation am Kragen, Innenfutter aus Seide" /><small>Verkaufsfördernde Details, ebenfalls öffentlich sichtbar.</small></label>
        </div>
      </div>

      <div className="subcard">
        <div className="subcard-header">
          <div className="subcard-header-left">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 8h16M4 8v8M20 8v8M4 16h16M8 8v3M12 8v3M16 8v3"/></svg>
            <h3>Größe</h3>
          </div>
        </div>
        <div className="form-grid">
          <label>Vintage Größe Etikette<input value={item.original_size || ''} onChange={event => { const value = event.target.value; setItem(previous => { if (!previous) return previous; const derived = deriveDeSize(previous.size_system, value, previous.gender, previous.subcategory); return { ...previous, original_size: value, ...(derived ? { de_size: derived } : {}) }; }); }} /></label>
          <label>Größensystem<select value={item.size_system || 'DE'} onChange={event => { const value = event.target.value; setItem(previous => { if (!previous) return previous; const derived = deriveDeSize(value, previous.original_size, previous.gender, previous.subcategory); return { ...previous, size_system: value, ...(derived ? { de_size: derived } : {}) }; }); }}><option>DE</option><option>FR</option><option>IT</option><option>UK</option><option>US</option><option>One Size</option></select></label>
          <label>Reale Größe heute<input value={item.de_size || ''} onChange={event => update('de_size', event.target.value)} /><small>Bei FR (Damen) und bei IT/UK/US-Zahlengrößen automatisch berechnet, sonst manuell eintragen.</small></label>
          <label>Internationale Größe<input value={item.international_size || ''} onChange={event => update('international_size', event.target.value)} /></label>
          <label>Passform<select value={item.fit || ''} onChange={event => update('fit', event.target.value)}><option value="">Standard (kein Hinweis)</option><option>Fällt kleiner aus</option><option>Fällt größer aus</option></select></label>
        </div>
      </div>

      <div className="subcard">
        <div className="subcard-header">
          <div className="subcard-header-left">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="13.5" cy="6.5" r="2.5"/><circle cx="19" cy="13" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="10" cy="19" r="2.5"/></svg>
            <h3>Farbe</h3>
          </div>
        </div>
        <div className="form-grid">
          <label>Hauptfarbe<select value={item.color || ''} onChange={event => update('color', event.target.value)}><option value="">Bitte wählen</option>{colorCatalog.map(c => <option key={c}>{c}</option>)}</select></label>
          <label>Nebenfarbe<select value={item.secondary_color || ''} onChange={event => update('secondary_color', event.target.value)}><option value="">Keine</option>{colorCatalog.map(c => <option key={c}>{c}</option>)}</select></label>
          <label>Farbhinweis (optional)<input value={item.color_note || ''} onChange={event => update('color_note', event.target.value)} placeholder="z. B. Dunkelblau mit roten Streifen" /></label>
        </div>
      </div>

      <div className="subcard">
        <div className="subcard-header">
          <div className="subcard-header-left">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 3h18v18H3z"/><path d="M8 3v18M3 8h5"/></svg>
            <h3>Maße & Notizen</h3>
          </div>
        </div>
        <div className="form-grid">
          <label className="full">Maße<textarea value={item.measurements || ''} onChange={event => update('measurements', event.target.value)} /></label>
          <label className="full">Besonderheiten / Mängel<textarea value={item.flaws || ''} onChange={event => update('flaws', event.target.value)} /></label>
          <label className="full internal-field">Interne Notizen 🔒<textarea value={item.internal_notes || ''} onChange={event => update('internal_notes', event.target.value)} /></label>
        </div>
      </div>

      <div className="subcard">
        <div className="subcard-header">
          <div className="subcard-header-left">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 2l3 7h7l-5.5 4.5L18.5 21 12 16.5 5.5 21l2-7.5L2 9h7z"/></svg>
            <h3>Zustand & Herkunft-Details</h3>
          </div>
        </div>
        <div className="form-grid">
          <label>Zustand<select value={item.condition || 'Sehr gut'} onChange={event => update('condition', event.target.value)}><option>Neu mit Etikett</option><option>Neuwertig</option><option>Sehr gut</option><option>Gut</option><option>Akzeptabel</option></select></label>
          <label className="internal-field">Echtheitsstatus 🔒<select value={item.authenticity_status || 'Zu prüfen'} onChange={event => update('authenticity_status', event.target.value)}><option>Zu prüfen</option><option>Geprüft</option><option>Authentisch</option><option>Nicht bestätigt</option></select></label>
          <label>Epoche<input value={item.era || ''} onChange={event => update('era', event.target.value)} placeholder="z. B. 1970er" /></label>
        </div>
      </div>

      <div className="subcard">
        <div className="subcard-header">
          <div className="subcard-header-left">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M9 4c0-1 1-2 3-2s3 1 3 2c0 1-1 1.5-1 2.5s1 1.5 1 2.5c-2 1-4 1-6 0 0-1 1-1.5 1-2.5s-1-1.5-1-2.5zM7 10c-1 3-1 6 1 8.5 1 1.5 2.5 2 4 2s3-.5 4-2c2-2.5 2-5.5 1-8.5M12 20v2"/></svg>
            <h3>Stilrichtung</h3>
          </div>
        </div>
        <div className="form-grid">
          <label>MON-CHIC-Stilrichtung<select value={item.style_key || ''} onChange={event => update('style_key', event.target.value)}><option value="">Bitte wählen</option>{styleCatalog.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}</select></label>
        </div>
      </div>

      <div className="subcard">
        <div className="subcard-header">
          <div className="subcard-header-left">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 6L9 17l-5-5"/></svg>
            <h3>Anlässe</h3>
          </div>
        </div>
        <fieldset className="occasion-fieldset"><div className="occasion-scroll">{occasionGroups.map(group => <section key={group.label} className="occasion-group"><h3>{group.label}</h3><div className="occasion-options">{group.options.map(option => <label key={option} className={`occasion-option${(item.occasions || []).includes(option) ? ' selected' : ''}`}><input type="checkbox" checked={(item.occasions || []).includes(option)} onChange={() => toggleOccasion(option)} /><span>{option}</span></label>)}</div></section>)}</div></fieldset>
      </div>

      <div className="subcard">
        <div className="subcard-header">
          <div className="subcard-header-left">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 4h16v4H4zM4 12h16M4 20h10"/></svg>
            <h3>Material & Pflege</h3>
          </div>
        </div>
        <div className="form-grid">
          <label>Material<input value={item.material || ''} onChange={event => { const value = event.target.value; setItem(previous => previous ? { ...previous, material: value, care_instructions: previous.care_instructions ? previous.care_instructions : deriveCareInstructions(value) } : previous); }} /></label>
          <label>Muster<input value={item.pattern || ''} onChange={event => update('pattern', event.target.value)} /></label>
          <label className="full">Pflegehinweise<textarea value={item.care_instructions || ''} onChange={event => update('care_instructions', event.target.value)} placeholder={deriveCareInstructions(item.material) || 'Bitte Pflegeetikett beachten.'} /><small>Regelbasiert aus dem Material abgeleitet, kann angepasst werden.</small></label>
        </div>
      </div>
    </section>

    <section className="capture-card">
      <div className="capture-heading capture-heading--major"><div className="capture-heading-main"><span className="step-badge">3.</span><h2>Preise</h2></div></div>
      <div className="form-grid">
        <label>Verkaufspreis (€)<input type="number" min="0" step="0.01" value={item.sale_price ?? ''} onChange={event => update('sale_price', event.target.value ? Number(event.target.value) : null)} /></label>
        <div />
        <label className="internal-field">Einkaufspreis 🔒 (€)<input type="number" min="0" step="0.01" value={item.purchase_price ?? ''} onChange={event => update('purchase_price', event.target.value ? Number(event.target.value) : null)} /><small>Was MON CHIC PARIS für dieses Vintage-Stück bezahlt hat.</small></label>
        <label className="internal-field">Ehemaliger Wert 🔒 (€)<input type="number" min="0" step="0.01" value={item.original_retail_value ?? ''} onChange={event => update('original_retail_value', event.target.value ? Number(event.target.value) : null)} /><small>Preis beim ursprünglichen Neukauf.</small></label>
      </div>
    </section>

    <section className="capture-card">
      <div className="capture-heading capture-heading--major"><div className="capture-heading-main"><span className="step-badge">4.</span><h2>Referenzen & Bestellung</h2></div></div>
      <div className="form-grid">
        <label>Referenznummer (intern)<input value={item.supplier_reference || ''} onChange={event => update('supplier_reference', event.target.value)} placeholder="z. B. 8912368-1" /></label>
        <label>Artikel-Nr. / Bestellung<input value={item.supplier_order_number || ''} onChange={event => update('supplier_order_number', event.target.value)} placeholder="z. B. 133357183" /></label>
      </div>
    </section>

    <section className="capture-card">
      <div className="capture-heading capture-heading--major"><div className="capture-heading-main"><span className="step-badge">5.</span><h2>Lager & Inventur</h2></div></div>
      <div className="form-grid">
        <label>Lagerort<select value={item.warehouse_location || ''} onChange={event => update('warehouse_location', event.target.value)}><option value="">Bitte wählen</option>{warehouseLocations.map(value => <option key={value}>{value}</option>)}</select></label>
        <label>Regal<input value={item.warehouse_rack || ''} onChange={event => update('warehouse_rack', event.target.value)} /></label>
        <label>Fach<input value={item.warehouse_shelf || ''} onChange={event => update('warehouse_shelf', event.target.value)} /></label>
        <label>Letzte Inventur<input type="date" value={item.last_inventory_at ? item.last_inventory_at.slice(0,10) : ''} onChange={event => update('last_inventory_at', event.target.value || null)} /></label>
        <label>Letzte Bewegung<input value={item.last_movement_at ? new Date(item.last_movement_at).toLocaleString('de-DE') : 'Noch keine Bewegung erfasst'} readOnly /></label>
      </div>
    </section>

    <div className="save-bar"><button type="button" className="danger-button" onClick={remove}>Artikel löschen</button><button type="button" className="primary-button" onClick={save} disabled={saving}>{saving ? 'Speichert …' : 'Änderungen speichern'}</button></div>
    {message && <div className={`form-message${message.includes('gespeichert') ? ' success' : ''}`}>{message}</div>}
  </div>;
}
