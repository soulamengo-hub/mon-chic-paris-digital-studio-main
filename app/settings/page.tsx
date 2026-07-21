import AppShell from '@/components/AppShell';
import AiBudgetPanel from '@/components/AiBudgetPanel';
import SystemStatusPanel from '@/components/SystemStatusPanel';
export default function Page(){return <AppShell><div className="page-header"><div><p className="eyebrow">MON CHIC PARIS</p><h1>Einstellungen</h1><p>KI-Budget, Nutzungskontrolle und Systemstatus.</p></div></div><SystemStatusPanel/><AiBudgetPanel/></AppShell>}
