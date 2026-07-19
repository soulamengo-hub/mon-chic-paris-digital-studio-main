import type { ProductInput } from './types';

const allowedFields: Array<keyof ProductInput> = [
  'sku','brand','category','subcategory','season','size','original_size','size_system','de_size','international_size',
  'color','secondary_color','material','pattern','condition','era','style_key','authenticity_status','purchase_price',
  'sale_price','occasions','measurements','flaws','notes','internal_notes','public_title','public_description',
  'warehouse_location','warehouse_rack','warehouse_shelf','last_inventory_at','last_movement_at','status',
];

export function sanitizeProductInput(value: unknown, options: { allowSku?: boolean } = {}): Partial<ProductInput> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const source = value as Record<string, unknown>;
  const result: Partial<ProductInput> = {};
  for (const field of allowedFields) {
    if (field === 'sku' && options.allowSku === false) continue;
    if (source[field] !== undefined) (result as Record<string, unknown>)[field] = source[field];
  }
  return result;
}
