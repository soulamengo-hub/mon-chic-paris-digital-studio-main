import { NextResponse } from 'next/server';
import { supabaseServiceHeaders, getServiceSupabaseConfig } from '@/lib/supabase';
import { summarizeBudget, currentMonthStartIso } from '@/lib/ai-budget';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const { url } = getServiceSupabaseConfig();
    const monthStart = currentMonthStartIso();
    const response = await fetch(
      `${url}/rest/v1/ai_usage_log?select=estimated_cost_eur&created_at=gte.${encodeURIComponent(monthStart)}`,
      { headers: supabaseServiceHeaders(), cache: 'no-store' },
    );
    if (!response.ok) {
      // Falls die Tabelle/Migration noch nicht eingespielt wurde, zeigen wir
      // ein leeres Budget statt die ganze Seite abstürzen zu lassen.
      return NextResponse.json(summarizeBudget(0));
    }
    const rows = await response.json() as Array<{ estimated_cost_eur: number | string }>;
    const spentEur = rows.reduce((sum, row) => sum + Number(row.estimated_cost_eur || 0), 0);
    return NextResponse.json(summarizeBudget(spentEur));
  } catch {
    return NextResponse.json(summarizeBudget(0));
  }
}
