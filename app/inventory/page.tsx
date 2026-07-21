import Link from 'next/link';
import AppShell from '@/components/AppShell';
import InventoryImport from '@/components/InventoryImport';
import InventoryExport from '@/components/InventoryExport';
export default function Page(){return <AppShell><div className="page-header split"><div><p className="eyebrow">LAGER</p><h1>Bestand importieren &amp; exportieren</h1><p>Excel- oder CSV-Bestand einlesen, prüfen und als Artikel übernehmen — oder den aktuellen Bestand als Excel-Datei herunterladen.</p></div><Link href="/articles/labels" className="primary-button">QR-Etiketten drucken</Link></div><InventoryExport/><InventoryImport/></AppShell>}
