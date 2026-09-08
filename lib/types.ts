export type ProductInput = {
  sku: string;
  brand?: string;
  origin?: string;
  fit?: string;
  category?: string;
  subcategory?: string;
  season?: string;
  size?: string;
  original_size?: string;
  size_system?: string;
  de_size?: string;
  international_size?: string;
  color?: string;
  secondary_color?: string;
  color_note?: string;
  material?: string;
  care_instructions?: string;
  pattern?: string;
  condition?: string;
  era?: string;
  style_key?: string;

  // Mehrfachauswahl für Content Studio / Stilrichtungen.
  style_keys?: string[];

  authenticity_status?: string;

  // Preise
  // Einzelpreis des Artikels beim Ankauf – ohne automatisch verteilte Nebenkosten.
  purchase_price?: number | null;
  sale_price?: number | null;
  original_retail_value?: number | null;

  occasions?: string[];
  measurements?: string;
  flaws?: string;
  notes?: string;
  internal_notes?: string;
  public_title?: string;
  public_description?: string;

  // Lager
  // warehouse_location = Lagerort, z. B. MyPlace.
  warehouse_location?: string;

  // Neue Lagerstruktur:
  // warehouse_area = Wo / Bereich, z. B. Keller, Boden, Regal 1.
  warehouse_area?: string;

  // warehouse_place = konkrete Beschreibung, z. B. Etage 1
  // oder Boden 1 – Box 45 L Blumen.
  warehouse_place?: string;

  // warehouse_code = kurze Lagerbezeichnung, z. B. REG1-E1-1 oder Bo-1-1.
  warehouse_code?: string;

  // Optionaler Verweis auf den Stammdatensatz in warehouse_places.
  warehouse_place_id?: string | null;

  // Bestehende Legacy-/Detailfelder bleiben erhalten.
  warehouse_rack?: string;
  warehouse_shelf?: string;

  last_inventory_at?: string | null;
  last_movement_at?: string | null;
  status?: string;

  // Referenzen & Bestellung
  // Interne bzw. importierte Referenz des Lieferanten/der Charge.
  supplier_reference?: string;
  // Bestellnummer / Artikelnummer der Quelle.
  supplier_order_number?: string;
  // Rechnungsnummer, falls vorhanden.
  invoice_number?: string;

  // Ankauf & Herkunft
  purchase_date?: string | null;
  purchase_source?: string;
  seller_name?: string;
  seller_type?: 'Privatperson' | 'Unternehmen' | 'Unbekannt' | string;
  payment_method?: string;
  payment_reference?: string;

  // Sammelbestellung / Nebenkosten
  // Gesamtwerte des Einkaufsvorgangs; bei mehreren Positionen können mehrere
  // Artikel dieselbe Einkaufs-/Bestellnummer verwenden.
  purchase_shipping_total?: number | null;
  purchase_fees_total?: number | null;
  // Dem einzelnen Artikel zugeordneter Anteil aus Versand/Gebühren.
  purchase_extra_cost_share?: number | null;
  // Interne Kostenrechnung: Artikelpreis + zugeordneter Nebenkostenanteil.
  acquisition_cost_total?: number | null;

  // Kaufzweck und steuerliche Herkunft.
  // Die App dokumentiert die Auswahl, entscheidet sie aber NICHT automatisch.
  purchase_purpose?:
    | 'MON CHIC / Wiederverkauf'
    | 'Privat'
    | 'Nicht eindeutig'
    | string;
  tax_origin?:
    | 'Vorweggenommener Wareneinkauf'
    | 'Privateinlage'
    | 'Laufender Wareneinkauf'
    | 'Zu prüfen'
    | string;

  // Privateinlage – nur relevant, wenn tax_origin = "Privateinlage".
  contribution_date?: string | null;
  contribution_value?: number | null;
  contribution_valuation_note?: string;

  // §25a UStG – Status/Prüfkennzeichen, keine automatische Steuerentscheidung.
  margin_scheme_status?: 'Ja' | 'Nein' | 'Zu prüfen' | string;

  // Belege & Nachweise
  // Ziel: möglichst EIN Belegpaket-PDF pro Einkauf; mehrere Artikel können darauf verweisen.
  receipt_package_status?:
    | 'Vollständig'
    | 'Teilweise'
    | 'Fehlt'
    | 'Zu prüfen'
    | string;
  receipt_package_reference?: string;
  self_receipt_status?:
    | 'Nicht erforderlich'
    | 'Vorhanden'
    | 'Erforderlich'
    | 'Fehlt'
    | string;
  self_receipt_id?: string;

  // Steuerberater-/Prüfworkflow
  tax_review_status?: 'Offen' | 'Mit Steuerberater klären' | 'Geklärt' | string;
  tax_note?: string;

  // Bestimmt, welche Größentabelle (Damen/Herren) für die Größenumrechnung gilt.
  gender?: string;

  // Referenzfoto des Lieferanten – getrennt von echten Artikelfotos.
  reference_photo_url?: string;
};

export type ProductRecord = ProductInput & {
  id: string;
  created_at: string;
  updated_at: string;
  product_images?: Array<{
    id?: string;
    public_url: string;
    storage_path?: string;
    sort_order: number;
    content_suitable?: boolean;
  }>;
};

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
