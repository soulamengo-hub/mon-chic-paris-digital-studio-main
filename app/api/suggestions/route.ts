import { NextResponse } from 'next/server';
import { getSupabaseConfig, supabaseHeaders } from '@/lib/supabase';
import { designerSuggestions } from '@/lib/catalog';

type SuggestionRow = {
  brand?: string | null;
  material?: string | null;
  color?: string | null;
  warehouse_location?: string | null;
};

const defaultMaterials = ['Baumwolle', 'Kaschmir', 'Leder', 'Leinen', 'Seide', 'Wolle'];
const defaultColors = ['Beige', 'Blau', 'Braun', 'Creme', 'Grau', 'Grün', 'Navy', 'Rot', 'Schwarz', 'Weiß'];
const defaultWarehouses = ['Boutique', 'Lager A', 'Lager B', 'Schaufenster', 'Fotoshooting', 'Versand', 'Qualitätsprüfung', 'Reinigung', 'Retouren', 'Extern', 'Sonstiges'];

function unique(values: Array<string | null | undefined>) {
  return [...new Set(values.map(value => value?.trim()).filter((value): value is string => Boolean(value)))]
    .sort((a, b) => a.localeCompare(b, 'de'));
}

export async function GET() {
  try {
    const { url } = getSupabaseConfig();
    const response = await fetch(
      `${url}/rest/v1/products?select=brand,material,color,warehouse_location&limit=1000`,
      { headers: supabaseHeaders(), cache: 'no-store' },
    );
    const rows: SuggestionRow[] = response.ok ? await response.json() : [];

    return NextResponse.json({
      brands: unique([...designerSuggestions, ...rows.map(row => row.brand)]),
      materials: unique([...defaultMaterials, ...rows.map(row => row.material)]),
      colors: unique([...defaultColors, ...rows.map(row => row.color)]),
      warehouses: unique([...defaultWarehouses, ...rows.map(row => row.warehouse_location)]),
    }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch {
    return NextResponse.json({
      brands: designerSuggestions,
      materials: defaultMaterials,
      colors: defaultColors,
      warehouses: defaultWarehouses,
    });
  }
}
