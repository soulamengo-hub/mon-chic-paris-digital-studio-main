import type { ProductInput } from '@/lib/types';

export const PRODUCT_WRITE_FIELDS = [
  'sku', 'brand', 'category', 'subcategory', 'season', 'size', 'original_size',
  'size_system', 'de_size', 'international_size', 'color', 'secondary_color',
  'material', 'pattern', 'condition', 'era', 'style_key', 'authenticity_status',
  'purchase_price', 'sale_price', 'occasions', 'measurements', 'flaws', 'notes',
  'internal_notes', 'public_title', 'public_description', 'warehouse_location',
  'warehouse_rack', 'warehouse_shelf', 'last_inventory_at', 'last_movement_at',
  'status',
] as const satisfies ReadonlyArray<keyof ProductInput>;

export function sanitizeProductInput(value: unknown, options: { allowSku?: boolean } = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {} as Partial<ProductInput>;
  const input = value as Record<string, unknown>;
  const output: Partial<ProductInput> = {};

  for (const field of PRODUCT_WRITE_FIELDS) {
    if (field === 'sku' && options.allowSku === false) continue;
    if (Object.prototype.hasOwnProperty.call(input, field)) {
      (output as Record<string, unknown>)[field] = input[field];
    }
  }

  return output;
}
