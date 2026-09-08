import { NextResponse } from 'next/server';
import { getSupabaseConfig, supabaseHeaders } from '@/lib/supabase';
import type { ProductInput } from '@/lib/types';
import { sanitizeProductInput } from '@/lib/product-fields';

type Context = { params: Promise<{ id: string }> };

const WAREHOUSE_FIELDS: Array<keyof ProductInput> = [
  'warehouse_location',
  'warehouse_area',
  'warehouse_place',
  'warehouse_code',
  'warehouse_place_id',
  'warehouse_rack',
  'warehouse_shelf',
];

export async function GET(_: Request, { params }: Context) {
  const { id } = await params;
  const { url } = getSupabaseConfig();
  const headers = supabaseHeaders();

  const [productRes, imagesRes] = await Promise.all([
    fetch(
      `${url}/rest/v1/products?id=eq.${encodeURIComponent(id)}&select=*`,
      { headers, cache: 'no-store' },
    ),
    fetch(
      `${url}/rest/v1/product_images?product_id=eq.${encodeURIComponent(id)}&select=*&order=sort_order.asc`,
      { headers, cache: 'no-store' },
    ),
  ]);

  if (!productRes.ok) {
    return new NextResponse(await productRes.text(), {
      status: productRes.status,
    });
  }

  const rows = await productRes.json();

  if (!rows[0]) {
    return NextResponse.json(
      { error: 'Artikel nicht gefunden.' },
      { status: 404 },
    );
  }

  return NextResponse.json({
    ...rows[0],
    product_images: imagesRes.ok ? await imagesRes.json() : [],
  });
}

export async function PATCH(request: Request, { params }: Context) {
  const { id } = await params;
  const rawBody = await request.json() as Record<string, unknown>;

  const { url } = getSupabaseConfig();
  const headers = supabaseHeaders();

  // Aktuellen Datensatz zuerst laden.
  // Die Sonderfreigabe für SKU-Änderungen gilt ausschließlich
  // für echte PENDING-Artikel.
  const currentRes = await fetch(
    `${url}/rest/v1/products?id=eq.${encodeURIComponent(id)}&select=*`,
    { headers, cache: 'no-store' },
  );

  if (!currentRes.ok) {
    return new NextResponse(await currentRes.text(), {
      status: currentRes.status,
    });
  }

  const currentRows =
    await currentRes.json() as Array<Record<string, unknown>>;

  const current = currentRows[0];

  if (!current) {
    return NextResponse.json(
      { error: 'Artikel nicht gefunden.' },
      { status: 404 },
    );
  }

  const currentSku = String(current.sku ?? '').trim();
  const isPending = currentSku.startsWith('PENDING-');

  const wantsFinalize = rawBody.__finalize_pending === true;

  const requestedSku = String(rawBody.sku ?? '').trim();
  const requestedSubcategory = String(rawBody.subcategory ?? '').trim();

  // Normale PATCH-Requests dürfen die SKU weiterhin nie verändern.
  const body = sanitizeProductInput(rawBody, { allowSku: false });

  // Alle Lagerfelder werden als echte Lagerbewegung erkannt.
  const warehouseChanged = WAREHOUSE_FIELDS.some(
    key =>
      body[key] !== undefined &&
      body[key] !== current[key],
  );

  const now = new Date().toISOString();

  const specialPatch: Record<string, unknown> = {};

  if (isPending && wantsFinalize) {
    if (!requestedSubcategory) {
      return NextResponse.json(
        {
          error:
            'Unterkategorie fehlt. Die PENDING-SKU bleibt unverändert.',
        },
        { status: 400 },
      );
    }

    if (!requestedSku.startsWith('MCP-')) {
      return NextResponse.json(
        {
          error:
            'Ungültige endgültige SKU. Die PENDING-SKU bleibt unverändert.',
        },
        { status: 400 },
      );
    }

    // Zusätzliche Sicherheit vor dem Update.
    // Die UNIQUE-Constraint in Supabase bleibt ebenfalls aktiv
    // und ist die letzte Schutzschicht.
    const duplicateRes = await fetch(
      `${url}/rest/v1/products?sku=eq.${encodeURIComponent(requestedSku)}&select=id,sku&limit=1`,
      { headers, cache: 'no-store' },
    );

    if (!duplicateRes.ok) {
      return new NextResponse(await duplicateRes.text(), {
        status: duplicateRes.status,
      });
    }

    const duplicates =
      await duplicateRes.json() as Array<{
        id?: string;
        sku?: string;
      }>;

    if (duplicates.some(row => row.id && row.id !== id)) {
      return NextResponse.json(
        {
          error:
            `Die SKU ${requestedSku} ist bereits vergeben. ` +
            'Die PENDING-SKU bleibt unverändert.',
        },
        { status: 409 },
      );
    }

    // Die echte MCP-SKU darf jetzt gesetzt werden.
    specialPatch.sku = requestedSku;

    // Ein Referenzfoto muss für "vollständig" vorhanden sein.
    const hasReferencePhoto = Boolean(
      String(current.reference_photo_url ?? '').trim(),
    );

    specialPatch.status =
      hasReferencePhoto ? 'Entwurf' : 'Unvollständig';

    specialPatch.show_on_website = hasReferencePhoto;
  } else if (isPending) {
    // Solange der PENDING-Artikel nicht ausdrücklich vervollständigt wird,
    // darf er nicht versehentlich in einen normalen Status wechseln.
    specialPatch.status = 'Unvollständig';
    specialPatch.show_on_website = false;
  } else {
    // V55C25:
    // Hat der Artikel bereits eine echte MCP-SKU und eine Unterkategorie,
    // wird er beim erstmaligen Hinzufügen eines Referenzfotos automatisch
    // von "Unvollständig" auf "Entwurf" gesetzt.
    const incomingReferencePhoto =
      rawBody.reference_photo_url === null
        ? ''
        : String(rawBody.reference_photo_url ?? '').trim();

    const isAddingReferencePhoto =
      incomingReferencePhoto !== '' &&
      !String(current.reference_photo_url ?? '').trim();

    const hasRealMcpSku = currentSku.startsWith('MCP-');

    const effectiveSubcategory =
      String(rawBody.subcategory ?? current.subcategory ?? '').trim();

    const currentlyIncomplete =
      String(current.status ?? '').trim() === 'Unvollständig';

    if (
      isAddingReferencePhoto &&
      hasRealMcpSku &&
      Boolean(effectiveSubcategory) &&
      currentlyIncomplete
    ) {
      specialPatch.status = 'Entwurf';
      specialPatch.show_on_website = true;
    }
  }

  const patchBody: Record<string, unknown> = {
    ...body,
    ...specialPatch,
    updated_at: now,
    ...(warehouseChanged ? { last_movement_at: now } : {}),
  };

  const res = await fetch(
    `${url}/rest/v1/products?id=eq.${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      headers: supabaseHeaders({
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      }),
      body: JSON.stringify(patchBody),
      cache: 'no-store',
    },
  );

  const text = await res.text();

  if (!res.ok) {
    return new NextResponse(text, {
      status: res.status,
    });
  }

  const updated = JSON.parse(text)[0];

  // Historie auf Basis der tatsächlich gespeicherten Felder führen.
  const historyFields = Object.fromEntries(
    Object.entries(patchBody).filter(
      ([key]) =>
        key !== 'updated_at' &&
        key !== 'last_movement_at',
    ),
  );

  const changes = Object.entries(historyFields)
    .filter(
      ([key, value]) =>
        value !== undefined &&
        value !== current[key],
    )
    .map(([key, value]) => ({
      field_name: key,
      old_value:
        current[key] == null
          ? null
          : String(current[key]),
      new_value:
        value == null
          ? null
          : String(value),
    }));

  if (changes.length) {
    await fetch(
      `${url}/rest/v1/product_history`,
      {
        method: 'POST',
        headers: supabaseHeaders({
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        }),
        body: JSON.stringify(
          changes.map(change => ({
            product_id: id,
            event_type:
              warehouseChanged &&
              WAREHOUSE_FIELDS.includes(
                change.field_name as keyof ProductInput,
              )
                ? 'Lagerbewegung'
                : 'Änderung',
            ...change,
          })),
        ),
        cache: 'no-store',
      },
    );
  }

  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: Context) {
  const { id } = await params;

  const { url } = getSupabaseConfig();
  const headers = supabaseHeaders();

  const imagesRes = await fetch(
    `${url}/rest/v1/product_images?product_id=eq.${encodeURIComponent(id)}&select=storage_path`,
    {
      headers,
      cache: 'no-store',
    },
  );

  const images = imagesRes.ok
    ? await imagesRes.json() as Array<{ storage_path: string }>
    : [];

  for (const image of images) {
    const encoded = image.storage_path
      .split('/')
      .map(encodeURIComponent)
      .join('/');

    await fetch(
      `${url}/storage/v1/object/product-images/${encoded}`,
      {
        method: 'DELETE',
        headers,
      },
    );
  }

  const res = await fetch(
    `${url}/rest/v1/products?id=eq.${encodeURIComponent(id)}`,
    {
      method: 'DELETE',
      headers: supabaseHeaders({
        Prefer: 'return=minimal',
      }),
      cache: 'no-store',
    },
  );

  if (!res.ok) {
    return new NextResponse(
      await res.text(),
      { status: res.status },
    );
  }

  return NextResponse.json({ ok: true });
}
