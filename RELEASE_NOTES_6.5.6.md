import type { SVGProps } from 'react';

type Props = SVGProps<SVGSVGElement>;
const base = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
export const HomeIcon = (p: Props) => <svg {...base} {...p}><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg>;
export const ArticleIcon = (p: Props) => <svg {...base} {...p}><path d="M6 3h12v18H6z"/><path d="M9 7h6M9 11h6M9 15h4"/></svg>;
export const BoxIcon = (p: Props) => <svg {...base} {...p}><path d="m4 7 8-4 8 4-8 4z"/><path d="M4 7v10l8 4 8-4V7M12 11v10"/></svg>;
export const CartIcon = (p: Props) => <svg {...base} {...p}><path d="M3 4h2l2 12h10l2-8H7"/><circle cx="9" cy="20" r="1"/><circle cx="17" cy="20" r="1"/></svg>;
export const UsersIcon = (p: Props) => <svg {...base} {...p}><circle cx="9" cy="8" r="3"/><path d="M3 20c0-4 2-7 6-7s6 3 6 7"/><path d="M16 5a3 3 0 0 1 0 6M17 13c3 .6 4 3 4 7"/></svg>;
export const SparkIcon = (p: Props) => <svg {...base} {...p}><path d="m12 3 1.4 4.1L17.5 8.5l-4.1 1.4L12 14l-1.4-4.1-4.1-1.4 4.1-1.4z"/><path d="m19 14 .8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8z"/></svg>;
export const PenIcon = (p: Props) => <svg {...base} {...p}><path d="M4 20h4l11-11-4-4L4 16z"/><path d="m13 7 4 4"/></svg>;
export const EuroIcon = (p: Props) => <svg {...base} {...p}><path d="M18 7a7 7 0 1 0 0 10"/><path d="M4 10h10M4 14h10"/></svg>;
export const ChartIcon = (p: Props) => <svg {...base} {...p}><path d="M4 20V10M10 20V4M16 20v-7M22 20V7"/></svg>;
export const GearIcon = (p: Props) => <svg {...base} {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21h-4v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3v-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1L7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V3h4v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.1v4H21a1.7 1.7 0 0 0-1.6 1z"/></svg>;
export const BellIcon = (p: Props) => <svg {...base} {...p}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>;
export const CalendarIcon = (p: Props) => <svg {...base} {...p}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>;
export const CameraIcon = (p: Props) => <svg {...base} {...p}><path d="M4 7h4l2-3h4l2 3h4v13H4z"/><circle cx="12" cy="13" r="4"/></svg>;
export const UploadIcon = (p: Props) => <svg {...base} {...p}><path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 20h16"/></svg>;
