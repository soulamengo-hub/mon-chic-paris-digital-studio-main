import type { ProductInput } from './types';

const allowedFields: Array<keyof ProductInput> = [
  'sku',
  'brand',
  'origin',
  'fit',
  'category',
  'subcategory',
  'season',
  'size',
  'original_size',
  'size_system',
  'de_size',
  'international_size',

  'color',
  'secondary_color',
  'color_note',
  'material',
  'care_instructions',
  'pattern',
  'condition',

  'era',

  // Bestehende einzelne Stilrichtung bleibt kompatibel.
  'style_key',

  // Mehrfachauswahl für Content Studio / Stilrichtungen.
  'style_keys',

  'authenticity_status',
  'purchase_price',
  'sale_price',
  'occasions',
  'measurements',
  'flaws',
  'notes',
  'internal_notes',
  'public_title',
  'public_description',

  // Lager
  'warehouse_location',
  'warehouse_area',
  'warehouse_place',
  'warehouse_code',
  'warehouse_place_id',

  // Bestehende Legacy-/Detailfelder bleiben kompatibel.
  'warehouse_rack',
  'warehouse_shelf',

  'last_inventory_at',
  'last_movement_at',
  'status',

  'supplier_reference',
  'gender',
  'reference_photo_url',
  'original_retail_value',
  'supplier_order_number',

  // V54 · Ankauf & steuerliche Einordnung
  'invoice_number',

  // Ankauf & Herkunft
  'purchase_date',
  'purchase_source',
  'seller_name',
  'seller_type',
  'payment_method',
  'payment_reference',

  // Sammelbestellung & Nebenkosten
  'purchase_shipping_total',
  'purchase_fees_total',
  'purchase_extra_cost_share',
  'acquisition_cost_total',

  // Kaufzweck & steuerliche Herkunft
  'purchase_purpose',
  'tax_origin',

  // Privateinlage
  'contribution_date',
  'contribution_value',
  'contribution_valuation_note',

  // §25a Differenzbesteuerung
  'margin_scheme_status',

  // Belege
  'receipt_package_status',
  'receipt_package_reference',
  'self_receipt_status',
  'self_receipt_id',

  // Steuerliche Prüfung / Steuerberater
  'tax_review_status',
  'tax_note',
];

export function sanitizeProductInput(
  value: unknown,
  options: { allowSku?: boolean } = {},
): Partial<ProductInput> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const source = value as Record<string, unknown>;
  const result: Partial<ProductInput> = {};

  for (const field of allowedFields) {
    if (field === 'sku' && options.allowSku === false) continue;

    if (source[field] !== undefined) {
      (result as Record<string, unknown>)[field] = source[field];
    }
  }

  return result;
}
