'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ArticleIcon, BellIcon, BoxIcon, CartIcon, ChartIcon, EuroIcon, GearIcon,
  HomeIcon, PenIcon, QrIcon, SparkIcon, UsersIcon,
} from './Icons';

const items = [
  { href: '/', label: 'Dashboard', icon: HomeIcon },
  { href: '/articles', label: 'Artikel', icon: ArticleIcon },
  { href: '/showcase', label: 'Schaufenster', icon: SparkIcon },
  { href: '/inventory', label: 'Lager', icon: BoxIcon },
  { href: '/sales', label: 'Verkäufe', icon: CartIcon },
  { href: '/crm', label: 'CRM', icon: UsersIcon },
  { href: '/ai-studio', label: 'AI Studio', icon: SparkIcon },
  { href: '/content-studio', label: 'Content Studio', icon: PenIcon },
  { href: '/finance', label: 'Finance', icon: EuroIcon },
  { href: '/analytics', label: 'Analytics', icon: ChartIcon },
  { href: '/settings', label: 'Einstellungen', icon: GearIcon },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-block">
          <Image src="/mon-chic-logo.png" alt="MON CHIC PARIS Logo" width={150} height={130} priority className="brand-logo" />
          <div>
            <div className="brand-title">MON CHIC PARIS</div>
            <div className="brand-subtitle">DIGITAL STUDIO</div>
            <div className="brand-tagline">Fashion · Creativity · Innovation</div>
          </div>
        </div>
        <div className="header-actions">
          <Link href="/articles/scan" className="icon-button" aria-label="Artikel per QR-Code öffnen"><QrIcon /></Link>
          <button className="icon-button" aria-label="Benachrichtigungen"><BellIcon /></button>
          <Link href="/ai-studio" className="ai-pill"><SparkIcon /> AI Studio</Link>
          <div className="profile">
            <div className="avatar">MC</div>
            <div><strong>Mon Chic</strong><span>Administrator</span></div>
          </div>
        </div>
      </header>

      <aside className="sidebar">
        <nav>
          {items.map(({ href, label, icon: Icon }) => {
            const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
            return <Link key={href} href={href} className={`nav-item${active ? ' active' : ''}`}><Icon /><span>{label}</span></Link>;
          })}
        </nav>
        <div className="premium-card"><ArticleIcon /><div><strong>Premium Plan</strong><span>Alle Funktionen aktiv</span></div><b>›</b></div>
      </aside>

      <main className="main-content">{children}</main>
      <div className="mobile-nav">
        {items.slice(0,5).map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return <Link key={href} href={href} className={active ? 'active' : ''}><Icon /><span>{label}</span></Link>;
        })}
      </div>
    </div>
  );
}
