export const PRODUCT_SEASONS = [
  'Ganzjährig',
  'Frühling',
  'Frühling / Sommer',
  'Sommer',
  'Frühling / Herbst',
  'Herbst',
  'Herbst / Winter',
  'Winter',
] as const;

export type ProductSeason = (typeof PRODUCT_SEASONS)[number];
export type WebsiteSeason = 'Frühling' | 'Sommer' | 'Herbst' | 'Winter';
export type WebsiteSeasonMode = 'Automatisch' | 'Manuell';

const aliases: Record<string, ProductSeason> = {
  'ganzjährig': 'Ganzjährig',
  'ganzjaehrig': 'Ganzjährig',
  'all season': 'Ganzjährig',
  'frühling': 'Frühling',
  'fruehling': 'Frühling',
  'frühjahr': 'Frühling',
  'fruehjahr': 'Frühling',
  'frühling/sommer': 'Frühling / Sommer',
  'fruehling/sommer': 'Frühling / Sommer',
  'frühling / sommer': 'Frühling / Sommer',
  'fruehling / sommer': 'Frühling / Sommer',
  'sommer': 'Sommer',
  'frühling/herbst': 'Frühling / Herbst',
  'fruehling/herbst': 'Frühling / Herbst',
  'frühling / herbst': 'Frühling / Herbst',
  'fruehling / herbst': 'Frühling / Herbst',
  'herbst': 'Herbst',
  'herbst/winter': 'Herbst / Winter',
  'herbst / winter': 'Herbst / Winter',
  'winter': 'Winter',
};

export function normalizeProductSeason(value: unknown): ProductSeason {
  const raw = String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (!raw) return 'Ganzjährig';
  return aliases[raw] ?? 'Ganzjährig';
}

/**
 * Dauerhafte, jahresunabhängige Logik.
 * März–Mai = Frühling, Juni–August = Sommer,
 * September–November = Herbst, Dezember–Februar = Winter.
 */
export function getAutomaticWebsiteSeason(date = new Date()): WebsiteSeason {
  const month = date.getMonth() + 1;
  if (month >= 3 && month <= 5) return 'Frühling';
  if (month >= 6 && month <= 8) return 'Sommer';
  if (month >= 9 && month <= 11) return 'Herbst';
  return 'Winter';
}

export function resolveWebsiteSeason(
  mode: WebsiteSeasonMode = 'Automatisch',
  manualSeason?: WebsiteSeason | null,
  date = new Date(),
): WebsiteSeason {
  if (mode === 'Manuell' && manualSeason) return manualSeason;
  return getAutomaticWebsiteSeason(date);
}

const websiteSeasonMap: Record<WebsiteSeason, readonly ProductSeason[]> = {
  Frühling: ['Frühling', 'Frühling / Sommer', 'Frühling / Herbst', 'Ganzjährig'],
  Sommer: ['Sommer', 'Frühling / Sommer', 'Ganzjährig'],
  Herbst: ['Herbst', 'Herbst / Winter', 'Frühling / Herbst', 'Ganzjährig'],
  Winter: ['Winter', 'Herbst / Winter', 'Ganzjährig'],
};

export function isProductVisibleInSeason(
  productSeason: unknown,
  websiteSeason: WebsiteSeason,
): boolean {
  const normalized = normalizeProductSeason(productSeason);
  return websiteSeasonMap[websiteSeason].includes(normalized);
}

export function shouldShowProductOnWebsite(
  product: { season?: unknown; show_on_website?: unknown; status?: unknown },
  websiteSeason: WebsiteSeason,
): boolean {
  const manuallyVisible = product.show_on_website !== false;
  const status = String(product.status ?? '').trim().toLowerCase();
  const allowedStatus = !['verkauft', 'retoure', 'archiviert', 'nicht im verkauf'].includes(status);
  return manuallyVisible && allowedStatus && isProductVisibleInSeason(product.season, websiteSeason);
}
