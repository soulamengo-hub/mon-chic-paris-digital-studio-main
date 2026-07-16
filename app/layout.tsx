import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MON CHIC PARIS · Digital Studio',
  description: 'Professionelles Digital Studio für Artikel, Fotos, Lager und Content.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
