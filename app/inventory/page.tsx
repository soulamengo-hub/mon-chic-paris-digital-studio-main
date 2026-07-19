import AppShell from '@/components/AppShell';
import InventoryImport from '@/components/InventoryImport';
export default function Page(){return <AppShell><div className="page-header"><div><p className="eyebrow">LAGER</p><h1>Bestand importieren</h1><p>Excel- oder CSV-Bestand einlesen, prüfen und als Artikel übernehmen.</p></div></div><InventoryImport/></AppShell>}
