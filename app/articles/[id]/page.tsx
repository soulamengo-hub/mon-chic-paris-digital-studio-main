import AppShell from '@/components/AppShell';
import ArticleEditor from '@/components/ArticleEditor';
export default async function Page({params}:{params:Promise<{id:string}>}){const{id}=await params;return <AppShell><div className="page-header"><div><p className="eyebrow">ARTIKELVERWALTUNG</p><h1>Artikel bearbeiten</h1><p>Öffentliche Angaben und interne Informationen bleiben klar getrennt.</p></div></div><ArticleEditor id={id}/></AppShell>}
