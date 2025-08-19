import { NextRequest, NextResponse } from 'next/server';

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.API_BASE ||
  'http://localhost:3001'; // ⬅️ ajustá a tu backend

export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization') || '';
    const sp = new URL(req.url).searchParams;
    const id_usuario = sp.get('id_usuario');
    const busqueda = sp.get('busqueda') ?? '';

    if (!id_usuario) {
      return NextResponse.json({ error: 'id_usuario es requerido' }, { status: 400 });
    }

    const upstreamUrl =
      `${API_BASE}/api/contacts/misContactos?id_usuario=${encodeURIComponent(id_usuario)}` +
      (busqueda ? `&busqueda=${encodeURIComponent(busqueda)}` : '');

    const r = await fetch(upstreamUrl, {
      headers: {
        'content-type': 'application/json',
        ...(auth ? { authorization: auth } : {}),
      },
      cache: 'no-store',
    });

    const text = await r.text();
    if (!r.ok) return new NextResponse(text || 'Upstream error', { status: r.status });

    return new NextResponse(text, { status: 200, headers: { 'content-type': 'application/json' } });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Proxy error' }, { status: 500 });
  }
}
