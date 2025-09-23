import { NextRequest, NextResponse } from 'next/server';

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.API_BASE ||
  'http://localhost:3001';

// Mapeo de hexadecimales a nombres de colores
const COLOR_HEX_TO_NAME: Record<string, string> = {
  '#3B82F6': 'blue',
  '#10B981': 'green',
  '#EF4444': 'red', 
  '#F97316': 'orange',
  '#8B5CF6': 'purple',
  '#EC4899': 'pink',
  '#EAB308': 'yellow',
  '#6B7280': 'gray',
};

// Función para convertir hex a nombre de color
function convertColorHexToName(colorHex?: string): string | null {
  if (!colorHex) return null;
  return COLOR_HEX_TO_NAME[colorHex.toUpperCase()] || colorHex;
}

// GET: Obtener detalles de un evento específico
export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization') || undefined;
    const sp = new URL(req.url).searchParams;
    const id_evento = sp.get('id_evento') ?? '';
    const id_usuario = sp.get('id_usuario') ?? '';

    if (!id_evento || !id_usuario) {
      return NextResponse.json(
        { error: 'id_evento e id_usuario son requeridos' },
        { status: 400 }
      );
    }

    const upstreamUrl = `${API_BASE}/api/calendar/details?id_evento=${encodeURIComponent(
      id_evento
    )}&id_usuario=${encodeURIComponent(id_usuario)}`;

    const r = await fetch(upstreamUrl, {
      headers: {
        'content-type': 'application/json',
        ...(auth ? { authorization: auth } : {}),
      },
      cache: 'no-store',
    });

    if (!r.ok) {
      const text = await r.text();
      return new NextResponse(text, { status: r.status });
    }

    // Convertir color hex a nombre para el frontend
    const data = await r.json();
    if (data?.color) {
      data.color = convertColorHexToName(data.color) || data.color;
    }

    return NextResponse.json(data, {
      status: 200,
      headers: {
        'content-type': 'application/json',
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Proxy error' }, { status: 500 });
  }
}