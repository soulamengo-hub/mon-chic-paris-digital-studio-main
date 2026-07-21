'use client';
import { useState } from 'react';
import * as XLSX from 'xlsx';

type Product = Record<string, unknown> & { sku: string };

const exportColumns = [
  'sku','brand','category','subcategory','original_size','size_system','color','secondary_color','color_note',
  'material','care_instructions','condition','style_key','status','purchase_price','sale_price',
  'warehouse_location','warehouse_rack','warehouse_shelf','created_at',
];

export default function InventoryExport() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function run() {
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch('/api/products', { cache: 'no-store' });
      if (!response.ok) throw new Error('Bestand konnte nicht geladen werden.');
      const products = await response.json() as Product[];
      const rows = products.map(product => Object.fromEntries(
        exportColumns.map(column => [column, product[column] ?? '']),
      ));
      const sheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, sheet, 'Lagerbestand');
      const date = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(workbook, `MON_CHIC_Lagerbestand_${date}.xlsx`);
      setMessage(`${products.length} Artikel exportiert.`);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'Export fehlgeschlagen.');
    } finally {
      setLoading(false);
    }
  }

  return <section className="capture-card">
    <div className="capture-heading"><div><span className="step-badge">↓</span><h2>Lagerbestand exportieren</h2></div></div>
    <p>Exportiert den kompletten aktuellen Bestand als Excel-Datei — dieselben Spalten, die auch der Import erwartet, damit du die Datei bei Bedarf bearbeitet wieder importieren kannst.</p>
    <button className="primary-button centered-button" onClick={run} disabled={loading}>{loading ? 'Export läuft …' : 'Als Excel herunterladen'}</button>
    {message && <div className="form-message success">{message}</div>}
  </section>;
}
