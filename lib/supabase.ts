export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Supabase environment variables are missing.');
  }
  return { url: url.replace(/\/$/, ''), key };
}

export function supabaseHeaders(extra?: HeadersInit): HeadersInit {
  const { key } = getSupabaseConfig();
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    ...extra,
  };
}

// Nur serverseitig verwenden (z. B. in app/api/*/route.ts), niemals an den
// Client ausliefern. Wird für das KI-Nutzungsprotokoll benötigt, damit dessen
// Tabelle nicht per anonymem Schlüssel beschreibbar sein muss.
export function getServiceSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Supabase Service-Role-Konfiguration fehlt (SUPABASE_SERVICE_ROLE_KEY).');
  }
  return { url: url.replace(/\/$/, ''), key };
}

export function supabaseServiceHeaders(extra?: HeadersInit): HeadersInit {
  const { key } = getServiceSupabaseConfig();
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    ...extra,
  };
}
