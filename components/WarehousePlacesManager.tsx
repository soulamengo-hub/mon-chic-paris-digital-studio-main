'use client';

import { useEffect, useMemo, useState } from 'react';

type WarehousePlace = {
  id: string;
  warehouse_location: string | null;
  warehouse_area: string | null;
  warehouse_place: string | null;
  warehouse_code: string | null;
  storage_type: string | null;
  container_name: string | null;
  container_quantity: number | null;
  dimensions: string | null;
  source_sheet: string | null;
  notes: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type FormState = {
  warehouse_location: string;
  warehouse_area: string;
  warehouse_place: string;
  warehouse_code: string;
  storage_type: string;
  container_name: string;
  container_quantity: string;
  dimensions: string;
  notes: string;
};

type StoredProduct = {
  id: string;
  sku: string | null;
  supplier_order_number: string | null;
  supplier_reference: string | null;
  brand: string | null;
  public_title: string | null;
  season: string | null;
  status: string | null;
  warehouse_location: string | null;
  warehouse_area: string | null;
  warehouse_place: string | null;
  warehouse_code: string | null;
};

type PendingAssignment = {
  id: string;
  article_number: string;
  warehouse_location: string | null;
  warehouse_area: string | null;
  warehouse_place: string | null;
  warehouse_code: string | null;
  season: string | null;
  brand: string | null;
  source_sheet: string | null;
  source_row: number | null;
  status: string | null;
};

const EMPTY_FORM: FormState = {
  warehouse_location: 'MyPlace',
  warehouse_area: '',
  warehouse_place: '',
  warehouse_code: '',
  storage_type: '',
  container_name: '',
  container_quantity: '',
  dimensions: '',
  notes: '',
};

const AREA_SUGGESTIONS = [
  'Keller',
  'Flur',
  'Schlafzimmer',
  'Dachboden',
  'Boden',
  'Regal 1',
  'Regal 2',
];

const TYPE_SUGGESTIONS = [
  'Box',
  'Kleiderstange',
  'Regal',
  'Bodenplatz',
  'Sonstiges',
];

function normalize(value: string | null | undefined) {
  return String(value ?? '').trim();
}

function isIncomplete(place: WarehousePlace) {
  return (
    !normalize(place.warehouse_location) ||
    !normalize(place.warehouse_area) ||
    !normalize(place.warehouse_place) ||
    !normalize(place.warehouse_code)
  );
}

function formFromRow(row: WarehousePlace): FormState {
  return {
    warehouse_location: normalize(row.warehouse_location) || 'MyPlace',
    warehouse_area: normalize(row.warehouse_area),
    warehouse_place: normalize(row.warehouse_place),
    warehouse_code: normalize(row.warehouse_code),
    storage_type: normalize(row.storage_type),
    container_name: normalize(row.container_name),
    container_quantity:
      row.container_quantity == null ? '' : String(row.container_quantity),
    dimensions: normalize(row.dimensions),
    notes: normalize(row.notes),
  };
}

async function readJsonSafely(res: Response) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

export default function WarehousePlacesManager() {
  const [items, setItems] = useState<WarehousePlace[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [query, setQuery] = useState('');
  const [pendingItems, setPendingItems] = useState<PendingAssignment[]>([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [pendingQuery, setPendingQuery] = useState('');
  const [products, setProducts] = useState<StoredProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [overviewQuery, setOverviewQuery] = useState('');
  const [showOverview, setShowOverview] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showPlaces, setShowPlaces] = useState(false);
  const [showPending, setShowPending] = useState(false);

  async function load() {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/warehouse', { cache: 'no-store' });
      const data = await readJsonSafely(res);

      if (!res.ok) {
        throw new Error(
          data?.error || 'Lagerplätze konnten nicht geladen werden.',
        );
      }

      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler.');
    } finally {
      setLoading(false);
    }
  }

  async function loadPending() {
    setPendingLoading(true);

    try {
      const res = await fetch('/api/warehouse/pending', { cache: 'no-store' });
      const data = await readJsonSafely(res);

      if (!res.ok) {
        throw new Error(
          data?.error || 'Offene Lagerzuordnungen konnten nicht geladen werden.',
        );
      }

      setPendingItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler.');
    } finally {
      setPendingLoading(false);
    }
  }


  async function loadProducts() {
    setProductsLoading(true);
    try {
      const res = await fetch('/api/products', { cache: 'no-store' });
      const data = await readJsonSafely(res);
      if (!res.ok) throw new Error(data?.error || 'Artikel konnten nicht geladen werden.');
      setProducts(Array.isArray(data) ? data : Array.isArray(data?.products) ? data.products : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler.');
    } finally {
      setProductsLoading(false);
    }
  }

  useEffect(() => {
    void load();
    void loadPending();
    void loadProducts();
  }, []);

  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) return items;

    return items.filter((item) =>
      [
        item.warehouse_location,
        item.warehouse_area,
        item.warehouse_place,
        item.warehouse_code,
        item.storage_type,
        item.container_name,
        item.dimensions,
        item.notes,
        item.source_sheet,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(text),
    );
  }, [items, query]);

  const openPending = useMemo(
    () =>
      pendingItems.filter(
        (item) => normalize(item.status).toLowerCase() !== 'erledigt',
      ),
    [pendingItems],
  );

  const filteredPending = useMemo(() => {
    const text = pendingQuery.trim().toLowerCase();
    if (!text) return openPending;

    return openPending.filter((item) =>
      [
        item.article_number,
        item.brand,
        item.season,
        item.warehouse_location,
        item.warehouse_area,
        item.warehouse_place,
        item.warehouse_code,
        item.source_sheet,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(text),
    );
  }, [openPending, pendingQuery]);


  const storedProducts = useMemo(
    () =>
      products.filter(
        (product) =>
          normalize(product.warehouse_location) ||
          normalize(product.warehouse_area) ||
          normalize(product.warehouse_place) ||
          normalize(product.warehouse_code),
      ),
    [products],
  );

  const overviewRows = useMemo(() => {
    const map = new Map<string, {
      key: string;
      warehouse_location: string;
      warehouse_area: string;
      warehouse_place: string;
      warehouse_code: string;
      actual: StoredProduct[];
      pending: PendingAssignment[];
    }>();

    const add = (
      warehouse_location: string | null | undefined,
      warehouse_area: string | null | undefined,
      warehouse_place: string | null | undefined,
      warehouse_code: string | null | undefined,
      kind: 'actual' | 'pending',
      value: StoredProduct | PendingAssignment,
    ) => {
      const location = normalize(warehouse_location);
      const area = normalize(warehouse_area);
      const place = normalize(warehouse_place);
      const code = normalize(warehouse_code);
      const key = [location, area, place, code].join('||').toLowerCase();
      if (!map.has(key)) {
        map.set(key, { key, warehouse_location: location, warehouse_area: area, warehouse_place: place, warehouse_code: code, actual: [], pending: [] });
      }
      const row = map.get(key)!;
      if (kind === 'actual') row.actual.push(value as StoredProduct);
      else row.pending.push(value as PendingAssignment);
    };

    items.forEach((place) =>
      add(place.warehouse_location, place.warehouse_area, place.warehouse_place, place.warehouse_code, 'actual', null as unknown as StoredProduct),
    );
    storedProducts.forEach((product) =>
      add(product.warehouse_location, product.warehouse_area, product.warehouse_place, product.warehouse_code, 'actual', product),
    );
    openPending.forEach((pending) =>
      add(pending.warehouse_location, pending.warehouse_area, pending.warehouse_place, pending.warehouse_code, 'pending', pending),
    );

    // Remove placeholder entries used only to make empty master places visible.
    map.forEach((row) => { row.actual = row.actual.filter(Boolean); });

    return Array.from(map.values()).sort((a, b) =>
      [a.warehouse_location, a.warehouse_area, a.warehouse_place, a.warehouse_code]
        .join(' ')
        .localeCompare([b.warehouse_location, b.warehouse_area, b.warehouse_place, b.warehouse_code].join(' '), 'de'),
    );
  }, [items, storedProducts, openPending]);

  const filteredOverview = useMemo(() => {
    const q = overviewQuery.trim().toLowerCase();
    if (!q) return overviewRows;
    return overviewRows.filter((row) => {
      const articleText = row.actual.map((p) =>
        [p.sku, p.supplier_order_number, p.supplier_reference, p.brand, p.public_title].filter(Boolean).join(' '),
      ).join(' ');
      const pendingText = row.pending.map((p) => [p.article_number, p.brand, p.season].filter(Boolean).join(' ')).join(' ');
      return [row.warehouse_location, row.warehouse_area, row.warehouse_place, row.warehouse_code, articleText, pendingText]
        .filter(Boolean).join(' ').toLowerCase().includes(q);
    });
  }, [overviewRows, overviewQuery]);

  const stats = useMemo(() => {
    const areas = new Set(
      items.map((item) => normalize(item.warehouse_area)).filter(Boolean),
    );

    return {
      total: items.length,
      areas: areas.size,
      incomplete: items.filter(isIncomplete).length,
      containers: items.filter(
        (item) =>
          normalize(item.storage_type).toLowerCase().includes('box') ||
          normalize(item.container_name),
      ).length,
    };
  }, [items]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetForm() {
    setShowForm(true);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError('');
    setMessage('');
  }

  function startEdit(item: WarehousePlace) {
    setShowForm(true);
    setEditingId(item.id);
    setForm(formFromRow(item));
    setError('');
    setMessage(
      `Bearbeitung geöffnet: ${
        normalize(item.warehouse_code) ||
        normalize(item.warehouse_place) ||
        'Lagerplatz'
      }`,
    );

    window.setTimeout(() => {
      document
        .getElementById('warehouse-form')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  }

  async function save() {
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const payload = {
        warehouse_location: form.warehouse_location.trim() || 'MyPlace',
        warehouse_area: form.warehouse_area.trim() || null,
        warehouse_place: form.warehouse_place.trim() || null,
        warehouse_code: form.warehouse_code.trim() || null,
        storage_type: form.storage_type.trim() || null,
        container_name: form.container_name.trim() || null,
        container_quantity:
          form.container_quantity.trim() === ''
            ? null
            : Number(form.container_quantity),
        dimensions: form.dimensions.trim() || null,
        notes: form.notes.trim() || null,
      };

      const wasEditing = Boolean(editingId);
      const url = editingId
        ? `/api/warehouse/${encodeURIComponent(editingId)}`
        : '/api/warehouse';

      const res = await fetch(url, {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await readJsonSafely(res);

      if (!res.ok) {
        throw new Error(
          data?.error || 'Lagerplatz konnte nicht gespeichert werden.',
        );
      }

      setEditingId(null);
      setForm(EMPTY_FORM);
      await load();
      setMessage(
        wasEditing ? 'Änderungen gespeichert.' : 'Lagerplatz angelegt.',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler.');
    } finally {
      setSaving(false);
    }
  }

  async function remove(item: WarehousePlace) {
    const label =
      normalize(item.warehouse_code) ||
      normalize(item.warehouse_place) ||
      normalize(item.container_name) ||
      'diesen Lagerplatz';

    if (!window.confirm(`"${label}" wirklich löschen?`)) return;

    setDeletingId(item.id);
    setError('');
    setMessage('');

    try {
      const res = await fetch(
        `/api/warehouse/${encodeURIComponent(item.id)}`,
        { method: 'DELETE' },
      );

      const data = await readJsonSafely(res);

      if (!res.ok) {
        throw new Error(
          data?.error || 'Lagerplatz konnte nicht gelöscht werden.',
        );
      }

      setItems((current) => current.filter((row) => row.id !== item.id));

      if (editingId === item.id) {
        setEditingId(null);
        setForm(EMPTY_FORM);
      }

      setMessage('Lagerplatz gelöscht.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="warehouse-manager">
      <div className="warehouse-head">
        <div>
          <p className="warehouse-eyebrow">LAGERPLÄTZE &amp; BOXEN</p>
          <h2>Lagerverwaltung</h2>
          <p className="warehouse-intro">
            Lagerorte, Bereiche, Boxen und Kleiderstangen verwalten. Fehlende
            Lagerbezeichnungen können später ergänzt werden.
          </p>
        </div>

        <button
          type="button"
          className="warehouse-button secondary"
          onClick={resetForm}
        >
          + Neuer Lagerplatz
        </button>
      </div>

      <div className="warehouse-stats">
        <div className="warehouse-stat">
          <strong>{stats.total}</strong>
          <span>Lagerplätze</span>
        </div>
        <div className="warehouse-stat">
          <strong>{stats.areas}</strong>
          <span>Bereiche</span>
        </div>
        <div className="warehouse-stat">
          <strong>{stats.containers}</strong>
          <span>Boxen / Behälter</span>
        </div>
        <div className="warehouse-stat">
          <strong>{stats.incomplete}</strong>
          <span>Unvollständig</span>
        </div>
        <div className="warehouse-stat pending">
          <strong>{openPending.length}</strong>
          <span>Offene Lagerzuordnungen</span>
        </div>
      </div>

      <div className="warehouse-collapse-card" id="warehouse-form">
        <button type="button" className="warehouse-collapse-head" onClick={() => setShowForm((v) => !v)}>
          <span>
            <strong>{editingId ? 'Lagerplatz bearbeiten' : 'Lagerplatz anlegen'}</strong>
            <small>{editingId ? 'Bearbeitung ist aktiv' : 'Neuen Lagerplatz manuell erfassen'}</small>
          </span>
          <span className="warehouse-collapse-action">{showForm ? '▲ Schließen' : '▼ Anzeigen'}</span>
        </button>
        {showForm ? (
          <div className="warehouse-form-card warehouse-collapsed-content">
        <div className="warehouse-form-title">
          <div>
            <h3>{editingId ? 'Lagerplatz bearbeiten' : 'Lagerplatz anlegen'}</h3>
            <p>
              <strong>MyPlace</strong> ist vorausgefüllt und kann jederzeit
              geändert werden.
            </p>
          </div>

          {editingId ? (
            <button
              type="button"
              className="warehouse-link-button"
              onClick={resetForm}
            >
              Bearbeitung abbrechen
            </button>
          ) : null}
        </div>

        <div className="warehouse-grid">
          <label>
            <span>Lagerort</span>
            <input
              value={form.warehouse_location}
              onChange={(event) =>
                updateField('warehouse_location', event.target.value)
              }
              placeholder="MyPlace"
            />
          </label>

          <label>
            <span>Wo / Bereich</span>
            <input
              list="warehouse-area-suggestions"
              value={form.warehouse_area}
              onChange={(event) =>
                updateField('warehouse_area', event.target.value)
              }
              placeholder="z. B. Keller, Schlafzimmer, Dachboden"
            />
            <datalist id="warehouse-area-suggestions">
              {AREA_SUGGESTIONS.map((value) => (
                <option value={value} key={value} />
              ))}
            </datalist>
          </label>

          <label>
            <span>Lagerplatz</span>
            <input
              value={form.warehouse_place}
              onChange={(event) =>
                updateField('warehouse_place', event.target.value)
              }
              placeholder="z. B. Boden 1 – Box 45 L Blumen"
            />
          </label>

          <label>
            <span>Lagerbezeichnung</span>
            <input
              value={form.warehouse_code}
              onChange={(event) =>
                updateField('warehouse_code', event.target.value)
              }
              placeholder="z. B. Bo-1-1 oder REG1-E5-1"
            />
            <small>Darf zunächst leer bleiben.</small>
          </label>

          <label>
            <span>Art</span>
            <input
              list="warehouse-type-suggestions"
              value={form.storage_type}
              onChange={(event) =>
                updateField('storage_type', event.target.value)
              }
              placeholder="Box, Kleiderstange, Regal …"
            />
            <datalist id="warehouse-type-suggestions">
              {TYPE_SUGGESTIONS.map((value) => (
                <option value={value} key={value} />
              ))}
            </datalist>
          </label>

          <label>
            <span>Box / Behälter</span>
            <input
              value={form.container_name}
              onChange={(event) =>
                updateField('container_name', event.target.value)
              }
              placeholder="z. B. IKEA Samla 45 L"
            />
          </label>

          <label>
            <span>Anzahl</span>
            <input
              type="number"
              min="0"
              step="1"
              value={form.container_quantity}
              onChange={(event) =>
                updateField('container_quantity', event.target.value)
              }
              placeholder="1"
            />
          </label>

          <label>
            <span>Maße</span>
            <input
              value={form.dimensions}
              onChange={(event) =>
                updateField('dimensions', event.target.value)
              }
              placeholder="z. B. 57 × 39 × 28 cm / 45 L"
            />
          </label>

          <label className="warehouse-grid-full">
            <span>Notiz / Bemerkung</span>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(event) => updateField('notes', event.target.value)}
              placeholder="z. B. Sommersachen"
            />
          </label>
        </div>

        <div className="warehouse-actions">
          <button
            type="button"
            className="warehouse-button primary"
            onClick={() => void save()}
            disabled={saving}
          >
            {saving
              ? 'Speichern …'
              : editingId
                ? 'Änderungen speichern'
                : 'Lagerplatz speichern'}
          </button>

          <span className="warehouse-hint">
            Fehlende Angaben können später manuell oder per Lagerdatei ergänzt
            werden.
          </span>
        </div>

        {error ? <p className="warehouse-error">{error}</p> : null}
        {message ? <p className="warehouse-success">{message}</p> : null}

          </div>
        ) : null}
      </div>

      <div className="warehouse-collapse-card">
        <button
          type="button"
          className="warehouse-collapse-head"
          onClick={() => setShowOverview((v) => !v)}
        >
          <span>
            <strong>Lagerübersicht ({overviewRows.length})</strong>
            <small>Artikel im Lager und offene Zuordnungen nach Lagerplatz</small>
          </span>
          <span className="warehouse-collapse-action">
            {showOverview ? '▲ Schließen' : '▼ Anzeigen'}
          </span>
        </button>

        {showOverview ? (
          <><div className="warehouse-list-card warehouse-collapsed-content">
        <div className="warehouse-list-head">
          <div>
            <h3>Lagerübersicht</h3>
            <p>Zeigt pro Lagerplatz die bereits erfassten Artikel und die noch offenen Zuordnungen.</p>
          </div>
          <input
            className="warehouse-search"
            value={overviewQuery}
            onChange={(event) => setOverviewQuery(event.target.value)}
            placeholder="SKU, Artikel-Nr., Marke, Lagercode …"
          />
        </div>

        {productsLoading || pendingLoading || loading ? (
          <div className="warehouse-empty">Lagerübersicht wird geladen …</div>
        ) : filteredOverview.length === 0 ? (
          <div className="warehouse-empty">Keine passenden Lagerdaten gefunden.</div>
        ) : (
          <div className="warehouse-table-wrap">
            <table className="warehouse-table overview-table">
              <thead>
                <tr>
                  <th>Lagerort</th><th>Wo / Bereich</th><th>Lagerplatz</th><th>Lagerbezeichnung</th>
                  <th>Artikel im Lager</th><th>Offen</th><th>Inhalt</th>
                </tr>
              </thead>
              <tbody>
                {filteredOverview.map((row) => (
                  <tr key={row.key}>
                    <td>{row.warehouse_location || '—'}</td>
                    <td>{row.warehouse_area || '—'}</td>
                    <td>{row.warehouse_place || '—'}</td>
                    <td><strong>{row.warehouse_code || '—'}</strong></td>
                    <td><span className="warehouse-count actual">{row.actual.length}</span></td>
                    <td><span className="warehouse-count pending-count">{row.pending.length}</span></td>
                    <td className="warehouse-contents">
                      {row.actual.length === 0 && row.pending.length === 0 ? <span className="warehouse-muted">Leer</span> : null}
                      {row.actual.map((product) => (
                        <div className="warehouse-content-line" key={`p-${product.id}`}>
                          <span className="warehouse-badge complete">Im Lager</span>
                          <strong>{normalize(product.sku) || normalize(product.supplier_order_number) || 'Artikel'}</strong>
                          <span>{normalize(product.brand) || ''}</span>
                          {normalize(product.supplier_order_number) ? <small>Art.-Nr. {product.supplier_order_number}</small> : null}
                        </div>
                      ))}
                      {row.pending.map((pending) => (
                        <div className="warehouse-content-line" key={`o-${pending.id}`}>
                          <span className="warehouse-badge pending">Offen</span>
                          <strong>{pending.article_number}</strong>
                          <span>{normalize(pending.brand) || ''}</span>
                        </div>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div></>
        ) : null}
      </div>

      <div className="warehouse-collapse-card">
        <button type="button" className="warehouse-collapse-head" onClick={() => setShowPlaces((v) => !v)}>
          <span>
            <strong>Vorhandene Lagerplätze ({items.length})</strong>
            <small>Lagerplätze, Boxen und Behälter verwalten</small>
          </span>
          <span className="warehouse-collapse-action">{showPlaces ? '▲ Schließen' : '▼ Anzeigen'}</span>
        </button>
        {showPlaces ? (
          <><div className="warehouse-list-card warehouse-collapsed-content">
        <div className="warehouse-list-head">
          <div>
            <h3>Vorhandene Lagerplätze</h3>
            <p>
              Einträge ohne vollständige Ortsangaben oder Lagerbezeichnung
              werden markiert.
            </p>
          </div>

          <input
            className="warehouse-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Lager durchsuchen …"
          />
        </div>

        {loading ? (
          <div className="warehouse-empty">Lagerplätze werden geladen …</div>
        ) : filtered.length === 0 ? (
          <div className="warehouse-empty">
            {items.length === 0
              ? 'Noch keine Lagerplätze angelegt.'
              : 'Keine passenden Lagerplätze gefunden.'}
          </div>
        ) : (
          <div className="warehouse-table-wrap">
            <table className="warehouse-table">
              <thead>
                <tr>
                  <th>Lagerort</th>
                  <th>Wo</th>
                  <th>Lagerplatz</th>
                  <th>Lagerbezeichnung</th>
                  <th>Art / Box</th>
                  <th>Maße</th>
                  <th>Notiz / Bemerkung</th>
                  <th>Status</th>
                  <th>Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const incomplete = isIncomplete(item);

                  return (
                    <tr key={item.id}>
                      <td>{normalize(item.warehouse_location) || '—'}</td>
                      <td>{normalize(item.warehouse_area) || '—'}</td>
                      <td>{normalize(item.warehouse_place) || '—'}</td>
                      <td>
                        <strong>{normalize(item.warehouse_code) || '—'}</strong>
                      </td>
                      <td>
                        <div>{normalize(item.storage_type) || '—'}</div>
                        {normalize(item.container_name) ? (
                          <small>
                            {item.container_quantity
                              ? `${item.container_quantity} × `
                              : ''}
                            {item.container_name}
                          </small>
                        ) : null}
                      </td>
                      <td>{normalize(item.dimensions) || '—'}</td>
                      <td className="warehouse-note">
                        {normalize(item.notes) || '—'}
                      </td>
                      <td>
                        <span
                          className={
                            incomplete
                              ? 'warehouse-badge incomplete'
                              : 'warehouse-badge complete'
                          }
                        >
                          {incomplete ? 'Unvollständig' : 'Vollständig'}
                        </span>
                      </td>
                      <td>
                        <div className="warehouse-row-actions">
                          <button
                            type="button"
                            onClick={() => startEdit(item)}
                          >
                            Bearbeiten
                          </button>
                          <button
                            type="button"
                            className="danger"
                            disabled={deletingId === item.id}
                            onClick={() => void remove(item)}
                          >
                            {deletingId === item.id ? 'Löschen …' : 'Löschen'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div></>
        ) : null}
      </div>

      <div className="warehouse-collapse-card">
        <button type="button" className="warehouse-collapse-head" onClick={() => setShowPending((v) => !v)}>
          <span>
            <strong>Offene Lagerzuordnungen ({openPending.length})</strong>
            <small>Artikel mit Lagerdaten, die noch nicht erfasst sind</small>
          </span>
          <span className="warehouse-collapse-action">{showPending ? '▲ Schließen' : '▼ Anzeigen'}</span>
        </button>
        {showPending ? (
          <><div className="warehouse-list-card warehouse-collapsed-content">
        <div className="warehouse-list-head">
          <div>
            <h3>Offene Lagerzuordnungen</h3>
            <p>
              Lagerdaten sind bereits vorhanden, der zugehörige Artikel ist aber
              noch nicht in der Artikelliste erfasst. Sobald der Artikel regulär
              importiert wird, kann die Zuordnung automatisch übernommen werden.
            </p>
          </div>

          <input
            className="warehouse-search"
            value={pendingQuery}
            onChange={(event) => setPendingQuery(event.target.value)}
            placeholder="Artikel-Nr., Marke, Lagercode …"
          />
        </div>

        {pendingLoading ? (
          <div className="warehouse-empty">
            Offene Lagerzuordnungen werden geladen …
          </div>
        ) : filteredPending.length === 0 ? (
          <div className="warehouse-empty">
            {openPending.length === 0
              ? 'Keine offenen Lagerzuordnungen.'
              : 'Keine passenden offenen Lagerzuordnungen gefunden.'}
          </div>
        ) : (
          <div className="warehouse-table-wrap">
            <table className="warehouse-table pending-table">
              <thead>
                <tr>
                  <th>Artikel-Nr.</th>
                  <th>Marke</th>
                  <th>Saison</th>
                  <th>Lagerort</th>
                  <th>Wo / Bereich</th>
                  <th>Lagerplatz</th>
                  <th>Lagerbezeichnung</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredPending.map((item) => (
                  <tr key={item.id}>
                    <td><strong>{normalize(item.article_number) || '—'}</strong></td>
                    <td>{normalize(item.brand) || '—'}</td>
                    <td>{normalize(item.season) || '—'}</td>
                    <td>{normalize(item.warehouse_location) || '—'}</td>
                    <td>{normalize(item.warehouse_area) || '—'}</td>
                    <td>{normalize(item.warehouse_place) || '—'}</td>
                    <td><strong>{normalize(item.warehouse_code) || '—'}</strong></td>
                    <td>
                      <span className="warehouse-badge pending">
                        Artikel noch nicht erfasst
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div></>
        ) : null}
      </div>

      <style jsx>{`
        .warehouse-manager {
          --mcp-blue: #1f3a5f;
          --mcp-gold: #bea175;
          --mcp-ivory: #faf6f0;
          --mcp-cocoa: #32251d;
          --mcp-border: #e6ddd2;
          --mcp-muted: #766b62;

          margin: 28px 0 34px;
          color: var(--mcp-cocoa);
          font-family: Arial, Helvetica, sans-serif;
        }

        .warehouse-manager,
        .warehouse-manager * {
          font-family: Arial, Helvetica, sans-serif !important;
        }

        .warehouse-head,
        .warehouse-form-title,
        .warehouse-list-head,
        .warehouse-actions {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
        }

        .warehouse-head h2,
        .warehouse-form-card h3,
        .warehouse-list-card h3 {
          margin: 0;
          color: var(--mcp-blue);
          font-family: Arial, Helvetica, sans-serif;
          font-weight: 700;
          letter-spacing: 0;
        }

        .warehouse-head h2 {
          font-size: 28px;
          line-height: 1.2;
        }

        .warehouse-form-card h3,
        .warehouse-list-card h3 {
          font-size: 19px;
        }

        .warehouse-eyebrow {
          margin: 0 0 6px;
          color: var(--mcp-gold);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .warehouse-intro,
        .warehouse-form-title p,
        .warehouse-list-head p {
          margin: 6px 0 0;
          color: var(--mcp-muted);
        }

        .warehouse-stats {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 12px;
          margin: 18px 0;
        }

        .warehouse-stat,
        .warehouse-form-card,
        .warehouse-list-card {
          border: 1px solid var(--mcp-border);
          background: #fffdfa;
          border-radius: 16px;
        }

        .warehouse-stat {
          padding: 14px 16px;
        }

        .warehouse-stat strong {
          display: block;
          font-size: 24px;
          color: var(--mcp-cocoa);
          font-weight: 700;
        }

        .warehouse-stat span {
          font-size: 13px;
          color: var(--mcp-muted);
        }

        .warehouse-form-card,
        .warehouse-list-card {
          padding: 20px;
          margin-top: 16px;
        }

        .warehouse-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
          margin-top: 18px;
        }

        .warehouse-grid label {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .warehouse-grid label span {
          font-size: 13px;
          font-weight: 700;
          color: var(--mcp-cocoa);
        }

        .warehouse-grid input,
        .warehouse-grid textarea,
        .warehouse-search {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #d9cec2;
          background: #fff;
          border-radius: 10px;
          padding: 10px 11px;
          color: var(--mcp-cocoa);
          font-family: Arial, Helvetica, sans-serif !important;
          font-size: inherit;
          outline: none;
        }

        .warehouse-grid input:focus,
        .warehouse-grid textarea:focus,
        .warehouse-search:focus {
          border-color: var(--mcp-gold);
          box-shadow: 0 0 0 3px rgba(190, 161, 117, 0.16);
        }

        .warehouse-grid input::placeholder,
        .warehouse-grid textarea::placeholder,
        .warehouse-search::placeholder {
          color: #94887e;
        }

        .warehouse-grid small,
        .warehouse-hint,
        .warehouse-table small {
          color: #81756c;
          font-size: 12px;
        }

        .warehouse-grid-full {
          grid-column: 1 / -1;
        }

        .warehouse-actions {
          align-items: center;
          justify-content: flex-start;
          margin-top: 16px;
        }

        .warehouse-button {
          border-radius: 12px;
          padding: 11px 18px;
          font-family: Arial, Helvetica, sans-serif !important;
          font-size: inherit;
          font-weight: 700;
          cursor: pointer;
          transition:
            background 0.15s ease,
            border-color 0.15s ease,
            color 0.15s ease;
        }

        .warehouse-button.primary {
          border: 1px solid var(--mcp-blue);
          background: var(--mcp-blue);
          color: #fff;
        }

        .warehouse-button.primary:hover {
          background: #172e4c;
        }

        .warehouse-button.secondary {
          border: 1px solid var(--mcp-gold);
          background: #fff;
          color: var(--mcp-blue);
        }

        .warehouse-button.secondary:hover {
          background: var(--mcp-ivory);
        }

        .warehouse-button:disabled {
          opacity: 0.55;
          cursor: default;
        }

        .warehouse-link-button,
        .warehouse-row-actions button {
          border: 0;
          background: transparent;
          color: var(--mcp-blue);
          cursor: pointer;
          padding: 4px 6px;
          font-family: Arial, Helvetica, sans-serif !important;
          font-size: inherit;
          font-weight: 600;
        }

        .warehouse-row-actions {
          display: flex;
          gap: 7px;
          white-space: nowrap;
        }

        .warehouse-row-actions .danger {
          color: #a33b32;
        }

        .warehouse-row-actions button:disabled {
          opacity: 0.55;
          cursor: default;
        }

        .warehouse-error,
        .warehouse-success {
          margin: 14px 0 0;
          padding: 10px 12px;
          border-radius: 10px;
        }

        .warehouse-error {
          background: #fff1ef;
          color: #9e332d;
        }

        .warehouse-success {
          background: #f0f7ef;
          color: #356438;
        }

        .warehouse-search {
          max-width: 280px;
        }

        .warehouse-table-wrap {
          overflow-x: auto;
          margin-top: 16px;
        }

        .warehouse-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 1180px;
          color: var(--mcp-cocoa);
        }

        .warehouse-table th,
        .warehouse-table td {
          text-align: left;
          vertical-align: top;
          padding: 11px 9px;
          border-bottom: 1px solid #eee6dd;
          font-size: 13px;
          font-family: Arial, Helvetica, sans-serif;
        }

        .warehouse-table th {
          color: #685d55;
          font-weight: 700;
          background: var(--mcp-ivory);
        }

        .warehouse-table td strong {
          color: var(--mcp-blue);
        }

        .warehouse-note {
          min-width: 160px;
          max-width: 260px;
          white-space: normal;
        }

        .warehouse-badge {
          display: inline-flex;
          padding: 5px 8px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
        }

        .warehouse-badge.complete {
          background: #edf6ec;
          color: #3c6940;
        }

        .warehouse-badge.incomplete {
          background: #fff3df;
          color: #8d611d;
        }

        .warehouse-badge.pending {
          background: #f4eee5;
          color: #7a5b2e;
          white-space: nowrap;
        }

        .warehouse-stat.pending {
          background: var(--mcp-ivory);
        }

        .pending-table td:first-child strong {
          color: var(--mcp-blue);
        }

        .warehouse-empty {
          padding: 28px 8px 10px;
          color: var(--mcp-muted);
        }



        .warehouse-collapse-card {
          margin-top: 16px;
          border: 1px solid var(--mcp-border);
          background: #fffdfa;
          border-radius: 16px;
          overflow: hidden;
        }

        .warehouse-collapse-head {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 16px 20px;
          border: 0;
          background: #fffdfa;
          color: var(--mcp-cocoa);
          text-align: left;
          cursor: pointer;
          font-family: Arial, Helvetica, sans-serif !important;
        }

        .warehouse-collapse-head:hover {
          background: var(--mcp-ivory);
        }

        .warehouse-collapse-head > span:first-child {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .warehouse-collapse-head strong {
          color: var(--mcp-blue);
          font-size: 17px;
        }

        .warehouse-collapse-head small {
          color: var(--mcp-muted);
          font-size: 12px;
          font-weight: 400;
        }

        .warehouse-collapse-action {
          color: var(--mcp-gold);
          font-size: 12px;
          font-weight: 700;
          white-space: nowrap;
        }

        .warehouse-collapsed-content {
          margin-top: 0 !important;
          border: 0 !important;
          border-top: 1px solid var(--mcp-border) !important;
          border-radius: 0 !important;
        }

        .warehouse-count {
          display: inline-flex;
          min-width: 28px;
          height: 28px;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          font-weight: 700;
          font-size: 12px;
        }
        .warehouse-count.actual { background: #edf6ec; color: #3c6940; }
        .warehouse-count.pending-count { background: #f4eee5; color: #7a5b2e; }
        .warehouse-contents { min-width: 300px; }
        .warehouse-content-line {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 7px;
          padding: 5px 0;
          border-bottom: 1px dashed #eee6dd;
        }
        .warehouse-content-line:last-child { border-bottom: 0; }
        .warehouse-content-line strong { color: var(--mcp-blue); }
        .warehouse-muted { color: var(--mcp-muted); }
        .overview-table { min-width: 1250px; }

        @media (max-width: 1050px) {
          .warehouse-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .warehouse-stats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 680px) {
          .warehouse-head,
          .warehouse-form-title,
          .warehouse-list-head,
          .warehouse-actions {
            flex-direction: column;
          }

          .warehouse-grid,
          .warehouse-stats {
            grid-template-columns: 1fr;
          }

          .warehouse-search {
            max-width: none;
          }
        }
      `}</style>
    </section>
  );
}
