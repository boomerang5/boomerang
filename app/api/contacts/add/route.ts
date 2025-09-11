import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL!; // viene de .env.local

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization') || '';
    const body = await req.json().catch(() => ({}));
    const { id_usuario, id_usuario_contacto } = body || {};

    if (!id_usuario || !id_usuario_contacto) {
      return NextResponse.json({ message: 'Faltan parámetros' }, { status: 400 });
    }

    const r = await fetch(`${BACKEND_URL}/api/contacts/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(auth ? { authorization: auth } : {}),
      },
      body: JSON.stringify({ id_usuario, id_usuario_contacto }),
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
      { message: e?.message || 'Proxy error' },
      { status: 500 }
    );
  }
}
