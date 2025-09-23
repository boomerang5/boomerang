import { NextRequest, NextResponse } from 'next/server';

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.API_BASE ||
  'http://localhost:3001';

// Mapeo de nombres de colores a valores hexadecimales
const COLOR_NAME_TO_HEX: Record<string, string> = {
  blue: '#3B82F6',
  green: '#10B981', 
  red: '#EF4444',
  orange: '#F97316',
  purple: '#8B5CF6',
  pink: '#EC4899',
  yellow: '#EAB308',
  gray: '#6B7280',
};

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

// Función para convertir nombre de color a hex
function convertColorNameToHex(colorName?: string): string | null {
  if (!colorName) return null;
  return COLOR_NAME_TO_HEX[colorName.toLowerCase()] || colorName;
}

// Función para convertir hex a nombre de color
function convertColorHexToName(colorHex?: string): string | null {
  if (!colorHex) return null;
  return COLOR_HEX_TO_NAME[colorHex.toUpperCase()] || colorHex;
}

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
      `${API_BASE}/api/calendar/user-events?id_usuario=${encodeURIComponent(id_usuario)}` +
      (fecha_inicio ? `&fecha_desde=${encodeURIComponent(fecha_inicio)}` : '') +
      (fecha_fin ? `&fecha_hasta=${encodeURIComponent(fecha_fin)}` : '');

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

    // Convertir colores hex a nombres para el frontend
    const data = await r.json();
    if (Array.isArray(data)) {
      data.forEach((evento: any) => {
        if (evento.color) {
          evento.color = convertColorHexToName(evento.color) || evento.color;
        }
      });
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

// POST: Crear nuevo evento/reunión
export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization') || undefined;
    const bodyText = await req.text();
    
    // Convertir color de nombre a hex antes de enviar al backend
    let bodyData;
    try {
      bodyData = JSON.parse(bodyText);
      if (bodyData.color) {
        bodyData.color = convertColorNameToHex(bodyData.color);
      }
    } catch {
      // Si no se puede parsear, enviar el body original
      bodyData = bodyText;
    }

    const upstreamUrl = `${API_BASE}/api/calendar/create`;

    const r = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(auth ? { authorization: auth } : {}),
      },
      body: typeof bodyData === 'string' ? bodyData : JSON.stringify(bodyData),
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

// PATCH: Actualizar evento/reunión
export async function PATCH(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization') || undefined;
    const bodyText = await req.text();
    
    // Convertir color de nombre a hex antes de enviar al backend
    let bodyData;
    try {
      bodyData = JSON.parse(bodyText);
      if (bodyData.color) {
        bodyData.color = convertColorNameToHex(bodyData.color);
      }
    } catch {
      // Si no se puede parsear, enviar el body original
      bodyData = bodyText;
    }

    const upstreamUrl = `${API_BASE}/api/calendar/update`;

    const r = await fetch(upstreamUrl, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        ...(auth ? { authorization: auth } : {}),
      },
      body: typeof bodyData === 'string' ? bodyData : JSON.stringify(bodyData),
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
    const body = await req.text();

    const upstreamUrl = `${API_BASE}/api/calendar/delete`;

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
