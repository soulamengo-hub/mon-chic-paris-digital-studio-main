'use client';

import { useEffect, useState, type ClipboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { UploadIcon } from './Icons';
import { categories, colorCatalog, styleCatalog, type CategoryName } from '@/lib/catalog';
import { deriveCareInstructions } from '@/lib/care-instructions';
import { deriveDeSize } from '@/lib/size-conversion';
import { deleteUploadedObject, uploadProductPhoto, uploadProductPhotoReplacement, uploadReferencePhoto } from '@/lib/photo-upload';
import type { ProductRecord } from '@/lib/types';

const warehouseLocations = ['MyPlace','Boutique','Lager A','Lager B','Schaufenster','Fotoshooting','Versand','Qualitätsprüfung','Reinigung','Retouren','Extern','Sonstiges'];

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
  const [photoActionId, setPhotoActionId] = useState<string | null>(null);
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
  async function makeMainPhoto(
    image: NonNullable<ProductRecord['product_images']>[number],
  ) {
    if (!image.id) {
      setMessage('Dieses Foto hat keine Bild-ID und kann noch nicht als Hauptbild gesetzt werden.');
      return;
    }

    setPhotoActionId(image.id);
    setMessage('');

    try {
      const response = await fetch(`/api/products/${id}/images/${image.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'primary' }),
      });

      if (!response.ok) throw new Error(await response.text());

      await reload();
      setMessage('Hauptbild wurde festgelegt.');
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Hauptbild konnte nicht festgelegt werden.',
      );
    } finally {
      setPhotoActionId(null);
    }
  }

  async function toggleContentSuitable(
    image: NonNullable<ProductRecord['product_images']>[number],
  ) {
    if (!image.id) {
      setMessage(
        'Dieses Foto hat keine Bild-ID und kann nicht für Content markiert werden.',
      );
      return;
    }

    setPhotoActionId(image.id);
    setMessage('');

    try {
      const response = await fetch(`/api/products/${id}/images/${image.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'content',
          content_suitable: !Boolean(image.content_suitable),
        }),
      });

      if (!response.ok) throw new Error(await response.text());

      await reload();
      setMessage(
        image.content_suitable
          ? 'Content-Markierung wurde entfernt.'
          : 'Foto wurde als Content geeignet markiert.',
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Content-Markierung konnte nicht geändert werden.',
      );
    } finally {
      setPhotoActionId(null);
    }
  }

  async function deleteProductPhoto(
    image: NonNullable<ProductRecord['product_images']>[number],
  ) {
    if (!image.id) {
      setMessage('Dieses Foto hat keine Bild-ID und kann nicht einzeln gelöscht werden.');
      return;
    }

    if (!confirm('Dieses Produktfoto wirklich löschen?')) return;

    setPhotoActionId(image.id);
    setMessage('');

    try {
      const response = await fetch(`/api/products/${id}/images/${image.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error(await response.text());

      await reload();
      setMessage('Foto wurde gelöscht.');
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Foto konnte nicht gelöscht werden.',
      );
    } finally {
      setPhotoActionId(null);
    }
  }



  async function replaceProductPhoto(
    image: NonNullable<ProductRecord['product_images']>[number],
    file: File | null,
  ) {
    if (!file) return;
    if (!image.id) {
      setMessage('Dieses Foto hat keine Bild-ID und kann nicht ersetzt werden.');
      return;
    }

    setPhotoActionId(image.id);
    setMessage('');
    let replacementStoragePath = '';

    try {
      const replacement = await uploadProductPhotoReplacement(file, id, image.id, image.sort_order);
      replacementStoragePath = replacement.storage_path;

      const response = await fetch(`/api/products/${id}/images/${image.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'replace',
          ...replacement,
        }),
      });

      if (!response.ok) {
        await deleteUploadedObject(replacement.storage_path).catch(() => {});
        throw new Error(await response.text());
      }

      await reload();
      setMessage('Foto wurde ersetzt. Die Position in der Bilderfolge bleibt erhalten.');
    } catch (error) {
      if (replacementStoragePath) {
        await deleteUploadedObject(replacementStoragePath).catch(() => {});
      }
      setMessage(error instanceof Error ? error.message : 'Foto konnte nicht ersetzt werden.');
    } finally {
      setPhotoActionId(null);
    }
  }

  function referenceStoragePath(publicUrl?: string) {
    if (!publicUrl) return '';
    const marker = '/storage/v1/object/public/product-images/';
    const markerIndex = publicUrl.indexOf(marker);
    if (markerIndex < 0) return '';
    const encodedPath = publicUrl.slice(markerIndex + marker.length);
    return encodedPath
      .split('/')
      .map(segment => {
        try { return decodeURIComponent(segment); } catch { return segment; }
      })
      .join('/');
  }

  async function setReferencePhoto(file: File | null) {
    if (!file || !item) return;
    setUploadingReference(true);
    setMessage('');
    const previousReferenceUrl = item.reference_photo_url || '';

    try {
      const publicUrl = await uploadReferencePhoto(file, id);
      const response = await fetch(`/api/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference_photo_url: publicUrl }),
      });

      if (!response.ok) {
        const newStoragePath = referenceStoragePath(publicUrl);
        if (newStoragePath) await deleteUploadedObject(newStoragePath).catch(() => {});
        throw new Error(await response.text());
      }

      const updated = await response.json() as ProductRecord;
      setItem(previous => previous ? { ...previous, ...updated } : updated);

      const previousStoragePath = referenceStoragePath(previousReferenceUrl);
      if (previousStoragePath && previousReferenceUrl !== publicUrl) {
        await deleteUploadedObject(previousStoragePath).catch(() => {});
      }

      const becameComplete =
        item.status === 'Unvollständig' &&
        String(item.sku || '').startsWith('MCP-') &&
        Boolean(item.subcategory?.trim()) &&
        updated.status === 'Entwurf';

      setMessage(
        becameComplete
          ? 'Referenzfoto gespeichert. Artikel ist jetzt vollständig und wurde automatisch auf „Entwurf“ gesetzt.'
          : (previousReferenceUrl ? 'Referenzfoto wurde ersetzt.' : 'Referenzfoto gespeichert.'),
      );
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
    if (!item?.reference_photo_url) return;
    if (!confirm('Referenzfoto wirklich entfernen?')) return;

    setUploadingReference(true);
    setMessage('');
    const currentReferenceUrl = item.reference_photo_url;

    try {
      const response = await fetch(`/api/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference_photo_url: null }),
      });

      if (!response.ok) throw new Error(await response.text());

      const storagePath = referenceStoragePath(currentReferenceUrl);
      if (storagePath) await deleteUploadedObject(storagePath).catch(() => {});

      setItem(previous => previous ? { ...previous, reference_photo_url: undefined } : previous);
      setMessage('Referenzfoto wurde entfernt.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Referenzfoto konnte nicht entfernt werden.');
    } finally {
      setUploadingReference(false);
    }
  }

  function update(key: keyof ProductRecord, value: unknown) {
    setItem(previous => previous ? { ...previous, [key]: value } : previous);
  }

  function updatePurchaseCost(key: 'purchase_price' | 'purchase_extra_cost_share', value: number | null) {
    setItem(previous => {
      if (!previous) return previous;
      const next = { ...previous, [key]: value } as ProductRecord;
      return {
        ...next,
        acquisition_cost_total:
          Math.round((Number(next.purchase_price || 0) + Number(next.purchase_extra_cost_share || 0)) * 100) / 100,
      };
    });
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

    try {
      const isPending = String(item.sku || '').startsWith('PENDING-');
      const itemToSave = item.purchase_source === 'Remix' && !!(item.supplier_order_number || item.invoice_number)
        ? { ...item, self_receipt_status: 'Nicht erforderlich', self_receipt_id: '' }
        : item;

      let payload: Record<string, unknown> = { ...itemToSave };
      let finalizedSku = '';

      // PENDING-Artikel werden erst dann vervollständigt, wenn eine echte Unterkategorie feststeht.
      // Die bestehende PENDING-SKU bleibt bis zur erfolgreichen MCP-SKU-Vergabe erhalten.
      if (isPending && item.subcategory?.trim()) {
        const skuResponse = await fetch('/api/sku', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subcategory: item.subcategory.trim() }),
        });

        if (!skuResponse.ok) {
          throw new Error((await skuResponse.text()).trim() || 'Neue MCP-SKU konnte nicht erzeugt werden.');
        }

        const skuData = await skuResponse.json() as { sku?: string };
        finalizedSku = String(skuData.sku || '').trim();
        if (!finalizedSku.startsWith('MCP-')) {
          throw new Error('Die erzeugte SKU ist ungültig. Die PENDING-SKU bleibt unverändert.');
        }

        payload = {
          ...itemToSave,
          sku: finalizedSku,
          status: 'Entwurf',
          __finalize_pending: true,
        };
      }

      const response = await fetch(`/api/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error((await response.text()).trim() || 'Änderungen konnten nicht gespeichert werden.');
      }

      const updated = await response.json() as ProductRecord;
      setItem(previous => previous ? { ...previous, ...updated } : updated);

      setMessage(finalizedSku
        ? `Artikel vervollständigt und gespeichert. Neue SKU: ${finalizedSku}`
        : 'Änderungen wurden gespeichert.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Änderungen konnten nicht gespeichert werden.');
    } finally {
      setSaving(false);
    }
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
      <div className="capture-heading capture-heading--major">
        <div className="capture-heading-main"><span className="step-badge">1.</span><h2>Fotos</h2></div>
        <span className="photo-count">{item.product_images?.length || 0} Fotos</span>
      </div>
      <div className="photo-grid">
        {[...(item.product_images || [])]
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((image, index) => {
            const busy = Boolean(image.id && photoActionId === image.id);
            const inputId = `replace-photo-${image.id || index}`;

            return (
              <article className="photo-preview" key={image.id || image.public_url}>
                <img src={image.public_url} alt={`Foto ${index + 1}`} />
                <div>
                  {index === 0 ? (
                    <button type="button" disabled title="Aktuelles Hauptbild">★ Hauptbild</button>
                  ) : (
                    <button type="button" disabled={busy || !image.id} onClick={() => void makeMainPhoto(image)}>
                      ★ Hauptbild
                    </button>
                  )}
                  <button
                    type="button"
                    className={image.content_suitable ? 'content-photo-button active' : 'content-photo-button'}
                    disabled={busy || !image.id}
                    onClick={() => void toggleContentSuitable(image)}
                  >
                    {image.content_suitable ? '✦ Content geeignet' : '✦ Content'}
                  </button>


                  <input
                    id={inputId}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    disabled={busy || !image.id}
                    onChange={event => {
                      void replaceProductPhoto(image, event.target.files?.[0] || null);
                      event.target.value = '';
                    }}
                  />
                  <button
                    type="button"
                    disabled={busy || !image.id}
                    onClick={() => document.getElementById(inputId)?.click()}
                  >
                    Ersetzen
                  </button>

                  <button
                    type="button"
                    className="remove"
                    disabled={busy || !image.id}
                    onClick={() => void deleteProductPhoto(image)}
                  >
                    Löschen
                  </button>
                </div>
              </article>
            );
          })}
      </div>
      <label className="upload-zone">
        <UploadIcon />
        <span>{uploadingPhotos ? 'Fotos werden hochgeladen …' : 'Weitere Fotos hinzufügen (werden von der KI analysierbar)'}</span>
        <input type="file" accept="image/*" multiple disabled={uploadingPhotos} onChange={event => { void addPhotos(event.target.files); event.target.value = ''; }} />
      </label>
    </section>

    <section className="capture-card ai-analysis-section">
      <div className="capture-heading capture-heading--major">
        <div className="capture-heading-main"><span className="step-badge plain">✦</span><h2>KI-Analyse</h2></div>
        <button type="button" className="ai-analysis-button" onClick={analyzeAllPhotos} disabled={analyzing || !item.product_images?.length || Boolean(aiBudget?.blocked)}>
          {analyzing ? 'KI analysiert …' : aiBudget?.blocked ? 'KI-Budget erreicht' : '✦ Alle Fotos analysieren'}
        </button>
      </div>
      <p className="field-help">Analysiert die bereits hochgeladenen Artikelfotos. Nichts wird automatisch gespeichert — Vorschläge müssen einzeln oder gesammelt übernommen und vor dem Speichern geprüft werden. Die SKU bleibt in jedem Fall unverändert.</p>
      {aiBudget && <div className={`ai-budget-card${aiBudget.warning ? ' warning' : ''}${aiBudget.blocked ? ' blocked' : ''}`}>
        <div><strong>KI-Budget im laufenden Monat</strong><span>{aiBudget.spentEur.toFixed(3)} € von {aiBudget.budgetEur.toFixed(2)} € · noch {aiBudget.remainingEur.toFixed(2)} €</span></div>
        <div className="ai-budget-track"><span style={{width: `${aiBudget.percent}%`}} /></div>
        {aiUsage && <small>Letzte Analyse: ca. {aiUsage.estimatedCostEur.toFixed(4)} € · {aiUsage.inputTokens + aiUsage.outputTokens} Tokens</small>}
      </div>}
      {aiDraft && <section className="ai-draft-panel">
        <div className="ai-draft-heading">
          <div><strong>Mon Chic AI – Vorschläge</strong><span>Nichts wird automatisch gespeichert.</span></div>
          <button type="button" className="secondary-button" onClick={applyAllAiSuggestions}>Alle übernehmen</button>
        </div>
        <div className="ai-suggestion-grid">
          {aiFields.filter(fieldItem => {
            const value = aiDraft[fieldItem.key];
            return value !== undefined && value !== null && value !== '';
          }).map(fieldItem => (
            <article key={fieldItem.key} className={`ai-suggestion ai-suggestion--${String(fieldItem.key)}`}>
              <div>
                <small>{fieldItem.label}</small>
                <strong>{Array.isArray(aiDraft[fieldItem.key]) ? (aiDraft[fieldItem.key] as string[]).join(', ') : String(aiDraft[fieldItem.key])}</strong>
                <span>{confidenceLabel(String(fieldItem.key))}</span>
              </div>
              <button type="button" onClick={() => applyAiField(fieldItem.key)}>Übernehmen</button>
            </article>
          ))}
        </div>
      </section>}
    </section>

    <section className="reference-product-row">
      <aside className="capture-card reference-product-photo">
        <div className="capture-heading capture-heading--major">
          <div className="capture-heading-main"><span className="step-badge plain">↺</span><h2>Referenzfoto</h2></div>
        </div>
        <p className="field-help">Katalog-/Lieferantenfoto — dauerhafte Fotokartei zum Vergleich. Wird NIE von der KI analysiert.</p>
        {item.reference_photo_url
          ? <div className="reference-photo-row">
              <div className="reference-photo-thumb"><img src={item.reference_photo_url} alt="Referenzfoto" /></div>
              <div className="reference-photo-info">
                <div
                  className="reference-photo-actions"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px',
                    width: '100%',
                    marginTop: '8px',
                  }}
                >
                  <input
                    id="replace-reference-photo"
                    type="file"
                    accept="image/*"
                    disabled={uploadingReference}
                    onChange={event => {
                      void setReferencePhoto(event.target.files?.[0] || null);
                      event.target.value = '';
                    }}
                    style={{display:'none'}}
                  />
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={uploadingReference}
                    onClick={() => document.getElementById('replace-reference-photo')?.click()}
                    style={{ width: '100%', margin: 0, fontSize: '12px', minHeight: '34px' }}
                  >
                    {uploadingReference ? 'Wird ersetzt …' : 'Ersetzen'}
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={uploadingReference}
                    onClick={() => void removeReferencePhoto()}
                    style={{ width: '100%', margin: 0, fontSize: '12px', minHeight: '34px', color: 'var(--danger)' }}
                  >
                    Löschen
                  </button>
                </div>
              </div>
            </div>
          : <label className="reference-photo-row" tabIndex={0} onPaste={handleReferencePhotoPaste}>
              <span className="reference-upload-mini"><UploadIcon /></span>
              <span className="reference-photo-info"><strong>{uploadingReference ? 'Wird hochgeladen …' : 'Hochladen'}</strong>Klicken oder Strg+V</span>
              <input type="file" accept="image/*" disabled={uploadingReference} onChange={event => { void setReferencePhoto(event.target.files?.[0] || null); event.target.value = ''; }} style={{display:'none'}} />
            </label>}
      </aside>

      <div className="capture-card product-data-card">
        <div className="capture-heading capture-heading--major product-data-heading">
          <div className="capture-heading-main"><span className="step-badge">2.</span><h2>Produktdaten</h2></div>
        </div>

        <div className="product-top-grid">
          <div className="subcard basis-subcard">
            <div className="subcard-header">
              <div className="subcard-header-left">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M8 4v5"/></svg>
                <h3>Basisdaten</h3>
              </div>
              <span className={`status-badge status-${item.status || 'Entwurf'}`}>{item.status || 'Entwurf'}</span>
            </div>
            <div className="form-grid basis-form-grid">
              <label>SKU<input value={item.sku} readOnly /><small>{String(item.sku || '').startsWith('PENDING-') ? 'Temporäre Kennung. Wird beim Speichern nach Auswahl der Unterkategorie automatisch durch die endgültige MCP-SKU ersetzt.' : 'Nach dem ersten Speichern unveränderlich.'}</small></label>
              <label>Status<select value={item.status || 'Entwurf'} onChange={event => update('status', event.target.value)} disabled={String(item.sku || '').startsWith('PENDING-')}><option>Unvollständig</option><option>Entwurf</option><option>Aktiv</option><option>Reserviert</option><option>Verkauft</option><option>Archiv</option></select><small>{String(item.sku || '').startsWith('PENDING-') ? 'Bleibt bis zur erfolgreichen Vergabe der MCP-SKU auf „Unvollständig“.' : ''}</small></label>
              <label>Marke / Designer<input value={item.brand || ''} onChange={event => update('brand', event.target.value)} /></label>
              <label>Herkunft<input value={item.origin || ''} onChange={event => update('origin', event.target.value)} placeholder="z. B. Frankreich" /></label>
              <label>Kategorie<select value={item.category || ''} onChange={event => { update('category', event.target.value); update('subcategory', ''); }}><option value="">Bitte wählen</option>{Object.keys(categories).map(value => <option key={value}>{value}</option>)}</select></label>
              <label>Unterkategorie<select value={item.subcategory || ''} onChange={event => { const value = event.target.value; setItem(previous => { if (!previous) return previous; const derived = deriveDeSize(previous.size_system, previous.original_size, previous.gender, value); return { ...previous, subcategory: value, ...(derived ? { de_size: derived } : {}) }; }); }} disabled={!item.category}><option value="">{item.category ? 'Bitte wählen' : 'Zuerst Kategorie wählen'}</option>{item.category && categories[item.category as CategoryName]?.map(value => <option key={value}>{value}</option>)}</select></label>
              <label>Saison<select value={item.season || 'Ganzjährig'} onChange={event => update('season', event.target.value)}><option>Ganzjährig</option><option>Frühling</option><option>Sommer</option><option>Herbst</option><option>Winter</option><option>Frühling-Sommer</option><option>Frühling-Herbst</option><option>Herbst-Winter</option></select></label>
              <label>Geschlecht<select value={item.gender || 'Damen'} onChange={event => { const value = event.target.value; setItem(previous => { if (!previous) return previous; const derived = deriveDeSize(previous.size_system, previous.original_size, value, previous.subcategory); return { ...previous, gender: value, ...(derived ? { de_size: derived } : {}) }; }); }}><option>Damen</option><option>Herren</option></select></label>
            </div>
          </div>

          <div className="subcard color-subcard">
            <div className="subcard-header">
              <div className="subcard-header-left">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="13.5" cy="6.5" r="2.5"/><circle cx="19" cy="13" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="10" cy="19" r="2.5"/></svg>
                <h3>Farbe</h3>
              </div>
            </div>
            <div className="form-grid color-form-grid">
              <label>Hauptfarbe<select value={item.color || ''} onChange={event => update('color', event.target.value)}><option value="">Bitte wählen</option>{colorCatalog.map(c => <option key={c}>{c}</option>)}</select></label>
              <label>Nebenfarbe<select value={item.secondary_color || ''} onChange={event => update('secondary_color', event.target.value)}><option value="">Keine</option>{colorCatalog.map(c => <option key={c}>{c}</option>)}</select></label>
              <label>Farbhinweis (optional)<input value={item.color_note || ''} onChange={event => update('color_note', event.target.value)} placeholder="z. B. Dunkelblau mit roten Streifen" /></label>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section className="subcard numbered-section section-description">
      <div className="subcard-header">
        <div className="subcard-header-left">
          <svg className="section-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14M5 9h14M5 13h10M5 17h8"/></svg>
          <h3><span className="subcard-number">3.</span> Beschreibung</h3>
        </div>
      </div>
      <div className="form-grid">
        <label className="full">Artikelbeschreibung<textarea value={item.public_description || ''} onChange={event => update('public_description', event.target.value)} placeholder="Fließtext für Website/Schaufenster" /><small>Öffentlich sichtbar für Kunden.</small></label>
        <label className="full">Weitere Eigenschaften<textarea value={item.notes || ''} onChange={event => update('notes', event.target.value)} placeholder="z. B. Applikation am Kragen, Innenfutter aus Seide" /><small>Verkaufsfördernde Details, ebenfalls öffentlich sichtbar.</small></label>
      </div>
    </section>

    <div className="editor-section-grid editor-section-grid--three">
      <section className="subcard numbered-section section-size">
        <div className="subcard-header"><div className="subcard-header-left">
          <svg className="section-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16v10H4zM8 7v4M12 7v4M16 7v4"/></svg>
          <h3><span className="subcard-number">4.</span> Größe</h3>
        </div></div>
        <div className="form-grid size-form-grid">
          <label>Vintage Größe Etikette<input value={item.original_size || ''} onChange={event => { const value = event.target.value; setItem(previous => { if (!previous) return previous; const derived = deriveDeSize(previous.size_system, value, previous.gender, previous.subcategory); return { ...previous, original_size: value, ...(derived ? { de_size: derived } : {}) }; }); }} /></label>
          <label>Größensystem<select value={item.size_system || 'DE'} onChange={event => { const value = event.target.value; setItem(previous => { if (!previous) return previous; const derived = deriveDeSize(value, previous.original_size, previous.gender, previous.subcategory); return { ...previous, size_system: value, ...(derived ? { de_size: derived } : {}) }; }); }}><option>DE</option><option>FR</option><option>IT</option><option>UK</option><option>US</option><option>One Size</option></select></label>
          <label>Reale Größe heute<input value={item.de_size || ''} onChange={event => update('de_size', event.target.value)} /><small>Bei FR (Damen) und bei IT/UK/US-Zahlengrößen automatisch berechnet, sonst manuell eintragen.</small></label>
          <label>Internationale Größe<input value={item.international_size || ''} onChange={event => update('international_size', event.target.value)} /></label>
          <label className="full">Passform<select value={item.fit || ''} onChange={event => update('fit', event.target.value)}><option value="">Standard (kein Hinweis)</option><option>Fällt kleiner aus</option><option>Fällt größer aus</option></select></label>
        </div>
      </section>

      <section className="subcard numbered-section section-measures">
        <div className="subcard-header"><div className="subcard-header-left">
          <svg className="section-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14v16H5zM9 4v16M5 9h4"/></svg>
          <h3><span className="subcard-number">5.</span> Maße & Notizen</h3>
        </div></div>
        <div className="form-grid single-column-form">
          <label>Maße<textarea value={item.measurements || ''} onChange={event => update('measurements', event.target.value)} /></label>
          <label>Besonderheiten / Mängel<textarea value={item.flaws || ''} onChange={event => update('flaws', event.target.value)} /></label>
          <label className="internal-field">Interne Notizen 🔒<textarea value={item.internal_notes || ''} onChange={event => update('internal_notes', event.target.value)} /></label>
        </div>
      </section>

      <section className="subcard numbered-section section-condition compact-reference-fields">
        <div className="subcard-header"><div className="subcard-header-left">
          <svg className="section-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg>
          <h3><span className="subcard-number">6.</span> Zustand & Herkunft</h3>
        </div></div>
        <div className="form-grid single-column-form">
          <label>Zustand<select value={item.condition || 'Sehr gut'} onChange={event => update('condition', event.target.value)}><option>Neu mit Etikett</option><option>Neuwertig</option><option>Sehr gut</option><option>Gut</option><option>Akzeptabel</option></select></label>
          <label>Epoche<input value={item.era || ''} onChange={event => update('era', event.target.value)} placeholder="z. B. 1970er" /></label>
          <label className="internal-field">Echtheitsstatus 🔒<select value={item.authenticity_status || 'Zu prüfen'} onChange={event => update('authenticity_status', event.target.value)}><option>Zu prüfen</option><option>Geprüft</option><option>Authentisch</option><option>Nicht bestätigt</option></select></label>
        </div>
      </section>
    </div>

    <div className="editor-section-grid editor-section-grid--three">
      <section className="subcard numbered-section section-occasions">
        <div className="subcard-header"><div className="subcard-header-left">
          <svg className="section-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l4 4L19 6"/></svg>
          <h3><span className="subcard-number">7.</span> Anlässe</h3>
        </div></div>
        <fieldset className="occasion-fieldset"><div className="occasion-scroll">{occasionGroups.map(group => <section key={group.label} className="occasion-group"><h3>{group.label}</h3><div className="occasion-options">{group.options.map(option => <label key={option} className={`occasion-option${(item.occasions || []).includes(option) ? ' selected' : ''}`}><input type="checkbox" checked={(item.occasions || []).includes(option)} onChange={() => toggleOccasion(option)} /><span>{option}</span></label>)}</div></section>)}</div></fieldset>
      </section>

      <section className="subcard numbered-section section-style">
        <div className="subcard-header"><div className="subcard-header-left">
          <svg className="section-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5c0-1.7 1.3-3 3-3s3 1.3 3 3c0 1.1-.6 1.7-1.1 2.3M8 9h8l2 4v5H6v-5l2-4z"/></svg>
          <h3><span className="subcard-number">8.</span> Stilrichtungen</h3>
        </div></div>
        <div className="form-grid single-column-form">
          <label>MON-CHIC-Stilrichtung<select value={item.style_key || ''} onChange={event => update('style_key', event.target.value)}><option value="">Bitte wählen</option>{styleCatalog.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}</select></label>
        </div>
      </section>

      <section className="subcard numbered-section section-material">
        <div className="subcard-header"><div className="subcard-header-left">
          <svg className="section-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14v4H5zM5 13h14M5 18h10"/></svg>
          <h3><span className="subcard-number">9.</span> Material & Pflege</h3>
        </div></div>
        <div className="form-grid single-column-form">
          <label>Material<input value={item.material || ''} onChange={event => { const value = event.target.value; setItem(previous => previous ? { ...previous, material: value, care_instructions: previous.care_instructions ? previous.care_instructions : deriveCareInstructions(value) } : previous); }} /></label>
          <label>Muster<input value={item.pattern || ''} onChange={event => update('pattern', event.target.value)} /></label>
          <label>Pflegehinweise<textarea value={item.care_instructions || ''} onChange={event => update('care_instructions', event.target.value)} placeholder={deriveCareInstructions(item.material) || 'Bitte Pflegeetikett beachten.'} /><small>Regelbasiert aus dem Material abgeleitet, kann angepasst werden.</small></label>
        </div>
      </section>
    </div>

    <div className="editor-section-grid editor-section-grid--three editor-bottom-grid">
      <section className="subcard numbered-section compact-reference-fields">
        <div className="subcard-header"><div className="subcard-header-left">
          <svg className="section-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 6h14v12H5zM8 10h8M8 14h5"/></svg>
          <h3><span className="subcard-number">10.</span> Preise</h3>
        </div></div>
        <div className="form-grid single-column-form">
          <label>Verkaufspreis (€)<input type="number" min="0" step="0.01" value={item.sale_price ?? ''} onChange={event => update('sale_price', event.target.value ? Number(event.target.value) : null)} /></label>
          <label className="internal-field">Ehemaliger Wert 🔒 (€)<input type="number" min="0" step="0.01" value={item.original_retail_value ?? ''} onChange={event => update('original_retail_value', event.target.value ? Number(event.target.value) : null)} /><small>Preis beim ursprünglichen Neukauf.</small></label>
        </div>
      </section>

      <section className="subcard numbered-section warehouse-section">
        <div className="subcard-header"><div className="subcard-header-left">
          <svg className="section-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9l8-5 8 5v10H4zM8 13h8v6H8z"/></svg>
          <h3><span className="subcard-number">11.</span> Lager &amp; Inventur</h3>
        </div></div>
        <div className="form-grid warehouse-form-grid">
          <label>Lagerort<select value={item.warehouse_location || ''} onChange={event => update('warehouse_location', event.target.value)}><option value="">Bitte wählen</option>{warehouseLocations.map(value => <option key={value}>{value}</option>)}</select></label>
          <label>Wo / Bereich<input value={item.warehouse_area || ''} onChange={event => update('warehouse_area', event.target.value)} placeholder="z. B. REGAL 1 - IKEA Box Samla (45 L)" /></label>
          <label>Lagerplatz<input value={item.warehouse_place || ''} onChange={event => update('warehouse_place', event.target.value)} placeholder="z. B. Etage 5" /></label>
          <label>Lagerbezeichnung<input value={item.warehouse_code || ''} onChange={event => update('warehouse_code', event.target.value)} placeholder="z. B. REG1-E5-1" /></label>
          <label>Letzte Inventur<input type="date" value={item.last_inventory_at ? item.last_inventory_at.slice(0,10) : ''} onChange={event => update('last_inventory_at', event.target.value || null)} /></label>
          <label className="full">Letzte Bewegung<input value={item.last_movement_at ? new Date(item.last_movement_at).toLocaleString('de-DE') : 'Noch keine Bewegung erfasst'} readOnly /></label>
        </div>
      </section>

      <section className="subcard numbered-section compact-reference-fields reference-order-section">
        <div className="subcard-header"><div className="subcard-header-left">
          <svg className="section-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v12H4zM7 10h10M7 14h7"/></svg>
          <h3><span className="subcard-number">13.</span> Referenzen &amp; Bestellung</h3>
        </div></div>
        <div className="form-grid single-column-form">
          <label>Referenznummer (intern)<input value={item.supplier_reference || ''} onChange={event => update('supplier_reference', event.target.value)} placeholder="z. B. 8912368-1" /></label>
          <label>Artikel-Nr. / Bestellung<input value={item.supplier_order_number || ''} onChange={event => update('supplier_order_number', event.target.value)} placeholder="z. B. 133357183" /></label>
        </div>
      </section>
    </div>

    <section className="subcard numbered-section purchase-tax-section purchase-tax-section--wide">
      <div className="subcard-header"><div className="subcard-header-left">
        <svg className="section-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18H6zM9 7h6M9 11h6M9 15h4"/></svg>
        <h3><span className="subcard-number">12.</span> Ankauf &amp; steuerliche Einordnung</h3>
      </div></div>

      <div className="purchase-tax-top">
        <div className="purchase-tax-group purchase-tax-group--top">
          <h3>Ankauf &amp; Zahlung</h3>
          <div className="form-grid purchase-tax-grid">
            <label>Kaufdatum<input type="date" value={item.purchase_date || ''} onChange={event => update('purchase_date', event.target.value)} /></label>
            <label>Einkaufsquelle<select value={item.purchase_source || ''} onChange={event => update('purchase_source', event.target.value)}><option value="">Bitte wählen</option><option>Remix</option><option>Vinted</option><option>Momox</option><option>Flohmarkt</option><option>eBay</option><option>Kleinanzeigen</option><option>Vestiaire Collective</option><option>Sonstige</option></select></label>
            <label>Verkäufer / Nutzername<input value={item.seller_name || ''} onChange={event => update('seller_name', event.target.value)} /></label>
            <label>Verkäuferart<select value={item.seller_type || ''} onChange={event => update('seller_type', event.target.value)}><option value="">Bitte wählen</option><option>Privatperson</option><option>Unternehmen</option><option>Plattform / Händler</option><option>Unklar</option></select></label>
            <label>Rechnungsnummer<input value={item.invoice_number || ''} onChange={event => update('invoice_number', event.target.value)} /></label>
            <label>Zahlungsart<select value={item.payment_method || ''} onChange={event => update('payment_method', event.target.value)}><option value="">Bitte wählen</option><option>PayPal</option><option>Karte</option><option>Banküberweisung</option><option>Bar</option><option>Sonstige</option></select></label>
            <label className="full">Zahlungsreferenz<input value={item.payment_reference || ''} onChange={event => update('payment_reference', event.target.value)} placeholder="z. B. PayPal-Transaktions-ID / Kontoauszug-Referenz" /></label>
          </div>
        </div>
        <div className="tax-orientation-card tax-orientation-card--top">
          <strong>ⓘ Ankauf &amp; Steuer – Kurzorientierung</strong>
          <p><b>1. Du hast den Artikel gezielt für MON CHIC / zum späteren Verkauf gekauft</b><br />
          → bei <b>Kaufzweck</b> auswählen: <b>„Zum Wiederverkauf gekauft“</b><br />
          → bei <b>Steuerliche Herkunft</b> auswählen: <b>„Vorweggenommener betrieblicher Wareneinkauf / Gründungsbestand“</b></p>
          <p><b>2. Du hattest bereits eine konkrete Gründungsabsicht, aber dieser Artikel lässt sich nicht eindeutig zuordnen</b><br />
          → bei <b>Kaufzweck</b> auswählen: <b>„Gründungsabsicht / Zuordnung zu prüfen“</b><br />
          → bei <b>Steuerliche Herkunft</b> auswählen: <b>„Zu prüfen“</b><br />
          → bei <b>Prüfstatus</b> auswählen: <b>„Zu prüfen“</b><br />
          → im Feld <b>„Vermerk / Klärung mit Steuerberater“</b> kurz dokumentieren, warum der Fall unklar ist.</p>
          <p><b>3. Du hast den Artikel ursprünglich wirklich privat für dich gekauft und erst später entschieden, ihn über MON CHIC zu verkaufen</b><br />
          → bei <b>Kaufzweck</b> auswählen: <b>„Ursprünglich privat gekauft“</b><br />
          → bei <b>Steuerliche Herkunft</b> auswählen: <b>„Privateinlage“</b><br />
          → anschließend <b>Einlagedatum</b>, <b>Einlagewert</b> und <b>Bewertung / Ermittlung Einlagewert</b> ausfüllen.</p>
          <p><b>Wichtig:</b> Das Kaufjahr allein entscheidet nicht. Maßgeblich ist vor allem, <b>warum der Artikel ursprünglich gekauft wurde</b>. Wenn du unsicher bist, immer <b>„Zu prüfen“</b> wählen und den Fall im Steuerberater-Vermerk dokumentieren.</p>
        </div>
      </div>

      <div className="purchase-tax-group">
        <h3>Kosten &amp; Sammelbestellung</h3>
        <div className="form-grid purchase-tax-grid purchase-cost-grid">
          <label>Einkaufspreis Artikel (€)<input type="number" min="0" step="0.01" value={item.purchase_price ?? ''} onChange={event => updatePurchaseCost('purchase_price', event.target.value ? Number(event.target.value) : null)} /><small>Preis, den du für diesen Artikel bezahlt hast.</small></label>
          <label>Versand Bestellung gesamt (€)<input type="number" min="0" step="0.01" value={item.purchase_shipping_total ?? ''} onChange={event => update('purchase_shipping_total', event.target.value ? Number(event.target.value) : null)} /><small>Gesamtwert der Bestellung; bei Sammelbestellungen nicht vollständig diesem Artikel zurechnen.</small></label>
          <label>Gebühren Bestellung gesamt (€)<input type="number" min="0" step="0.01" value={item.purchase_fees_total ?? ''} onChange={event => update('purchase_fees_total', event.target.value ? Number(event.target.value) : null)} /><small>Gesamtwert der Bestellung.</small></label>
          <label>Nebenkostenanteil Artikel (€)<input type="number" min="0" step="0.01" value={item.purchase_extra_cost_share ?? ''} onChange={event => updatePurchaseCost('purchase_extra_cost_share', event.target.value ? Number(event.target.value) : null)} /><small>Anteil von Versand/Gebühren für diesen Artikel.</small></label>
          <label>Anschaffungskosten gesamt (€)<input type="number" value={(Number(item.purchase_price || 0) + Number(item.purchase_extra_cost_share || 0)).toFixed(2)} readOnly /><small>Automatisch ohne KI: Einkaufspreis Artikel + Nebenkostenanteil Artikel.</small></label>
        </div>
      </div>

      <div className="purchase-tax-group">
        <h3>Kaufzweck &amp; steuerliche Herkunft</h3>
        <div className="form-grid purchase-tax-grid">
          <label>Kaufzweck<select value={item.purchase_purpose || ''} onChange={event => update('purchase_purpose', event.target.value)}><option value="">Bitte wählen</option><option>Zum Wiederverkauf gekauft</option><option>Ursprünglich privat gekauft</option><option>Gründungsabsicht / Zuordnung zu prüfen</option></select><small>Der ursprüngliche Kaufzweck ist wichtiger als das Kaufjahr allein.</small></label>
          <label>Steuerliche Herkunft<select value={item.tax_origin || ''} onChange={event => update('tax_origin', event.target.value)}><option value="">Bitte wählen</option><option>Regulärer betrieblicher Wareneinkauf</option><option>Vorweggenommener betrieblicher Wareneinkauf / Gründungsbestand</option><option>Privateinlage</option><option>Zu prüfen</option></select><small>Keine automatische Festlegung nur nach Jahr. Bei älteren oder unklaren Käufen prüfen.</small></label>
        </div>
      </div>

      <div className="purchase-tax-group">
        <h3>Privateinlage</h3>
        <div className="form-grid purchase-tax-grid">
          <label>Einlagedatum<input type="date" value={item.contribution_date || ''} onChange={event => update('contribution_date', event.target.value)} /><small>Tag, an dem der zuvor private Artikel dem Betrieb zugeführt wird – nicht das ursprüngliche Kaufdatum.</small></label>
          <label>Einlagewert (€)<input type="number" min="0" step="0.01" value={item.contribution_value ?? ''} onChange={event => update('contribution_value', event.target.value ? Number(event.target.value) : null)} /><small>Bewertungswert der Privateinlage; bei Unsicherheit steuerlich prüfen lassen.</small></label>
          <label className="full">Bewertung / Ermittlung Einlagewert<textarea value={item.contribution_valuation_note || ''} onChange={event => update('contribution_valuation_note', event.target.value)} placeholder="Ermittlung/Begründung und Beleg dokumentieren." /></label>
        </div>
      </div>

      <div className="purchase-tax-group">
        <h3>§25a &amp; Belege</h3>
        <div className="form-grid purchase-tax-grid">
          <label>§25a-Status<select value={item.margin_scheme_status || ''} onChange={event => update('margin_scheme_status', event.target.value)}><option value="">Bitte wählen</option><option>Zu prüfen</option><option>§25a möglich</option><option>§25a bestätigt</option><option>Nicht §25a</option></select><small>Differenzbesteuerung nicht automatisch festlegen; Voraussetzungen und Nachweise prüfen.</small></label>
          <label>Belegpaket<select value={item.receipt_package_status || ''} onChange={event => update('receipt_package_status', event.target.value)}><option value="">Bitte wählen</option><option>Nicht vorhanden</option><option>Unvollständig</option><option>Vollständig</option></select><small>Einkaufs-/Transaktionsnachweis, Zahlungsnachweis und ggf. Eigenbeleg zusammenhalten.</small></label>
          <label className="full">Belegpaket / Ablagereferenz<input value={item.receipt_package_reference || ''} onChange={event => update('receipt_package_reference', event.target.value)} placeholder="z. B. RES-001.pdf" /></label>
          <label>Eigenbeleg<select value={(item.purchase_source === 'Remix' && !!(item.supplier_order_number || item.invoice_number)) ? 'Nicht erforderlich' : (item.self_receipt_status || '')} disabled={item.purchase_source === 'Remix' && !!(item.supplier_order_number || item.invoice_number)} onChange={event => update('self_receipt_status', event.target.value)}><option value="">Bitte wählen</option><option>Nicht erforderlich</option><option>Erforderlich</option><option>Vorhanden</option></select><small>{item.purchase_source === 'Remix' && !!(item.supplier_order_number || item.invoice_number) ? 'Nicht erforderlich – Remix-Bestellnachweis vorhanden.' : 'Bei fehlendem Fremdbeleg prüfen, ob ein Eigenbeleg benötigt wird.'}</small></label>
          <label>Eigenbeleg-ID<input value={item.self_receipt_id || ''} disabled={item.purchase_source === 'Remix' && !!(item.supplier_order_number || item.invoice_number)} onChange={event => update('self_receipt_id', event.target.value)} placeholder="z. B. RES-001" /></label>
        </div>
      </div>

      <div className="purchase-tax-group">
        <h3>Steuerberater-Prüfung</h3>
        <div className="form-grid purchase-tax-grid">
          <label>Prüfstatus<select value={item.tax_review_status || ''} onChange={event => update('tax_review_status', event.target.value)}><option value="">Bitte wählen</option><option>Offen</option><option>Zu prüfen</option><option>Geklärt</option></select></label>
          <label className="full">Vermerk / Klärung mit Steuerberater<textarea value={item.tax_note || ''} onChange={event => update('tax_note', event.target.value)} placeholder="z. B. Kauf 2025 im Zeitraum der Gründungskonkretisierung – Einordnung prüfen." /></label>
        </div>
      </div>
    </section>

    <style jsx>{`
      .numbered-section .subcard-header-left { display: flex; align-items: center; gap: 8px; }
      .numbered-section .subcard-header-left h3 { margin: 0; }
      .section-icon { width: 18px; height: 18px; flex: 0 0 18px; fill: none; stroke: #bea175; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
      .numbered-section label, .numbered-section small { white-space: normal !important; overflow: visible !important; text-overflow: clip !important; overflow-wrap: anywhere; }
      .numbered-section label { min-width: 0; height: auto !important; }
      .purchase-tax-section--wide { width: 100%; margin-top: 18px; }
      .purchase-tax-top { display: grid; grid-template-columns: minmax(0, 2fr) minmax(300px, .9fr); gap: 20px; align-items: start; }
      .purchase-tax-group { padding: 16px 0; border-top: 1px solid rgba(50,37,29,.12); }
      .purchase-tax-group--top { border-top: 0; padding-top: 4px; }
      .purchase-tax-group h3 { margin: 0 0 12px; font-size: 15px; line-height: 1.3; }
      .purchase-tax-grid { grid-template-columns: repeat(3,minmax(0,1fr)); gap: 14px 18px; }
      .purchase-cost-grid { grid-template-columns: repeat(5,minmax(0,1fr)); }
      .purchase-tax-grid label, .purchase-tax-grid small, .tax-orientation-card { white-space: normal !important; overflow: visible !important; text-overflow: clip !important; overflow-wrap: anywhere; }
      .purchase-tax-grid label { min-width: 0; height: auto !important; }
      .purchase-tax-grid small { display: block; line-height: 1.45; margin-top: 6px; }
      .purchase-tax-grid .full { grid-column: 1 / -1; }
      .tax-orientation-card { padding: 14px 16px; border: 1px solid rgba(190,161,117,.45); border-radius: 12px; background: rgba(250,246,240,.7); font-size: 12px; line-height: 1.55; }
      .tax-orientation-card p { margin: 7px 0 0; }
      .reference-order-section .single-column-form { grid-template-columns: 1fr; }
      @media (max-width:1250px) { .purchase-cost-grid { grid-template-columns: repeat(3,minmax(0,1fr)); } }
      @media (max-width:1100px) { .purchase-tax-top { grid-template-columns: 1fr; } .purchase-tax-grid { grid-template-columns: repeat(2,minmax(0,1fr)); } .purchase-cost-grid { grid-template-columns: repeat(2,minmax(0,1fr)); } }
      @media (max-width:720px) { .purchase-tax-grid, .purchase-cost-grid { grid-template-columns: 1fr; } .purchase-tax-grid .full { grid-column: auto; } }
    `}</style>

    <div className="save-bar">
      <button type="button" className="danger-button" onClick={remove}>Artikel löschen</button>
      <button type="button" className="primary-button" onClick={save} disabled={saving}>{saving ? 'Speichert …' : 'Änderungen speichern'}</button>
    </div>
    {message && <div className={`form-message${message.includes('gespeichert') ? ' success' : ''}`}>{message}</div>}
  </div>;
}
