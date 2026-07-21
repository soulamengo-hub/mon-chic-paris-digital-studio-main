import AppShell from '@/components/AppShell';
import QrScanner from '@/components/QrScanner';
export default function Page(){return <AppShell><div className="page-header"><div><p className="eyebrow">ARTIKEL</p><h1>QR-Code scannen</h1><p>Kamera auf das ausgedruckte Etikett richten — der passende Artikel öffnet sich automatisch.</p></div></div><QrScanner/></AppShell>}
