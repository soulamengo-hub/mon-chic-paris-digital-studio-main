import Link from 'next/link';
import AppShell from '@/components/AppShell';
import WarehousePlacesManager from '@/components/WarehousePlacesManager';
import WarehouseImport from '@/components/WarehouseImport';
import InventoryImport from '@/components/InventoryImport';
import InventoryExport from '@/components/InventoryExport';

const FONT = 'Arial, Helvetica, sans-serif';

export default function Page() {
  return (
    <AppShell>
      <div className="page-header split" style={{ fontFamily: FONT }}>
        <div>
          <p className="eyebrow" style={{ fontFamily: FONT, color: '#BEA175' }}>
            MON CHIC PARIS · DIGITAL STUDIO
          </p>
          <h1 style={{ fontFamily: FONT, color: '#1F3A5F' }}>Lager &amp; Bestand</h1>
          <p style={{ fontFamily: FONT, maxWidth: 820 }}>
            Lagerplätze und Boxen verwalten, Lagerdaten aus Excel prüfen,
            Bestände importieren oder exportieren und QR-Etiketten drucken.
          </p>
        </div>
        <div>
          <Link href="/articles/labels" className="button" style={{ fontFamily: FONT }}>
            QR-Etiketten
          </Link>
        </div>
      </div>

      <WarehousePlacesManager />
      <WarehouseImport />
      <InventoryExport />
      <InventoryImport />
    </AppShell>
  );
}
