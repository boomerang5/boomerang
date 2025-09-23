import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { response } = await req.json();
    
    const auth = req.headers.get('authorization') || undefined;

    const backendResponse = await fetch(`${BACKEND_URL}/api/notifications/${id}/mark-responded`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(auth ? { authorization: auth } : {}),
      },
      body: JSON.stringify({ response }),
    });

    const data = await backendResponse.json();

    if (!backendResponse.ok) {
      return NextResponse.json(
        { error: data.message || 'Error al marcar notificación como respondida' },
        { status: backendResponse.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error al marcar notificación como respondida:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}