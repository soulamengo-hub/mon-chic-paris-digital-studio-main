import { NextResponse } from 'next/server';
import { getSupabaseConfig, supabaseHeaders } from '@/lib/supabase';
import packageJson from '../../../package.json';

export const runtime = 'nodejs';

async function checkSupabase(): Promise<{ ok: boolean; detail: string }> {
  try {
    const { url } = getSupabaseConfig();
    const response = await fetch(`${url}/rest/v1/products?select=id&limit=1`, {
      headers: supabaseHeaders(), cache: 'no-store',
    });
    return response.ok
      ? { ok: true, detail: 'Verbindung erfolgreich.' }
      : { ok: false, detail: `Antwort mit Status ${response.status}.` };
  } catch (error) {
    return { ok: false, detail: error instanceof Error ? error.message : 'Verbindung fehlgeschlagen.' };
  }
}

export async function GET() {
  const supabase = await checkSupabase();
  const openaiConfigured = Boolean(process.env.OPENAI_API_KEY);
  const openaiModel = process.env.OPENAI_MODEL || 'gpt-4.1-mini';

  return NextResponse.json({
    appVersion: packageJson.version,
    nodeVersion: process.version,
    supabase,
    openai: { configured: openaiConfigured, model: openaiModel },
    checkedAt: new Date().toISOString(),
  });
}
