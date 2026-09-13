export type SocialChannel =
  | 'instagram'
  | 'facebook'
  | 'pinterest'
  | 'tiktok'
  | 'linkedin';

export type SocialContentFormat = {
  id: string;
  label: string;
  aspectRatio: string;
  dimensions: string;
  minImages: number;
  maxImages: number;
  recommendedMin?: number;
  recommendedMax?: number;
  note?: string;
};

export const SOCIAL_MEDIA_FORMATGUIDE_REFERENCE =
  'Social Media Formatguide · geprüft am 09.09.2026';

export const socialMediaFormatguide: Record<
  SocialChannel,
  SocialContentFormat[]
> = {
  instagram: [
    {
      id: 'feed-single',
      label: 'Feed-Post Einzelbild',
      aspectRatio: '4:5',
      dimensions: '1080 × 1350 px',
      minImages: 1,
      maxImages: 1,
    },
    {
      id: 'carousel',
      label: 'Karussell',
      aspectRatio: '4:5',
      dimensions: '1080 × 1350 px',
      minImages: 2,
      maxImages: 20,
      recommendedMin: 5,
      recommendedMax: 10,
    },
    {
      id: 'story',
      label: 'Story',
      aspectRatio: '9:16',
      dimensions: '1080 × 1920 px',
      minImages: 1,
      maxImages: 1,
      note: '1 Foto pro Frame',
    },
    {
      id: 'reel',
      label: 'Reel',
      aspectRatio: '9:16',
      dimensions: '1080 × 1920 px',
      minImages: 1,
      maxImages: 1,
      note: 'Video + 1 Cover',
    },
  ],

  facebook: [
    {
      id: 'feed-single',
      label: 'Feed-Post',
      aspectRatio: '4:5',
      dimensions: '1080 × 1350 px',
      minImages: 1,
      maxImages: 1,
      note: 'Alternativ 1:1 oder 1.91:1',
    },
    {
      id: 'multi-image',
      label: 'Mehrbild-Post / Fotoalbum',
      aspectRatio: 'gemischt',
      dimensions: 'variabel',
      minImages: 2,
      maxImages: 20,
      recommendedMin: 3,
      recommendedMax: 5,
    },
    {
      id: 'story',
      label: 'Story',
      aspectRatio: '9:16',
      dimensions: '1080 × 1920 px',
      minImages: 1,
      maxImages: 1,
    },
    {
      id: 'reel',
      label: 'Reel',
      aspectRatio: '9:16',
      dimensions: '1080 × 1920 px',
      minImages: 1,
      maxImages: 1,
      note: 'Video + Cover',
    },
  ],

  pinterest: [
    {
      id: 'standard-pin',
      label: 'Standard-Pin',
      aspectRatio: '2:3',
      dimensions: '1000 × 1500 px',
      minImages: 1,
      maxImages: 1,
    },
    {
      id: 'carousel-pin',
      label: 'Karussell-Pin',
      aspectRatio: '2:3',
      dimensions: '1000 × 1500 px',
      minImages: 2,
      maxImages: 5,
      note: 'Alternativ 1:1',
    },
    {
      id: 'idea-pin',
      label: 'Idea- / Story-Pin',
      aspectRatio: '9:16',
      dimensions: '1080 × 1920 px',
      minImages: 1,
      maxImages: 20,
    },
  ],

  tiktok: [
    {
      id: 'photo-mode',
      label: 'Foto-Karussell / Photo Mode',
      aspectRatio: '9:16',
      dimensions: '1080 × 1920 px',
      minImages: 4,
      maxImages: 35,
      recommendedMin: 5,
      recommendedMax: 10,
    },
    {
      id: 'video',
      label: 'Video-Post',
      aspectRatio: '9:16',
      dimensions: '1080 × 1920 px',
      minImages: 1,
      maxImages: 1,
      note: 'Video + 1 Cover',
    },
  ],

  linkedin: [
    {
      id: 'feed-single',
      label: 'Feed-Post',
      aspectRatio: '4:5',
      dimensions: '1080 × 1350 px',
      minImages: 1,
      maxImages: 1,
      note: 'Alternativ 1:1 oder 1.91:1',
    },
    {
      id: 'multi-image',
      label: 'Mehrbild-Post',
      aspectRatio: '4:5',
      dimensions: '1080 × 1350 px',
      minImages: 2,
      maxImages: 20,
      recommendedMin: 5,
      recommendedMax: 10,
      note: 'Alternativ 1:1',
    },
    {
      id: 'document',
      label: 'Dokument-Post / PDF-Karussell',
      aspectRatio: '4:5',
      dimensions: '1080 × 1350 px',
      minImages: 1,
      maxImages: 300,
      recommendedMin: 5,
      recommendedMax: 12,
      note: 'PDF · alternativ 1:1',
    },
  ],
};

export const defaultContentFormat: Record<SocialChannel, string> = {
  instagram: 'carousel',
  facebook: 'multi-image',
  pinterest: 'standard-pin',
  tiktok: 'photo-mode',
  linkedin: 'multi-image',
};