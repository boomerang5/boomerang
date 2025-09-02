import { NextRequest, NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.API_BASE ||
  'http://localhost:3001'; // ⬅️ ajustá a tu backend

// ===== Supabase (server) para enriquecer con UUID =====
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY; // ⬅️ clave segura, solo en server
let adminSb: SupabaseClient | null = null;

if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
  adminSb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Helper: dada una lista de IDs numéricos, devuelve un Map id->uuid (User_id)
async function fetchUuidMap(idsNum: number[]): Promise<Map<number, string>> {
  const map = new Map<number, string>();
  if (!adminSb || idsNum.length === 0) return map;

  try {
    // SELECT id, User_id FROM "Usuario" WHERE id IN (...)
    const { data, error } = await adminSb
      .from('Usuario')
      .select('id, User_id')
      .in('id', idsNum);

    if (!error && Array.isArray(data)) {
      for (const row of data) {
        if (row?.id != null && row?.User_id) {
          map.set(Number(row.id), String(row.User_id));
        }
      }
    }
  } catch {
    // silencioso: si falla, seguimos sin UUIDs
  }
  return map;
}

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

    // Parse del upstream y detección de shape
    const json = text ? JSON.parse(text) : null;
    const arr: any[] = Array.isArray(json) ? json : (json?.items ?? json?.data ?? []);

    // Si no hay adminSb, devolvemos tal cual
    if (!adminSb || !Array.isArray(arr) || arr.length === 0) {
      return new NextResponse(text, { status: 200, headers: { 'content-type': 'application/json' } });
    }

    // Extraer los IDs numéricos de cada contacto (id | id_usuario | user_id)
    const idsNum = Array.from(
      new Set(
        arr
          .map((c) => Number(c?.id ?? c?.id_usuario ?? c?.user_id))
          .filter((n) => Number.isFinite(n))
      )
    );

    // Traer mapa id->uuid
    const idToUuid = await fetchUuidMap(idsNum);

    // Enriquecer contactos con user_uuid si falta
    const enriched = arr.map((c) => {
      const baseId = Number(c?.id ?? c?.id_usuario ?? c?.user_id);
      const alreadyUuid =
        c?.User_id || c?.user_uuid || c?.uuid;

      if (alreadyUuid) return c;

      const uuid = idToUuid.get(baseId);
      return uuid ? { ...c, user_uuid: uuid } : c;
    });

    // Mantener la misma forma de respuesta del upstream
    let payload: any;
    if (Array.isArray(json)) {
      payload = enriched;
    } else if (json && typeof json === 'object') {
      if (Array.isArray(json.items)) payload = { ...json, items: enriched };
      else if (Array.isArray(json.data)) payload = { ...json, data: enriched };
      else payload = enriched; // fallback
    } else {
      payload = enriched;
    }

    return NextResponse.json(payload, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Proxy error' }, { status: 500 });
  }
}
