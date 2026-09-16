'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { socialMediaFormatguide, defaultContentFormat, SOCIAL_MEDIA_FORMATGUIDE_REFERENCE } from '@/lib/social-media-formatguide';

type Channel = 'instagram' | 'facebook' | 'pinterest';

type AiBudget = {
  budgetEur: number;
  spentEur: number;
  remainingEur: number;
  percent: number;
  warning: boolean;
  blocked: boolean;
  generations?: number;
  generationLimit?: number;
};

type ProductImage = {
  id?: string;
  product_id?: string;
  storage_path?: string;
  public_url?: string;
  url?: string;
  sort_order?: number;
  content_suitable?: boolean;
};

type Product = {
  id: string;
  sku?: string;
  brand?: string;
  category?: string;
  subcategory?: string;
  public_title?: string;
  material?: string;
  size?: string;
  color?: string;
  status?: string;
  product_images?: ProductImage[];
};

type PlatformRule = {
  label: string;
  captionLimit: number | null;
  hashtagLimit: number | null;
};

type ChannelContent = {
  title: string;
  caption: string;
  hashtags: string;
  firstComment: string;
  link: string;
  altText: string;
  board: string;
  imageFormat: string;
};

const platformRules: Record<Channel, PlatformRule> = {
  instagram: {
    label: 'Instagram',
    captionLimit: 2200,
    hashtagLimit: 30,
  },
  facebook: {
    label: 'Facebook',
    captionLimit: null,
    hashtagLimit: null,
  },
  pinterest: {
    label: 'Pinterest',
    captionLimit: 800,
    hashtagLimit: null,
  },
};

const fixedBrandHashtags = [
  '#monchicparis',
  '#vintagefashion',
  '#parisianstyle',
  '#prelovedfashion',
];

const demoArticleHashtags = [
  '#vintageblazer',
  '#autumnstyle',
  '#neutralstyle',
];

const demoTitle = 'Herbst in Paris · Zeitlose Eleganz';

const demoCaption =
  'Herbst in Paris. Zeitlose Eleganz, neu kombiniert. Ein Blazer mit Vergangenheit, feine Naturtöne und ein Look, der bereit ist für ein neues Kapitel.';

const demoProducts = [
  {
    id: 'demo-blazer',
    name: 'Vintage Blazer',
    meta: 'Beige · Classic',
    short: 'Blazer',
  },
  {
    id: 'demo-blouse',
    name: 'Seidenbluse',
    meta: 'Creme · Parisian Chic',
    short: 'Bluse',
  },
  {
    id: 'demo-trousers',
    name: 'Vintage Hose',
    meta: 'Camel · Minimal',
    short: 'Hose',
  },
];

type PlanningSuggestion = {
  channel: Channel;
  weekday: number;
  time: string;
};

const planningSuggestionRules: PlanningSuggestion[] = [
  { channel: 'instagram', weekday: 4, time: '19:00' },
  { channel: 'facebook', weekday: 3, time: '18:30' },
  { channel: 'pinterest', weekday: 2, time: '18:15' },
];

function nextWeekdayIso(weekday: number) {
  const now = new Date();
  const result = new Date(now);
  let delta = (weekday - now.getDay() + 7) % 7;
  if (delta === 0) delta = 7;
  result.setDate(now.getDate() + delta);
  const year = result.getFullYear();
  const month = String(result.getMonth() + 1).padStart(2, '0');
  const day = String(result.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatPlanningDate(value: string) {
  if (!value) return '';
  return new Intl.DateTimeFormat('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(`${value}T12:00:00`));
}

type SavedContent = {
  id: string;
  internalName: string;
  keywords: string[];
  channels: Channel[];
  productIds: string[];
  channelContent: Record<Channel, ChannelContent>;
  status: 'draft' | 'planned';
  plannedDate: string;
  plannedTime: string;
  planningConfirmed: boolean;
  reviewConfirmed: boolean;
  savedAt: string;
};

export default function Page() {
  const [channels, setChannels] = useState<Channel[]>(['instagram']);
  const [previewChannel, setPreviewChannel] = useState<Channel>('instagram');
  const [title, setTitle] = useState(demoTitle);
  const [caption, setCaption] = useState(demoCaption);
  const [hashtags, setHashtags] = useState(
    [...fixedBrandHashtags, ...demoArticleHashtags].join(' ')
  );
  const [status, setStatus] = useState<'draft' | 'planned'>('draft');
  const [plannedDate, setPlannedDate] = useState('');
  const [plannedTime, setPlannedTime] = useState('');
  const [planningConfirmed, setPlanningConfirmed] = useState(false);
  const [planningSuggestionSource, setPlanningSuggestionSource] = useState<Channel | null>(null);
  const [showFinalReview, setShowFinalReview] = useState(false);
  const [finalReviewPlanning, setFinalReviewPlanning] = useState<{
    status: 'draft' | 'planned';
    plannedDate: string;
    plannedTime: string;
    planningConfirmed: boolean;
  } | null>(null);
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const [internalName, setInternalName] = useState('');
  const [contentKeywords, setContentKeywords] = useState('');
  const [contentSaved, setContentSaved] = useState(false);
  const [showContentLibrary, setShowContentLibrary] = useState(false);
  const [showWeeklyPlan, setShowWeeklyPlan] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [contentLibrary, setContentLibrary] = useState<SavedContent[]>([]);
  const [calendarPlanningPreview, setCalendarPlanningPreview] = useState<SavedContent | null>(null);
  const [librarySearch, setLibrarySearch] = useState('');
  const [openedLibraryId, setOpenedLibraryId] = useState<string | null>(null);
  const [editingContentId, setEditingContentId] = useState<string | null>(null);
  const [contentSuggestionReference, setContentSuggestionReference] = useState<{
    title: string;
    caption: string;
    hashtags: string;
  } | null>({
    title: demoTitle,
    caption: demoCaption,
    hashtags: [...fixedBrandHashtags, ...demoArticleHashtags].join(' '),
  });
  const [aiBudget, setAiBudget] = useState<AiBudget | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState('');
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [selectedContentImages, setSelectedContentImages] = useState<string[]>([]);
  const [previewSlideIndex, setPreviewSlideIndex] = useState(0);
  const [editChannel, setEditChannel] = useState<Channel>('instagram');
  const [contentFormatByChannel, setContentFormatByChannel] = useState<Record<Channel, string>>({ instagram: defaultContentFormat.instagram, facebook: defaultContentFormat.facebook, pinterest: defaultContentFormat.pinterest });
  const [customHashtagInput, setCustomHashtagInput] = useState('');
  const [channelContent, setChannelContent] = useState<Record<Channel, ChannelContent>>({
    instagram: {
      title: '',
      caption: '',
      hashtags: '',
      firstComment: '',
      link: '',
      altText: '',
      board: '',
      imageFormat: '4:5',
    },
    facebook: {
      title: '',
      caption: '',
      hashtags: '',
      firstComment: '',
      link: '',
      altText: '',
      board: '',
      imageFormat: '4:5',
    },
    pinterest: {
      title: '',
      caption: '',
      hashtags: '',
      firstComment: '',
      link: '',
      altText: '',
      board: '',
      imageFormat: '2:3',
    },
  });

  // V48: Pinterest title/caption use local edit buffers so typing can never be
  // overwritten by base/channel synchronization during the same edit session.
  const [pinterestDraftTitle, setPinterestDraftTitle] = useState('');
  const [pinterestDraftCaption, setPinterestDraftCaption] = useState('');

  /*
    Wird im nächsten Schritt durch die echte Artikelauswahl ersetzt.
    Sobald echte Artikel gewählt sind, verschwindet der Beispielzustand automatisch.
  */
  const selectedProductsCount = selectedProducts.length;

  useEffect(() => {
    setProductsLoading(true);
    setProductsError('');

    fetch('/api/products', { cache: 'no-store' })
    .then(async response => {
      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    })
    .then(data => {
      const productList = Array.isArray(data) ? data : [];
      setProducts(productList);
      setSelectedProducts(productList.filter((product: Product) =>
        (product.product_images || []).some(image => Boolean(image.content_suitable))
      ));
      setSelectedContentImages(productList.flatMap((product: Product) => (product.product_images || []).filter(image => Boolean(image.content_suitable)).map(image => image.id || image.public_url || '').filter(Boolean)));
    })
    .catch(error => {
      console.error('Produkte konnten nicht geladen werden:', error);
      setProductsError('Produkte konnten nicht geladen werden.');
    })
    .finally(() => {
      setProductsLoading(false);
    });
}, []);

  useEffect(() => {
    fetch('/api/ai/budget', { cache: 'no-store' })
      .then(response => (response.ok ? response.json() : null))
      .then(data => {
        if (data) setAiBudget(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('mon-chic-current-planning');
      if (!raw) return;
      const pending = JSON.parse(raw);
      if (!pending?.plannedDate || !pending?.plannedTime) return;

      setStatus('planned');
      setPlannedDate(pending.plannedDate);
      setPlannedTime(pending.plannedTime);
      setPlanningConfirmed(true);
      setPlanningSuggestionSource(pending.planningSuggestionSource || null);
      if (Array.isArray(pending.channels) && pending.channels.length > 0) {
        setChannels(pending.channels);
      }
    } catch {
      localStorage.removeItem('mon-chic-current-planning'); localStorage.removeItem('mon-chic-calendar-draft-v1');
    }
  }, []);

  useEffect(() => {
    if (channels.length === 0) return;

    // V45: Editor und Vorschau müssen immer auf einem tatsächlich gewählten Kanal stehen.
    // Das ist besonders nach Reload/Restore wichtig, wenn z. B. Pinterest gewählt ist,
    // editChannel aber noch den initialen Wert "instagram" hat.
    const fallbackChannel = channels[0];
    if (!channels.includes(editChannel)) setEditChannel(fallbackChannel);
    if (!channels.includes(previewChannel)) setPreviewChannel(fallbackChannel);
  }, [channels, editChannel, previewChannel]);

  // Nur beim Wechsel IN den Pinterest-Editor initialisieren.
  // Wichtig: channelContent ist absichtlich KEINE Dependency, damit Tippen nicht zurückgesetzt wird.
  useEffect(() => {
    if (editChannel !== 'pinterest') return;
    setPinterestDraftTitle(channelContent.pinterest.title);
    setPinterestDraftCaption(channelContent.pinterest.caption);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editChannel]);

  function toggleChannel(channel: Channel) {
    setChannels(current => {
      const isSelected = current.includes(channel);

      if (isSelected) {
        const nextChannels = current.filter(item => item !== channel);
        const fallbackChannel = nextChannels[0] || 'instagram';

        if (editChannel === channel) setEditChannel(fallbackChannel);
        if (previewChannel === channel) setPreviewChannel(fallbackChannel);

        return nextChannels;
      }

      // V44: Beim Auswählen eines Kanals direkt dessen Editor und Vorschau öffnen.
      // So bleibt z. B. nach der Pinterest-Auswahl nicht versehentlich Instagram sichtbar.
      setEditChannel(channel);
      setPreviewChannel(channel);
      return [...current, channel];
    });
  }

  const activePreviewContent = channelContent[previewChannel];

  const effectivePreviewTitle =
    previewChannel === 'pinterest' && editChannel === 'pinterest'
      ? pinterestDraftTitle.trim() || title.trim()
      : activePreviewContent.title.trim() || title.trim();

  const effectivePreviewCaption =
    previewChannel === 'pinterest' && editChannel === 'pinterest'
      ? pinterestDraftCaption.trim() || caption.trim()
      : activePreviewContent.caption.trim() || caption.trim();

  const effectivePreviewHashtags =
    activePreviewContent.hashtags.trim() || hashtags.trim();

  const hashtagList = useMemo(() => {
    return effectivePreviewHashtags
      .split(/\s+/)
      .map(value => value.trim())
      .filter(value => value.startsWith('#'));
  }, [effectivePreviewHashtags]);

  // Version 25: persist a confirmed plan reactively as a second safety net.
  // This makes the calendar independent from the exact button handler path.
  useEffect(() => {
    if (
      status !== 'planned' ||
      !planningConfirmed ||
      !plannedDate ||
      !plannedTime
    ) {
      return;
    }

    const calendarDraft: SavedContent = {
      id: 'current-planning-preview',
      internalName:
        internalName.trim() ||
        effectivePreviewTitle ||
        title.trim() ||
        'Aktueller Beitrag',
      keywords: contentKeywords
        .split(',')
        .map(value => value.trim())
        .filter(Boolean),
      channels,
      productIds: selectedProducts.map(product => product.id),
      channelContent,
      status: 'planned',
      plannedDate,
      plannedTime,
      planningConfirmed: true,
      reviewConfirmed,
      savedAt: '',
    };

    try {
      window.localStorage.setItem(
        'mon-chic-calendar-draft-v1',
        JSON.stringify(calendarDraft)
      );
      window.localStorage.setItem(
        'mon-chic-current-planning',
        JSON.stringify({
          plannedDate,
          plannedTime,
          planningSuggestionSource,
          channels,
          savedAt: new Date().toISOString(),
        })
      );
      setCalendarPlanningPreview(calendarDraft);
    } catch (error) {
      console.error('Kalenderplanung konnte nicht automatisch gespeichert werden:', error);
    }
  }, [
    status,
    planningConfirmed,
    plannedDate,
    plannedTime,
    planningSuggestionSource,
    channels,
    selectedProducts,
    channelContent,
    internalName,
    contentKeywords,
    effectivePreviewTitle,
    title,
    reviewConfirmed,
  ]);

  function updateChannelContent(
    channel: Channel,
    patch: Partial<ChannelContent>
  ) {
    setChannelContent(current => ({
      ...current,
      [channel]: {
        ...current[channel],
        ...patch,
      },
    }));
  }

  function toggleHashtag(tag: string) {
    const currentHashtags =
      channelContent[editChannel].hashtags || hashtags;

    const allEntries = currentHashtags
      .split(/\s+/)
      .map(value => value.trim())
      .filter(Boolean);

    const nextHashtags = allEntries.includes(tag)
      ? allEntries.filter(value => value !== tag).join(' ')
      : [...allEntries, tag].join(' ');

    updateChannelContent(editChannel, { hashtags: nextHashtags });
  }

  function hasHashtag(tag: string) {
    const currentHashtags =
      channelContent[editChannel].hashtags || hashtags;

    return currentHashtags
      .split(/\s+/)
      .map(value => value.trim())
      .filter(Boolean)
      .includes(tag);
  }

  function normalizeHashtag(value: string) {
    const normalized = value
      .trim()
      .toLowerCase()
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .replace(/ß/g, 'ss')
      .replace(/[^a-z0-9]/g, '');

    return normalized ? `#${normalized}` : '';
  }

  const articleHashtags = useMemo(() => {
    const tags = selectedProducts.flatMap(product =>
      [product.brand, product.category, product.subcategory, product.color]
        .filter(Boolean)
        .map(value => normalizeHashtag(String(value)))
        .filter(Boolean)
    );

    return [...new Set(tags)].filter(tag => !fixedBrandHashtags.includes(tag));
  }, [selectedProducts]);

  const editHashtagList = useMemo(() => {
    const currentHashtags = channelContent[editChannel].hashtags || hashtags;
    return currentHashtags
      .split(/\s+/)
      .map(value => value.trim())
      .filter(value => value.startsWith('#'));
  }, [channelContent, editChannel, hashtags]);

  function addCustomHashtag() {
    const tag = normalizeHashtag(customHashtagInput.replace(/^#/, ''));
    if (!tag) return;

    const currentHashtags = channelContent[editChannel].hashtags || hashtags;
    const entries = currentHashtags
      .split(/\s+/)
      .map(value => value.trim())
      .filter(Boolean);

    if (!entries.includes(tag)) {
      updateChannelContent(editChannel, {
        hashtags: [...entries, tag].join(' '),
      });
    }

    setCustomHashtagInput('');
  }

  const currentMonthLabel = new Intl.DateTimeFormat('de-DE', {
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  const currentRule = platformRules[previewChannel];
  const currentContentFormat = socialMediaFormatguide[previewChannel].find(item => item.id === contentFormatByChannel[previewChannel]) || socialMediaFormatguide[previewChannel][0];
  const editContentFormat = socialMediaFormatguide[editChannel].find(item => item.id === contentFormatByChannel[editChannel]) || socialMediaFormatguide[editChannel][0];
  const captionLength = effectivePreviewCaption.length;
  const captionPercent = currentRule.captionLimit
    ? Math.min(100, (captionLength / currentRule.captionLimit) * 100)
    : 0;

  const captionTooLong =
    currentRule.captionLimit !== null &&
    captionLength > currentRule.captionLimit;

  const instagramSelected = channels.includes('instagram');

  const instagramHashtagTooMany =
    previewChannel === 'instagram' &&
    hashtagList.length > (platformRules.instagram.hashtagLimit || 30);

  const step1Done = channels.length > 0;
  const step2Done = selectedProductsCount > 0;
  const step3Done = title.trim().length > 0 || caption.trim().length > 0;

  let currentStep = 1;
  if (step1Done) currentStep = 2;
  if (step1Done && step2Done) currentStep = 3;
  if (step1Done && step2Done && step3Done) currentStep = 4;

  function progressClass(step: number) {
    if (
      (step === 1 && step1Done) ||
      (step === 2 && step2Done) ||
      (step === 3 && step3Done)
    ) {
      return 'is-done';
    }

    if (step === currentStep) return 'is-current';
    return '';
  }

  const anyChannelContent = Object.values(channelContent).some(item =>
    [
      item.title,
      item.caption,
      item.hashtags,
      item.firstComment,
      item.link,
      item.altText,
      item.board,
    ].some(value => value.trim())
  );

  const demoMode = products.length === 0 && selectedProductsCount === 0;

  // Version 39: Demo mode controls only the demo product photos.
  // The preview text must always reflect the currently edited content.
  const previewTitle =
    effectivePreviewTitle ||
    demoTitle ||
    'Dein Beitrag';

  const previewCaption =
    effectivePreviewCaption ||
    demoCaption ||
    'Hier erscheint die Vorschau deines Beitragstextes.';

  const previewHashtags =
    effectivePreviewHashtags ||
    [...fixedBrandHashtags, ...demoArticleHashtags].join(' ');

  const previewAspectRatio = (() => {
    const format = channelContent[previewChannel].imageFormat;
    if (format === '1:1') return '1 / 1';
    if (format === '4:5') return '4 / 5';
    if (format === '9:16') return '9 / 16';
    if (format === '2:3') return '2 / 3';
    if (format === '16:9') return '16 / 9';
    return '4 / 5';
  })();

  function getPrimaryImageUrl(product: Product) {
    const images = [...(product.product_images || [])].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    return images.find(image => image.content_suitable)?.public_url || images[0]?.public_url || '';
  }

  function getContentImageKey(image: ProductImage) {
    return image.id || image.public_url || image.url || '';
  }

  function moveContentImage(imageKey: string, direction: -1 | 1) {
    setSelectedContentImages(current => {
      const fromIndex = current.indexOf(imageKey);
      const toIndex = fromIndex + direction;
      if (fromIndex < 0 || toIndex < 0 || toIndex >= current.length) return current;
      const next = [...current];
      [next[fromIndex], next[toIndex]] = [next[toIndex], next[fromIndex]];
      return next;
    });
  }

  const selectedPreviewProducts = selectedProducts.flatMap(product =>
    [...(product.product_images || [])]
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .filter(image => {
        const imageKey = getContentImageKey(image);

        return Boolean(imageKey && selectedContentImages.includes(imageKey));
      })
      .map(image => ({
        product,
        image,
        imageKey: getContentImageKey(image),
        imageUrl: image.public_url || image.url || '',
      }))
      .filter(item => item.imageUrl)
  ).sort((a, b) => selectedContentImages.indexOf(a.imageKey) - selectedContentImages.indexOf(b.imageKey));

  const selectedContentImageCount = selectedPreviewProducts.length;
  const contentImageCountValid = selectedContentImageCount >= currentContentFormat.minImages && selectedContentImageCount <= currentContentFormat.maxImages;

  function createContentFromSelectedProducts() {
    if (selectedProducts.length === 0) return;

    const productLabels = selectedProducts.map(product =>
      product.brand ||
      product.subcategory ||
      product.category ||
      'Vintage'
    );

    const uniqueLabels = [...new Set(productLabels)];
    const itemCount = selectedProducts.length;

    const detailFor = (product: Product) =>
      [
        product.brand,
        product.subcategory || product.category,
        product.color,
      ]
        .filter(Boolean)
        .join(' · ');

    const descriptions = selectedProducts.map(detailFor);

    const first = selectedProducts[0];
    const second = selectedProducts[1];
    const third = selectedProducts[2];

    const firstLabel =
      first?.brand || first?.subcategory || first?.category || 'Vintage-Piece';
    const secondLabel =
      second?.brand || second?.subcategory || second?.category || 'zweites Piece';
    const thirdLabel =
      third?.brand || third?.subcategory || third?.category || 'drittes Piece';

    let suggestedTitle = '';
    let suggestedCaption = '';
    let facebookCaption = '';
    let pinterestTitle = '';
    let pinterestCaption = '';

    if (itemCount === 1) {
      suggestedTitle = `${firstLabel} · Vintage Style`;
      suggestedCaption =
        `${descriptions[0]}. Ein ausgewähltes Vintage-Piece mit Charakter – ` +
        `zeitlos, individuell und bereit für einen neuen Auftritt.`;

      facebookCaption =
        `${descriptions[0]}. Ein besonderes Vintage-Piece von MON CHIC PARIS, ` +
        `das sich vielseitig kombinieren lässt und einem Look Persönlichkeit gibt.`;

      pinterestTitle = `${firstLabel} Vintage Style`;
      pinterestCaption =
        `${descriptions[0]}. Vintage Fashion Inspiration von MON CHIC PARIS – ` +
        `zeitloser Stil, individuelle Details und Ideen zum Kombinieren.`;
    } else if (itemCount === 2) {
      suggestedTitle = `${firstLabel} & ${secondLabel} · Vintage Look`;
      suggestedCaption =
        `${firstLabel} trifft auf ${secondLabel}. ` +
        `Zwei Vintage-Pieces verbinden sich zu einem ausdrucksstarken Look – ` +
        `charaktervoll, individuell und bewusst kombiniert.`;

      facebookCaption =
        `${firstLabel} & ${secondLabel}: zwei Vintage-Pieces, die sich gegenseitig ergänzen. ` +
        `So entsteht ein Look mit Persönlichkeit – individuell, tragbar und spannend kombiniert.`;

      pinterestTitle = `${firstLabel} & ${secondLabel} Vintage Look`;
      pinterestCaption =
        `${descriptions[0]} kombiniert mit ${descriptions[1]}. ` +
        `Vintage Outfit Inspiration von MON CHIC PARIS für einen individuellen, zeitlosen Look.`;
    } else {
      const extraCount = Math.max(0, itemCount - 3);
      suggestedTitle =
        `${firstLabel} & ${secondLabel} & ${thirdLabel}` +
        (extraCount > 0 ? ` + ${extraCount} mehr` : '') +
        ` · Komplettlook`;

      suggestedCaption =
        `${descriptions[0]}, ${descriptions[1]} und ${descriptions[2]} bilden gemeinsam einen Look. ` +
        `Statt einzelne Teile nur aufzuzählen, verbindet sie eine gemeinsame Idee: ` +
        `Vintage mit Charakter, ruhige Kontraste und ein Styling, das wie aus einem Guss wirkt.` +
        (extraCount > 0
          ? ` Ergänzt wird der Look durch ${extraCount} weitere${extraCount === 1 ? 's Piece' : ' Pieces'}.`
          : '');

      facebookCaption =
        `Dieser Look entsteht aus mehreren Vintage-Pieces: ${descriptions.slice(0, 3).join(' · ')}. ` +
        `Zusammen wirkt die Kombination stärker als jedes Teil für sich – individuell, tragbar und mit eigener Geschichte.` +
        (extraCount > 0
          ? ` Dazu kommen ${extraCount} weitere${extraCount === 1 ? 's Piece' : ' Pieces'}.`
          : '');

      pinterestTitle = `${firstLabel} ${secondLabel} ${thirdLabel} Vintage Outfit`;
      pinterestCaption =
        `${descriptions.slice(0, 3).join(' · ')}. ` +
        `Vintage Outfit Inspiration von MON CHIC PARIS – ein kompletter Look mit harmonischen Farben, ` +
        `individuellen Details und zeitlosem Charakter.`;
    }

    setTitle(suggestedTitle);
    setCaption(suggestedCaption);

    const generatedTags = selectedProducts.flatMap(product => {
      return [
        product.brand,
        product.category,
        product.subcategory,
        product.color,
      ]
        .filter(Boolean)
        .map(value => normalizeHashtag(String(value)))
        .filter(Boolean);
    });

    const allTags = [
      ...fixedBrandHashtags,
      ...new Set(generatedTags),
    ];

    const baseHashtags = allTags.join(' ');

    setContentSuggestionReference({
      title: suggestedTitle,
      caption: suggestedCaption,
      hashtags: baseHashtags,
    });

    setHashtags(baseHashtags);

    setChannelContent(current => ({
      instagram: {
        ...current.instagram,
        title: suggestedTitle,
        caption: suggestedCaption,
        hashtags: baseHashtags,
      },
      facebook: {
        ...current.facebook,
        title: suggestedTitle,
        caption: facebookCaption,
        hashtags: fixedBrandHashtags.join(' '),
      },
      pinterest: {
        ...current.pinterest,
        title: pinterestTitle,
        caption: pinterestCaption,
        hashtags: baseHashtags,
      },
    }));
    setPinterestDraftTitle(pinterestTitle);
    setPinterestDraftCaption(pinterestCaption);
  }

  function copyBaseToChannel(channel: Channel) {
    updateChannelContent(channel, {
      title,
      caption,
      hashtags,
    });
    if (channel === 'pinterest') {
      setPinterestDraftTitle(title);
      setPinterestDraftCaption(caption);
    }
  }

  const planningSuggestions = planningSuggestionRules
    .filter(item => channels.includes(item.channel))
    .map(item => ({
      ...item,
      date: nextWeekdayIso(item.weekday),
      label: platformRules[item.channel].label,
    }));

  function applyPlanningSuggestion(channel: Channel, date: string, time: string) {
    setPlannedDate(date);
    setPlannedTime(time);
    setPlanningSuggestionSource(channel);
    setPlanningConfirmed(false);
    setContentSaved(false);
    try {
      localStorage.removeItem('mon-chic-current-planning'); localStorage.removeItem('mon-chic-calendar-draft-v1');
    } catch {}
  }

  function confirmPlanning() {
    if (!plannedDate || !plannedTime) return;

    const calendarDraft: SavedContent = {
      id: 'current-planning-preview',
      internalName:
        internalName.trim() ||
        effectivePreviewTitle ||
        title.trim() ||
        'Aktueller Beitrag',
      keywords: contentKeywords
        .split(',')
        .map(value => value.trim())
        .filter(Boolean),
      channels,
      productIds: selectedProducts.map(product => product.id),
      channelContent,
      status: 'planned',
      plannedDate,
      plannedTime,
      planningConfirmed: true,
      reviewConfirmed,
      savedAt: '',
    };

    // Version 24: persist the exact calendar entry FIRST.
    // The weekly plan reads this same object back without rebuilding it from editor state.
    try {
      window.localStorage.setItem('mon-chic-calendar-draft-v1', JSON.stringify(calendarDraft));
      window.localStorage.setItem(
        'mon-chic-current-planning',
        JSON.stringify({
          plannedDate,
          plannedTime,
          planningSuggestionSource,
          channels,
          savedAt: new Date().toISOString(),
        })
      );
    } catch (error) {
      console.error('Kalenderplanung konnte nicht gespeichert werden:', error);
    }

    setCalendarPlanningPreview(calendarDraft);
    setPlanningConfirmed(true);
  }

  function openFinalReview() {
    // Version 28: create one planning snapshot for the final review.
    // This avoids relying on asynchronous React state updates in the same click event.
    let reviewStatus: 'draft' | 'planned' = status;
    let reviewDate = plannedDate;
    let reviewTime = plannedTime;
    let reviewPlanningConfirmed = planningConfirmed;

    try {
      const rawDraft = window.localStorage.getItem('mon-chic-calendar-draft-v1');
      if (rawDraft) {
        const draft = JSON.parse(rawDraft) as SavedContent;
        if (draft.planningConfirmed && draft.plannedDate && draft.plannedTime) {
          reviewStatus = 'planned';
          reviewDate = draft.plannedDate;
          reviewTime = draft.plannedTime;
          reviewPlanningConfirmed = true;

          setStatus('planned');
          setPlannedDate(draft.plannedDate);
          setPlannedTime(draft.plannedTime);
          setPlanningConfirmed(true);
          setCalendarPlanningPreview(draft);
        }
      }
    } catch (error) {
      console.error('Bestätigte Planung konnte für die finale Prüfung nicht geladen werden:', error);
    }

    setFinalReviewPlanning({
      status: reviewStatus,
      plannedDate: reviewDate,
      plannedTime: reviewTime,
      planningConfirmed: reviewPlanningConfirmed,
    });

    // Version 29: make saving self-explanatory.
    // If no internal name was entered manually, use the current content title.
    if (!internalName.trim()) {
      setInternalName(
        effectivePreviewTitle ||
        title.trim() ||
        demoTitle ||
        'MON CHIC PARIS Content'
      );
    }

    setReviewConfirmed(false);
    setShowFinalReview(true);
  }

  function confirmFinalReview() {
    setReviewConfirmed(true);
    setContentSaved(false);
  }

  function saveDraftContent() {
    const effectiveInternalName =
      internalName.trim() ||
      effectivePreviewTitle ||
      title.trim() ||
      demoTitle ||
      'MON CHIC PARIS Content';

    const draftContent: SavedContent = {
      id: editingContentId || `content-${Date.now()}`,
      internalName: effectiveInternalName,
      keywords: contentKeywords
        .split(',')
        .map(value => value.trim())
        .filter(Boolean),
      channels,
      productIds: selectedProducts.map(product => product.id),
      channelContent,
      status: 'draft',
      plannedDate: '',
      plannedTime: '',
      planningConfirmed: false,
      reviewConfirmed: false,
      savedAt: new Date().toISOString(),
    };

    try {
      const existing = JSON.parse(
        localStorage.getItem('mon-chic-content-library') || '[]'
      );
      const currentLibrary: SavedContent[] = Array.isArray(existing) ? existing : [];
      const nextLibrary = editingContentId
        ? currentLibrary.map(item =>
            item.id === editingContentId ? draftContent : item
          )
        : [draftContent, ...currentLibrary];

      localStorage.setItem(
        'mon-chic-content-library',
        JSON.stringify(nextLibrary)
      );

      setContentLibrary(nextLibrary);
      setContentSaved(true);
      setEditingContentId(draftContent.id);
      setStatus('draft');
      setPlanningConfirmed(false);
      setReviewConfirmed(false);
      setFinalReviewPlanning(null);
      setCalendarPlanningPreview(null);

      try {
        localStorage.removeItem('mon-chic-current-planning');
        localStorage.removeItem('mon-chic-calendar-draft-v1');
      } catch {}

      // Show the library immediately so the user can see that the draft exists.
      setLibrarySearch('');
      setOpenedLibraryId(draftContent.id);
      setShowContentLibrary(true);
    } catch (error) {
      console.error('Entwurf konnte nicht gespeichert werden:', error);
      setContentSaved(false);
    }
  }

  function saveApprovedContent() {
    const effectiveInternalName =
      internalName.trim() ||
      effectivePreviewTitle ||
      title.trim() ||
      demoTitle ||
      'MON CHIC PARIS Content';

    // Version 19: A confirmed planning is the source of truth for the saved status.
    // This keeps Final Review -> Library -> Weekly Plan in sync.
    const reviewPlan = finalReviewPlanning;
    const effectivePlannedDate = reviewPlan?.plannedDate || plannedDate;
    const effectivePlannedTime = reviewPlan?.plannedTime || plannedTime;
    const effectivePlanningConfirmed = reviewPlan?.planningConfirmed ?? planningConfirmed;

    const effectiveStatus: 'draft' | 'planned' =
      effectivePlanningConfirmed && effectivePlannedDate && effectivePlannedTime
        ? 'planned'
        : 'draft';

    const savedContent: SavedContent = {
      id: editingContentId || `content-${Date.now()}`,
      internalName: effectiveInternalName,
      keywords: contentKeywords
        .split(',')
        .map(value => value.trim())
        .filter(Boolean),
      channels,
      productIds: selectedProducts.map(product => product.id),
      channelContent,
      status: effectiveStatus,
      plannedDate: effectiveStatus === 'planned' ? effectivePlannedDate : '',
      plannedTime: effectiveStatus === 'planned' ? effectivePlannedTime : '',
      planningConfirmed: effectivePlanningConfirmed,
      reviewConfirmed: true,
      savedAt: new Date().toISOString(),
    };

    try {
      const existing = JSON.parse(localStorage.getItem('mon-chic-content-library') || '[]');
      const currentLibrary: SavedContent[] = Array.isArray(existing) ? existing : [];
      const nextLibrary = editingContentId
        ? currentLibrary.map(item =>
            item.id === editingContentId ? savedContent : item
          )
        : [savedContent, ...currentLibrary];
      localStorage.setItem('mon-chic-content-library', JSON.stringify(nextLibrary));
      // Keep the in-memory library/calendar in sync immediately after saving.
      setContentLibrary(nextLibrary);
      setContentSaved(true);
      setEditingContentId(savedContent.id);
      setCalendarPlanningPreview(null);
      try {
        localStorage.removeItem('mon-chic-current-planning'); localStorage.removeItem('mon-chic-calendar-draft-v1');
      } catch {}
    } catch {
      setContentSaved(false);
    }
  }

  function loadContentLibrary() {
    try {
      const parsed = JSON.parse(localStorage.getItem('mon-chic-content-library') || '[]');
      setContentLibrary(Array.isArray(parsed) ? parsed : []);
    } catch {
      setContentLibrary([]);
    }
    setShowContentLibrary(true);
  }

  function loadWeeklyPlan() {
    try {
      const parsed = JSON.parse(localStorage.getItem('mon-chic-content-library') || '[]');
      setContentLibrary(Array.isArray(parsed) ? parsed : []);
    } catch {
      setContentLibrary([]);
    }

    let targetDate = planningConfirmed && plannedDate ? plannedDate : '';

    // Version 24: the calendar has its own persisted draft source.
    try {
      const calendarRaw = window.localStorage.getItem('mon-chic-calendar-draft-v1');
      if (calendarRaw) {
        const calendarDraft = JSON.parse(calendarRaw) as SavedContent;
        if (calendarDraft?.plannedDate && calendarDraft?.plannedTime) {
          setCalendarPlanningPreview(calendarDraft);
          targetDate = calendarDraft.plannedDate;
        }
      }
    } catch (error) {
      console.error('Kalenderentwurf konnte nicht geladen werden:', error);
    }

    if (status === 'planned' && planningConfirmed && plannedDate && plannedTime) {
      setCalendarPlanningPreview({
        id: 'current-planning-preview',
        internalName:
          internalName.trim() ||
          effectivePreviewTitle ||
          title.trim() ||
          'Aktueller Beitrag',
        keywords: contentKeywords
          .split(',')
          .map(value => value.trim())
          .filter(Boolean),
        channels,
        productIds: selectedProducts.map(product => product.id),
        channelContent,
        status: 'planned',
        plannedDate,
        plannedTime,
        planningConfirmed: true,
        reviewConfirmed,
        savedAt: '',
      });
    }

    // Restore a confirmed but not-yet-saved plan from localStorage.
    // This is especially important during development because F5 resets React state.
    try {
      const raw = localStorage.getItem('mon-chic-current-planning');
      if (raw) {
        const pending = JSON.parse(raw);
        if (pending?.plannedDate && pending?.plannedTime) {
          setStatus('planned');
          setPlannedDate(pending.plannedDate);
          setPlannedTime(pending.plannedTime);
          setPlanningConfirmed(true);
          setPlanningSuggestionSource(pending.planningSuggestionSource || null);
          const restoredChannels: Channel[] =
            Array.isArray(pending.channels) && pending.channels.length > 0
              ? pending.channels
              : channels;
          if (restoredChannels.length > 0) {
            setChannels(restoredChannels);
          }
          setCalendarPlanningPreview({
            id: 'current-planning-preview',
            internalName:
              internalName.trim() ||
              effectivePreviewTitle ||
              title.trim() ||
              'Aktueller Beitrag',
            keywords: contentKeywords
              .split(',')
              .map(value => value.trim())
              .filter(Boolean),
            channels: restoredChannels,
            productIds: selectedProducts.map(product => product.id),
            channelContent,
            status: 'planned',
            plannedDate: pending.plannedDate,
            plannedTime: pending.plannedTime,
            planningConfirmed: true,
            reviewConfirmed,
            savedAt: '',
          });
          targetDate = pending.plannedDate;
        }
      }
    } catch {}

    if (targetDate) {
      const today = new Date();
      today.setHours(12, 0, 0, 0);
      const currentMonday = new Date(today);
      const currentDay = currentMonday.getDay();
      currentMonday.setDate(currentMonday.getDate() + (currentDay === 0 ? -6 : 1 - currentDay));

      const target = new Date(`${targetDate}T12:00:00`);
      const targetMonday = new Date(target);
      const targetDay = targetMonday.getDay();
      targetMonday.setDate(targetMonday.getDate() + (targetDay === 0 ? -6 : 1 - targetDay));

      const diffWeeks = Math.round((targetMonday.getTime() - currentMonday.getTime()) / (7 * 24 * 60 * 60 * 1000));
      setWeekOffset(diffWeeks);
    } else {
      setWeekOffset(0);
    }

    setShowWeeklyPlan(true);
  }

  const weekDays = (() => {
    const today = new Date();
    const monday = new Date(today);
    const day = monday.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    monday.setDate(monday.getDate() + diff + weekOffset * 7);
    monday.setHours(12, 0, 0, 0);
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      return { date, iso };
    });
  })();

  const savedWeeklyPlannedContent = contentLibrary.filter(item =>
    item.status === 'planned' && item.planningConfirmed && item.plannedDate
  );

  // Version 20: A confirmed current plan is visible in the weekly calendar immediately,
  // even before the final content-library save. This avoids the confusing empty-calendar state.
  const currentPlanningPreview: SavedContent | null =
    status === 'planned' && planningConfirmed && plannedDate && plannedTime && !contentSaved
      ? {
          id: 'current-planning-preview',
          internalName:
            internalName.trim() ||
            effectivePreviewTitle ||
            title.trim() ||
            'Aktueller Beitrag',
          keywords: contentKeywords
            .split(',')
            .map(value => value.trim())
            .filter(Boolean),
          channels,
          productIds: selectedProducts.map(product => product.id),
          channelContent,
          status: 'planned',
          plannedDate,
          plannedTime,
          planningConfirmed: true,
          reviewConfirmed,
          savedAt: contentSaved ? new Date().toISOString() : '',
        }
      : null;

  const effectiveCalendarPreview = calendarPlanningPreview || currentPlanningPreview;

  const savedWeeklyWithoutEffectiveDuplicate = effectiveCalendarPreview
    ? savedWeeklyPlannedContent.filter(item =>
        !(
          item.plannedDate === effectiveCalendarPreview.plannedDate &&
          item.plannedTime === effectiveCalendarPreview.plannedTime &&
          (item.channels || []).join('|') === (effectiveCalendarPreview.channels || []).join('|') &&
          item.internalName === effectiveCalendarPreview.internalName
        )
      )
    : savedWeeklyPlannedContent;

  const weeklyPlannedContent = effectiveCalendarPreview
    ? [effectiveCalendarPreview, ...savedWeeklyWithoutEffectiveDuplicate]
    : savedWeeklyWithoutEffectiveDuplicate;

  const normalizedLibraryTerms = librarySearch
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const filteredContentLibrary = contentLibrary.filter(item => {
    const linkedProducts = products.filter(product => item.productIds?.includes(product.id));
    const productText = linkedProducts.map(product =>
      [product.brand, product.public_title, product.category, product.subcategory, product.color, product.material]
        .filter(Boolean)
        .join(' ')
    ).join(' ');
    const channelText = Object.values(item.channelContent || {}).map(content =>
      [content.title, content.caption, content.hashtags, content.altText, content.board]
        .filter(Boolean)
        .join(' ')
    ).join(' ');
    const haystack = [
      item.internalName,
      ...(item.keywords || []),
      ...(item.channels || []),
      productText,
      channelText,
      item.status,
      item.plannedDate,
    ].filter(Boolean).join(' ').toLowerCase();
    return normalizedLibraryTerms.every(term => haystack.includes(term));
  });

  function openSavedContentForEditing(item: SavedContent) {
    const restoredChannels: Channel[] = item.channels?.length ? item.channels : ['instagram'];
    const firstChannel = restoredChannels[0] as Channel;
    const firstContent = item.channelContent?.[firstChannel];

    setEditingContentId(item.id);
    setChannels(restoredChannels);
    setPreviewChannel(firstChannel);
    setEditChannel(firstChannel);
    setChannelContent(item.channelContent);

    if (firstContent) {
      const restoredTitle = firstContent.title || '';
      const restoredCaption = firstContent.caption || '';
      const restoredHashtags = firstContent.hashtags || '';
      setTitle(restoredTitle);
      setCaption(restoredCaption);
      setHashtags(restoredHashtags);
      setContentSuggestionReference({
        title: restoredTitle,
        caption: restoredCaption,
        hashtags: restoredHashtags,
      });
    }

    setSelectedProducts(
      products.filter(product => item.productIds?.includes(product.id))
    );
    setInternalName(item.internalName || '');
    setContentKeywords((item.keywords || []).join(', '));
    setStatus(item.status);
    setPlannedDate(item.plannedDate || '');
    setPlannedTime(item.plannedTime || '');
    setPlanningConfirmed(Boolean(item.planningConfirmed));
    setReviewConfirmed(Boolean(item.reviewConfirmed));
    setContentSaved(true);
    setFinalReviewPlanning(
      item.status === 'planned'
        ? {
            status: 'planned',
            plannedDate: item.plannedDate || '',
            plannedTime: item.plannedTime || '',
            planningConfirmed: Boolean(item.planningConfirmed),
          }
        : null
    );
    setCalendarPlanningPreview(null);
    setShowWeeklyPlan(false);
    setShowContentLibrary(false);
    setShowFinalReview(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function deleteDraftContent(item: SavedContent) {
    if (item.status !== 'draft') return;

    const confirmed = window.confirm(
      `Entwurf „${item.internalName}“ wirklich löschen?`
    );
    if (!confirmed) return;

    try {
      const existing = JSON.parse(
        localStorage.getItem('mon-chic-content-library') || '[]'
      );
      const nextLibrary = (Array.isArray(existing) ? existing : []).filter(
        (entry: SavedContent) => entry.id !== item.id
      );

      localStorage.setItem(
        'mon-chic-content-library',
        JSON.stringify(nextLibrary)
      );
      setContentLibrary(nextLibrary);

      if (openedLibraryId === item.id) {
        setOpenedLibraryId(null);
      }
    } catch (error) {
      console.error('Entwurf konnte nicht gelöscht werden:', error);
    }
  }

  function useSavedContentAsTemplate(item: SavedContent) {
    const templateChannels: Channel[] =
      item.channels?.length ? item.channels : ['instagram'];
    setChannels(templateChannels);
    setPreviewChannel(item.channels?.[0] || 'instagram');
    setChannelContent(item.channelContent);
    const firstChannel = item.channels?.[0] || 'instagram';
    const firstContent = item.channelContent?.[firstChannel];
    if (firstContent) {
      setTitle(firstContent.title || '');
      setCaption(firstContent.caption || '');
      setHashtags(firstContent.hashtags || '');
    }
    setSelectedProducts(products.filter(product => item.productIds?.includes(product.id)));
    setInternalName(`${item.internalName} – Kopie`);
    setContentKeywords((item.keywords || []).join(', '));
    setStatus('draft');
    setPlannedDate('');
    setPlannedTime('');
    setPlanningConfirmed(false);
    setReviewConfirmed(false);
    setContentSaved(false);
    setEditingContentId(null);
    setShowFinalReview(false);
    setShowContentLibrary(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <p className="eyebrow">MON CHIC PARIS · CONTENT MARKETING</p>
          <h1>{editingContentId ? 'Content bearbeiten' : 'Content erstellen'}</h1>
          <p
            style={{
              fontFamily: 'Georgia, "Times New Roman", serif',
              color: '#1F3A5F',
              fontSize: '14px',
            }}
          >
            {editingContentId
              ? 'Du bearbeitest einen gespeicherten Beitrag. Beim Speichern wird derselbe Eintrag aktualisiert.'
              : 'Erstelle und organisiere deinen Beitrag für Instagram, Facebook oder Pinterest.'}
          </p>
        </div>

        <div className="content-header-actions">
          <button type="button" className="secondary-button" onClick={loadWeeklyPlan} style={{
              fontFamily: 'Georgia, "Times New Roman", serif',
              color: '#1F3A5F',
              fontWeight: 700,
              letterSpacing: '0.01em',
            }}>
            Wochenplan
          </button>
          <button type="button" className="secondary-button" onClick={loadContentLibrary} style={{
              fontFamily: 'Georgia, "Times New Roman", serif',
              color: '#1F3A5F',
              fontWeight: 700,
              letterSpacing: '0.01em',
            }}>
            Content-Bibliothek
          </button>
          <Link href="/content-studio" className="secondary-button" style={{
              fontFamily: 'Georgia, "Times New Roman", serif',
              color: '#1F3A5F',
              fontWeight: 700,
              letterSpacing: '0.01em',
            }}>
            Zurück zum Content Studio
          </Link>
        </div>
      </div>

      <div
        style={{
          position: 'relative',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          maxWidth: '820px',
          margin: '8px 0 24px',
          padding: '0 8px',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: 'calc(12.5% + 8px)',
            right: 'calc(12.5% + 8px)',
            top: '16px',
            height: '1px',
            background: 'var(--line)',
          }}
        >
          <span
            style={{
              display: 'block',
              width: `${Math.max(0, Math.min(100, ((currentStep - 1) / 3) * 100))}%`,
              height: '100%',
              background: 'var(--gold)',
              transition: 'width 180ms ease',
            }}
          />
        </div>

        {[
          [1, 'Kanäle'],
          [2, 'Artikel'],
          [3, 'Beitrag'],
          [4, 'Status'],
        ].map(([number, label]) => {
          const state = progressClass(number as number);

          return (
            <div
              key={number}
              style={{
                position: 'relative',
                zIndex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '7px',
                minWidth: 0,
              }}
            >
              <span
                style={{
                  width: '32px',
                  height: '32px',
                  display: 'grid',
                  placeItems: 'center',
                  borderRadius: '50%',
                  border:
                    state === 'is-current'
                      ? '1px solid var(--navy)'
                      : state === 'is-done'
                      ? '1px solid var(--gold)'
                      : '1px solid var(--line)',
                  background:
                    state === 'is-done'
                      ? 'var(--gold)'
                      : state === 'is-current'
                      ? 'var(--navy)'
                      : '#fff',
                  color:
                    state === 'is-done' || state === 'is-current'
                      ? '#fff'
                      : 'var(--muted)',
                  boxShadow: '0 0 0 5px var(--cream)',
                  fontSize: '11px',
                  fontWeight: 700,
                }}
              >
                {state === 'is-done' ? '✓' : number}
              </span>

              <span
                style={{
                  color:
                    state === 'is-current'
                      ? 'var(--navy)'
                      : state === 'is-done'
                      ? 'var(--gold)'
                      : 'var(--muted)',
                  fontSize: '10px',
                  fontWeight: state === 'is-current' ? 700 : 600,
                  letterSpacing: '0.01em',
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="content-workspace">
        <main className="content-create-page">
          <section className="content-create-section">
            <div className="content-create-section-title">
              <span className="section-star">✦</span>
              <span className="section-number">1.</span>
              <h2>Kanäle auswählen</h2>
            </div>

            <p className="content-create-section-description">
              Wähle aus, für welche Plattformen der Beitrag erstellt wird.
            </p>

            <div className="content-channel-grid">
              <button
                type="button"
                className={`content-channel-card${
                  channels.includes('instagram') ? ' active' : ''
                }`}
                onClick={() => toggleChannel('instagram')}
              >
                <span className="content-channel-icon">◎</span>
                <span className="content-channel-info">
                  <strong>Instagram</strong>
                  <span>Post · Story · Reel</span>
                </span>
                <span className="content-channel-check">
                  {channels.includes('instagram') ? '●' : '○'}
                </span>
              </button>

              <button
                type="button"
                className={`content-channel-card${
                  channels.includes('facebook') ? ' active' : ''
                }`}
                onClick={() => toggleChannel('facebook')}
              >
                <span className="content-channel-icon">f</span>
                <span className="content-channel-info">
                  <strong>Facebook</strong>
                  <span>Beitrag</span>
                </span>
                <span className="content-channel-check">
                  {channels.includes('facebook') ? '●' : '○'}
                </span>
              </button>

              <button
                type="button"
                className={`content-channel-card${
                  channels.includes('pinterest') ? ' active' : ''
                }`}
                onClick={() => toggleChannel('pinterest')}
              >
                <span className="content-channel-icon">P</span>
                <span className="content-channel-info">
                  <strong>Pinterest</strong>
                  <span>2:3 · 1000 × 1500 px</span>
                </span>
                <span className="content-channel-check">
                  {channels.includes('pinterest') ? '●' : '○'}
                </span>
              </button>
            </div>
          </section>

          <section className="content-create-section">
            <div className="content-create-section-title">
              <span className="section-star">✦</span>
              <span className="section-number">2.</span>
              <h2>Artikel auswählen</h2>
            </div>

            <p className="content-create-section-description">
              Wähle einen oder mehrere Artikel für einen Einzelbeitrag oder
              einen kompletten Look.
            </p>

            {demoMode ? (
              <>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '7px',
                    marginBottom: '10px',
                  }}
                >
                  <span
                    style={{
                      padding: '4px 8px',
                      borderRadius: '999px',
                      background: '#fff6e7',
                      color: 'var(--gold)',
                      fontSize: '9px',
                      fontWeight: 700,
                    }}
                  >
                    Beispiel
                  </span>

                  <span
                    style={{
                      color: 'var(--muted)',
                      fontSize: '10px',
                    }}
                  >
                    Verschwindet automatisch, sobald echte Artikel ausgewählt
                    werden.
                  </span>
                </div>

                <div className="content-product-grid">
                  {demoProducts.map((product, index) => (
                    <article
                      key={`${product.name}-${index}`}
                      className="content-product-card"
                      style={{
                        width: '132px',
                        padding: '7px',
                      }}
                    >
                      <div
                        className={`demo-product-image demo-product-image-${index}`}
                        role="img"
                        aria-label={product.name}
                      />

                      <strong>{product.name}</strong>
                      <small>{product.meta}</small>
                    </article>
                  ))}

                  <button
                    type="button"
                    className="content-add-product"
                    onClick={() => setShowProductPicker(true)}
                  >
                    <span className="plus">＋</span>
                    <span>Artikel hinzufügen</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="content-product-grid">
                {selectedProducts.map(product => {
                  const imageUrl = getPrimaryImageUrl(product);
                  const contentImages = [...(product.product_images || [])].filter(image => Boolean(image.content_suitable)).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

                  return (
                    <article
                      key={product.id}
                      className="content-product-card"
                      style={{
                        width: '132px',
                        padding: '7px',
                      }}
                    >
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={product.brand || product.subcategory || product.sku || 'Artikel'}
                          style={{
                            display: 'block',
                            width: '100%',
                            height: '172px',
                            objectFit: 'contain',
                            objectPosition: 'center',
                            borderRadius: '9px',
                            border: '1px solid rgba(190, 154, 87, 0.18)',
                            background: '#f6f2ea',
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '100%',
                            height: '172px',
                            display: 'grid',
                            placeItems: 'center',
                            borderRadius: '9px',
                            border: '1px solid rgba(190, 154, 87, 0.18)',
                            background: '#f6f2ea',
                            color: 'var(--muted)',
                            fontSize: '10px',
                            textAlign: 'center',
                            padding: '10px',
                            boxSizing: 'border-box',
                          }}
                        >
                          Kein Foto
                        </div>
                      )}

                      <strong>
                        {product.brand || product.subcategory || 'Artikel'}
                      </strong>
                      <small>
                        {[product.color, product.size].filter(Boolean).join(' · ') ||
                          product.sku ||
                          'Ausgewählt'}
                      </small>

                      {contentImages.length > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '5px', marginTop: '7px' }}>
                          {contentImages.map(image => {
                            const imageKey = getContentImageKey(image);
                            const selected = selectedContentImages.includes(imageKey);
                            const imageUrl = image.public_url || image.url || '';
                            return (
                              <button key={imageKey} type="button" onClick={() => setSelectedContentImages(current => selected ? current.filter(key => key !== imageKey) : [...current, imageKey])} aria-label={selected ? 'Content-Foto abwählen' : 'Content-Foto auswählen'} style={{ padding: 0, borderRadius: '7px', overflow: 'hidden', cursor: 'pointer', border: selected ? '2px solid var(--gold)' : '1px solid rgba(190, 154, 87, 0.25)', background: '#fff', aspectRatio: '1 / 1', opacity: selected ? 1 : 0.3, position: 'relative' }}>
                                <img src={imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                              </button>
                            );
                          })}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          const productImageKeys = (product.product_images || []).map(image => getContentImageKey(image)).filter(Boolean);
                          setSelectedProducts(current => current.filter(item => item.id !== product.id));
                          setSelectedContentImages(current => current.filter(key => !productImageKeys.includes(key)));
                        }}
                        style={{
                          marginTop: '7px',
                          width: '100%',
                          padding: '6px 8px',
                          borderRadius: '8px',
                          border: '1px solid var(--gold)',
                          background: '#fffaf2',
                          cursor: 'pointer',
                          fontSize: '10px',
                          fontWeight: 600,
                        }}
                      >
                        {'\u2713'} Auswahl entfernen
                      </button>
                    </article>
                  );
                })}

                <button
                  type="button"
                  className="content-add-product"
                  onClick={() => setShowProductPicker(true)}
                >
                  <span className="plus">＋</span>
                  <span>Artikel hinzufügen</span>
                </button>
              </div>
            )}

            {selectedPreviewProducts.length > 0 && (
              <section style={{ marginTop: '16px', padding: '12px', border: '1px solid rgba(190, 161, 117, 0.35)', borderRadius: '12px', background: '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                  <strong style={{ fontSize: '13px', color: '#1F3A5F' }}>Content-Fotos · Reihenfolge</strong>
                  <small style={{ color: '#6b7280' }}>{selectedPreviewProducts.length} Fotos ausgewählt</small>
                </div>
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                  {selectedPreviewProducts.map((item, index) => (
                    <div key={item.imageKey} style={{ flex: '0 0 92px', position: 'relative' }}>
                      <div style={{ position: 'relative', width: '92px', height: '112px', borderRadius: '9px', overflow: 'hidden', border: '2px solid var(--gold)', background: '#f6f2ea' }}>
                        <img src={item.imageUrl} alt='' style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
                        <span style={{ position: 'absolute', top: '5px', left: '5px', minWidth: '22px', height: '22px', padding: '0 5px', borderRadius: '11px', background: '#bea175', color: '#fff', display: 'grid', placeItems: 'center', fontSize: '11px', fontWeight: 700 }}>{index + 1}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px' }}>
                        <button type='button' onClick={() => moveContentImage(item.imageKey, -1)} disabled={index === 0} aria-label='Foto nach links verschieben' style={{ width: '42px', border: '1px solid rgba(190,161,117,0.45)', borderRadius: '7px', background: '#fffaf2', cursor: index === 0 ? 'default' : 'pointer', opacity: index === 0 ? 0.35 : 1 }}>‹</button>
                        <button type='button' onClick={() => moveContentImage(item.imageKey, 1)} disabled={index === selectedPreviewProducts.length - 1} aria-label='Foto nach rechts verschieben' style={{ width: '42px', border: '1px solid rgba(190,161,117,0.45)', borderRadius: '7px', background: '#fffaf2', cursor: index === selectedPreviewProducts.length - 1 ? 'default' : 'pointer', opacity: index === selectedPreviewProducts.length - 1 ? 0.35 : 1 }}>›</button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
            {showProductPicker && (
              <div
                role="dialog"
                aria-modal="true"
                aria-label="Artikel auswählen"
                onClick={() => setShowProductPicker(false)}
                style={{
                  position: 'fixed',
                  inset: 0,
                  zIndex: 1000,
                  display: 'grid',
                  placeItems: 'center',
                  padding: '24px',
                  background: 'rgba(20, 28, 50, 0.38)',
                }}
              >
                <div
                  onClick={event => event.stopPropagation()}
                  style={{
                    width: 'min(980px, 94vw)',
                    maxHeight: '86vh',
                    overflow: 'hidden',
                    padding: '18px',
                    border: '1px solid var(--line)',
                    borderRadius: '14px',
                    background: '#fff',
                    boxShadow: '0 20px 70px rgba(16, 28, 55, 0.22)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '12px',
                      marginBottom: '14px',
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: '16px' }}>Artikel auswählen</strong>
                      <div
                        style={{
                          marginTop: '3px',
                          color: 'var(--muted)',
                          fontSize: '10px',
                        }}
                      >
                        {selectedProducts.length} ausgewählt · Anklicken zum Auswählen oder Abwählen
                      </div>
                    </div>

                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => setShowProductPicker(false)}
                      style={{ margin: 0 }}
                    >
                      Fertig
                    </button>
                  </div>

                  {productsLoading ? (
                    <p>Artikel werden geladen …</p>
                  ) : productsError ? (
                    <p>{productsError}</p>
                  ) : products.length === 0 ? (
                    <p>Keine Artikel gefunden.</p>
                  ) : (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))',
                        gap: '12px',
                        maxHeight: '68vh',
                        overflowY: 'auto',
                        padding: '2px 4px 6px 2px',
                      }}
                    >
                      {products.map(product => {
                        const selected = selectedProducts.some(
                          item => item.id === product.id
                        );
                        const imageUrl = getPrimaryImageUrl(product);
                  const contentImages = [...(product.product_images || [])].filter(image => Boolean(image.content_suitable)).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

                        return (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => {
                              setSelectedProducts(current =>
                                selected
                                  ? current.filter(item => item.id !== product.id)
                                  : [...current, product]
                              );
                            }}
                            style={{
                              overflow: 'hidden',
                              padding: 0,
                              textAlign: 'left',
                              borderRadius: '11px',
                              border: selected
                                ? '2px solid var(--gold)'
                                : '1px solid var(--line)',
                              background: selected ? '#fff8eb' : '#fff',
                              cursor: 'pointer',
                            }}
                          >
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={product.brand || product.subcategory || product.sku || 'Artikel'}
                                style={{
                                  display: 'block',
                                  width: '100%',
                                  height: '150px',
                                  objectFit: 'contain',
                                  objectPosition: 'center',
                                  background: '#f6f2ea',
                                }}
                              />
                            ) : (
                              <div
                                style={{
                                  height: '150px',
                                  display: 'grid',
                                  placeItems: 'center',
                                  background: '#f6f2ea',
                                  color: 'var(--muted)',
                                  fontSize: '10px',
                                }}
                              >
                                Kein Foto
                              </div>
                            )}

                            <div style={{ padding: '10px' }}>
                              <strong>
                                {product.brand || product.subcategory || 'Artikel'}
                              </strong>

                              <div
                                style={{
                                  marginTop: '5px',
                                  fontSize: '10px',
                                }}
                              >
                                {product.sku || 'Keine SKU'}
                              </div>

                              <div
                                style={{
                                  marginTop: '3px',
                                  color: 'var(--muted)',
                                  fontSize: '10px',
                                }}
                              >
                                {[product.color, product.size]
                                  .filter(Boolean)
                                  .join(' · ') || 'Keine Zusatzangaben'}
                              </div>

                              {selected && (
                                <div
                                  style={{
                                    marginTop: '8px',
                                    color: 'var(--gold)',
                                    fontSize: '10px',
                                    fontWeight: 700,
                                  }}
                                >
                                  ✓ Ausgewählt
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            <p
              style={{
                margin: '12px 0 0',
                fontSize: '11px',
                color: 'var(--muted)',
              }}
            >
              Bevorzugt werden später Artikel und Fotos angezeigt, die als
              ✦ Content geeignet markiert wurden.
            </p>
          </section>

          <section className="content-create-section">
            <div className="content-create-section-title">
              <span className="section-star">✦</span>
              <span className="section-number">3.</span>
              <h2>Beitrag gestalten</h2>
            </div>

            <p className="content-create-section-description">
              Erstelle zuerst einen Basisinhalt und passe ihn anschließend je
              Kanal individuell an.
            </p>

            <div className="content-basis-card">
              <div className="content-basis-head">
                <div>
                  <span className="content-basis-kicker">BASISINHALT</span>
                  <strong
                  style={{
                    fontFamily: 'Georgia, "Times New Roman", serif',
                    color: '#1F3A5F',
                    fontSize: '18px',
                    fontWeight: 700,
                    letterSpacing: '0.01em',
                  }}
                >
                  Ein Ausgangspunkt für alle gewählten Kanäle
                </strong>
                </div>

                {selectedProducts.length > 0 && (
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={createContentFromSelectedProducts}
                    style={{ margin: 0 }}
                  >
                    ✦ Aus Artikeln übernehmen
                  </button>
                )}
              </div>

              {contentSuggestionReference && (
                <div className="content-suggestion-reference content-suggestion-reference-top">
                  <div className="content-suggestion-reference-head">
                    <div>
                      <span className="content-basis-kicker">✦ KI-VORSCHLAG</span>
                      <strong>Deine Referenz bleibt beim Bearbeiten sichtbar</strong>
                    </div>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => {
                        setTitle(contentSuggestionReference.title);
                        setCaption(contentSuggestionReference.caption);
                        setHashtags(contentSuggestionReference.hashtags);
                        setChannelContent(current => ({
                          ...current,
                          [editChannel]: {
                            ...current[editChannel],
                            title: contentSuggestionReference.title,
                            caption: contentSuggestionReference.caption,
                            hashtags: contentSuggestionReference.hashtags,
                          },
                        }));
                      }}
                      style={{ margin: 0 }}
                    >
                      Vorschlag übernehmen
                    </button>
                  </div>
                  <div className="content-suggestion-reference-body">
                    <strong>{contentSuggestionReference.title}</strong>
                    <p>{contentSuggestionReference.caption}</p>
                  </div>
                </div>
              )}

              <div className="content-basis-grid">
                <div>
                  <div className="content-field">
                    <label>Basistitel</label>
                    <input
                      type="text"
                      value={title}
                      onChange={event => setTitle(event.target.value)}
                      placeholder="Eigenen Titel eingeben"
                    />
                  </div>

                  <div className="content-field" style={{ marginBottom: 0 }}>
                    <label>Basistext</label>
                    <textarea
                      value={caption}
                      onChange={event => setCaption(event.target.value)}
                      placeholder="Eigenen Text ergänzen oder formulieren"
                      style={{ minHeight: '112px' }}
                    />
                  </div>
                </div>

                <div>
                  <div className="content-field">
                    <label>Basis-Hashtags</label>
                    <textarea
                      value={hashtags}
                      onChange={event => setHashtags(event.target.value)}
                      rows={4}
                      placeholder="#monchicparis #vintagefashion"
                      style={{ minHeight: '92px' }}
                    />
                  </div>

                  <div className="content-basis-note">
                    <strong>Kostenfrei</strong>
                    <span>
                      Basistext und Artikeldaten können ohne KI übernommen und
                      danach je Plattform angepasst werden.
                    </span>
                  </div>
                </div>
              </div>

            </div>

            <div className="content-channel-editor-head">
              <div>
                <span className="content-basis-kicker">KANALVERSIONEN</span>
                <strong
                  style={{
                    fontFamily: 'Georgia, "Times New Roman", serif',
                    color: '#1F3A5F',
                    fontSize: '18px',
                    fontWeight: 700,
                    letterSpacing: '0.01em',
                  }}
                >
                  Für jede Plattform individuell anpassen
                </strong>
              </div>
              <span className="content-channel-count">
                {channels.length} {channels.length === 1 ? 'Kanal' : 'Kanäle'} gewählt
              </span>
            </div>

            <div className="content-channel-tabs">
              {(['instagram', 'facebook', 'pinterest'] as Channel[]).map(channel => {
                const selected = channels.includes(channel);
                const active = editChannel === channel;

                return (
                  <button
                    key={channel}
                    type="button"
                    disabled={!selected}
                    onClick={() => {
                      if (!selected) return;
                      setEditChannel(channel);
                      setPreviewChannel(channel);
                    }}
                    className={`content-channel-tab${active ? ' active' : ''}${
                      selected ? '' : ' disabled'
                    }`}
                  >
                    <span>{platformRules[channel].label}</span>
                    <small>{selected ? 'ausgewählt' : 'nicht gewählt'}</small>
                  </button>
                );
              })}
            </div>

            <div className="content-channel-editor">
              <div className="content-channel-editor-title">
                <div>
                  <strong
                    style={{
                      fontFamily: 'Georgia, "Times New Roman", serif',
                      color: '#1F3A5F',
                      fontSize: '18px',
                      fontWeight: 700,
                      letterSpacing: '0.01em',
                    }}
                  >
                    {platformRules[editChannel].label}
                  </strong>
                  <span
                    style={{
                      fontFamily: 'Georgia, "Times New Roman", serif',
                      color: '#1F3A5F',
                      fontSize: '11px',
                      fontStyle: 'italic',
                    }}
                  >
                    Eigene Version für diesen Kanal
                  </span>
                </div>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => copyBaseToChannel(editChannel)}
                  style={{ margin: 0, fontSize: '9px' }}
                >
                  Basis übernehmen
                </button>
              </div>

              <div className="content-field">
                <label style={{ fontFamily: 'Georgia, "Times New Roman", serif', color: '#1F3A5F', fontSize: '12px', fontWeight: 700 }}>Content-Art</label>
                <select style={{ width: '100%', minHeight: '38px', padding: '7px 10px', borderRadius: '8px', border: '1px solid rgba(190, 161, 117, 0.55)', background: '#fffdf9', color: '#1F3A5F', fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '12px', fontWeight: 600, outline: 'none' }} value={contentFormatByChannel[editChannel]} onChange={event => setContentFormatByChannel(current => ({ ...current, [editChannel]: event.target.value }))}>
                  {socialMediaFormatguide[editChannel].map(format => <option key={format.id} value={format.id}>{format.label}</option>)}
                </select>
              </div>
              <div style={{ marginTop: '8px', fontSize: '10px', color: 'var(--muted)', lineHeight: 1.5 }}>
                <strong style={{ color: 'var(--navy)' }}>{editContentFormat.aspectRatio}</strong>{' · '}{editContentFormat.dimensions}{' · '}{editContentFormat.minImages === editContentFormat.maxImages ? `${editContentFormat.minImages} Foto` : `${editContentFormat.minImages}–${editContentFormat.maxImages} Fotos`}{editContentFormat.recommendedMin && editContentFormat.recommendedMax ? ` · empfohlen ${editContentFormat.recommendedMin}–${editContentFormat.recommendedMax}` : ''}
              </div>
              <div style={{ marginTop: '4px', fontSize: '9px', color: 'var(--muted)' }}>{SOCIAL_MEDIA_FORMATGUIDE_REFERENCE}</div>
              {editChannel === 'instagram' && (
                <>
                  <div className="content-field">
                    <label>Instagram-Titel / interne Bezeichnung</label>
                    <input
                      type="text"
                      value={channelContent.instagram.title}
                      onChange={event =>
                        updateChannelContent('instagram', {
                          title: event.target.value,
                        })
                      }
                      placeholder={title || 'Titel'}
                    />
                  </div>

                  <div className="content-channel-form-grid">
                    <div>
                      <div className="content-field">
                        <label>Instagram Caption</label>
                        <textarea
                          value={channelContent.instagram.caption}
                          onChange={event =>
                            updateChannelContent('instagram', {
                              caption: event.target.value,
                            })
                          }
                          placeholder={caption || demoCaption}
                          style={{ minHeight: '132px' }}
                        />
                      </div>

                      <div className="content-field" style={{ marginBottom: 0 }}>
                        <label>Alt-Text</label>
                        <input
                          type="text"
                          value={channelContent.instagram.altText}
                          onChange={event =>
                            updateChannelContent('instagram', {
                              altText: event.target.value,
                            })
                          }
                          placeholder="Kurze Bildbeschreibung"
                        />
                      </div>
                    </div>

                    <div>

                      <div className="content-field">
                        <label>Erster Kommentar</label>
                        <textarea
                          value={channelContent.instagram.firstComment}
                          onChange={event =>
                            updateChannelContent('instagram', {
                              firstComment: event.target.value,
                            })
                          }
                          rows={2}
                          placeholder="Optionaler erster Kommentar"
                          style={{ minHeight: '64px' }}
                        />
                      </div>

                      <div className="content-field" style={{ marginBottom: 0 }}>
                        <label>Bildformat (Instagram)</label>
                        <div className="content-format-grid">
                          {[
                            ['4:5', 'Feed Hochformat', '1080 × 1350 px', 'Empfohlen'],
                            ['1:1', 'Quadrat', '1080 × 1080 px', 'Klassischer Post'],
                            ['9:16', 'Story / Reel', '1080 × 1920 px', 'Stories, Reels'],
                          ].map(([value, label, size, note]) => {
                            const active = channelContent.instagram.imageFormat === value;
                            return (
                              <button
                                key={value}
                                type="button"
                                className={`content-format-card${active ? ' active' : ''}`}
                                onClick={() => updateChannelContent('instagram', { imageFormat: value })}
                              >
                                <strong>{value}</strong>
                                <span>{label}</span>
                                <em>{size}</em>
                                <small>{note}</small>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {editChannel === 'facebook' && (
                <>
                  <div className="content-field">
                    <label>Facebook-Titel / interne Bezeichnung</label>
                    <input
                      type="text"
                      value={channelContent.facebook.title}
                      onChange={event =>
                        updateChannelContent('facebook', {
                          title: event.target.value,
                        })
                      }
                      placeholder={title || 'Titel'}
                    />
                  </div>

                  <div className="content-channel-form-grid">
                    <div className="content-field" style={{ marginBottom: 0 }}>
                      <label>Facebook Beitragstext</label>
                      <textarea
                        value={channelContent.facebook.caption}
                        onChange={event =>
                          updateChannelContent('facebook', {
                            caption: event.target.value,
                          })
                        }
                        placeholder={caption || demoCaption}
                        style={{ minHeight: '132px' }}
                      />
                    </div>

                    <div>
                      <div className="content-field">
                        <label>Ziel-Link <span style={{ color: 'var(--gold)' }}>· empfohlen</span></label>
                        <input
                          type="url"
                          value={channelContent.facebook.link}
                          onChange={event =>
                            updateChannelContent('facebook', {
                              link: event.target.value,
                            })
                          }
                          placeholder="https://..."
                        />
                      </div>

                      <div className="content-field">
                        <label>Bildformat (Facebook)</label>
                        <div className="content-format-grid">
                          {[
                            ['4:5', 'Hochformat', '1080 × 1350 px', 'Feed'],
                            ['1:1', 'Quadrat', '1080 × 1080 px', 'Klassisch'],
                            ['16:9', 'Querformat', '1920 × 1080 px', 'Link / Landscape'],
                          ].map(([value, label, size, note]) => {
                            const active = channelContent.facebook.imageFormat === value;
                            return (
                              <button
                                key={value}
                                type="button"
                                className={`content-format-card${active ? ' active' : ''}`}
                                onClick={() => updateChannelContent('facebook', { imageFormat: value })}
                              >
                                <strong>{value}</strong>
                                <span>{label}</span>
                                <em>{size}</em>
                                <small>{note}</small>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="content-field" style={{ marginBottom: 0 }}>
                        <label>Alt-Text</label>
                        <input
                          type="text"
                          value={channelContent.facebook.altText}
                          onChange={event =>
                            updateChannelContent('facebook', {
                              altText: event.target.value,
                            })
                          }
                          placeholder="Kurze Bildbeschreibung"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {editChannel === 'pinterest' && (
                <>
                  <div className="content-field">
                    <label>Pin-Titel</label>
                    <input
                      type="text"
                      value={pinterestDraftTitle}
                      onChange={event => {
                        const value = event.currentTarget.value;
                        setPinterestDraftTitle(value);
                        updateChannelContent('pinterest', { title: value });
                      }}
                      placeholder={title || 'Pinterest-Titel'}
                    />
                  </div>

                  <div className="content-channel-form-grid">
                    <div>
                      <div className="content-field">
                        <label>Pinterest-Beschreibung</label>
                        <textarea
                          value={pinterestDraftCaption}
                          onChange={event => {
                            const value = event.currentTarget.value;
                            setPinterestDraftCaption(value);
                            updateChannelContent('pinterest', { caption: value });
                          }}
                          placeholder={caption || demoCaption}
                          style={{ minHeight: '132px' }}
                        />
                      </div>

                      <div className="content-field" style={{ marginBottom: 0 }}>
                        <label>Alt-Text</label>
                        <input
                          type="text"
                          value={channelContent.pinterest.altText}
                          onChange={event =>
                            updateChannelContent('pinterest', {
                              altText: event.target.value,
                            })
                          }
                          placeholder="Kurze Bildbeschreibung"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="content-field">
                        <label>Pinterest Board <span style={{ color: 'var(--gold)' }}>· erforderlich für Planung</span></label>
                        <input
                          type="text"
                          value={channelContent.pinterest.board}
                          onChange={event =>
                            updateChannelContent('pinterest', {
                              board: event.target.value,
                            })
                          }
                          placeholder="z. B. Parisian Vintage Style"
                        />
                      </div>

                      <div className="content-field">
                        <label>Ziel-Link</label>
                        <input
                          type="url"
                          value={channelContent.pinterest.link}
                          onChange={event =>
                            updateChannelContent('pinterest', {
                              link: event.target.value,
                            })
                          }
                          placeholder="https://..."
                        />
                        <small
                          style={{
                            display: 'block',
                            marginTop: '5px',
                            color: 'var(--muted)',
                            fontSize: '9px',
                          }}
                        >
                          Link zum Artikel oder später zum MON CHIC Lookbook
                        </small>
                      </div>

                      <div className="content-field" style={{ marginBottom: 0 }}>
                        <label>Bildformat (Pinterest)</label>
                        <div className="content-format-grid content-format-grid--two">
                          {[
                            ['2:3', 'Pinterest Pin', '1000 × 1500 px', 'Empfohlen'],
                            ['1:1', 'Quadrat', '1000 × 1000 px', 'Alternative'],
                          ].map(([value, label, size, note]) => {
                            const active = channelContent.pinterest.imageFormat === value;
                            return (
                              <button
                                key={value}
                                type="button"
                                className={`content-format-card${active ? ' active' : ''}`}
                                onClick={() => updateChannelContent('pinterest', { imageFormat: value })}
                              >
                                <strong>{value}</strong>
                                <span>{label}</span>
                                <em>{size}</em>
                                <small>{note}</small>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="content-hashtag-panel">
                <div className="content-hashtag-panel-head">
                  <strong>Hashtags</strong>
                  <span>{editHashtagList.length} / 30</span>
                </div>

                <div className="content-hashtag-section">
                  <div className="content-hashtag-subhead">
                    <span>Feste Marken-Hashtags</span>
                    <small>Kostenfrei</small>
                  </div>
                  <div className="content-chips">
                    {fixedBrandHashtags.map(tag => (
                      <button key={tag} type="button" className={`content-chip${hasHashtag(tag) ? ' active' : ''}`} onClick={() => toggleHashtag(tag)}>
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="content-hashtag-section">
                  <div className="content-hashtag-subhead">
                    <span>Artikel-Hashtags (automatisch)</span>
                    <small>{articleHashtags.length} gefunden</small>
                  </div>
                  <div className="content-chips">
                    {articleHashtags.length > 0 ? (
                      <>
                        {articleHashtags.slice(0, 5).map(tag => (
                          <button key={tag} type="button" className="content-chip article" onClick={() => toggleHashtag(tag)}>{tag}</button>
                        ))}
                        {articleHashtags.length > 5 && <span className="content-chip-more">+{articleHashtags.length - 5}</span>}
                      </>
                    ) : <span className="content-hashtag-empty">Nach Artikelauswahl</span>}
                  </div>
                </div>

                <div className="content-hashtag-section">
                  <div className="content-hashtag-subhead">
                    <span>AI-Vorschläge (optional)</span>
                    <small>nur auf Anfrage</small>
                  </div>
                  <div className="content-ai-suggestion-row">
                    <span className="content-hashtag-empty">Noch keine AI-Vorschläge geladen</span>
                    <button type="button" className="secondary-button" disabled={Boolean(aiBudget?.blocked)} style={{ margin: 0, minHeight: '30px', padding: '5px 9px', fontSize: '9px' }}>
                      {aiBudget?.blocked ? 'AI-Budget erreicht' : '✦ Vorschläge erstellen'}
                    </button>
                  </div>
                </div>

                <div className="content-hashtag-section content-hashtag-section--own">
                  <div className="content-hashtag-subhead">
                    <span>Eigene Hashtags hinzufügen</span>
                    <small>{editHashtagList.length} / 30</small>
                  </div>
                  <div className="content-hashtag-add">
                    <input type="text" value={customHashtagInput} onChange={event => setCustomHashtagInput(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); addCustomHashtag(); } }} placeholder="" aria-label="Eigenen Hashtag eingeben" />
                    <button type="button" className="secondary-button" onClick={addCustomHashtag} style={{ margin: 0, minHeight: '34px', padding: '6px 10px', fontSize: '9px' }}>Hinzufügen</button>
                  </div>
                </div>
              </div>

              <div className="content-channel-note">
                Die Kanalversionen bleiben unabhängig voneinander bearbeitbar.
                Die rechte Vorschau zeigt immer den aktuell gewählten Kanal.
              </div>
            </div>
          </section>

          <section className="content-create-section">
            <div className="content-create-section-title">
              <span className="section-star">✦</span>
              <span className="section-number">4.</span>
              <h2>Status</h2>
            </div>

            <p className="content-create-section-description">
              Entscheide, ob der Beitrag zunächst gespeichert oder für eine
              Veröffentlichung vorbereitet wird.
            </p>

            <div className="content-status-grid">
              <button
                type="button"
                className={`content-status-card${
                  status === 'draft' ? ' active' : ''
                }`}
                onClick={() => { setStatus('draft'); setPlanningConfirmed(false); setCalendarPlanningPreview(null); try { localStorage.removeItem('mon-chic-current-planning'); localStorage.removeItem('mon-chic-calendar-draft-v1'); } catch {} }}
              >
                <span style={{ fontSize: '21px' }}>✎</span>
                <span>
                  <strong>Entwurf</strong>
                  <span>Später weiterbearbeiten</span>
                </span>
              </button>

              <button
                type="button"
                className={`content-status-card${
                  status === 'planned' ? ' active' : ''
                }`}
                onClick={() => { setStatus('planned'); setPlanningConfirmed(false); }}
              >
                <span style={{ fontSize: '20px' }}>▣</span>
                <span>
                  <strong>Geplant</strong>
                  <span>Datum und Uhrzeit festlegen</span>
                </span>
              </button>
            </div>

            {status === 'planned' && (
              <div
                style={{
                  marginTop: '12px',
                  padding: '12px 14px',
                  border: '1px solid var(--line)',
                  borderRadius: '10px',
                  background: '#fffdf9',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    gap: '12px',
                    marginBottom: '9px',
                  }}
                >
                  <strong style={{ color: 'var(--navy)', fontSize: '11px' }}>
                    Veröffentlichung planen
                  </strong>
                  <span style={{ color: 'var(--muted)', fontSize: '8.5px' }}>
                    gilt zunächst für alle gewählten Kanäle
                  </span>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
                    gap: '10px',
                    maxWidth: '520px',
                  }}
                >
                  <label
                    style={{
                      display: 'grid',
                      gap: '5px',
                      color: 'var(--navy)',
                      fontSize: '9px',
                      fontWeight: 600,
                    }}
                  >
                    Datum
                    <input
                      type="date"
                      value={plannedDate}
                      onChange={event => { setPlannedDate(event.target.value); setPlanningConfirmed(false); setPlanningSuggestionSource(null); setContentSaved(false); try { localStorage.removeItem('mon-chic-current-planning'); localStorage.removeItem('mon-chic-calendar-draft-v1'); } catch {} }}
                      style={{
                        minHeight: '38px',
                        padding: '7px 10px',
                        border: '1px solid var(--line)',
                        borderRadius: '8px',
                        background: '#fff',
                        color: 'var(--navy)',
                        font: 'inherit',
                        outline: 'none',
                      }}
                    />
                  </label>

                  <label
                    style={{
                      display: 'grid',
                      gap: '5px',
                      color: 'var(--navy)',
                      fontSize: '9px',
                      fontWeight: 600,
                    }}
                  >
                    Uhrzeit
                    <input
                      type="time"
                      value={plannedTime}
                      onChange={event => { setPlannedTime(event.target.value); setPlanningConfirmed(false); setPlanningSuggestionSource(null); setContentSaved(false); try { localStorage.removeItem('mon-chic-current-planning'); localStorage.removeItem('mon-chic-calendar-draft-v1'); } catch {} }}
                      style={{
                        minHeight: '38px',
                        padding: '7px 10px',
                        border: '1px solid var(--line)',
                        borderRadius: '8px',
                        background: '#fff',
                        color: 'var(--navy)',
                        font: 'inherit',
                        outline: 'none',
                      }}
                    />
                  </label>
                </div>

                <div
                  style={{
                    marginTop: '10px',
                    paddingTop: '9px',
                    borderTop: '1px solid var(--line)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                      marginBottom: '6px',
                    }}
                  >
                    <strong style={{ color: 'var(--gold)', fontSize: '9.5px' }}>
                      Test-Vorschläge
                    </strong>
                    <span style={{ color: 'var(--muted)', fontSize: '8px' }}>
                      später mit eigenen Analytics optimierbar
                    </span>
                  </div>

                  <div style={{ display: 'grid', gap: '5px' }}>
                    {planningSuggestions.map(suggestion => (
                      <div
                        key={suggestion.channel}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '90px minmax(0, 1fr) auto',
                          alignItems: 'center',
                          gap: '8px',
                          minHeight: '32px',
                          padding: '4px 6px',
                          border: planningSuggestionSource === suggestion.channel
                            ? '1px solid var(--gold)'
                            : '1px solid var(--line)',
                          borderRadius: '8px',
                          background: planningSuggestionSource === suggestion.channel
                            ? '#fffaf1'
                            : '#fff',
                        }}
                      >
                        <strong style={{ color: 'var(--navy)', fontSize: '9px' }}>
                          {suggestion.label}
                        </strong>
                        <span style={{ color: 'var(--muted)', fontSize: '8.5px' }}>
                          {formatPlanningDate(suggestion.date)} · {suggestion.time} Uhr
                        </span>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() =>
                            applyPlanningSuggestion(
                              suggestion.channel,
                              suggestion.date,
                              suggestion.time
                            )
                          }
                          style={{
                            margin: 0,
                            minHeight: '26px',
                            padding: '4px 8px',
                            fontSize: '8.5px',
                            borderColor: planningSuggestionSource === suggestion.channel
                              ? 'var(--gold)'
                              : undefined,
                            color: planningSuggestionSource === suggestion.channel
                              ? 'var(--gold)'
                              : undefined,
                          }}
                        >
                          {planningSuggestionSource === suggestion.channel
                            ? '✓ Übernommen'
                            : 'Übernehmen'}
                        </button>
                      </div>
                    ))}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                      marginTop: '9px',
                    }}
                  >
                    <span style={{ color: 'var(--muted)', fontSize: '8.5px' }}>
                      Die erste Version plant alle gewählten Kanäle gemeinsam.
                    </span>
                    <button
                      type="button"
                      className="primary-button"
                      disabled={!plannedDate || !plannedTime}
                      onClick={confirmPlanning}
                      style={{
                        margin: 0,
                        minHeight: '32px',
                        padding: '6px 12px',
                        fontSize: '9px',
                        opacity: plannedDate && plannedTime ? 1 : 0.5,
                      }}
                    >
                      Planung übernehmen
                    </button>
                  </div>

                  {planningConfirmed && (
                    <div
                      style={{
                        marginTop: '7px',
                        padding: '7px 9px',
                        borderRadius: '8px',
                        background: '#f4f7ee',
                        color: 'var(--navy)',
                        fontSize: '8.7px',
                      }}
                    >
                      ✓ Planung übernommen: {formatPlanningDate(plannedDate)} · {plannedTime} Uhr
                      {planningSuggestionSource
                        ? ` · Vorschlag ${platformRules[planningSuggestionSource].label}`
                        : ''}
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        </main>

        <aside className="content-preview-panel">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              marginBottom: '10px',
            }}
          >
            <h3 style={{ margin: 0 }}>Vorschau</h3>

            {demoMode && (
              <span
                style={{
                  padding: '4px 8px',
                  borderRadius: '999px',
                  background: '#fff6e7',
                  color: 'var(--gold)',
                  fontSize: '9px',
                  fontWeight: 700,
                }}
              >
                Beispiel
              </span>
            )}
          </div>

          {channels.length > 0 ? (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '5px',
                marginBottom: '12px',
              }}
            >
              {channels.map(channel => (
                <button
                  key={channel}
                  type="button"
                  onClick={() => setPreviewChannel(channel)}
                  style={{
                    padding: '6px 9px',
                    borderRadius: '999px',
                    border:
                      previewChannel === channel
                        ? '1px solid var(--navy)'
                        : '1px solid var(--line)',
                    background:
                      previewChannel === channel ? 'var(--navy)' : '#fff',
                    color:
                      previewChannel === channel ? '#fff' : 'var(--navy)',
                    fontSize: '9px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {platformRules[channel].label}
                </button>
              ))}
            </div>
          ) : (
            <p
              style={{
                color: 'var(--muted)',
                fontSize: '10px',
              }}
            >
              Bitte zuerst einen Kanal auswählen.
            </p>
          )}

          <div className="content-preview-image content-preview-image--social" style={{ aspectRatio: previewAspectRatio }}>
            {demoMode ? (
              <img
                src="/content-demo-paris.png"
                alt="Beispiel-Look Herbst in Paris mit Aviator-Jacke, Seidenbluse und Hose"
                className="content-demo-preview-image"
              />
            ) : selectedPreviewProducts.length > 0 ? (
              <div style={{ position: 'relative', width: '100%', height: '100%' }}><div style={{ position: 'absolute', top: '8px', left: '50%', transform: 'translateX(-50%)', zIndex: 3, display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 7px', borderRadius: '14px', background: 'rgba(255,255,255,0.92)', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}><button type='button' onClick={() => setPreviewSlideIndex(current => Math.max(0, current - 1))} disabled={previewSlideIndex <= 0} style={{ border: 0, background: 'transparent', cursor: previewSlideIndex <= 0 ? 'default' : 'pointer', fontSize: '16px' }}>‹</button><strong style={{ fontSize: '10px', color: '#1F3A5F' }}>{Math.min(previewSlideIndex, selectedPreviewProducts.length - 1) + 1} / {selectedPreviewProducts.length}</strong><button type='button' onClick={() => setPreviewSlideIndex(current => Math.min(selectedPreviewProducts.length - 1, current + 1))} disabled={previewSlideIndex >= selectedPreviewProducts.length - 1} style={{ border: 0, background: 'transparent', cursor: previewSlideIndex >= selectedPreviewProducts.length - 1 ? 'default' : 'pointer', fontSize: '16px' }}>›</button></div><img src={selectedPreviewProducts[Math.min(previewSlideIndex, selectedPreviewProducts.length - 1)].imageUrl} alt={selectedPreviewProducts[Math.min(previewSlideIndex, selectedPreviewProducts.length - 1)].product.brand || selectedPreviewProducts[Math.min(previewSlideIndex, selectedPreviewProducts.length - 1)].product.subcategory || 'Ausgewählter Artikel'} style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center', background: '#f6f2ea', display: 'block' }} /></div>
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'grid',
                  placeItems: 'center',
                  color: 'var(--muted)',
                  fontSize: '11px',
                }}
              >
                Kein Produktfoto vorhanden
              </div>
            )}
          </div>

{/* MON CHIC PARIS Branding */}
<div
  className="content-branding"
  style={{
    width: '100%',
    padding: '8px 6px 10px',
    boxSizing: 'border-box',
    display: 'flex',
    justifyContent: 'center',
    background: '#fff',
  }}
>
  <img
    src="/mon-chic-paris-branding.png"
    alt="MON CHIC PARIS · DIGITAL STUDIO · Vintage Fashion · Home & Living · Digital Solutions"
    style={{
      width: '100%',
      maxWidth: '300px',
      height: 'auto',
      objectFit: 'contain',
      display: 'block',
    }}
  />
</div>

<div className="content-preview-text">
            <span
              style={{
                display: 'block',
                marginBottom: '6px',
                color: 'var(--gold)',
                fontSize: '9px',
                fontWeight: 700,
              }}
            >
              {currentRule.label}
            </span>

            <strong
              style={{
                display: 'block',
                marginBottom: '7px',
                fontFamily: "'Playfair Display', serif",
                fontSize: '14px',
              }}
            >
              {previewTitle}
            </strong>

            <p>{previewCaption}</p>

            {previewHashtags && (
              <p
                style={{
                  color: '#244f87',
                  overflowWrap: 'anywhere',
                }}
              >
                {previewHashtags}
              </p>
            )}

            {!demoMode && previewChannel === 'instagram' &&
              channelContent.instagram.firstComment && (
                <div
                  style={{
                    marginTop: '8px',
                    paddingTop: '8px',
                    borderTop: '1px solid var(--line)',
                    color: 'var(--muted)',
                    fontSize: '9px',
                  }}
                >
                  <strong>Erster Kommentar:</strong>{' '}
                  {channelContent.instagram.firstComment}
                </div>
              )}

            {!demoMode && previewChannel === 'facebook' &&
              channelContent.facebook.link && (
                <div
                  style={{
                    marginTop: '8px',
                    color: '#244f87',
                    fontSize: '9px',
                    overflowWrap: 'anywhere',
                  }}
                >
                  {channelContent.facebook.link}
                </div>
              )}

            {!demoMode && previewChannel === 'pinterest' && (
              <div
                style={{
                  display: 'grid',
                  gap: '4px',
                  marginTop: '8px',
                  paddingTop: '8px',
                  borderTop: '1px solid var(--line)',
                  color: 'var(--muted)',
                  fontSize: '9px',
                }}
              >
                {channelContent.pinterest.board && (
                  <span>
                    <strong>Board:</strong> {channelContent.pinterest.board}
                  </span>
                )}
                {channelContent.pinterest.link && (
                  <span style={{ color: '#244f87', overflowWrap: 'anywhere' }}>
                    {channelContent.pinterest.link}
                  </span>
                )}
              </div>
            )}
          </div>

          <div
            style={{
              display: 'grid',
              gap: '4px',
              marginTop: '10px',
              paddingTop: '10px',
              borderTop: '1px solid var(--line)',
              color: 'var(--muted)',
              fontSize: '9px',
            }}
          >
            <span
              style={{
                color: captionTooLong ? 'var(--danger)' : 'inherit',
              }}
            >
              {currentRule.captionLimit
                ? `Text: ${demoMode ? demoCaption.length : captionLength} / ${
                    currentRule.captionLimit
                  } Zeichen`
                : `Text: ${demoMode ? demoCaption.length : captionLength} Zeichen`}
            </span>

            <span
              style={{
                color: instagramHashtagTooMany ? 'var(--danger)' : 'inherit',
              }}
            >
              {previewChannel === 'instagram'
                ? `Hashtags: ${
                    demoMode
                      ? fixedBrandHashtags.length + demoArticleHashtags.length
                      : hashtagList.length
                  } / 30`
                : `Hashtags: ${
                    demoMode
                      ? fixedBrandHashtags.length + demoArticleHashtags.length
                      : hashtagList.length
                  }`}
            </span>

            {!demoMode && (
              <span>
                Bildformat: {channelContent[previewChannel].imageFormat}
              </span>
            )}
          </div>

          <div className="content-ai-budget content-ai-budget--detailed">
            <div className="content-ai-budget-title">
              <span>✦ AI KOSTEN KONTROLLE</span>
              <span aria-label="Information" title="AI-Kosten werden nur bei bewusster Anforderung erzeugt.">ⓘ</span>
            </div>
            <div className="content-ai-budget-month">
              <span>Monatsbudget ({currentMonthLabel})</span>
              <strong>{aiBudget ? `${aiBudget.budgetEur.toFixed(2)} €` : '–'}</strong>
            </div>
            <div className="content-ai-budget-bar content-ai-budget-bar--detailed">
              <span style={{ width: `${aiBudget ? Math.min(100, Math.max(0, aiBudget.percent)) : 0}%` }} />
            </div>
            <div className="content-ai-budget-metrics">
              <div><span>Verbraucht</span><strong>{aiBudget ? `${aiBudget.spentEur.toFixed(2)} €` : '–'}</strong></div>
              <div><span>Verbleibend</span><strong>{aiBudget ? `${aiBudget.remainingEur.toFixed(2)} €` : '–'}</strong></div>
              <div><span>Nutzung</span><strong>{aiBudget ? `${aiBudget.percent.toFixed(1)} %` : '–'}</strong></div>
            </div>
            <div className="content-ai-generation-grid">
              <div><span>AI-Generierungen</span><strong>{aiBudget?.generations ?? '–'}</strong><small>diesen Monat</small></div>
              <div><span>Limit</span><strong>{aiBudget?.generationLimit ?? '–'}</strong><small>pro Monat</small></div>
            </div>
            <div className="content-ai-budget-warning">♡ Warnung bei 75 % · Limit erreicht bei 100 %</div>
          </div>

          <div
            style={{
              display: 'grid',
              gap: '8px',
              marginTop: '14px',
            }}
          >
            <button
              type="button"
              className="secondary-button"
              onClick={saveDraftContent}
              style={{ width: '100%', margin: 0 }}
            >
              Als Entwurf speichern
            </button>

            <button
              type="button"
              className="primary-button"
              onClick={openFinalReview}
              style={{ width: '100%', margin: 0 }}
            >
              Beitrag vorbereiten
            </button>
          </div>
        </aside>
      </div>

      {showFinalReview && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Beitrag final prüfen"
          onClick={() => setShowFinalReview(false)}
          className="content-review-overlay"
        >
          <div
            className="content-review-modal"
            onClick={event => event.stopPropagation()}
          >
            <div className="content-review-head">
              <div>
                <span className="content-basis-kicker">FINALE PRÜFUNG</span>
                <h2>Beitrag vor Veröffentlichung prüfen</h2>
                <p>Hier siehst du die wichtigsten Inhalte noch einmal gesammelt.</p>
              </div>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setShowFinalReview(false)}
                style={{ margin: 0 }}
              >
                Zurück bearbeiten
              </button>
            </div>

            <div className="content-review-summary">
              <div>
                <span>Kanäle</span>
                <strong>{channels.map(channel => platformRules[channel].label).join(' · ') || 'Keine Auswahl'}</strong>
              </div>
              <div>
                <span>Artikel</span>
                <strong>{selectedProductsCount || (demoMode ? 3 : 0)}</strong>
              </div>
              <div>
                <span>Status</span>
                <strong>{(finalReviewPlanning?.status || status) === 'planned' ? 'Geplant' : 'Entwurf'}</strong>
              </div>
              <div>
                <span>Termin</span>
                <strong>
                  {(finalReviewPlanning?.status || status) === 'planned' &&
                  (finalReviewPlanning?.plannedDate || plannedDate) &&
                  (finalReviewPlanning?.plannedTime || plannedTime)
                    ? `${formatPlanningDate(finalReviewPlanning?.plannedDate || plannedDate)} · ${finalReviewPlanning?.plannedTime || plannedTime} Uhr`
                    : 'Noch nicht geplant'}
                </strong>
              </div>
            </div>

            {(finalReviewPlanning?.status || status) === 'planned' &&
              !(finalReviewPlanning?.planningConfirmed ?? planningConfirmed) && (
              <div className="content-review-warning">
                ⚠ Die Planung wurde noch nicht mit „Planung übernehmen“ bestätigt.
              </div>
            )}

            <div className="content-review-channels">
              {channels.map(channel => {
                const item = channelContent[channel];
                const reviewTitle = item.title.trim() || title.trim() || demoTitle;
                const reviewCaption = item.caption.trim() || caption.trim() || demoCaption;
                const reviewHashtags = item.hashtags.trim() || hashtags.trim() || fixedBrandHashtags.join(' ');

                return (
                  <section key={channel} className="content-review-channel-card">
                    <div className="content-review-channel-head">
                      <strong>{platformRules[channel].label}</strong>
                      <span>{item.imageFormat}</span>
                    </div>
                    <div className="content-review-field">
                      <span>Titel</span>
                      <strong>{reviewTitle}</strong>
                    </div>
                    <div className="content-review-field">
                      <span>Text</span>
                      <p>{reviewCaption}</p>
                    </div>
                    <div className="content-review-field">
                      <span>Hashtags</span>
                      <p className="content-review-hashtags">{reviewHashtags || 'Keine Hashtags'}</p>
                    </div>
                    {channel === 'instagram' && item.firstComment && (
                      <div className="content-review-field">
                        <span>Erster Kommentar</span>
                        <p>{item.firstComment}</p>
                      </div>
                    )}
                    {channel === 'pinterest' && item.board && (
                      <div className="content-review-field">
                        <span>Pinterest Board</span>
                        <p>{item.board}</p>
                      </div>
                    )}
                    {item.link && (
                      <div className="content-review-field">
                        <span>Ziel-Link</span>
                        <p>{item.link}</p>
                      </div>
                    )}
                    {item.altText && (
                      <div className="content-review-field">
                        <span>Alt-Text</span>
                        <p>{item.altText}</p>
                      </div>
                    )}
                  </section>
                );
              })}
            </div>

            <div className="content-review-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setShowFinalReview(false)}
                style={{ margin: 0 }}
              >
                Noch bearbeiten
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={confirmFinalReview}
                style={{ margin: 0 }}
              >
                {reviewConfirmed ? '✓ Freigabe bestätigt' : 'Freigabe bestätigen'}
              </button>
            </div>

            {reviewConfirmed && (
              <>
                <div className="content-review-success">
                  ✓ Inhalt geprüft. Der Beitrag ist für den nächsten Veröffentlichungsschritt freigegeben.
                </div>

                <div className="content-save-panel">
                  <div className="content-save-head">
                    <div>
                      <strong>Content speichern</strong>
                      <span>Damit du diesen Beitrag später schnell wiederfindest und wiederverwenden kannst.</span>
                    </div>
                  </div>

                  <label className="content-save-field">
                    <span>Interne Bezeichnung</span>
                    <input
                      type="text"
                      value={internalName}
                      onChange={event => {
                        setInternalName(event.target.value);
                        setContentSaved(false);
                      }}
                      placeholder="z. B. Weihnachtslook Paris"
                    />
                  </label>

                  <label className="content-save-field">
                    <span>Schlagwörter</span>
                    <input
                      type="text"
                      value={contentKeywords}
                      onChange={event => {
                        setContentKeywords(event.target.value);
                        setContentSaved(false);
                      }}
                      placeholder="z. B. Weihnachten, Hemd, Blumen, Paris"
                    />
                    <small>Mehrere Begriffe mit Komma trennen. Diese Begriffe können später durchsucht werden.</small>
                  </label>

                  <div className="content-save-actions">
                    <button
                      type="button"
                      className="primary-button"
                      onClick={saveApprovedContent}
                      style={{ margin: 0 }}
                    >
                      {contentSaved ? '✓ Content gespeichert' : 'Content speichern'}
                    </button>
                  </div>

                  {contentSaved && (
                    <div className="content-save-success">
                      ✓ Gespeichert. Der Beitrag ist jetzt in der Content-Bibliothek und im Wochenplan verfügbar.
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showWeeklyPlan && (
        <div className="content-library-overlay">
          <div className="weekly-plan-modal">
            <div className="content-library-head">
              <div>
                <p className="eyebrow">CONTENT-KALENDER</p>
                <h2>Wochenplan</h2>
                <p>Geplante Beiträge und empfohlene Startzeiten auf einen Blick. <span style={{ color: 'var(--muted)', fontSize: '8px' }}>Sync v53</span></p>
              </div>
              <button type="button" className="secondary-button" onClick={() => setShowWeeklyPlan(false)}>Schließen</button>
            </div>

            <div className="week-nav">
              <button type="button" className="secondary-button" onClick={() => setWeekOffset(value => value - 1)}>← Vorherige Woche</button>
              <strong>{formatPlanningDate(weekDays[0].iso)} – {formatPlanningDate(weekDays[6].iso)}</strong>
              <button type="button" className="secondary-button" onClick={() => setWeekOffset(value => value + 1)}>Nächste Woche →</button>
            </div>

            <div className="week-grid">
              {weekDays.map(({ date, iso }) => {
                const entries = weeklyPlannedContent.filter(item => item.plannedDate === iso);
                const jsWeekday = date.getDay();
                const recommendations = planningSuggestionRules.filter(rule => rule.weekday === jsWeekday);
                return (
                  <div className="week-day" key={iso}>
                    <div className="week-day-head">
                      <strong>{new Intl.DateTimeFormat('de-DE', { weekday: 'long' }).format(date)}</strong>
                      <span>{new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit' }).format(date)}</span>
                    </div>
                    <div className="week-recommendations">
                      {recommendations.length ? recommendations.map(rule => (
                        <span key={rule.channel}>Empfohlen · {platformRules[rule.channel].label} {rule.time}</span>
                      )) : <span className="week-quiet">—</span>}
                    </div>
                    <div className="week-entries">
                      {entries.length ? entries.map(item => {
                        const linkedProducts = products.filter(product => item.productIds?.includes(product.id));
                        return (
                          <div className="week-entry" key={item.id}>
                            {linkedProducts[0] && <img src={getPrimaryImageUrl(linkedProducts[0]) || ''} alt="" />}
                            <div>
                              <strong>{item.internalName}</strong>
                              <span>{(item.channels || []).map(channel => platformRules[channel]?.label || channel).join(' · ')}</span>
                              <small>{item.plannedTime ? `${item.plannedTime} Uhr` : 'Zeit offen'}</small>
                              {item.id === 'current-planning-preview' ? (
                                <small style={{ color: 'var(--gold)', fontWeight: 700 }}>
                                  Noch nicht gespeichert
                                </small>
                              ) : (
                                <>
                                  <small style={{ color: 'var(--muted)', fontWeight: 700 }}>
                                    ✓ Gespeichert · Geplant
                                  </small>
                                  <button
                                    type="button"
                                    className="secondary-button"
                                    onClick={() => openSavedContentForEditing(item)}
                                    style={{
                                      marginTop: '7px',
                                      minHeight: '26px',
                                      padding: '4px 8px',
                                      fontSize: '8.5px',
                                    }}
                                  >
                                    Öffnen & bearbeiten
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      }) : <div className="week-empty">Noch kein Beitrag geplant</div>}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="week-note">Die empfohlenen Zeiten sind zunächst Startwerte. Später werden sie mit den eigenen MON CHIC PARIS Analytics optimiert.</div>
          </div>
        </div>
      )}

      {showContentLibrary && (
        <div className="content-library-overlay">
          <div className="content-library-modal">
            <div className="content-library-head">
              <div>
                <p className="eyebrow">CONTENT-BIBLIOTHEK</p>
                <h2>Gespeicherten Content wiederfinden</h2>
                <p>Suche nach Bezeichnung, Schlagwörtern, Artikel, Marke, Text, Hashtags oder Kanal.</p>
              </div>
              <button type="button" className="secondary-button" onClick={() => setShowContentLibrary(false)}>
                Schließen
              </button>
            </div>

            <div className="content-library-search">
              <input
                autoFocus
                type="search"
                value={librarySearch}
                onChange={event => setLibrarySearch(event.target.value)}
                placeholder="z. B. Weihnachten, Hemd Blumen, Paris Herbst …"
              />
              <span>{filteredContentLibrary.length} Treffer</span>
            </div>

            <div className="content-library-results">
              {filteredContentLibrary.length === 0 ? (
                <div className="content-library-empty">Kein gespeicherter Content zu dieser Suche gefunden.</div>
              ) : filteredContentLibrary.map(item => {
                const linkedProducts = products.filter(product => item.productIds?.includes(product.id));
                const isOpen = openedLibraryId === item.id;
                return (
                  <div className="content-library-card" key={item.id}>
                    <div className="content-library-card-main">
                      <div className="content-library-thumb">
                        {linkedProducts[0] ? (
                          <img src={getPrimaryImageUrl(linkedProducts[0]) || ''} alt="" />
                        ) : <span>Content</span>}
                      </div>
                      <div className="content-library-info">
                        <strong>{item.internalName}</strong>
                        <span>{(item.channels || []).map(channel => platformRules[channel]?.label || channel).join(' · ')}</span>
                        <div className="content-library-keywords">
                          {(item.keywords || []).map(keyword => <em key={keyword}>{keyword}</em>)}
                        </div>
                      </div>
                      <div className="content-library-meta">
                        <span>{item.status === 'planned' ? 'Geplant' : 'Entwurf'}</span>
                        {item.status === 'planned' && item.plannedDate && (
                          <small>{formatPlanningDate(item.plannedDate)}{item.plannedTime ? ` · ${item.plannedTime} Uhr` : ''}</small>
                        )}
                      </div>
                    </div>
                    <div className="content-library-actions">
                      <button type="button" className="secondary-button" onClick={() => setOpenedLibraryId(isOpen ? null : item.id)}>
                        {isOpen ? 'Details schließen' : 'Details'}
                      </button>
                      <button type="button" className="secondary-button" onClick={() => openSavedContentForEditing(item)}>
                        Bearbeiten
                      </button>
                      {item.status === 'draft' && (
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => deleteDraftContent(item)}
                          style={{ color: '#8b4a3b' }}
                        >
                          Löschen
                        </button>
                      )}
                      <button type="button" className="primary-button" onClick={() => useSavedContentAsTemplate(item)}>
                        Als Vorlage verwenden
                      </button>
                    </div>
                    {isOpen && (
                      <div className="content-library-detail">
                        {(item.channels || []).map(channel => (
                          <div key={channel}>
                            <strong>{platformRules[channel]?.label || channel}</strong>
                            <p>{item.channelContent?.[channel]?.title}</p>
                            <p>{item.channelContent?.[channel]?.caption}</p>
                            <small>{item.channelContent?.[channel]?.hashtags}</small>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .content-header-actions { display: flex; gap: 10px; align-items: center; }
        .content-library-overlay { position: fixed; inset: 0; z-index: 1000; background: rgba(24, 25, 48, .28); padding: 24px; overflow: auto; }
        .content-library-modal { width: min(1120px, 100%); margin: 20px auto; background: #fff; border: 1px solid #eadbca; border-radius: 18px; padding: 22px; box-shadow: 0 18px 50px rgba(20,20,40,.14); }
        .weekly-plan-modal { width:min(1420px,100%); margin:20px auto; background:#fff; border:1px solid #eadbca; border-radius:18px; padding:22px; box-shadow:0 18px 50px rgba(20,20,40,.14); }
        .week-nav { display:grid; grid-template-columns:auto 1fr auto; gap:12px; align-items:center; margin:18px 0; }
        .week-nav strong { text-align:center; color:#29246d; }
        .week-nav .secondary-button { margin:0; min-height:38px; }
        .week-grid { display:grid; grid-template-columns:repeat(7,minmax(150px,1fr)); gap:8px; align-items:stretch; }
        .week-day { border:1px solid #eadbca; border-radius:11px; padding:10px; min-height:250px; background:#fff; }
        .week-day-head { display:flex; justify-content:space-between; gap:8px; padding-bottom:8px; border-bottom:1px solid #f0e5d8; color:#29246d; text-transform:capitalize; }
        .week-day-head span { color:#8b6b39; font-size:11px; }
        .week-recommendations { min-height:42px; padding:8px 0; display:grid; gap:3px; }
        .week-recommendations span { font-size:10px; color:#a2762d; line-height:1.3; }
        .week-recommendations .week-quiet { color:#c4b8aa; }
        .week-entries { display:grid; gap:7px; }
        .week-entry { display:grid; grid-template-columns:42px minmax(0,1fr); gap:7px; padding:7px; border:1px solid #e9ddcf; border-radius:8px; background:#faf8f5; }
        .week-entry img { width:42px; height:52px; object-fit:cover; border-radius:5px; }
        .week-entry div { display:grid; gap:2px; min-width:0; }
        .week-entry strong { color:#29246d; font-size:11px; line-height:1.25; overflow:hidden; text-overflow:ellipsis; }
        .week-entry span, .week-entry small { color:#667085; font-size:9px; }
        .week-empty { color:#98a0ad; font-size:10px; padding:10px 2px; }
        .week-note { margin-top:12px; padding:9px 12px; border-radius:8px; background:#eef5ff; color:#31588a; font-size:11px; }
        .content-library-head { display:flex; justify-content:space-between; gap:20px; align-items:flex-start; border-bottom:1px solid #eadbca; padding-bottom:16px; }
        .content-library-head h2 { margin: 2px 0 5px; color:#29246d; }
        .content-library-head p { margin:0; color:#667085; }
        .content-library-search { display:flex; gap:12px; align-items:center; margin:18px 0; }
        .content-library-search input { flex:1; min-height:46px; border:1px solid #d9c9b7; border-radius:10px; padding:0 14px; font:inherit; }
        .content-library-search span { color:#8b6b39; white-space:nowrap; font-size:13px; }
        .content-library-results { display:grid; gap:10px; }
        .content-library-card { border:1px solid #eadbca; border-radius:12px; padding:12px; }
        .content-suggestion-reference-top { margin:12px 0 14px; }
        .content-suggestion-reference { margin-top:14px; padding:14px; border:1px solid var(--line); border-radius:12px; background:#faf8f5; }
        .content-suggestion-reference-head { display:flex; align-items:center; justify-content:space-between; gap:14px; }
        .content-suggestion-reference-head > div { display:grid; gap:3px; }
        .content-suggestion-reference-head strong { color:var(--navy); font-size:12px; }
        .content-suggestion-reference-body { margin-top:10px; padding-top:10px; border-top:1px solid var(--line); display:grid; gap:6px; }
        .content-suggestion-reference-body strong { color:var(--navy); font-size:12px; }
        .content-suggestion-reference-body p { margin:0; color:#4d5870; font-size:11px; line-height:1.55; }
        .content-suggestion-reference-body small { color:#667085; font-size:9px; line-height:1.45; }

        .content-library-card-main { display:grid; grid-template-columns:72px minmax(0,1fr) auto; gap:14px; align-items:center; }
        .content-library-thumb { width:72px; height:72px; border-radius:8px; overflow:hidden; background:#faf6f0; display:grid; place-items:center; color:#a27d3b; font-size:11px; }
        .content-library-thumb img { width:100%; height:100%; object-fit:cover; }
        .content-library-info { display:grid; gap:4px; min-width:0; }
        .content-library-info strong { color:#29246d; font-size:15px; }
        .content-library-info > span { color:#667085; font-size:12px; }
        .content-library-keywords { display:flex; gap:6px; flex-wrap:wrap; margin-top:3px; }
        .content-library-keywords em { font-style:normal; font-size:11px; background:#f8f0e5; color:#9a6d24; border-radius:7px; padding:4px 7px; }
        .content-library-meta { display:grid; gap:3px; text-align:right; color:#29246d; font-size:12px; }
        .content-library-meta small { color:#667085; }
        .content-library-actions { display:flex; justify-content:flex-end; gap:8px; margin-top:10px; }
        .content-library-actions .primary-button, .content-library-actions .secondary-button { margin:0; min-height:38px; padding:0 14px; }
        .content-library-detail { margin-top:12px; padding:12px; background:#faf8f5; border-radius:9px; display:grid; gap:12px; }
        .content-library-detail p { margin:4px 0; color:#29246d; }
        .content-library-detail small { color:#667085; }
        .content-library-empty { padding:28px; text-align:center; border:1px dashed #dccab6; border-radius:12px; color:#667085; }
        @media (max-width: 1050px) { .week-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } }
        @media (max-width: 760px) { .week-grid { grid-template-columns:1fr; } .week-nav { grid-template-columns:1fr 1fr; } .week-nav strong { grid-column:1 / -1; grid-row:1; } .content-header-actions { flex-wrap:wrap; } .content-library-overlay { padding:8px; } .content-library-head { flex-direction:column; } .content-library-card-main { grid-template-columns:58px 1fr; } .content-library-meta { grid-column:2; text-align:left; } }

        /* =========================================================
           CONTENT STUDIO · SHOWCASE + RESPONSIVE
           ========================================================= */

        .content-workspace {
          grid-template-columns: minmax(0, 1fr) 380px;
          gap: 22px;
        }

        .content-preview-panel {
          width: auto;
          min-width: 0;
        }

        .content-preview-image--social {
          width: 100%;
          height: auto;
          overflow: hidden;
          border-radius: 12px;
          background: #f6f2ea;
          transition: aspect-ratio 180ms ease;
        }

        .content-format-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 9px;
          margin-top: 6px;
        }

        .content-format-grid--two {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .content-format-card {
          min-height: 82px;
          padding: 8px 7px;
          display: grid;
          align-content: center;
          justify-items: center;
          gap: 3px;
          border: 1px solid var(--line);
          border-radius: 11px;
          background: #fff;
          color: var(--navy);
          cursor: pointer;
          text-align: center;
        }

        .content-format-card:hover {
          border-color: rgba(190, 154, 87, 0.7);
        }

        .content-format-card.active {
          border-color: var(--gold);
          background: #fffaf0;
          box-shadow: inset 0 0 0 1px rgba(190, 154, 87, 0.16);
        }

        .content-format-card strong {
          font-size: 12px;
          line-height: 1;
        }

        .content-format-card span {
          font-size: 8.5px;
          font-weight: 600;
        }

        .content-format-card em {
          color: #244f87;
          font-size: 7px;
          font-style: normal;
          line-height: 1.25;
        }

        .content-format-card small {
          color: var(--muted);
          font-size: 7px;
          line-height: 1.25;
        }

        .content-demo-preview-image {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: contain;
          object-position: center;
        }

        .content-product-grid {
          align-items: stretch;
          gap: 14px;
        }

        .content-product-card {
          width: 166px !important;
          padding: 8px !important;
          flex: 0 0 166px;
        }

        .demo-product-image {
          width: 100%;
          height: 190px;
          border-radius: 9px;
          background-image: url('/content-demo-paris.png');
          background-repeat: no-repeat;
          background-size: 300% auto;
          background-position-y: top;
          background-color: #f6f2ea;
          border: 1px solid rgba(190, 154, 87, 0.18);
        }

        .demo-product-image-0 {
          background-position-x: 0%;
        }

        .demo-product-image-1 {
          background-position-x: 50%;
        }

        .demo-product-image-2 {
  background-image: url('/content-demo-trousers.png');
  background-size: 112% auto;
  background-position: center 8%;
}
        .content-add-product {
          width: 150px;
          min-height: 236px;

          flex: 0 0 150px;
        }


        .content-basis-card {
          margin-bottom: 18px;
          padding: 16px;
          border: 1px solid var(--line);
          border-radius: 14px;
          background: linear-gradient(180deg, #fffdf9 0%, #fbfaf8 100%);
        }

        .content-basis-head,
        .content-channel-editor-head,
        .content-channel-editor-title {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
        }

        .content-basis-head {
          margin-bottom: 14px;
        }

        .content-basis-head > div,
        .content-channel-editor-head > div,
        .content-channel-editor-title > div {
          display: grid;
          gap: 3px;
        }

        .content-basis-kicker {
          color: var(--gold);
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.12em;
        }

        .content-basis-grid,
        .content-channel-form-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.35fr) minmax(260px, 0.65fr);
          gap: 14px;
        }

        .content-basis-note {
          display: grid;
          gap: 4px;
          padding: 10px 11px;
          border-radius: 10px;
          background: #edf4ff;
          color: #244f87;
          font-size: 9px;
          line-height: 1.45;
        }

        .content-channel-editor-head {
          margin: 4px 0 10px;
        }

        .content-channel-count {
          color: var(--muted);
          font-size: 9px;
        }

        .content-channel-tabs {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
          margin-bottom: 12px;
        }

        .content-channel-tab {
          display: grid;
          gap: 2px;
          min-height: 54px;
          padding: 9px 12px;
          border: 1px solid var(--line);
          border-radius: 11px;
          background: #fff;
          color: var(--navy);
          text-align: left;
          cursor: pointer;
        }

        .content-channel-tab span {
          font-size: 11px;
          font-weight: 800;
        }

        .content-channel-tab small {
          color: var(--muted);
          font-size: 8px;
        }

        .content-channel-tab.active {
          border-color: var(--navy);
          background: var(--navy);
          color: #fff;
          box-shadow: 0 5px 16px rgba(31, 58, 95, 0.12);
        }

        .content-channel-tab.active small {
          color: rgba(255, 255, 255, 0.78);
        }

        .content-channel-tab.disabled {
          cursor: not-allowed;
          opacity: 0.48;
        }

        .content-channel-editor {
          padding: 16px;
          border: 1px solid var(--line);
          border-radius: 14px;
          background: #fff;
        }

        .content-channel-editor-title {
          margin-bottom: 14px;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--line);
        }

        .content-channel-editor-title strong {
          font-family: Georgia, 'Times New Roman', serif;
          color: var(--navy);
          font-size: 17px;
          font-weight: 700;
        }

        .content-channel-editor-title span {
          color: var(--muted);
          font-size: 9px;
        }

        /* Hashtags bewusst kompakt: mehr Raum für den eigentlichen Instagram-Text. */
        .content-hashtag-panel {
          margin-top: 22px;
          padding-top: 8px;
          border-top: 1px solid var(--line);
        }

        .content-hashtag-panel-head,
        .content-hashtag-subhead,
        .content-ai-suggestion-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .content-hashtag-panel-head {
          margin-bottom: 2px;
        }

        .content-hashtag-panel-head > strong {
          color: var(--navy);
          font-size: 11px;
        }

        .content-hashtag-panel-head > span,
        .content-hashtag-subhead small {
          color: var(--muted);
          font-size: 8px;
        }

        /* Gleicher, ruhiger Abstand zwischen den drei Hashtag-Gruppen. */
        .content-hashtag-section {
          display: grid;
          gap: 3px;
          margin-top: 5px;
        }

        /* Eigene Hashtags näher an die AI-Vorschläge rücken. */
        .content-hashtag-section--own {
          margin-top: 2px;
        }

        .content-hashtag-subhead > span {
          color: var(--gold);
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0;
          text-transform: none;
        }

        .content-hashtag-panel .content-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
        }

        /* Hashtag-Felder wie die übrigen Content-Felder: dezent, erst aktiv gold. */
        .content-hashtag-panel .content-chip,
        .content-hashtag-panel .content-chip-more {
          border: 1px solid var(--line);
          border-radius: 7px;
          box-shadow: none;
        }

        .content-hashtag-panel .content-chip.active {
          border-color: var(--gold);
          outline: none;
          font-weight: 700;
        }

        .content-hashtag-panel .content-chip.article {
          background: #fff3df;
          color: #8a5b12;
        }

        .content-chip-more {
          display: inline-grid;
          place-items: center;
          min-width: 28px;
          padding: 5px 7px;
          border: 1px solid var(--line);
          border-radius: 999px;
          color: var(--navy);
          background: #fff;
          font-size: 8px;
          font-weight: 700;
        }

        .content-hashtag-empty {
          color: var(--muted);
          font-size: 8.5px;
        }

        .content-ai-suggestion-row {
          min-height: 26px;
        }

        .content-hashtag-add {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 6px;
        }

        .content-hashtag-add input {
          min-width: 0;
          min-height: 34px;
          padding: 6px 10px;
          border: 1px solid var(--line);
          border-radius: 7px;
          background: #fff;
          color: var(--navy);
          outline: none;
          box-sizing: border-box;
        }

        .content-hashtag-add input:focus {
          border-color: var(--gold);
          box-shadow: 0 0 0 2px rgba(190, 161, 117, 0.12);
        }

        .content-ai-budget--detailed { padding: 13px; }
        .content-ai-budget-title, .content-ai-budget-month { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
        .content-ai-budget-title { color: var(--gold); font-size: 9px; font-weight: 800; letter-spacing: 0.035em; }
        .content-ai-budget-month { margin-top: 11px; color: var(--navy); font-size: 9px; }
        .content-ai-budget-month strong { font-size: 11px; }
        .content-ai-budget-bar--detailed { margin-top: 7px; background: var(--navy); }
        .content-ai-budget-bar--detailed > span { background: var(--gold); }
        .content-ai-budget-metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 10px; }
        .content-ai-budget-metrics > div, .content-ai-generation-grid > div { display: grid; gap: 2px; }
        .content-ai-budget-metrics span, .content-ai-generation-grid span, .content-ai-generation-grid small { color: var(--muted); font-size: 7.5px; }
        .content-ai-budget-metrics strong { color: var(--navy); font-size: 12px; }
        .content-ai-generation-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 11px; padding: 9px 10px; border: 1px solid var(--line); border-radius: 9px; background: rgba(255,255,255,.55); }
        .content-ai-generation-grid strong { color: var(--navy); font-size: 13px; }
        .content-ai-budget-warning { margin-top: 9px; color: var(--muted); font-size: 7.5px; }

        .content-channel-note {
          margin-top: 5px;
          padding: 8px 11px;
          border-radius: 9px;
          background: #edf4ff;
          color: #244f87;
          font-size: 9px;
          line-height: 1.4;
        }

        /* Nur den Abstand zwischen Schritt 3 und Schritt 4 verkleinern. */
        .content-create-page > .content-create-section:nth-of-type(3) {
          margin-bottom: -14px;
        }

        @media (max-width: 1280px) {
          .content-workspace {
            grid-template-columns: minmax(0, 1fr) 340px;
            gap: 18px;
          }

          .content-product-card {
            width: 150px !important;
            flex-basis: 150px;
          }

          .demo-product-image {
            height: 172px;
          }

          .content-add-product {
            width: 140px;
            min-height: 218px;
            flex-basis: 140px;
          }
        }

        @media (max-width: 1050px) {
          .content-workspace {
            grid-template-columns: 1fr;
          }

          .content-preview-panel {
            position: static;
            max-width: 720px;
          }

        }



        @media (max-width: 900px) {
          .content-basis-grid,
          .content-channel-form-grid {
            grid-template-columns: 1fr;
          }
        }


        .content-save-panel {
          margin-top: 12px;
          padding: 13px;
          border: 1px solid var(--line);
          border-radius: 10px;
          background: #fff;
        }

        .content-save-head {
          margin-bottom: 11px;
        }

        .content-save-head strong,
        .content-save-head span {
          display: block;
        }

        .content-save-head strong {
          color: var(--navy);
          font-size: 12px;
          margin-bottom: 3px;
        }

        .content-save-head span,
        .content-save-field small {
          color: var(--muted);
          font-size: 9px;
          line-height: 1.4;
        }

        .content-save-field {
          display: block;
          margin-bottom: 9px;
        }

        .content-save-field > span {
          display: block;
          margin-bottom: 4px;
          color: var(--gold);
          font-size: 9px;
          font-weight: 600;
        }

        .content-save-field input {
          width: 100%;
          min-height: 34px;
          box-sizing: border-box;
          padding: 7px 9px;
          border: 1px solid var(--line);
          border-radius: 7px;
          background: #fff;
          color: var(--navy);
          font: inherit;
          font-size: 10px;
          outline: none;
        }

        .content-save-field input:focus {
          border-color: var(--gold);
        }

        .content-save-field small {
          display: block;
          margin-top: 4px;
        }

        .content-save-actions {
          display: flex;
          justify-content: flex-end;
          margin-top: 10px;
        }

        .content-save-actions button:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .content-save-success {
          margin-top: 9px;
          padding: 8px 10px;
          border-radius: 7px;
          background: #f4f7ee;
          color: var(--navy);
          font-size: 9.5px;
          font-weight: 600;
        }

        @media (max-width: 760px) {
          .content-workspace {
            display: flex;
            flex-direction: column;
            gap: 14px;
          }

          .content-create-page {
            display: contents;
          }

          .content-create-page > .content-create-section:nth-of-type(1) {
            order: 1;
          }

          .content-create-page > .content-create-section:nth-of-type(2) {
            order: 2;
          }

          .content-create-page > .content-create-section:nth-of-type(3) {
            order: 3;
          }

          .content-preview-panel {
            order: 4;
            width: 100%;
            max-width: none;
            box-sizing: border-box;
          }

          .content-create-page > .content-create-section:nth-of-type(4) {
            order: 5;
          }

          .content-product-grid {
            display: flex;
            flex-wrap: nowrap;
            overflow-x: auto;
            gap: 12px;
            padding: 2px 2px 10px;
            scroll-snap-type: x proximity;
            -webkit-overflow-scrolling: touch;
          }

          .content-product-card,
          .content-add-product {
            scroll-snap-align: start;
          }

          .content-product-card {
            width: min(72vw, 230px) !important;
            flex: 0 0 min(72vw, 230px);
          }

          .demo-product-image {
            height: min(88vw, 285px);
          }

          .content-add-product {
            width: min(55vw, 180px);
            min-height: min(100vw, 330px);
            flex: 0 0 min(55vw, 180px);
          }

        }

        @media (max-width: 480px) {
          .content-product-card {
            width: 76vw !important;
            flex-basis: 76vw;
          }

          .demo-product-image {
            height: 92vw;
            max-height: 330px;
          }

          .content-preview-panel {
            padding: 13px;
          }

          .content-preview-image--social {
            border-radius: 10px;
          }
        }

        .content-review-overlay {
          position: fixed;
          inset: 0;
          z-index: 1200;
          display: grid;
          place-items: center;
          padding: 24px;
          background: rgba(20, 28, 50, 0.42);
        }

        .content-review-modal {
          width: min(980px, 94vw);
          max-height: 90vh;
          overflow-y: auto;
          padding: 20px;
          border: 1px solid var(--line);
          border-radius: 14px;
          background: #fff;
          box-shadow: 0 22px 70px rgba(16, 28, 55, 0.24);
        }

        .content-review-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          padding-bottom: 14px;
          border-bottom: 1px solid var(--line);
        }

        .content-review-head h2 {
          margin: 3px 0 4px;
          color: var(--navy);
          font-size: 20px;
        }

        .content-review-head p {
          margin: 0;
          color: var(--muted);
          font-size: 10px;
        }

        .content-review-summary {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 8px;
          margin: 14px 0;
        }

        .content-review-summary > div {
          padding: 9px 10px;
          border: 1px solid var(--line);
          border-radius: 8px;
          background: #fffdf9;
        }

        .content-review-summary span,
        .content-review-field > span {
          display: block;
          margin-bottom: 3px;
          color: var(--gold);
          font-size: 8.5px;
          font-weight: 600;
        }

        .content-review-summary strong {
          color: var(--navy);
          font-size: 10px;
        }

        .content-review-warning,
        .content-review-success {
          margin: 10px 0;
          padding: 8px 10px;
          border-radius: 8px;
          font-size: 9px;
        }

        .content-review-warning {
          background: #fff7e8;
          color: #8a5a12;
        }

        .content-review-success {
          background: #f4f7ee;
          color: var(--navy);
        }

        .content-review-channels {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 10px;
        }

        .content-review-channel-card {
          padding: 12px;
          border: 1px solid var(--line);
          border-radius: 10px;
          background: #fff;
        }

        .content-review-channel-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 10px;
          padding-bottom: 8px;
          border-bottom: 1px solid var(--line);
        }

        .content-review-channel-head strong {
          color: var(--navy);
          font-size: 12px;
        }

        .content-review-channel-head span {
          color: var(--gold);
          font-size: 9px;
          font-weight: 700;
        }

        .content-review-field {
          margin-bottom: 9px;
        }

        .content-review-field strong,
        .content-review-field p {
          margin: 0;
          color: var(--navy);
          font-size: 9.5px;
          line-height: 1.45;
          overflow-wrap: anywhere;
        }

        .content-review-hashtags {
          color: #244f87 !important;
        }

        .content-review-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 14px;
          padding-top: 12px;
          border-top: 1px solid var(--line);
        }

        @media (max-width: 760px) {
          .content-review-summary {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .content-review-head {
            flex-direction: column;
          }
        }

      `}</style>
    </AppShell>
  );
}
