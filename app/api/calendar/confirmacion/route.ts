import { NextRequest, NextResponse } from 'next/server';

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.API_BASE ||
  'http://localhost:3001';

// GET - Obtener confirmación del usuario para un evento específico
export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization') || undefined;
    const { searchParams } = new URL(req.url);
    const eventoId = searchParams.get('evento_id');
    const usuarioId = searchParams.get('usuario_id');

    if (!eventoId || !usuarioId) {
      return NextResponse.json(
        { error: 'evento_id y usuario_id son requeridos' },
        { status: 400 }
      );
    }

    const upstreamUrl = `${API_BASE}/api/calendar/confirmacion?evento_id=${eventoId}&usuario_id=${usuarioId}`;

    const response = await fetch(upstreamUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(auth ? { authorization: auth } : {}),
      },
      cache: 'no-store',
    });

    const data = await response.text();
    if (!response.ok) {
      return new NextResponse(data, { status: response.status });
    }

    return new NextResponse(data, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error en GET confirmación:', error);
    return NextResponse.json(
      { error: error?.message || 'Error del proxy' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar confirmación del usuario para un evento
export async function PUT(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization') || undefined;
    const body = await req.json();

    const { evento_id, usuario_id, confirmacion } = body;

    if (!evento_id || !usuario_id || !confirmacion) {
      return NextResponse.json(
        { error: 'evento_id, usuario_id y confirmacion son requeridos' },
        { status: 400 }
      );
    }

    if (!['pendiente', 'confirmado', 'rechazado'].includes(confirmacion)) {
      return NextResponse.json(
        { error: 'confirmacion debe ser: pendiente, confirmado o rechazado' },
        { status: 400 }
      );
    }

    const upstreamUrl = `${API_BASE}/api/calendar/confirmacion`;

    const response = await fetch(upstreamUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(auth ? { authorization: auth } : {}),
      },
      body: JSON.stringify({
        evento_id,
        usuario_id,
        confirmacion
      }),
    });

    const data = await response.text();
    if (!response.ok) {
      return new NextResponse(data, { status: response.status });
    }

    return new NextResponse(data, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error en PUT confirmación:', error);
    return NextResponse.json(
      { error: error?.message || 'Error del proxy' },
      { status: 500 }
    );
  }
}