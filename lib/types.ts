export type ProductInput = {
  sku: string; brand?: string; category?: string; subcategory?: string; season?: string; size?: string;
  original_size?: string; size_system?: string; de_size?: string; international_size?: string;
  color?: string; secondary_color?: string; color_note?: string; material?: string; care_instructions?: string; pattern?: string; condition?: string;
  era?: string; style_key?: string; authenticity_status?: string; purchase_price?: number | null;
  sale_price?: number | null; occasions?: string[]; measurements?: string; flaws?: string; notes?: string;
  internal_notes?: string; public_title?: string; public_description?: string; warehouse_location?: string; warehouse_rack?: string; warehouse_shelf?: string; last_inventory_at?: string | null; last_movement_at?: string | null; status?: string;
  // Referenznummer aus dem Lieferanten-Import (z. B. Remix-Bestellnummer). Dient dem
  // späteren automatischen Zuordnen von Fotos anhand des Dateinamens (siehe
  // components/BulkPhotoMatch.tsx) — kein sichtbares Formularfeld.
  supplier_reference?: string;
  // Bestimmt, welche Größentabelle (Damen/Herren) für die Größenumrechnung gilt —
  // DE 44 bedeutet bei Damen XXL, bei Herren XS.
  gender?: string;
  // Referenzfoto des Lieferanten (z. B. Remix-Katalogfoto) — dauerhafte "Fotokartei",
  // getrennt von den echten Artikelfotos in product_images. Wird NIE von der KI
  // analysiert und zählt nicht zur Foto-Vollständigkeit.
  reference_photo_url?: string;
  // "Ehemaliger Wert": der Preis des Kleidungsstücks beim ursprünglichen Neukauf
  // (z. B. Hersteller-RRP) — als Orientierung für den Verkaufspreis. NICHT der
  // Preis, den MON CHIC PARIS für das Vintage-Stück bezahlt hat (das ist
  // purchase_price/"Einkaufspreis"), und NICHT der aktuelle "Verkaufspreis".
  original_retail_value?: number | null;
  // Artikel-/Bestellnummer der Quelle (z. B. Remix, aber auch andere Lieferanten/
  // Quellen) — getrennt von supplier_reference, das MON CHIC PARIS für die eigene
  // interne Charge/Referenz nutzt.
  supplier_order_number?: string;
};
export type ProductRecord = ProductInput & { id: string; created_at: string; updated_at: string; product_images?: Array<{id?:string; public_url:string; storage_path?:string; sort_order:number}> };

// Legacy modules still use these broader records. Keep them compatible while the
// application is consolidated around ProductInput/ProductRecord.
export type Product = ProductRecord & {
  discount_percent?: number | string | null;
  designer_level?: string;
  occasion?: string;
  rarity?: string;
  target_country?: string;
  sales_channel?: string;
  trend_score?: number | string | null;
  storage_location?: string;
  purchase_source?: string;
  sold_at?: string | null;
};

export type Expense = {
  id?: string;
  category?: string;
  description?: string;
  gross_amount?: number | string | null;
  net_amount?: number | string | null;
  tax_amount?: number | string | null;
  date?: string;
  created_at?: string;
};
