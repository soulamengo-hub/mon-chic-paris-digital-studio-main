'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';

type Product = Record<string, unknown>;

function text(value: unknown) {
  return String(value ?? '').trim();
}

export default function InventoryExport() {
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState('');

  async function exportInventory() {
    setExporting(true);
    setMessage('');

    try {
      const response = await fetch('/api/products', { cache: 'no-store' });

      if (!response.ok) {
        throw new Error((await response.text()) || 'Bestand konnte nicht geladen werden.');
      }

      const data = await response.json();
      const products: Product[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.products)
          ? data.products
          : [];

      if (!products.length) {
        setMessage('Keine Artikel zum Exportieren gefunden.');
        return;
      }

      const rows = products.map((product) => ({
        SKU: text(product.sku),
        Marke: text(product.brand),
        Kategorie: text(product.category),
        Unterkategorie: text(product.subcategory),
        Geschlecht: text(product.gender),
        Größe: text(product.original_size),
        Größensystem: text(product.size_system),
        'DE-Größe': text(product.de_size),
        Farbe: text(product.color),
        Zweitfarbe: text(product.secondary_color),
        Farbhinweis: text(product.color_note),
        Material: text(product.material),
        Saison: text(product.season),
        Zustand: text(product.condition),
        Status: text(product.status),
        Einkaufspreis: product.purchase_price ?? '',
        Verkaufspreis: product.sale_price ?? '',
        'Ehemaliger Wert': product.original_retail_value ?? '',
        Referenznummer: text(product.supplier_reference),
        'Artikel-Nr. / Bestellung': text(product.supplier_order_number),
        Bestellnummer: text(product.invoice_number),
        Lagerort: text(product.warehouse_location),
        Lagerregal: text(product.warehouse_rack),
        Lagerfach: text(product.warehouse_shelf),
        Mängel: text(product.flaws),
        Notiz: text(product.internal_notes),
        'Öffentlicher Titel': text(product.public_title),
        'Website anzeigen': product.show_on_website === true ? 'Ja' : product.show_on_website === false ? 'Nein' : '',
        'Erstellt am': text(product.created_at),
        'Aktualisiert am': text(product.updated_at),
      }));

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(rows);

      worksheet['!cols'] = [
        { wch: 18 }, { wch: 20 }, { wch: 16 }, { wch: 18 }, { wch: 12 },
        { wch: 10 }, { wch: 14 }, { wch: 10 }, { wch: 14 }, { wch: 14 },
        { wch: 20 }, { wch: 20 }, { wch: 14 }, { wch: 16 }, { wch: 14 },
        { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 18 }, { wch: 22 },
        { wch: 18 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 24 },
        { wch: 32 }, { wch: 28 }, { wch: 16 }, { wch: 20 }, { wch: 20 },
      ];

      XLSX.utils.book_append_sheet(workbook, worksheet, 'Bestand');

      const now = new Date();
      const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      XLSX.writeFile(workbook, `MON_CHIC_Bestand_${stamp}.xlsx`);
      setMessage(`${products.length} Artikel wurden als Excel exportiert.`);
    } catch (error) {
      setMessage(error instanceof Error ? `Export fehlgeschlagen: ${error.message}` : 'Export fehlgeschlagen.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <section className="capture-card">
      <div className="capture-heading">
        <div>
          <span className="step-badge">↓</span>
          <h2>Aktuellen Bestand exportieren</h2>
        </div>
      </div>

      <p>Den aktuellen Artikelbestand als Excel-Datei herunterladen.</p>

      <button
        type="button"
        className="secondary-button"
        onClick={exportInventory}
        disabled={exporting}
      >
        {exporting ? 'Export wird erstellt …' : 'Bestand als Excel herunterladen'}
      </button>

      {message && <div className="form-message success">{message}</div>}
    </section>
  );
}
