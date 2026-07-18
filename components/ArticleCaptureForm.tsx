'use client';

import { useEffect, useMemo, useState } from 'react';
import { CameraIcon, UploadIcon } from './Icons';
import { categories, designerSuggestions, type CategoryName } from '@/lib/catalog';

type PhotoItem = { file: File; preview: string };

const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const MAX_ANALYSIS_IMAGES = 9;
const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'];

type FormState = {
  sku: string; brand: string; category: string; subcategory: string; season: string;
  original_size: string; size_system: string; de_size: string; international_size: string;
  color: string; secondary_color: string; material: string; pattern: string; condition: string;
  era: string; style_key: string; authenticity_status: string; purchase_price: string;
  sale_price: string; occasions: string[]; measurements: string; flaws: string; notes: string; warehouse_location: string; warehouse_rack: string; warehouse_shelf: string; status: string;
};


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
  de_size: '', international_size: '', color: '', secondary_color: '', material: '', pattern: '', condition: 'Sehr gut',
  era: '', style_key: '', authenticity_status: 'Zu prüfen', purchase_price: '', sale_price: '', occasions: [], measurements: '', flaws: '', notes: '', warehouse_location: '', warehouse_rack: '', warehouse_shelf: '', status: 'Entwurf'
};

export default function ArticleCaptureForm() {
  const [form, setForm] = useState(initialState);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState({ brands: designerSuggestions, materials: [] as string[], colors: [] as string[], warehouses: [] as string[] });

  useEffect(() => {
    fetch('/api/suggestions', { cache: 'no-store' })
      .then(response => response.ok ? response.json() : Promise.reject())
      .then(data => setSuggestions({
        brands: Array.isArray(data.brands) ? data.brands : designerSuggestions,
        materials: Array.isArray(data.materials) ? data.materials : [],
        colors: Array.isArray(data.colors) ? data.colors : [],
        warehouses: Array.isArray(data.warehouses) ? data.warehouses : [],
      }))
      .catch(() => undefined);
  }, []);

  const photoCount = useMemo(() => `${photos.length}/9 Fotos`, [photos.length]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
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
    const remaining = Math.max(0, MAX_ANALYSIS_IMAGES - photos.length);
    const next = files.slice(0, remaining).map(file => ({ file, preview: URL.createObjectURL(file) }));
    setPhotos(prev => [...prev, ...next]);
    if (files.length > remaining) setMessage(`Maximal ${MAX_ANALYSIS_IMAGES} Fotos möglich. ${files.length - remaining} Foto(s) wurden nicht hinzugefügt.`);
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
      const imageDataUrls = await Promise.all(
        photos.slice(0, MAX_ANALYSIS_IMAGES).map(photo => photoToAnalysisDataUrl(photo.file)),
      );
      const response = await fetch('/api/ai/analyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageDataUrls }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'KI-Analyse fehlgeschlagen.');

      const nextCategory = result.category && Object.prototype.hasOwnProperty.call(categories, result.category)
        ? result.category
        : form.category;
      const validSubcategory = result.subcategory && nextCategory && (categories[nextCategory as CategoryName] as readonly string[])?.includes(String(result.subcategory))
        ? result.subcategory
        : form.subcategory;

      let generatedSku = form.sku;
      if (validSubcategory && validSubcategory !== form.subcategory) {
        try { generatedSku = await requestSku(validSubcategory); } catch { generatedSku = ''; }
      }

      setForm(prev => ({
        ...prev,
        sku: generatedSku || prev.sku,
        brand: result.brand || prev.brand,
        category: nextCategory || prev.category,
        subcategory: validSubcategory || prev.subcategory,
        season: result.season || prev.season,
        original_size: result.original_size || prev.original_size,
        size_system: result.size_system || prev.size_system,
        de_size: result.de_size || prev.de_size,
        international_size: result.international_size || prev.international_size,
        color: result.color || prev.color,
        secondary_color: result.secondary_color || prev.secondary_color,
        material: result.material || prev.material,
        pattern: result.pattern || prev.pattern,
        condition: result.condition || prev.condition,
        era: result.era || prev.era,
        style_key: result.style_key || prev.style_key,
        occasions: Array.isArray(result.occasions) ? result.occasions : prev.occasions,
        measurements: result.measurements || prev.measurements,
        flaws: result.flaws || prev.flaws,
        notes: result.notes ? [prev.notes, `KI-Hinweis: ${result.notes}`].filter(Boolean).join('\n') : prev.notes,
      }));
      setMessage(`${result.image_count || imageDataUrls.length} Fotos wurden gemeinsam analysiert. Bitte alle KI-Angaben prüfen.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'KI-Analyse fehlgeschlagen.');
    } finally {
      setAnalyzing(false);
    }
  }

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
      <div className="capture-heading"><div><span className="step-badge">2</span><h2>Artikel-DNA</h2></div><button type="button" className="ai-analysis-button" onClick={analyzeAllPhotos} disabled={analyzing || !photos.length}>{analyzing ? 'KI analysiert alle Fotos …' : '✦ Alle Fotos analysieren'}</button></div>
      <div className="form-grid">
        <label>Artikelnummer *<input value={form.sku} readOnly aria-label="Automatisch erzeugte Artikelnummer" placeholder="Unterkategorie wählen" required /><small>Schema: MCP-KL-12345. Nach dem Speichern unveränderlich.</small></label>
        <label>Status<select value={form.status} onChange={e=>update('status',e.target.value)}><option>Entwurf</option><option>Aktiv</option><option>Reserviert</option><option>Verkauft</option></select></label>
        <label>Marke / Designer<input list="designer-suggestions" value={form.brand} onChange={e=>update('brand',e.target.value)} autoComplete="off" /><datalist id="designer-suggestions">{suggestions.brands.map(name=><option key={name} value={name}/>)}</datalist></label>
        <label>Kategorie<select value={form.category} onChange={e=>setForm(prev=>({...prev,category:e.target.value,subcategory:''}))}><option value="">Bitte wählen</option>{Object.keys(categories).map(category=><option key={category}>{category}</option>)}</select></label>
        <label>Unterkategorie *<select value={form.subcategory} onChange={async e=>{const value=e.target.value; setForm(prev=>({...prev,subcategory:value,sku:''})); if(value){try{const sku=await requestSku(value); setForm(prev=>prev.subcategory===value?{...prev,sku}:prev);}catch(error){setMessage(error instanceof Error?error.message:'SKU konnte nicht erzeugt werden.')}}}} disabled={!form.category} required><option value="">{form.category ? 'Bitte wählen' : 'Zuerst Kategorie wählen'}</option>{form.category && categories[form.category as CategoryName]?.map(item=><option key={item}>{item}</option>)}</select></label>
        <label>Saison<select value={form.season} onChange={e=>update('season',e.target.value)}><option>Ganzjährig</option><option>Frühling</option><option>Sommer</option><option>Herbst</option><option>Winter</option></select></label>
        <label>Originalgröße<input value={form.original_size} onChange={e=>update('original_size',e.target.value)} /></label>
        <label>Größensystem<select value={form.size_system} onChange={e=>update('size_system',e.target.value)}><option>DE</option><option>FR</option><option>IT</option><option>UK</option><option>US</option><option>One Size</option></select></label>
        <label>DE-Vergleichsgröße<input value={form.de_size} onChange={e=>update('de_size',e.target.value)} /></label>
        <label>Internationale Größe<input value={form.international_size} onChange={e=>update('international_size',e.target.value)} placeholder="XS / S / M / L" /></label>
        <label>Hauptfarbe<input list="color-suggestions" value={form.color} onChange={e=>update('color',e.target.value)} autoComplete="off" /><datalist id="color-suggestions">{suggestions.colors.map(value=><option key={value} value={value}/>)}</datalist></label>
        <label>Nebenfarbe<input value={form.secondary_color} onChange={e=>update('secondary_color',e.target.value)} /></label>
        <label>Material<input list="material-suggestions" value={form.material} onChange={e=>update('material',e.target.value)} autoComplete="off" /><datalist id="material-suggestions">{suggestions.materials.map(value=><option key={value} value={value}/>)}</datalist></label>
        <label>Muster<input value={form.pattern} onChange={e=>update('pattern',e.target.value)} /></label>
        <label>Zustand<select value={form.condition} onChange={e=>update('condition',e.target.value)}><option>Neu mit Etikett</option><option>Neuwertig</option><option>Sehr gut</option><option>Gut</option><option>Akzeptabel</option></select></label>
        <label>Epoche<input value={form.era} onChange={e=>update('era',e.target.value)} placeholder="1990er, Y2K …" /></label>
        <label>MON-CHIC-Stilrichtung<input value={form.style_key} onChange={e=>update('style_key',e.target.value)} /></label>
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
        <label>Lagerort<input list="warehouse-suggestions" value={form.warehouse_location} onChange={e=>update('warehouse_location',e.target.value)} autoComplete="off" placeholder="Bitte wählen oder neu eingeben" /><datalist id="warehouse-suggestions">{suggestions.warehouses.map(value=><option key={value} value={value}/>)}</datalist></label>
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
