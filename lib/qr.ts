import QRCode from 'qrcode';

/**
 * Erzeugt einen QR-Code als SVG-Markup-String für den übergebenen Text
 * (typischerweise die SKU eines Artikels). Läuft rein in JavaScript, ohne
 * native Abhängigkeiten (kein "canvas"-Paket nötig) — funktioniert daher
 * zuverlässig sowohl serverseitig (API-Route) als auch client-seitig.
 */
export async function generateQrSvg(text: string): Promise<string> {
  return QRCode.toString(text, { type: 'svg', margin: 1, width: 160 });
}
