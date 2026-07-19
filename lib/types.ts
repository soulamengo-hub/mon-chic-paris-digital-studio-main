export type ProductInput = {
  sku: string; brand?: string; category?: string; subcategory?: string; season?: string; size?: string;
  original_size?: string; size_system?: string; de_size?: string; international_size?: string;
  color?: string; secondary_color?: string; material?: string; pattern?: string; condition?: string;
  era?: string; style_key?: string; authenticity_status?: string; purchase_price?: number | null;
  sale_price?: number | null; occasions?: string[]; measurements?: string; flaws?: string; notes?: string;
  internal_notes?: string; public_title?: string; public_description?: string; warehouse_location?: string; warehouse_rack?: string; warehouse_shelf?: string; last_inventory_at?: string | null; last_movement_at?: string | null; status?: string;
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
