import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL!         // p.ej. http://localhost:3001
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const isUUID = (v: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
const isIntegerId = (v: string) => /^\d+$/.test(v)

async function resolveUuidOrFallback(id_usuario: string, authHeader: string) {
  // si ya es uuid, devolver
  if (isUUID(id_usuario)) return { uuidOrId: id_usuario, usedFallback: false }

  // si es entero, intentamos pedir el User_id a Supabase
  if (isIntegerId(id_usuario)) {
    try {
      const token = (authHeader || '').startsWith('Bearer ')
        ? authHeader.replace(/^Bearer\s+/i, '')
        : ''

      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/Usuario?select=User_id&id=eq.${encodeURIComponent(id_usuario)}&limit=1`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: token ? `Bearer ${token}` : `Bearer ${SUPABASE_ANON_KEY}`,
          },
          cache: 'no-store',
        }
      )

      if (!r.ok) {
        // no rompemos: caemos a fallback (reenviar el id numérico al backend)
        const txt = await r.text().catch(() => '')
        return { uuidOrId: id_usuario, usedFallback: true, reason: `supabase ${r.status}: ${txt}` }
      }

      const data = (await r.json()) as Array<{ User_id: string | null }>
      const uuid = data?.[0]?.User_id
      if (uuid && isUUID(uuid)) return { uuidOrId: uuid, usedFallback: false }

      // si no hay uuid válido, fallback
      return { uuidOrId: id_usuario, usedFallback: true, reason: 'no uuid in row' }
    } catch (e: any) {
      // error de red u otro → fallback
      return { uuidOrId: id_usuario, usedFallback: true, reason: e?.message || 'resolve error' }
    }
  }

  // formato inválido: devolvemos error claro
  throw new Error('id_usuario inválido (debe ser UUID o entero)')
}

export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization') || ''
    const sp = new URL(req.url).searchParams

    const idRaw = sp.get('id_usuario')
    const busqueda = sp.get('busqueda') ?? sp.get('q') ?? ''
    if (!idRaw) {
      return NextResponse.json({ error: 'id_usuario es requerido' }, { status: 400 })
    }

    // Anti-loop: evitar que BACKEND_URL sea el mismo host/puerto que el frontend
    const reqOrigin = new URL(req.url).origin
    const backendOrigin = new URL(BACKEND_URL).origin
    if (reqOrigin === backendOrigin) {
      return NextResponse.json(
        { error: 'BACKEND_URL no puede apuntar al mismo host/puerto que el frontend.' },
        { status: 500 }
      )
    }

    const resolved = await resolveUuidOrFallback(idRaw, auth)

    // armamos URL al backend (si hizo fallback, va el id numérico; si no, va el uuid)
    const upstreamUrl =
      `${BACKEND_URL}/api/contactos/misContactos?id_usuario=${encodeURIComponent(resolved.uuidOrId)}` +
      (busqueda ? `&busqueda=${encodeURIComponent(busqueda.trim())}` : '')

    const r = await fetch(upstreamUrl, {
      headers: {
        'Content-Type': 'application/json',
        ...(auth ? { authorization: auth } : {}),
      },
      cache: 'no-store',
    })

    const bodyText = await r.text().catch(() => '')
    if (!r.ok) {
      return NextResponse.json(
        {
          error: 'Upstream error',
          status: r.status,
          backend_url: upstreamUrl,
          note: resolved.usedFallback ? `fallback id → ${resolved.reason}` : 'uuid ok',
          backend_body: bodyText?.slice(0, 1200) ?? '',
        },
        { status: r.status }
      )
    }

    // content-type del backend o json por defecto
    return new NextResponse(bodyText, {
      status: 200,
      headers: { 'Content-Type': r.headers.get('content-type') ?? 'application/json' },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Proxy error' }, { status: 500 })
  }
}
