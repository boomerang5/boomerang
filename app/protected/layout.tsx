'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { useUser } from '@supabase/auth-helpers-react'

type IncomingCall = { callId: string; fromId: string; fromName?: string }

async function ensureSubscribed(ch: ReturnType<SupabaseClient['channel']>): Promise<void> {
  return new Promise((resolve) => {
    let done = false
    ch.subscribe((status) => {
      if (!done && status === 'SUBSCRIBED') {
        done = true
        resolve()
      }
    })
  })
}

async function fetchMyNumericId(sb: SupabaseClient, myUuid: string): Promise<number | null> {
  try {
    const { data, error } = await sb.from('Usuario').select('id').eq('User_id', myUuid).maybeSingle()
    if (error) return null
    return data?.id ?? null
  } catch { return null }
}

export default function CallNotificationsProvider({
  children,
  callRoute = '/protected/videollamada',
}: { children: React.ReactNode; callRoute?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const user = useUser()
  const [sb, setSb] = useState<SupabaseClient | null>(null)
  const [meUuid, setMeUuid] = useState('')
  const [meNumericId, setMeNumericId] = useState<number | null>(null)
  const inboxesRef = useRef<ReturnType<SupabaseClient['channel']>[]>([])
  const [inboxReady, setInboxReady] = useState(false)

  const [incoming, setIncoming] = useState<IncomingCall | null>(null)
  const currentCallIdRef = useRef<string | null>(null)
  const peerIdRef = useRef<string | null>(null)
  const seenRingsRef = useRef<Set<string>>(new Set()) // 👈 evita dups y "parpadeos"
  const navigatingRef = useRef(false) // 👈 evita push doble por clicks rápidos

  // Detectar si estamos en la página de videollamada para evitar duplicar toasts
  const isOnVideoCallPage = pathname === callRoute

  // 1) Supabase client
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) return
    const client = createClient(url, key, { realtime: { params: { eventsPerSecond: 10 } } })
    setSb(client)
  }, [])

  // 2) Identidad (requiere sesión lista)
  useEffect(() => {
    if (!sb || !user) return
    ;(async () => {
      let uuid: string | null = null
      if (user?.id) uuid = user.id
      if (!uuid) {
        try {
          const { data: uuidData } = await sb.rpc('get_usuario_uuid')
          uuid =
            (typeof uuidData === 'string' && uuidData) ||
            (uuidData && (uuidData as any).uuid) ||
            (uuidData && (uuidData as any).user_uuid) ||
            null
        } catch {}
      }
      if (!uuid) {
        const ss = sessionStorage.getItem('vc_uuid')
        uuid = ss || (crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2))
        sessionStorage.setItem('vc_uuid', uuid)
      }
      setMeUuid(uuid)

      let idNum: number | null = null
      const ls = localStorage.getItem('usuario_id')
      if (ls && /^\d+$/.test(ls)) idNum = Number(ls)
      if (!idNum) {
        idNum = await fetchMyNumericId(sb, uuid)
        if (idNum) localStorage.setItem('usuario_id', String(idNum))
      }
      setMeNumericId(idNum ?? null)
    })()
  }, [sb, user])

  // 3) Suscripción a user:<uuid> y user:<id>
  useEffect(() => {
    if (!sb) return
    if (!meUuid && meNumericId == null) return
    ;(async () => {
      setInboxReady(false)
      const prev = inboxesRef.current
      inboxesRef.current = []
      for (const ch of prev) { try { await ch.unsubscribe() } catch {} }

      const setup = async (key: string) => {
        const ch = sb.channel(`user:${key}`, { config: { broadcast: { self: false } } })

        ch.on('broadcast', { event: 'ring' }, ({ payload }) => {
          const callId = String(payload.callId || '')
          if (!callId) return

          // 🔒 de-dupe entre uuid/id
          if (seenRingsRef.current.has(callId)) return
          seenRingsRef.current.add(callId)

          currentCallIdRef.current = callId
          const fromId = String(payload.from?.id ?? '')
          const fromName = String(payload.from?.name ?? 'Invitado')
          peerIdRef.current = fromId
          setIncoming({ callId, fromId, fromName })
          try { navigator.vibrate?.(200) } catch {}
        })

        // Si el caller cancela o rechaza desde su lado, cerramos el toast
        ch.on('broadcast', { event: 'cancel' }, ({ payload }) => {
          if (payload.callId !== currentCallIdRef.current) return
          setIncoming(null); currentCallIdRef.current = null; peerIdRef.current = null
        })
        ch.on('broadcast', { event: 'reject' }, ({ payload }) => {
          if (payload.callId !== currentCallIdRef.current) return
          setIncoming(null); currentCallIdRef.current = null; peerIdRef.current = null
        })

        await ensureSubscribed(ch)
        inboxesRef.current.push(ch)
      }

      if (meUuid) await setup(meUuid)
      const vc = sessionStorage.getItem('vc_uuid')
      if (vc && vc !== meUuid) await setup(vc)
      if (meNumericId != null) await setup(String(meNumericId))
      setInboxReady(true)
    })()
  }, [sb, meUuid, meNumericId])

  // 4) Acciones del toast
  const onAccept = () => {
    if (navigatingRef.current) return
    const callId = currentCallIdRef.current
    const from = peerIdRef.current
    if (!callId || !from) return
    // Gate para auto-acept en la página (solo si se aprieta Aceptar)
    sessionStorage.setItem(`aa:${callId}`, '1')
    navigatingRef.current = true
    const url = new URL(window.location.origin + callRoute)
    url.searchParams.set('incoming', callId)
    url.searchParams.set('from', from)
    url.searchParams.set('autoaccept', '1')
    url.searchParams.set('aa', callId)
    setIncoming(null)
    // ✅ solo navegamos acá (NO en ring, NO en reject)
    router.push(url.toString())
  }

  const onReject = async () => {
    if (!sb) return
    const callId = currentCallIdRef.current
    const from = peerIdRef.current
    if (!callId || !from) return
    // Limpia cualquier gate por si quedó seteado
    sessionStorage.removeItem(`aa:${callId}`)
    const ch = sb.channel(`user:${from}`)
    await ensureSubscribed(ch)
    await ch.send({ type: 'broadcast', event: 'reject', payload: { callId, from: meUuid } })
    await ch.unsubscribe()
    setIncoming(null); currentCallIdRef.current = null; peerIdRef.current = null
    navigatingRef.current = false // 👈 aseguramos que NO navegue
  }

  return (
    <>
      {children}
      {incoming && inboxReady && !isOnVideoCallPage && (
        <Toast fromName={incoming.fromName || 'Invitado'} onAccept={onAccept} onReject={onReject} />
      )}
    </>
  )
}

function Toast({ fromName, onAccept, onReject }: { fromName: string; onAccept: () => void; onReject: () => void }) {
  return (
    <div className="fixed right-4 bottom-6 z-[100] max-w-md w-[92vw] sm:w-auto">
      <div className="rounded-2xl border border-white/25 bg-white/70 dark:bg-neutral-900/80 backdrop-blur-xl shadow-2xl px-4 py-3 sm:px-5 sm:py-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 h-9 w-9 shrink-0 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 text-white grid place-items-center shadow">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.86 19.86 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.86 19.86 0 012.08 4.18 2 2 0 014.06 2h3a2 2 0 012 1.72c.12.9.37 1.77.73 2.58a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.5-1.25a2 2 0 012.11-.45c.81.36 1.68.61 2.58.73A2 2 0 0122 16.92z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <div className="min-w-0">
            <div className="text-sm text-black/60 dark:text-white/70">Llamada entrante</div>
            <div className="font-semibold truncate">{fromName}</div>
            <div className="mt-3 flex items-center gap-2">
              <button onClick={onAccept} className="inline-flex items-center gap-2 rounded-full bg-green-500 px-3 py-1.5 text-white text-sm shadow hover:bg-green-600">
                Aceptar
              </button>
              <button onClick={onReject} className="inline-flex items-center gap-2 rounded-full bg-rose-500 px-3 py-1.5 text-white text-sm shadow hover:bg-rose-600">
                Rechazar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
