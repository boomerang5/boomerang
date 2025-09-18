'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Toast minimal (reutiliza tu estilo)
function IncomingCallToast({
  fromName,
  onAccept,
  onReject,
}: {
  fromName: string
  onAccept: () => void
  onReject: () => void
}) {
  return (
    <div className="fixed right-4 bottom-24 z-[60] max-w-md w-[92vw] sm:w-auto">
      <div className="rounded-2xl border border-white/25 bg-white/70 dark:bg-neutral-900/80 backdrop-blur-xl shadow-2xl px-4 py-3 sm:px-5 sm:py-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 h-9 w-9 shrink-0 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 text-white grid place-items-center shadow">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.86 19.86 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.86 19.86 0 012.08 4.18 2 2 0 014.06 2h3a2 2 0 012 1.72c.12.9.37 1.77.73 2.58a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.5-1.25a2 2 0 012.11-.45c.81.36 1.68.61 2.58.73A2 2 0 0122 16.92z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="min-w-0">
            <div className="text-sm text-black/60 dark:text-white/70">Llamada entrante</div>
            <div className="font-semibold truncate">{fromName}</div>
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={onAccept}
                className="inline-flex items-center gap-2 rounded-full bg-green-500 px-3 py-1.5 text-white text-sm shadow hover:bg-green-600"
              >
                Aceptar
              </button>
              <button
                onClick={onReject}
                className="inline-flex items-center gap-2 rounded-full bg-rose-500 px-3 py-1.5 text-white text-sm shadow hover:bg-rose-600"
              >
                Rechazar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

type Incoming = { callId: string; fromId: string; fromName?: string }

// 👉 Ajustá esta ruta si tu página de llamada vive en otra
const CALL_PATH = '/videollamada'

export default function CallInboxProvider() {
  const router = useRouter()
  const pathname = usePathname()

  const [sb, setSb] = useState<SupabaseClient | null>(null)
  const [meUuid, setMeUuid] = useState<string>('')
  const [incoming, setIncoming] = useState<Incoming | null>(null)

  const inboxChannelsRef = useRef<ReturnType<SupabaseClient['channel']>[]>([])
  const meNumericIdRef = useRef<number | null>(null)

  // --- init supabase
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) return
    const client = createClient(url, key, { realtime: { params: { eventsPerSecond: 10 } } })
    setSb(client)
  }, [])

  // --- identidad mínima (uuid)
  useEffect(() => {
    if (!sb) return
    let cancelled = false
    ;(async () => {
      // 1) auth
      const { data } = await sb.auth.getUser().catch(() => ({ data: null as any }))
      const authId: string | null = data?.user?.id ?? null
      let uuid = authId

      // 2) fallback per-tab
      if (!uuid) {
        uuid = sessionStorage.getItem('vc_uuid') || crypto.randomUUID()
        sessionStorage.setItem('vc_uuid', uuid)
      }

      if (!cancelled) setMeUuid(uuid!)

      // 3) opcional: id numérico (si tenés la tabla Usuario)
      try {
        const { data: row } = await sb
          .from('Usuario')
          .select('id')
          .eq('User_id', uuid)
          .maybeSingle()
        meNumericIdRef.current = row?.id ?? null
      } catch {}
    })()
    return () => { cancelled = true }
  }, [sb])

  // --- suscribir inbox global user:<uuid> (+ opcional user:<id>) y escuchar RING
  useEffect(() => {
    if (!sb || !meUuid) return

    // limpiar suscripciones anteriores
    ;(async () => {
      for (const ch of inboxChannelsRef.current) {
        try { await ch.unsubscribe() } catch {}
      }
      inboxChannelsRef.current = []
    })()

    const setup = async (key: string) => {
      const ch = sb.channel(`user:${key}`, { config: { broadcast: { self: false } } })

      ch.on('broadcast', { event: 'ring' }, ({ payload }) => {
        const fromId = String(payload.from?.id ?? '')
        const fromName = String(payload.from?.name ?? 'Invitado')
        const callId = String(payload.callId ?? '')
        if (!callId || !fromId) return
        setIncoming({ callId, fromId, fromName })
        try { navigator.vibrate?.(200) } catch {}
      })

      await new Promise<void>(res => ch.subscribe(s => s === 'SUBSCRIBED' && res()))
      inboxChannelsRef.current.push(ch)
    }

    setup(meUuid)
    if (meNumericIdRef.current != null) setup(String(meNumericIdRef.current))

    return () => {
      // no desuscribo al desmontar app; React ya gestionará en navegación/refresh
    }
  }, [sb, meUuid])

  // --- acciones del toast
  const accept = async () => {
    const inc = incoming
    if (!inc) return

    // gate para que la página de llamada auto-acepte
    sessionStorage.setItem(`aa:${inc.callId}`, '1')

    const url = new URL(window.location.origin + CALL_PATH)
    url.searchParams.set('incoming', inc.callId)
    url.searchParams.set('from', inc.fromId)
    url.searchParams.set('autoaccept', '1')
    url.searchParams.set('aa', inc.callId)

    setIncoming(null)
    if (pathname === CALL_PATH) {
      // si ya estoy en la página, navego manteniendo la misma ruta
      router.push(url.pathname + url.search)
    } else {
      router.push(url.pathname + url.search)
    }
  }

  const reject = async () => {
    const inc = incoming
    if (!inc || !sb) { setIncoming(null); return }
    // avisar rechazo al caller por user:<id|uuid>
    const keys = [inc.fromId]
    for (const key of keys) {
      const ch = sb.channel(`user:${key}`)
      await new Promise<void>(res => ch.subscribe(s => s === 'SUBSCRIBED' && res()))
      await ch.send({ type: 'broadcast', event: 'reject', payload: { callId: inc.callId, from: meUuid } })
      await ch.unsubscribe()
    }
    setIncoming(null)
  }

  return incoming ? (
    <IncomingCallToast fromName={incoming.fromName || 'Invitado'} onAccept={accept} onReject={reject} />
  ) : null
}
