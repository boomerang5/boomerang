import { NextRequest, NextResponse } from 'next/server';

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.API_BASE ||
  'http://localhost:3003';

// GET: Obtener eventos/reuniones
export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization') || undefined;
    const sp = new URL(req.url).searchParams;
    const id_usuario = sp.get('id_usuario') ?? '';
    const fecha_inicio = sp.get('fecha_inicio') ?? '';
    const fecha_fin = sp.get('fecha_fin') ?? '';

    if (!id_usuario) {
      return NextResponse.json({ error: 'id_usuario es requerido' }, { status: 400 });
    }

    const upstreamUrl =
      `${API_BASE}/api/calendar/eventos?id_usuario=${encodeURIComponent(id_usuario)}` +
      (fecha_inicio ? `&fecha_inicio=${encodeURIComponent(fecha_inicio)}` : '') +
      (fecha_fin ? `&fecha_fin=${encodeURIComponent(fecha_fin)}` : '');

    const r = await fetch(upstreamUrl, {
      headers: {
        'content-type': 'application/json',
        ...(auth ? { authorization: auth } : {}),
      },
      cache: 'no-store',
    });

    const text = await r.text();
    if (!r.ok) return new NextResponse(text, { status: r.status });

    return new NextResponse(text, { 
      status: 200, 
      headers: { 
        'content-type': r.headers.get('content-type') ?? 'application/json',
      }, 
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Proxy error' }, { status: 500 });
  }
}

// POST: Crear nuevo evento/reunión
export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization') || undefined;
    const body = await req.text();

    const upstreamUrl = `${API_BASE}/api/calendar/eventos`;

    const r = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(auth ? { authorization: auth } : {}),
      },
      body,
    });

    const text = await r.text();
    if (!r.ok) return new NextResponse(text, { status: r.status });

    return new NextResponse(text, { 
      status: 200, 
      headers: { 
        'content-type': r.headers.get('content-type') ?? 'application/json',
      }, 
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Proxy error' }, { status: 500 });
  }
}

// PUT: Actualizar evento/reunión
export async function PUT(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization') || undefined;
    const body = await req.text();

    const upstreamUrl = `${API_BASE}/api/calendar/eventos`;

    const r = await fetch(upstreamUrl, {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
        ...(auth ? { authorization: auth } : {}),
      },
      body,
    });

    const text = await r.text();
    if (!r.ok) return new NextResponse(text, { status: r.status });

    return new NextResponse(text, { 
      status: 200, 
      headers: { 
        'content-type': r.headers.get('content-type') ?? 'application/json',
      }, 
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Proxy error' }, { status: 500 });
  }
}

// DELETE: Eliminar evento/reunión
export async function DELETE(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization') || undefined;
    const sp = new URL(req.url).searchParams;
    const id_evento = sp.get('id_evento') ?? '';

    if (!id_evento) {
      return NextResponse.json({ error: 'id_evento es requerido' }, { status: 400 });
    }

    const upstreamUrl = `${API_BASE}/api/calendar/eventos?id_evento=${encodeURIComponent(id_evento)}`;

    const r = await fetch(upstreamUrl, {
      method: 'DELETE',
      headers: {
        'content-type': 'application/json',
        ...(auth ? { authorization: auth } : {}),
      },
    });

    const text = await r.text();
    if (!r.ok) return new NextResponse(text, { status: r.status });

    return new NextResponse(text, { 
      status: 200, 
      headers: { 
        'content-type': r.headers.get('content-type') ?? 'application/json',
      }, 
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Proxy error' }, { status: 500 });
  }
}
