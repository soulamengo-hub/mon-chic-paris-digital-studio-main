'use client';

import { useEffect, useMemo, useState } from 'react';
import { CameraIcon, UploadIcon } from './Icons';
import { categories, designerSuggestions, colorCatalog, styleCatalog, type CategoryName } from '@/lib/catalog';
import { deriveCareInstructions } from '@/lib/care-instructions';

type PhotoItem = { file: File; preview: string };

const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'];

type FormState = {
  sku: string; brand: string; category: string; subcategory: string; season: string;
  original_size: string; size_system: string; de_size: string; international_size: string;
  color: string; secondary_color: string; color_note: string; material: string; care_instructions: string; pattern: string; condition: string;
  era: string; style_key: string; authenticity_status: string; purchase_price: string;
  sale_price: string; occasions: string[]; measurements: string; flaws: string; notes: string; warehouse_location: string; warehouse_rack: string; warehouse_shelf: string; status: string;
};

type AiDraft = Partial<FormState> & { confidence?: Record<string, number> };
type AiBudget = { budgetEur: number; spentEur: number; remainingEur: number; percent: number; warning: boolean; blocked: boolean };
type AiUsage = { inputTokens: number; outputTokens: number; estimatedCostEur: number };


const occasionGroups = [
  {
    label: 'Beruf & Alltag',
    options: ['Business', 'Casual', 'Chic'],
  },
  {
    label: 'Elegant & festlich',
    options: ['Abendgarderobe', 'Cocktail', 'Hochzeit', 'Dinner'],
  },
  {
    label: 'Reise & Aktiv',
    options: ['Urlaub', 'Strand', 'Skiurlaub', 'Sportiv', 'Outdoor'],
  },
  {
    label: 'Besondere Anlässe',
    options: ['Trauerfeier', 'Religiöse Feier', 'Weihnachten', 'Silvester'],
  },
] as const;

async function requestSku(subcategory: string) {
  const response = await fetch('/api/sku', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subcategory }) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'SKU konnte nicht erzeugt werden.');
  return String(result.sku);
}

const initialState: FormState = {
  sku: '', brand: '', category: '', subcategory: '', season: 'Ganzjährig', original_size: '', size_system: 'DE',
  de_size: '', international_size: '', color: '', secondary_color: '', color_note: '', material: '', care_instructions: '', pattern: '', condition: 'Sehr gut',
  era: '', style_key: '', authenticity_status: 'Zu prüfen', purchase_price: '', sale_price: '', occasions: [], measurements: '', flaws: '', notes: '', warehouse_location: '', warehouse_rack: '', warehouse_shelf: '', status: 'Entwurf'
};

export default function ArticleCaptureForm() {
  const [form, setForm] = useState(initialState);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiDraft, setAiDraft] = useState<AiDraft | null>(null);
  const [aiBudget, setAiBudget] = useState<AiBudget | null>(null);
  const [aiUsage, setAiUsage] = useState<AiUsage | null>(null);

  const photoCount = useMemo(() => `${photos.length}/9 Fotos`, [photos.length]);

  useEffect(() => {
    fetch('/api/ai/budget', { cache: 'no-store' })
      .then(response => response.ok ? response.json() : null)
      .then(data => { if (data) setAiBudget(data); })
      .catch(() => {});
  }, []);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function updateMaterial(value: string) {
    setForm(prev => ({ ...prev, material: value, care_instructions: deriveCareInstructions(value) }));
  }


  function toggleOccasion(value: string) {
    setForm(prev => ({
      ...prev,
      occasions: prev.occasions.includes(value)
        ? prev.occasions.filter(item => item !== value)
        : [...prev.occasions, value],
    }));
  }

  function isSupportedImage(file: File) {
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    return file.type.startsWith('image/') || ALLOWED_IMAGE_EXTENSIONS.includes(extension);
  }

  function inferMimeType(file: File) {
    if (file.type) return file.type;
    const extension = file.name.split('.').pop()?.toLowerCase();
    const mimeByExtension: Record<string, string> = {
      jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
      heic: 'image/heic', heif: 'image/heif',
    };
    return extension ? mimeByExtension[extension] || 'application/octet-stream' : 'application/octet-stream';
  }

  function addFiles(fileList: FileList | null) {
    if (!fileList) return;
    const files = Array.from(fileList).filter(isSupportedImage);
    const remaining = Math.max(0, 9 - photos.length);
    const next = files.slice(0, remaining).map(file => ({ file, preview: URL.createObjectURL(file) }));
    setPhotos(prev => [...prev, ...next]);
    if (files.length > remaining) setMessage(`Maximal 9 Fotos möglich. ${files.length - remaining} Foto(s) wurden nicht hinzugefügt.`);
  }

  function sanitizeFileName(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/-+/g, '-');
  }

  function getPublicSupabaseConfig() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error('Supabase-Verbindung fehlt. Bitte Vercel-Variablen prüfen.');
    return { url, key };
  }

  async function uploadPhotoDirect(file: File, productId: string, sortOrder: number) {
    if (file.size > MAX_PHOTO_BYTES) {
      throw new Error(`Foto „${file.name}“ ist größer als 8 MB. Bitte auf dem iPhone als kleinere Datei exportieren.`);
    }

    const { url, key } = getPublicSupabaseConfig();
    const mimeType = inferMimeType(file);
    const fileName = sanitizeFileName(file.name || `foto-${sortOrder + 1}.jpg`);
    const storagePath = `${productId}/${Date.now()}-${sortOrder}-${fileName}`;
    const encodedPath = storagePath.split('/').map(encodeURIComponent).join('/');
    const authHeaders = { apikey: key, Authorization: `Bearer ${key}` };

    const uploadResponse = await fetch(`${url}/storage/v1/object/product-images/${encodedPath}`, {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': mimeType, 'x-upsert': 'false' },
      body: file,
    });
    if (!uploadResponse.ok) throw new Error(`Foto-Upload fehlgeschlagen: ${await uploadResponse.text()}`);

    const publicUrl = `${url}/storage/v1/object/public/product-images/${encodedPath}`;
    const metadataResponse = await fetch(`${url}/rest/v1/product_images`, {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({
        product_id: productId,
        storage_path: storagePath,
        public_url: publicUrl,
        file_name: file.name,
        mime_type: mimeType,
        size_bytes: file.size,
        sort_order: sortOrder,
      }),
    });
    if (!metadataResponse.ok) throw new Error(`Bild-Metadaten konnten nicht gespeichert werden: ${await metadataResponse.text()}`);
  }

  async function photoToAnalysisDataUrl(file: File) {
    const bitmap = await createImageBitmap(file);
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
    if (!photos.length) { setMessage('Bitte zuerst mindestens ein Foto aufnehmen.'); return; }
    setAnalyzing(true); setMessage('');
    try {
      const imageDataUrls = await Promise.all(photos.map(photo => photoToAnalysisDataUrl(photo.file)));
      const response = await fetch('/api/ai/analyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageDataUrls }),
      });
      const result = await response.json();
      if (result.budget) setAiBudget(result.budget);
      if (!response.ok) throw new Error(result.error || 'KI-Analyse fehlgeschlagen.');
      if (result.usage) setAiUsage(result.usage);
      setAiDraft({
        brand: result.brand,
        category: result.category,
        subcategory: result.subcategory,
        color: result.color,
        secondary_color: result.secondary_color,
        color_note: result.color_note,
        material: result.material,
        pattern: result.pattern,
        condition: result.condition,
        season: result.season,
        original_size: result.original_size,
        size_system: result.size_system,
        de_size: result.de_size,
        international_size: result.international_size,
        era: result.era,
        style_key: result.style_key,
        occasions: result.occasions,
        measurements: result.measurements,
        flaws: result.flaws,
        notes: result.notes,
        confidence: result.confidence,
      });
      setMessage(`KI-Analyse von ${result.image_count || photos.length} Foto(s) abgeschlossen. Vorschläge bitte prüfen.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'KI-Analyse fehlgeschlagen.');
    } finally {
      setAnalyzing(false);
    }
  }

  async function applyAiField(key: keyof FormState) {
    if (!aiDraft) return;
    const value = aiDraft[key];
    if (value === undefined || value === null) return;
    if (key === 'subcategory' && typeof value === 'string') {
      const category = Object.entries(categories).find(([, values]) => (values as readonly string[]).includes(value))?.[0] || aiDraft.category || form.category;
      setForm(prev => ({ ...prev, category, subcategory: value, sku: '' }));
      try {
        const sku = await requestSku(value);
        setForm(prev => prev.subcategory === value ? { ...prev, sku } : prev);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'SKU konnte nicht erzeugt werden.');
      }
      return;
    }
    if (key === 'material' && typeof value === 'string') {
      setForm(prev => ({ ...prev, material: value, care_instructions: deriveCareInstructions(value) }));
      return;
    }
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function applyAllAiSuggestions() {
    if (!aiDraft) return;
    const { confidence: _confidence, ...suggestions } = aiDraft;
    const validSuggestions = Object.fromEntries(Object.entries(suggestions).filter(([, value]) => value !== undefined && value !== null && value !== ''));
    const subcategory = typeof suggestions.subcategory === 'string' ? suggestions.subcategory : '';
    const inferredCategory = subcategory
      ? Object.entries(categories).find(([, values]) => (values as readonly string[]).includes(subcategory))?.[0]
      : undefined;
    const materialSuggestion = typeof suggestions.material === 'string' ? suggestions.material : undefined;
    setForm(prev => ({
      ...prev,
      ...validSuggestions,
      ...(inferredCategory ? { category: inferredCategory } : {}),
      ...(subcategory ? { sku: '' } : {}),
      ...(materialSuggestion ? { care_instructions: deriveCareInstructions(materialSuggestion) } : {}),
    } as FormState));
    if (subcategory) {
      try {
        const sku = await requestSku(subcategory);
        setForm(prev => prev.subcategory === subcategory ? { ...prev, sku } : prev);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'SKU konnte nicht erzeugt werden.');
        return;
      }
    }
    setMessage('KI-Vorschläge wurden übernommen. Bitte vor dem Speichern prüfen.');
  }

  function confidenceLabel(key: string) {
    const value = aiDraft?.confidence?.[key];
    if (value === undefined) return 'Nicht bewertet';
    if (value >= 0.9) return `Sehr sicher · ${Math.round(value * 100)} %`;
    if (value >= 0.7) return `Prüfen · ${Math.round(value * 100)} %`;
    return `Unsicher · ${Math.round(value * 100)} %`;
  }

  const aiFields: Array<{ key: keyof FormState; label: string }> = [
    { key: 'brand', label: 'Marke' }, { key: 'category', label: 'Kategorie' },
    { key: 'subcategory', label: 'Unterkategorie' }, { key: 'color', label: 'Hauptfarbe' },
    { key: 'secondary_color', label: 'Nebenfarbe' }, { key: 'color_note', label: 'Farbhinweis' },
    { key: 'material', label: 'Material' },
    { key: 'pattern', label: 'Muster' }, { key: 'condition', label: 'Zustand' },
    { key: 'season', label: 'Saison' }, { key: 'original_size', label: 'Originalgröße' },
    { key: 'size_system', label: 'Größensystem' }, { key: 'de_size', label: 'DE-Größe' },
    { key: 'international_size', label: 'Internationale Größe' }, { key: 'era', label: 'Epoche' },
    { key: 'style_key', label: 'Stilrichtung' }, { key: 'measurements', label: 'Maße' },
    { key: 'flaws', label: 'Mängel' }, { key: 'notes', label: 'KI-Hinweis' },
  ];

  function removePhoto(index: number) {
    setPhotos(prev => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  }

  function movePhoto(index: number, direction: -1 | 1) {
    setPhotos(prev => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      [copy[index], copy[target]] = [copy[target], copy[index]];
      return copy;
    });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setMessage('');
    if (!form.subcategory) { setMessage('Bitte zuerst eine Unterkategorie wählen.'); return; }
    if (!form.sku.trim()) { setMessage('Die automatische SKU fehlt. Bitte Unterkategorie erneut wählen.'); return; }
    setSaving(true); setProgress(5);
    try {
      const payload = {
        ...form,
        purchase_price: form.purchase_price ? Number(form.purchase_price) : null,
        sale_price: form.sale_price ? Number(form.sale_price) : null,
      };
      const productResponse = await fetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!productResponse.ok) throw new Error(await productResponse.text());
      const product = await productResponse.json();
      setProgress(25);

      for (let index = 0; index < photos.length; index += 1) {
        await uploadPhotoDirect(photos[index].file, product.id, index);
        setProgress(25 + Math.round(((index + 1) / Math.max(1, photos.length)) * 75));
      }
      setMessage(`Artikel ${product.sku} wurde erfolgreich als ${product.status} gespeichert.`);
      setForm({ ...initialState, sku: '' });
      photos.forEach(p => URL.revokeObjectURL(p.preview));
      setPhotos([]);
      setProgress(100);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Speichern fehlgeschlagen.');
    } finally {
      setSaving(false);
    }
  }

  return <form onSubmit={submit} className="capture-form">
    <section className="capture-card photo-section">
      <div className="capture-heading"><div><span className="step-badge">1</span><h2>Fotos aufnehmen</h2></div><span className="photo-count">{photoCount}</span></div>
      <div className="photo-actions">
        <label className="upload-zone camera-zone">
          <CameraIcon />
          <strong>Foto mit Kamera aufnehmen</strong>
          <span>Nach jeder Aufnahme können Sie direkt das nächste Foto ergänzen.</span>
          <input type="file" accept="image/*" capture="environment" onChange={e => { addFiles(e.target.files); e.currentTarget.value=''; }} />
        </label>
        <label className="upload-zone library-zone">
          <UploadIcon />
          <strong>Aus Mediathek auswählen</strong>
          <span>Mehrfachauswahl, JPG/PNG/WEBP/HEIC, maximal 9 Fotos.</span>
          <input type="file" accept="image/*" multiple onChange={e => { addFiles(e.target.files); e.currentTarget.value=''; }} />
        </label>
      </div>
      {photos.length > 0 && <div className="photo-grid">{photos.map((photo,index)=><article key={photo.preview} className="photo-preview"><img src={photo.preview} alt={`Artikelbild ${index+1}`} /><div><button type="button" onClick={()=>movePhoto(index,-1)} disabled={index===0}>←</button><span>{index+1}</span><button type="button" onClick={()=>movePhoto(index,1)} disabled={index===photos.length-1}>→</button><button type="button" className="remove" onClick={()=>removePhoto(index)}>Löschen</button></div></article>)}</div>}
    </section>

    <section className="capture-card">
      <div className="capture-heading"><div><span className="step-badge">2</span><h2>Artikel-DNA</h2></div><button type="button" className="ai-analysis-button" onClick={analyzeAllPhotos} disabled={analyzing || !photos.length || Boolean(aiBudget?.blocked)}>{analyzing ? 'KI analysiert …' : aiBudget?.blocked ? 'KI-Budget erreicht' : '✦ Alle Fotos analysieren'}</button></div>
      {aiBudget && <div className={`ai-budget-card${aiBudget.warning ? ' warning' : ''}${aiBudget.blocked ? ' blocked' : ''}`}>
        <div><strong>KI-Budget im laufenden Monat</strong><span>{aiBudget.spentEur.toFixed(3)} € von {aiBudget.budgetEur.toFixed(2)} € · noch {aiBudget.remainingEur.toFixed(2)} €</span></div>
        <div className="ai-budget-track"><span style={{width: `${aiBudget.percent}%`}} /></div>
        {aiUsage && <small>Letzte Analyse: ca. {aiUsage.estimatedCostEur.toFixed(4)} € · {aiUsage.inputTokens + aiUsage.outputTokens} Tokens</small>}
      </div>}
      {aiDraft && <section className="ai-draft-panel">
        <div className="ai-draft-heading"><div><strong>Mon Chic AI – Vorschläge</strong><span>Nichts wird automatisch gespeichert.</span></div><button type="button" className="secondary-button" onClick={applyAllAiSuggestions}>Alle übernehmen</button></div>
        <div className="ai-suggestion-grid">
          {aiFields.filter(item => { const value = aiDraft[item.key]; return value !== undefined && value !== null && value !== ''; }).map(item => (
            <article key={item.key} className="ai-suggestion">
              <div><small>{item.label}</small><strong>{Array.isArray(aiDraft[item.key]) ? (aiDraft[item.key] as string[]).join(', ') : String(aiDraft[item.key])}</strong><span>{confidenceLabel(String(item.key))}</span></div>
              <button type="button" onClick={() => applyAiField(item.key)}>Übernehmen</button>
            </article>
          ))}
        </div>
      </section>}
      <div className="form-grid">
        <label>Artikelnummer *<input value={form.sku} readOnly aria-label="Automatisch erzeugte Artikelnummer" placeholder="Unterkategorie wählen" required /><small>Schema: MCP-KL-12345. Nach dem Speichern unveränderlich.</small></label>
        <label>Status<select value={form.status} onChange={e=>update('status',e.target.value)}><option>Entwurf</option><option>Aktiv</option><option>Reserviert</option><option>Verkauft</option></select></label>
        <label>Marke / Designer<input list="designer-suggestions" value={form.brand} onChange={e=>update('brand',e.target.value)} /><datalist id="designer-suggestions">{designerSuggestions.map(name=><option key={name} value={name}/>)}</datalist></label>
        <label>Kategorie<select value={form.category} onChange={e=>setForm(prev=>({...prev,category:e.target.value,subcategory:''}))}><option value="">Bitte wählen</option>{Object.keys(categories).map(category=><option key={category}>{category}</option>)}</select></label>
        <label>Unterkategorie *<select value={form.subcategory} onChange={async e=>{const value=e.target.value; setForm(prev=>({...prev,subcategory:value,sku:''})); if(value){try{const sku=await requestSku(value); setForm(prev=>prev.subcategory===value?{...prev,sku}:prev);}catch(error){setMessage(error instanceof Error?error.message:'SKU konnte nicht erzeugt werden.')}}}} disabled={!form.category} required><option value="">{form.category ? 'Bitte wählen' : 'Zuerst Kategorie wählen'}</option>{form.category && categories[form.category as CategoryName]?.map(item=><option key={item}>{item}</option>)}</select></label>
        <label>Saison<select value={form.season} onChange={e=>update('season',e.target.value)}><option>Ganzjährig</option><option>Frühling</option><option>Sommer</option><option>Herbst</option><option>Winter</option></select></label>
        <label>Originalgröße<input value={form.original_size} onChange={e=>update('original_size',e.target.value)} /></label>
        <label>Größensystem<select value={form.size_system} onChange={e=>update('size_system',e.target.value)}><option>DE</option><option>FR</option><option>IT</option><option>UK</option><option>US</option><option>One Size</option></select></label>
        <label>DE-Vergleichsgröße<input value={form.de_size} onChange={e=>update('de_size',e.target.value)} /></label>
        <label>Internationale Größe<input value={form.international_size} onChange={e=>update('international_size',e.target.value)} placeholder="XS / S / M / L" /></label>
        <label>Hauptfarbe<select value={form.color} onChange={e=>update('color',e.target.value)}><option value="">Bitte wählen</option>{colorCatalog.map(c=><option key={c}>{c}</option>)}</select></label>
        <label>Nebenfarbe<select value={form.secondary_color} onChange={e=>update('secondary_color',e.target.value)}><option value="">Keine</option>{colorCatalog.map(c=><option key={c}>{c}</option>)}</select></label>
        <label>Farbhinweis (optional)<input value={form.color_note} onChange={e=>update('color_note',e.target.value)} placeholder="z. B. Dunkelblau mit roten Streifen" /></label>
        <label>Material<input value={form.material} onChange={e=>updateMaterial(e.target.value)} /></label>
        <label className="full">Pflegehinweise<textarea value={form.care_instructions} onChange={e=>update('care_instructions',e.target.value)} placeholder="Wird automatisch aus dem Material abgeleitet, kann angepasst werden." /><small>Regelbasiert aus dem Material abgeleitet, nicht durch KI. Bitte vor dem Speichern prüfen.</small></label>
        <label>Muster<input value={form.pattern} onChange={e=>update('pattern',e.target.value)} /></label>
        <label>Zustand<select value={form.condition} onChange={e=>update('condition',e.target.value)}><option>Neu mit Etikett</option><option>Neuwertig</option><option>Sehr gut</option><option>Gut</option><option>Akzeptabel</option></select></label>
        <label>Epoche<input value={form.era} onChange={e=>update('era',e.target.value)} placeholder="1990er, Y2K …" /></label>
        <label>MON-CHIC-Stilrichtung<select value={form.style_key} onChange={e=>update('style_key',e.target.value)}><option value="">Bitte wählen</option>{styleCatalog.map(s=><option key={s.key} value={s.key}>{s.label}</option>)}</select></label>
        <label>Echtheitsstatus<select value={form.authenticity_status} onChange={e=>update('authenticity_status',e.target.value)}><option>Zu prüfen</option><option>Geprüft</option><option>Authentisch</option><option>Nicht bestätigt</option></select></label>
        <fieldset className="full occasion-fieldset">
          <legend>Anlässe</legend>
          <p className="field-help">Mehrfachauswahl möglich. Diese Angaben können später als Filter auf der Website genutzt werden.</p>
          <div className="occasion-scroll" role="group" aria-label="Anlässe auswählen">
            {occasionGroups.map(group => (
              <section key={group.label} className="occasion-group">
                <h3>{group.label}</h3>
                <div className="occasion-options">
                  {group.options.map(option => (
                    <label key={option} className={`occasion-option${form.occasions.includes(option) ? ' selected' : ''}`}>
                      <input
                        type="checkbox"
                        checked={form.occasions.includes(option)}
                        onChange={() => toggleOccasion(option)}
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              </section>
            ))}
          </div>
          {form.occasions.length > 0 && <div className="selected-occasions">Ausgewählt: {form.occasions.join(' · ')}</div>}
        </fieldset>
        <label>Einkaufspreis (€)<input type="number" min="0" step="0.01" value={form.purchase_price} onChange={e=>update('purchase_price',e.target.value)} /></label>
        <label>Verkaufspreis (€)<input type="number" min="0" step="0.01" value={form.sale_price} onChange={e=>update('sale_price',e.target.value)} /></label>
        <label>Lagerort<select value={form.warehouse_location} onChange={e=>update('warehouse_location',e.target.value)}><option value="">Bitte wählen</option><option>Boutique</option><option>Lager A</option><option>Lager B</option><option>Schaufenster</option><option>Fotoshooting</option><option>Versand</option><option>Qualitätsprüfung</option><option>Reinigung</option><option>Retouren</option><option>Extern</option><option>Sonstiges</option></select></label>
        <label>Regal<input value={form.warehouse_rack} onChange={e=>update('warehouse_rack',e.target.value)} placeholder="z. B. B" /></label>
        <label>Fach<input value={form.warehouse_shelf} onChange={e=>update('warehouse_shelf',e.target.value)} placeholder="z. B. 14" /></label>
        <label className="full">Maße<textarea value={form.measurements} onChange={e=>update('measurements',e.target.value)} placeholder="Brustweite, Länge, Schulter, Ärmel …" /></label>
        <label className="full">Besonderheiten / Mängel<textarea value={form.flaws} onChange={e=>update('flaws',e.target.value)} /></label>
        <label className="full">Notizen<textarea value={form.notes} onChange={e=>update('notes',e.target.value)} /></label>
      </div>
    </section>

    <div className="save-bar">
      <div><strong>Bereit zum Speichern</strong><span>KI-Vorschläge sind optional und müssen vor dem Speichern geprüft werden.</span></div>
      <button className="primary-button" type="submit" disabled={saving}><UploadIcon /> {saving ? `Speichern ${progress}%` : 'Artikel speichern'}</button>
    </div>
    {saving && <div className="progress"><span style={{width:`${progress}%`}} /></div>}
    {message && <div className={`form-message${message.includes('erfolgreich') ? ' success' : ''}`}>{message}</div>}
  </form>;
}
