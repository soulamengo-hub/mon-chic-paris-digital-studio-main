import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MON CHIC PARIS · Digital Studio',
  description: 'Digital Studio für Artikel, Lager, Verkauf und CRM.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="de"><body>{children}</body></html>;
}
