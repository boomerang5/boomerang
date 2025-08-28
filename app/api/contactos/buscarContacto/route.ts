import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL!; // de .env.local

export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization') || '';
    const sp = new URL(req.url).searchParams;
    const id_usuario = sp.get('id_usuario');
    const q = sp.get('q') ?? '';

    if (!id_usuario || !q) {
      return NextResponse.json(
        { error: 'id_usuario y q son requeridos' },
        { status: 400 }
      );
    }

    const upstreamUrl = `${BACKEND_URL}/api/contactos/search?id_usuario=${encodeURIComponent(
      id_usuario
    )}&q=${encodeURIComponent(q)}`;

    const r = await fetch(upstreamUrl, {
      headers: {
        'Content-Type': 'application/json',
        ...(auth ? { authorization: auth } : {}),
      },
      cache: 'no-store',
    });

    const text = await r.text();
    if (!r.ok) {
      return new NextResponse(text || 'Upstream error', { status: r.status });
    }

    return new NextResponse(text, {
      status: 200,
      headers: {
        'Content-Type': r.headers.get('content-type') ?? 'application/json',
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Proxy error' },
      { status: 500 }
    );
  }
} 