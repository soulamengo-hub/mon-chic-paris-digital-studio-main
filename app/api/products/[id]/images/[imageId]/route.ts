import { NextResponse } from 'next/server';
import { getSupabaseConfig, supabaseHeaders } from '@/lib/supabase';

type Context = { params: Promise<{ id: string; imageId: string }> };

type ImageRow = {
  id: string;
  product_id: string;
  storage_path: string;
  public_url: string;
  file_name?: string | null;
  mime_type?: string | null;
  size_bytes?: number | null;
  sort_order: number;
  content_suitable?: boolean;
};

function encodeStoragePath(storagePath: string) {
  return storagePath.split('/').map(encodeURIComponent).join('/');
}

async function getImage(productId: string, imageId: string): Promise<ImageRow | null> {
  const { url } = getSupabaseConfig();

  const response = await fetch(
    `${url}/rest/v1/product_images?id=eq.${encodeURIComponent(imageId)}&product_id=eq.${encodeURIComponent(productId)}&select=*`,
    {
      headers: supabaseHeaders(),
      cache: 'no-store',
    },
  );

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const rows = (await response.json()) as ImageRow[];
  return rows[0] || null;
}

async function deleteStorageObject(storagePath: string) {
  if (!storagePath) return;

  const { url } = getSupabaseConfig();

  const response = await fetch(
    `${url}/storage/v1/object/product-images/${encodeStoragePath(storagePath)}`,
    {
      method: 'DELETE',
      headers: supabaseHeaders(),
      cache: 'no-store',
    },
  );

  if (!response.ok && response.status !== 404) {
    throw new Error(
      `Storage-Datei konnte nicht gelöscht werden: ${await response.text()}`,
    );
  }
}

async function normalizeSortOrder(productId: string) {
  const { url } = getSupabaseConfig();

  const response = await fetch(
    `${url}/rest/v1/product_images?product_id=eq.${encodeURIComponent(productId)}&select=id,sort_order&order=sort_order.asc`,
    {
      headers: supabaseHeaders(),
      cache: 'no-store',
    },
  );

  if (!response.ok) return;

  const rows = (await response.json()) as Array<{
    id: string;
    sort_order: number;
  }>;

  for (let index = 0; index < rows.length; index += 1) {
    if (rows[index].sort_order === index) continue;

    await fetch(
      `${url}/rest/v1/product_images?id=eq.${encodeURIComponent(rows[index].id)}`,
      {
        method: 'PATCH',
        headers: supabaseHeaders({
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        }),
        body: JSON.stringify({ sort_order: index }),
        cache: 'no-store',
      },
    );
  }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    const { id, imageId } = await params;

    const body = (await request.json()) as {
      action?: 'primary' | 'replace' | 'content';
      storage_path?: string;
      public_url?: string;
      file_name?: string;
      mime_type?: string;
      size_bytes?: number;
      content_suitable?: boolean;
    };

    const currentImage = await getImage(id, imageId);

    if (!currentImage) {
      return NextResponse.json(
        { error: 'Produktfoto wurde nicht gefunden.' },
        { status: 404 },
      );
    }

    const { url } = getSupabaseConfig();

    if (body.action === 'primary') {
      const imagesResponse = await fetch(
        `${url}/rest/v1/product_images?product_id=eq.${encodeURIComponent(id)}&select=id,sort_order&order=sort_order.asc`,
        {
          headers: supabaseHeaders(),
          cache: 'no-store',
        },
      );

      if (!imagesResponse.ok) {
        return new NextResponse(await imagesResponse.text(), {
          status: imagesResponse.status,
        });
      }

      const images = (await imagesResponse.json()) as Array<{
        id: string;
        sort_order: number;
      }>;

      const selected = images.find(image => image.id === imageId);

      if (!selected) {
        return NextResponse.json(
          { error: 'Produktfoto wurde nicht gefunden.' },
          { status: 404 },
        );
      }

      const reordered = [
        selected,
        ...images.filter(image => image.id !== imageId),
      ];

      for (let index = 0; index < reordered.length; index += 1) {
        const response = await fetch(
          `${url}/rest/v1/product_images?id=eq.${encodeURIComponent(reordered[index].id)}`,
          {
            method: 'PATCH',
            headers: supabaseHeaders({
              'Content-Type': 'application/json',
              Prefer: 'return=minimal',
            }),
            body: JSON.stringify({ sort_order: index }),
            cache: 'no-store',
          },
        );

        if (!response.ok) {
          return new NextResponse(await response.text(), {
            status: response.status,
          });
        }
      }

      return NextResponse.json({ ok: true });
    }

    if (body.action === 'content') {
      const nextValue =
        typeof body.content_suitable === 'boolean'
          ? body.content_suitable
          : !Boolean(currentImage.content_suitable);

      const response = await fetch(
        `${url}/rest/v1/product_images?id=eq.${encodeURIComponent(imageId)}&product_id=eq.${encodeURIComponent(id)}`,
        {
          method: 'PATCH',
          headers: supabaseHeaders({
            'Content-Type': 'application/json',
            Prefer: 'return=representation',
          }),
          body: JSON.stringify({
            content_suitable: nextValue,
          }),
          cache: 'no-store',
        },
      );

      const text = await response.text();

      if (!response.ok) {
        return new NextResponse(text, {
          status: response.status,
        });
      }

      const rows = text ? (JSON.parse(text) as ImageRow[]) : [];

      return NextResponse.json({
        ok: true,
        image: rows[0] || {
          ...currentImage,
          content_suitable: nextValue,
        },
      });
    }

    if (body.action === 'replace') {
      if (!body.storage_path || !body.public_url) {
        return NextResponse.json(
          { error: 'Ersatzfoto ist unvollständig.' },
          { status: 400 },
        );
      }

      const response = await fetch(
        `${url}/rest/v1/product_images?id=eq.${encodeURIComponent(imageId)}&product_id=eq.${encodeURIComponent(id)}`,
        {
          method: 'PATCH',
          headers: supabaseHeaders({
            'Content-Type': 'application/json',
            Prefer: 'return=representation',
          }),
          body: JSON.stringify({
            storage_path: body.storage_path,
            public_url: body.public_url,
            file_name: body.file_name ?? null,
            mime_type: body.mime_type ?? null,
            size_bytes: body.size_bytes ?? null,
          }),
          cache: 'no-store',
        },
      );

      const text = await response.text();

      if (!response.ok) {
        return new NextResponse(text, {
          status: response.status,
        });
      }

      if (currentImage.storage_path !== body.storage_path) {
        await deleteStorageObject(currentImage.storage_path);
      }

      return NextResponse.json({
        ok: true,
        image: JSON.parse(text)[0],
      });
    }

    return NextResponse.json(
      { error: 'Unbekannte Foto-Aktion.' },
      { status: 400 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Produktfoto konnte nicht aktualisiert werden.',
      },
      { status: 500 },
    );
  }
}

export async function DELETE(_: Request, { params }: Context) {
  try {
    const { id, imageId } = await params;

    const currentImage = await getImage(id, imageId);

    if (!currentImage) {
      return NextResponse.json(
        { error: 'Produktfoto wurde nicht gefunden.' },
        { status: 404 },
      );
    }

    const { url } = getSupabaseConfig();

    const response = await fetch(
      `${url}/rest/v1/product_images?id=eq.${encodeURIComponent(imageId)}&product_id=eq.${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
        headers: supabaseHeaders({
          Prefer: 'return=minimal',
        }),
        cache: 'no-store',
      },
    );

    if (!response.ok) {
      return new NextResponse(await response.text(), {
        status: response.status,
      });
    }

    await deleteStorageObject(currentImage.storage_path);
    await normalizeSortOrder(id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Produktfoto konnte nicht gelöscht werden.',
      },
      { status: 500 },
    );
  }
}
