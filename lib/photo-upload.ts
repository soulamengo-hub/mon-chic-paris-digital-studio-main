// MON CHIC PARIS · Digital Studio
// Gemeinsame Upload-Logik für Produktfotos und das Lieferanten-Referenzfoto.
// Läuft im Browser (Client-Komponenten), lädt direkt in den Supabase-Storage-
// Bucket "product-images" hoch, mit dem öffentlichen Anon-Key.

export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

export function getPublicSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase-Verbindung fehlt. Bitte Vercel-Variablen prüfen.');
  return { url, key };
}

export function inferMimeType(file: File) {
  if (file.type) return file.type;
  const extension = file.name.split('.').pop()?.toLowerCase();
  const mimeByExtension: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
    heic: 'image/heic', heif: 'image/heif',
  };
  return extension ? mimeByExtension[extension] || 'application/octet-stream' : 'application/octet-stream';
}

export function sanitizeFileName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/-+/g, '-');
}

async function uploadRawFile(file: File, storagePath: string): Promise<string> {
  if (file.size > MAX_PHOTO_BYTES) {
    throw new Error(`Foto „${file.name}“ ist größer als 8 MB. Bitte auf dem iPhone als kleinere Datei exportieren.`);
  }
  const { url, key } = getPublicSupabaseConfig();
  const mimeType = inferMimeType(file);
  const encodedPath = storagePath.split('/').map(encodeURIComponent).join('/');
  const authHeaders = { apikey: key, Authorization: `Bearer ${key}` };

  const uploadResponse = await fetch(`${url}/storage/v1/object/product-images/${encodedPath}`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': mimeType, 'x-upsert': 'true' },
    body: file,
  });
  if (!uploadResponse.ok) throw new Error(`Foto-Upload fehlgeschlagen: ${await uploadResponse.text()}`);
  return `${url}/storage/v1/object/public/product-images/${encodedPath}`;
}

/** Lädt ein echtes Artikelfoto hoch und trägt es in product_images ein (wird von der KI analysiert). */
export async function uploadProductPhoto(file: File, productId: string, sortOrder: number) {
  const fileName = sanitizeFileName(file.name || `foto-${sortOrder + 1}.jpg`);
  const storagePath = `${productId}/${Date.now()}-${sortOrder}-${fileName}`;
  const publicUrl = await uploadRawFile(file, storagePath);
  const { url, key } = getPublicSupabaseConfig();
  const authHeaders = { apikey: key, Authorization: `Bearer ${key}` };
  const metadataResponse = await fetch(`${url}/rest/v1/product_images`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({
      product_id: productId,
      storage_path: storagePath,
      public_url: publicUrl,
      file_name: file.name,
      mime_type: inferMimeType(file),
      size_bytes: file.size,
      sort_order: sortOrder,
    }),
  });
  if (!metadataResponse.ok) throw new Error(`Bild-Metadaten konnten nicht gespeichert werden: ${await metadataResponse.text()}`);
}

/**
 * Lädt das Referenzfoto des Lieferanten hoch (z. B. Remix-Katalogfoto). Landet
 * NICHT in product_images — wird also nie von der KI analysiert und zählt nicht
 * zur "hat Fotos"-Vollständigkeit. Gibt die öffentliche URL zurück; der Aufrufer
 * speichert sie selbst im Feld reference_photo_url des Artikels (per PATCH).
 */
export async function uploadReferencePhoto(file: File, productId: string): Promise<string> {
  const fileName = sanitizeFileName(file.name || 'referenz.jpg');
  const storagePath = `${productId}/reference/${Date.now()}-${fileName}`;
  return uploadRawFile(file, storagePath);
}
