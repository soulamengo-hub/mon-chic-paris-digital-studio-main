'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';

function generateSku() {
  const stamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `MCP-${stamp}-${random}`;
}

export default function NewArticlePage() {
  const router = useRouter();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sku: generateSku() }),
    })
      .then(async response => {
        if (!response.ok) throw new Error(await response.text());
        return response.json() as Promise<{ id: string }>;
      })
      .then(product => {
        router.replace(`/articles/${product.id}`);
      })
      .catch(error => {
        console.error('Artikel konnte nicht angelegt werden:', error);
      });
  }, [router]);

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <p className="eyebrow">ARTIKELAUFNAHME</p>
          <h1>Neuen Artikel erfassen</h1>
          <p>Fotos aufnehmen, Artikel-DNA pflegen und als Entwurf speichern.</p>
        </div>
      </div>
      <section className="panel empty-state">
        <h2>Neuer Artikel wird angelegt …</h2>
      </section>
    </AppShell>
  );
}