'use client'

import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { useRouter } from 'next/navigation'
import clsx from 'clsx'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
// @ts-ignore — solo en cliente
import feather from 'feather-icons'

type Panel = 'none' | 'chat' | 'people' | 'settings'
type Role = 'idle' | 'caller' | 'callee'
type SignalPayload =
  | { type: 'offer' | 'answer'; sdp: RTCSessionDescriptionInit; from: string }
  | { type: 'ice'; candidate: RTCIceCandidateInit; from: string }
  | { type: 'hangup'; from: string }

type IncomingCall = { callId: string; fromId: string; fromName?: string }

/* =================== Helpers de datos =================== */

// Busca tu ID numérico en tabla Usuario usando tu UUID de auth
async function fetchMyNumericId(sb: SupabaseClient, myUuid: string): Promise<number | null> {
  try {
    const { data, error } = await sb
      .from('Usuario')
      .select('id')
      .eq('User_id', myUuid)
      .maybeSingle()
    if (error) return null
    return data?.id ?? null
  } catch {
    return null
  }
}

// Espera a que el canal quede SUBSCRIBED (evita perder mensajes)
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

// Devuelve claves de destino para ring/accept/... (id y/o uuid) con fallbacks fuertes
async function resolvePeerKeys(sb: SupabaseClient, peerInput: string, log?: (t: string)=>void): Promise<string[]> {
  const key = peerInput.trim()
  const keys = new Set<string>()
  if (!key) return []
  keys.add(key)

  // Si es ID → intentar RPC y también SELECT directo
  if (/^\d+$/.test(key)) {
    const idNum = Number(key)
    try {
      const { data, error } = await sb.rpc('get_user_by_id_usuario', { p_id_usuario: idNum })
      if (!error && data) {
        const u = (Array.isArray(data) ? data[0] : data) as any
        const uuid =
          (typeof u === 'string' && u) ||
          u?.User_id || u?.user_id || u?.uuid || u?.user_uuid
        if (uuid) { keys.add(String(uuid)); log?.(`~ resolvePeerKeys: RPC id→uuid ${key} → ${uuid}`) }
      } else {
        log?.(`~ resolvePeerKeys: RPC id→uuid sin datos (id=${key})`)
      }
    } catch (e:any) {
      log?.(`~ resolvePeerKeys: RPC id→uuid error: ${e?.message}`)
    }

    // Fallback fuerte: SELECT directo a Usuario
    try {
      const { data, error } = await sb
        .from('Usuario')
        .select('User_id')
        .eq('id', idNum)
        .maybeSingle()
      if (!error && data?.User_id) {
        keys.add(String(data.User_id))
        log?.(`~ resolvePeerKeys: SELECT id→uuid ${key} → ${data.User_id}`)
      }
    } catch (e:any) {
      log?.(`~ resolvePeerKeys: SELECT id→uuid error: ${e?.message}`)
    }
  } else {
    // input = UUID → traer ID desde Usuario (SELECT directo)
    try {
      const { data, error } = await sb
        .from('Usuario')
        .select('id')
        .eq('User_id', key)
        .maybeSingle()
      if (!error && data?.id != null) {
        keys.add(String(data.id))
        log?.(`~ resolvePeerKeys: SELECT uuid→id ${key} → ${data.id}`)
      }
    } catch (e:any) {
      log?.(`~ resolvePeerKeys: SELECT uuid→id error: ${e?.message}`)
    }
  }

  return Array.from(keys)
}

// Prioriza UUIDs; si no hay, usa lo que haya (numéricos)
function pickTargets(keys: string[]) {
  // Enviar a TODOS los destinos resueltos (uuid y/o id), evitando duplicados
  const uniq = Array.from(new Set(keys.filter(Boolean)))
  return uniq
}

export default function VideoCallPage() {
  const router = useRouter()

  // ---- UI base
  const [inCall, setInCall] = useState(false)
  const [panel, setPanel] = useState<Panel>('none')

  // ---- Refs de video
  const localVideoRef = useRef<HTMLVideoElement | null>(null)
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null)

  // ---- Supabase + realtime
  const [sb, setSb] = useState<SupabaseClient | null>(null)
  const [inbox, setInbox] = useState<ReturnType<SupabaseClient['channel']> | null>(null)
  const [callCh, setCallCh] = useState<ReturnType<SupabaseClient['channel']> | null>(null)
  const callChRef = useRef<ReturnType<SupabaseClient['channel']> | null>(null)
  const inboxesRef = useRef<ReturnType<SupabaseClient['channel']>[]>([])
  const [inboxReady, setInboxReady] = useState(false)

  // ---- Identidad / control
  const [meId, setMeId] = useState<string>('')                   // UUID (para canales/presence)
  const [meNumericId, setMeNumericId] = useState<number | null>(null) // ID numérico
  const [meName, setMeName] = useState<string>('Yo')
  const [peerId, setPeerId] = useState<string>('')               // uuid o id del peer

  const meIdInt = useMemo(() => {
    if (meNumericId != null) return meNumericId
    const n = Number(meId)
    return Number.isFinite(n) ? n : null
  }, [meNumericId, meId])

  const [role, setRole] = useState<Role>('idle')
  const [callId, setCallId] = useState<string | null>(null)
  const [callPeers, setCallPeers] = useState<number>(0)
  const [callRowId, setCallRowId] = useState<number | null>(null)
  const [ending, setEnding] = useState(false)

  const callerUserIdRef = useRef<string | null>(null)
  const calleeUserIdRef = useRef<string | null>(null)

  // ---- Refs anti-closures
  const callIdRef = useRef<string | null>(null)
  const roleRef = useRef<Role>('idle')
  useEffect(() => { callIdRef.current = callId }, [callId])
  useEffect(() => { roleRef.current = role }, [role])

  // ---- WebRTC
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const iceDownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([])

  // ---- Controles de UI
  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(true)

  // ---- Controles extra
  const [captionsOn, setCaptionsOn] = useState(false)
  const [shareOn, setShareOn] = useState(false)
  const [translateOn, setTranslateOn] = useState(false)

  const toggleCaptions = () => setCaptionsOn(v => !v)
  const toggleShare = () => { setShareOn(v => !v) }
  const toggleTranslate = () => { setTranslateOn(v => !v) }
  const openChat = () => setPanel(p => (p === 'chat' ? 'none' : 'chat'))
  const openPeople = () => setPanel(p => (p === 'people' ? 'none' : 'people'))
  const openSettings = () => setPanel(p => (p === 'settings' ? 'none' : 'settings'))

  // ---- Log
  const logRef = useRef<HTMLPreElement | null>(null)
  const log = (t: string) => {
    const el = logRef.current
    if (!el) return
    el.textContent += t + '\n'
    el.scrollTop = el.scrollHeight
  }

  const uuid = () =>
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2)

  const isNumericId = (s: string | null | undefined) => !!s && /^\d+$/.test(String(s))

  // Feather icons
  useEffect(() => {
    feather.replace()
  }, [micOn, camOn, shareOn, captionsOn, translateOn, panel])

  // ========= 1) Supabase client
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) {
      console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY')
      return
    }
    const client = createClient(url, key, { realtime: { params: { eventsPerSecond: 10 } } })
    setSb(client)
    log('✓ supabase client ready')
  }, [])

  // === Helpers URL
  const qp = (k: string) =>
    typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get(k)

  // === 1.b) Cargar identidad automáticamente (uuid + id numérico si existe)
  useEffect(() => {
    if (!sb) return
    ;(async () => {
      let finalUuid: string | null = null

      // a) override de pruebas: ?as=<uuid>
      const asQ = qp('as')
      if (asQ) {
        finalUuid = asQ
        sessionStorage.setItem('vc_uuid', finalUuid)
        log(`~ override via ?as=${finalUuid}`)
      }

      // b) UUID vía RPC
      if (!finalUuid) {
        try {
          const { data: uuidData } = await sb.rpc('get_usuario_uuid')
          const rpcUuid =
            (typeof uuidData === 'string' && uuidData) ||
            (uuidData && (uuidData as any).uuid) ||
            (uuidData && (uuidData as any).user_uuid) ||
            null
          if (rpcUuid) {
            finalUuid = rpcUuid
            log(`~ uuid via RPC get_usuario_uuid = ${finalUuid}`)
          }
        } catch {}
      }

      // c) fallback: usuario autenticado por client
      if (!finalUuid) {
        try {
          const { data } = await sb.auth.getUser()
          if (data?.user?.id) {
            finalUuid = data.user.id
            const nm =
              (data.user.user_metadata && (data.user.user_metadata.full_name || data.user.user_metadata.name)) ||
              undefined
            if (nm) setMeName(String(nm))
          }
        } catch {}
      }

      // d) per-tab (sessionStorage) para anónimos
      if (!finalUuid) {
        finalUuid = sessionStorage.getItem('vc_uuid')
        if (!finalUuid) {
          finalUuid = uuid()
          sessionStorage.setItem('vc_uuid', finalUuid)
        }
      }

      // id numérico: primero LS, si no, buscar en BD y cachear
      let lsId: number | null = null
      const lsIdStr = localStorage.getItem('usuario_id')
      if (lsIdStr && /^\d+$/.test(lsIdStr)) lsId = Number(lsIdStr)
      if (!lsId && finalUuid) {
        const fetched = await fetchMyNumericId(sb, finalUuid)
        if (fetched) {
          lsId = fetched
          localStorage.setItem('usuario_id', String(fetched))
          log(`~ meNumericId via DB = ${fetched}`)
        } else {
          log('~ no se encontró id numérico en BD (seguiré solo con UUID)')
        }
      }

      setMeNumericId(lsId ?? null)
      setMeId(finalUuid)
      log(`✓ identidad uid=${finalUuid}${lsId ? ` (id=${lsId})` : ''}`)

      // peer desde URL (para compartir link directo)
      const peerQ = qp('peer')
      if (peerQ) {
        setPeerId(peerQ)
        log(`~ peer via ?peer=${peerQ}`)
      }

      // >>> NUEVO: prefillear también cuando vienen desde contacto con ?to=<uuid|id>
      const toQ = qp('to')
      if (toQ) {
        setPeerId(toQ)
        log(`~ peer via ?to=${toQ}`)
      }
    })()
  }, [sb])

  // ========= 2) Inbox user:<meId> y/o user:<meNumericId>
  const [incoming, setIncoming] = useState<IncomingCall | null>(null)

  // Llamadas manejadas y "rings" ya vistos (para evitar dups entre uuid/id)
  const handledCallsRef = useRef<Set<string>>(new Set())
  const seenRingsRef = useRef<Set<string>>(new Set())
  const [handledBump, setHandledBump] = useState(0) // fuerza re-render al marcar
  const markHandled = (id: string | null | undefined) => {
    if (id) {
      handledCallsRef.current.add(id)
      setHandledBump((x) => x + 1)
    }
  }

  useEffect(() => {
    if (!sb) return
    if (!meId && meNumericId == null) return

    // limpiar anteriores
    ;(async () => {
      setInboxReady(false)
      if (inbox) { try { await inbox.unsubscribe() } catch {} setInbox(null) }
      const prev = inboxesRef.current
      inboxesRef.current = []
      for (const ch of prev) { try { await ch.unsubscribe() } catch {} }
    })()

    const setupInbox = async (key: string) => {
      const ch = sb.channel(`user:${key}`, { config: { broadcast: { self: false } } })

      ch.on('broadcast', { event: 'ring' }, ({ payload }) => {
        const cid = String(payload.callId || '')
        if (!cid) return

        // 🚫 si el ring viene de mí misma, ignorar (uuid o id numérico)
        const fromId = String(payload.from?.id ?? '')
        if (fromId && (fromId === meId || (meNumericId != null && fromId === String(meNumericId)))) {
          log('~ ring ignorado (from=me)')
          return
        }

        // ❌ si ya vimos un ring con este callId (por el otro inbox), ignorar
        if (seenRingsRef.current.has(cid)) {
          if (incoming?.callId === cid) setIncoming(null)
          log(`~ ring ignorado (duplicado) cid=${cid}`)
          return
        }
        // marcar este ring como visto para bloquear el duplicado del otro canal
        seenRingsRef.current.add(cid)

        // si la llamada ya fue manejada (aceptada/rechazada/cancelada), ignorar
        if (handledCallsRef.current.has(cid)) {
          if (incoming?.callId === cid) setIncoming(null)
          log(`~ ring ignorado (handled) cid=${cid}`)
          return
        }

        // ignorar si no estamos idle
        if (roleRef.current !== 'idle') {
          log(`~ ring ignorado (no idle) cid=${cid}`)
          return
        }

        const fromName = String(payload.from?.name ?? 'Invitado')
        log(`← ring on user:${key} from ${fromId} (${fromName}) callId=${cid}`)
        setCallId(cid); callIdRef.current = cid
        setRole('callee'); roleRef.current = 'callee'
        callerUserIdRef.current = fromId
        calleeUserIdRef.current = String(meId || key)
        setPeerId(fromId)
        setIncoming({ callId: cid, fromId, fromName }) // mostrar notificación
        try { navigator.vibrate?.(200) } catch {}
      })

      ch.on('broadcast', { event: 'accept' }, async ({ payload }) => {
        if (payload.callId !== callIdRef.current) return
        log(`← accept (via user:${key}) de ${payload.from}`)
        if (roleRef.current === 'caller') {
          setCallRowId(payload.id_llamada)
          if (!localStreamRef.current) await enableCam()
          await dbAddCallParticipant(payload.id_llamada, meIdInt, { host: true })
          await joinCallChannel(payload.callId)        // **espera SUBSCRIBED**
          setInCall(true)
          await startCall()                            // ahora sí, offer
        }
      })

      ch.on('broadcast', { event: 'reject' }, ({ payload }) => {
        if (payload.callId !== callIdRef.current) return
        markHandled(payload.callId)
        log(`← reject (via user:${key})`)
        setIncoming(null) // cerrar banner
        resetCall()
      })

      ch.on('broadcast', { event: 'cancel' }, ({ payload }) => {
        if (payload.callId !== callIdRef.current) return
        markHandled(payload.callId)
        log(`← cancel (via user:${key})`)
        setIncoming(null) // cerrar banner
        resetCall()
      })

      await ensureSubscribed(ch)
      setInboxReady(true)
      log(`✓ SUBSCRIBED inbox user:${key}`)
      inboxesRef.current.push(ch)
      if (!inbox) setInbox(ch)
    }

    ;(async () => {
      if (meId) await setupInbox(meId)
      if (meNumericId != null) await setupInbox(String(meNumericId))
    })()

  }, [sb, meId, meNumericId])

  /* ========= 2.b) Auto-acciones por query =========
     - ?to=<uuid|id>&autocall=1        -> inicia llamada automáticamente (caller)
     - ?incoming=<callId>&from=<id|uuid>&autoaccept=1 -> acepta automáticamente (callee)
  */

  // 3.a) AUTO-CALL
  useEffect(() => {
    if (!sb) return
    const to = qp('to')
    const auto = qp('autocall')
    if (!to || auto !== '1') return
    if (!meId || !inboxReady) return
    setPeerId(to)
    const onceKey = `autocall:${to}`
    const once = sessionStorage.getItem(onceKey)
    if (!once) {
      sessionStorage.setItem(onceKey, 'done')
      ;(async () => {
        if (!localStreamRef.current) await enableCam()
        await makeCall(to)
      })()
    }
    return () => { sessionStorage.removeItem(onceKey) }
  }, [sb, meId, inboxReady])

  // 3.b) AUTO-ACCEPT (con fallback a toast local si falta gate/token)
  useEffect(() => {
    if (!sb) return

    const incoming = qp('incoming')
    const from = qp('from')
    const auto = qp('autoaccept')
    const token = qp('aa')

    if (!incoming || !from || auto !== '1') return
    if (!inboxReady) return

    const gateKey = `aa:${incoming}`
    const ok = sessionStorage.getItem(gateKey) === '1'

    if (!ok || token !== incoming) {
      // ⛑️ Fallback: mostrar toast local para aceptar manualmente
      log('~ auto-accept bloqueado (sin gate o token inválido) → muestro toast local')
      setRole('callee')        // me preparo como callee
      roleRef.current = 'callee'
      setPeerId(from)          // guardo quién llama
      setIncoming({ callId: incoming, fromId: from, fromName: 'Invitado' })
      return
    }

    // ✅ Gate/Token OK → continuar auto-aceptación
    sessionStorage.removeItem(gateKey)

    setCallId(incoming); callIdRef.current = incoming
    setRole('callee');   roleRef.current = 'callee'
    setPeerId(from)
    callerUserIdRef.current = from
    calleeUserIdRef.current = String(meId || meNumericId || '')

    ;(async () => {
      if (!localStreamRef.current) await enableCam()
      const idRow = await dbStartCall()
      if (idRow) setCallRowId(idRow)
      await dbAddCallParticipant(idRow ?? -1, meIdInt, { host: false })
      await joinCallChannel(incoming)
      setInCall(true)

      // avisar al caller que aceptamos
      const keys = await resolvePeerKeys(sb, String(from), log)
      const targets = pickTargets(keys)
      for (const key of targets) {
        const ch = sb.channel(`user:${key}`)
        await ensureSubscribed(ch)
        await ch.send({ type: 'broadcast', event: 'accept', payload: { callId: incoming, from: meId, id_llamada: idRow ?? undefined } })
        await ch.unsubscribe()
      }
    })()
  }, [sb, inboxReady])

  // ========= 3) Acciones Call/Accept/Reject/Cancel
  const makeCall = async (peerOverride?: string) => {
    if (!sb) return
    if (!inboxReady) return alert('Aún suscribiéndose al inbox… probá de nuevo en un segundo')

    const targetPeer = (peerOverride ?? peerId).trim()
    log(`~ makeCall targetPeer=${targetPeer}`)
    if (!targetPeer) return alert('Falta Peer Usuario ID/UUID')
    if (!localStreamRef.current) await enableCam()

    const id = uuid()
    setCallId(id); callIdRef.current = id
    setRole('caller'); roleRef.current = 'caller'
    callerUserIdRef.current = String(meId)
    calleeUserIdRef.current = String(targetPeer)

    const keys = await resolvePeerKeys(sb, String(targetPeer), log)
    const targets = pickTargets(keys)

    // 🚫 filtrar mis propios ids/uuids
    const selfKeys = new Set([meId, meNumericId != null ? String(meNumericId) : ''].filter(Boolean))
    const finalTargets = targets.filter(t => !selfKeys.has(t))

    log(`→ ring targets: ${finalTargets.map(t => `user:${t}`).join(', ')}`)
    if (!finalTargets.length) {
      log('! No se resolvió ningún destino válido (tras filtrar self).')
      alert('No se resolvió ningún destino válido.')
      return
    }

    for (const key of finalTargets) {
      const ch = sb.channel(`user:${key}`)
      await ensureSubscribed(ch)
      await ch.send({
        type: 'broadcast',
        event: 'ring',
        payload: { callId: id, room: id, from: { id: meId, name: meName } },
      })
      await ch.unsubscribe()
    }
    log(`→ ring enviado (callId=${id})`)
  }

  const accept = async () => {
    if (!sb) return
    if (!incoming) return alert('No hay llamada entrante')
    if (roleRef.current !== 'callee') { log('! Accept: solo callee'); return }

    // Usar los valores antes de que se pierdan
    const currentCallId = incoming.callId
    const toId = incoming.fromId

    // Ocultar y marcar como manejada YA
    setIncoming(null)
    markHandled(currentCallId)

    try {
      if (!localStreamRef.current) await enableCam()
      const idRow = await dbStartCall()
      if (idRow) setCallRowId(idRow)
      await dbAddCallParticipant(idRow ?? -1, meIdInt, { host: false })
      await joinCallChannel(currentCallId)
      setInCall(true)

      // Avisar al caller
      const keys = await resolvePeerKeys(sb, String(toId), log)
      const targets = pickTargets(keys)
      for (const key of targets) {
        const ch = sb.channel(`user:${key}`)
        await ensureSubscribed(ch)
        await ch.send({ type: 'broadcast', event: 'accept', payload: { callId: currentCallId, from: meId, id_llamada: idRow ?? undefined } })
        await ch.unsubscribe()
      }
    } catch (error) {
      log('! Error al aceptar llamada: ' + (error as Error).message)
      alert('Error al aceptar la llamada')
    }
  }

  const reject = async () => {
    if (!sb) return
    const cid = callIdRef.current
    const toId = roleRef.current === 'callee' ? peerId.trim() : null
    if (!cid || !toId) { log('! Reject: faltan datos'); return }

    // Ocultar y marcar como manejada YA
    setIncoming(null)
    markHandled(cid)

    const keys = await resolvePeerKeys(sb, String(toId), log)
    const targets = pickTargets(keys)
    for (const key of targets) {
      const ch = sb.channel(`user:${key}`)
      await ensureSubscribed(ch)
      await ch.send({ type: 'broadcast', event: 'reject', payload: { callId: cid, from: meId } })
      await ch.unsubscribe()
    }
    log(`→ reject enviado a: ${targets.map(t => `user:${t}`).join(', ')}`)
    resetCall()
  }

  const cancel = async () => {
    if (!sb) return
    if (!callIdRef.current) return
    if (roleRef.current !== 'caller') { log('! Cancel solo caller'); return }
    const keys = await resolvePeerKeys(sb, String((peerId || '').trim()), log)
    const targets = pickTargets(keys)
    for (const key of targets) {
      const ch = sb.channel(`user:${key}`)
      await ensureSubscribed(ch)
      await ch.send({ type: 'broadcast', event: 'cancel', payload: { callId: callIdRef.current, from: meId } })
      await ch.unsubscribe()
    }
    markHandled(callIdRef.current)
    log(`→ cancel enviado a: ${targets.map(t => `user:${t}`).join(', ')}`)
    resetCall()
  }

  // ========= 4) Canal de llamada + WebRTC
  const mkPC = () => {
    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] })

    pc.onicecandidate = (e) => {
      if (e.candidate) sendSignal({ type: 'ice', candidate: e.candidate.toJSON(), from: meId })
    }

    pc.ontrack = async (e) => {
      const stream = e.streams[0]
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream
        try {
          await remoteVideoRef.current.play()
          log('~ remote stream set & playing')
        } catch (err: any) {
          log('! remote video play() blocked: ' + err?.message)
        }
      }
    }

    pc.onconnectionstatechange = () => log('pc.state: ' + pc.connectionState)
    pc.oniceconnectionstatechange = () => {
      log('ice.state: ' + pc.iceConnectionState)
      if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
        if (iceDownTimerRef.current) clearTimeout(iceDownTimerRef.current)
        iceDownTimerRef.current = setTimeout(() => {
          if (pcRef.current && (pcRef.current.iceConnectionState === 'disconnected' || pcRef.current.iceConnectionState === 'failed')) {
            endLocalCall('ice_disconnected')
          }
        }, 2000)
      } else {
        if (iceDownTimerRef.current) clearTimeout(iceDownTimerRef.current)
      }
    }
    pcRef.current = pc
  }

  const joinCallChannel = async (id: string | null) => {
    if (!sb || !id) return
    if (callCh) { try { await callCh.unsubscribe() } catch {} }

    // Usar una clave de presencia única y estable por pestaña/usuario
    const stableUuid = (() => {
      const s = sessionStorage.getItem('vc_uuid')
      if (s) return s
      const g = uuid()
      sessionStorage.setItem('vc_uuid', g)
      return g
    })()
    const presenceKey = meId || stableUuid

    const ch = sb.channel(`call:${id}`, {
      config: { broadcast: { self: false }, presence: { key: presenceKey } },
    })

    ch.on('presence', { event: 'sync' }, () => {
      const state = ch.presenceState()
      const count = Object.keys(state).length
      setCallPeers(count)
      log(`~ presence sync call:${id} peers=${count}`)
    })

    ch.on('broadcast', { event: 'signal' }, async ({ payload }) => {
      const m = payload as SignalPayload & { from: string }
      if (m.from === meId) return
      if (!pcRef.current) mkPC()

      if (m.type === 'offer') {
        log('← offer')
        if (!localStreamRef.current) await enableCam()
        await pcRef.current!.setRemoteDescription(m.sdp)
        localStreamRef.current!.getTracks().forEach(t => pcRef.current!.addTrack(t, localStreamRef.current!))
        const answer = await pcRef.current!.createAnswer()
        await pcRef.current!.setLocalDescription(answer)
        await sendSignal({ type: 'answer', sdp: pcRef.current!.localDescription!, from: meId })
        log('→ answer enviado')
        drainIceQueue()
      } else if (m.type === 'answer') {
        log('← answer')
        await pcRef.current!.setRemoteDescription(m.sdp)
        drainIceQueue()
      } else if (m.type === 'ice') {
        if (!pcRef.current) mkPC()
        if (!pcRef.current!.remoteDescription) {
          pendingIceRef.current.push(m.candidate)
          return
        }
        try { await pcRef.current!.addIceCandidate(m.candidate) } catch (e) { log('! addIceCandidate: ' + (e as Error).message) }
      } else if (m.type === 'hangup') {
        log('← hangup')
        await endLocalCall('remote_hangup')
      }
    })

    await ensureSubscribed(ch)
    await ch.track({ id: presenceKey, name: meName })
    log(`✓ SUBSCRIBED call:${id}`)
    setCallCh(ch)
    callChRef.current = ch
  }

  const drainIceQueue = () => {
    const pc = pcRef.current
    if (!pc || !pc.remoteDescription) return
    const toAdd = pendingIceRef.current
    pendingIceRef.current = []
    ;(async () => {
      for (const c of toAdd) {
        try { await pc.addIceCandidate(c) } catch (e) { log('! addIceCandidate (drain): ' + (e as Error).message) }
      }
    })()
  }

  const startCall = async () => {
    if (roleRef.current !== 'caller') { log('Start call: solo caller'); return }
    const ch = callChRef.current
    if (!ch) { log('Start call: no call channel (ref)'); return }
    if (!localStreamRef.current) { log('Start call: primero Enable camera'); return }

    if (!pcRef.current) mkPC()
    localStreamRef.current.getTracks().forEach(t => pcRef.current!.addTrack(t, localStreamRef.current!))
    const offer = await pcRef.current!.createOffer()
    await pcRef.current!.setLocalDescription(offer)
    await sendSignal({ type: 'offer', sdp: pcRef.current!.localDescription!, from: meId })
    log('→ offer enviado')
  }

  const sendSignal = async (payload: SignalPayload) => {
    const ch = callChRef.current
    if (!ch) { log('sendSignal: no call channel'); return }
    await ch.send({ type: 'broadcast', event: 'signal', payload })
    if (payload.type !== 'ice') setInCall(true)
    log('→ signal ' + payload.type)
  }

  // ========= 5) RPCs BD (best-effort)
  const dbStartCall = async (): Promise<number | null> => {
    if (!sb || !callIdRef.current) return null
    try {
      const { data, error } = await sb.rpc('start_call', {
        p_id_grupo: null,
        p_titulo: callIdRef.current,
        p_descripcion: JSON.stringify({
          from: callerUserIdRef.current,
          to: calleeUserIdRef.current,
        }),
      })
      if (error) { log('! start_call (no bloquea): ' + error.message); return null }
      log('✓ DB start_call id=' + data)
      return data as number
    } catch (e:any) {
      log('! start_call (excepción, no bloquea): ' + e?.message)
      return null
    }
  }

  const dbEndCall = async () => {
    if (!sb) return
    if (!callRowId) { log('~ end_call: callRowId null (omito)'); return }
    const { error } = await sb.rpc('end_call', { p_id_llamada: callRowId })
    if (error) log('! end_call: ' + error.message)
    else log('✓ DB end_call OK')
  }

  const dbAddCallParticipant = async (llamadaId: number, usuarioIdInt: number | null, { host = false } = {}) => {
    if (!sb) return
    if (usuarioIdInt == null) { log('! add_call_participant: usuarioIdInt null/NaN, omito'); return }
    const { error } = await sb.rpc('add_call_participant', {
      p_id_llamada: Number(llamadaId),
      p_id_usuario: Number(usuarioIdInt),
      p_host: !!host,
    })
    if (error) log('! add_call_participant: ' + error.message)
    else log(`✓ DB add_call_participant (host=${!!host})`)
  }

  // ========= 6) Medios
  const enableCam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
      localStreamRef.current = stream
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
        try { await localVideoRef.current.play() } catch {}
      }
      applyMediaState()
      log('✓ local stream ready')
    } catch (e: any) {
      alert('No se pudo acceder a cámara/mic: ' + e.message)
    }
  }

  const applyMediaState = () => {
    const s = localStreamRef.current
    if (!s) return
    s.getAudioTracks().forEach(t => (t.enabled = !!micOn))
    s.getVideoTracks().forEach(t => (t.enabled = !!camOn))
  }

  const toggleLocalMic = () => {
    setMicOn(v => {
      const nv = !v
      localStreamRef.current?.getAudioTracks().forEach(t => (t.enabled = nv))
      return nv
    })
  }

  const toggleLocalCam = () => {
    setCamOn(v => {
      const nv = !v
      localStreamRef.current?.getVideoTracks().forEach(t => (t.enabled = nv))
      return nv
    })
  }

  const hangup = async () => {
    if (callChRef.current && callIdRef.current) {
      try { await sendSignal({ type: 'hangup', from: meId }) } catch {}
    }
    await endLocalCall('local_hangup')
  }

  const endLocalCall = async (reason: string = 'normal') => {
    if (ending) return
    setEnding(true)
    log('~ endLocalCall (' + reason + ')')

    try { await dbEndCall() } catch {}

    // Marcar llamada como manejada y cerrar toast
    markHandled(callIdRef.current)
    setIncoming(null)

    cleanupPC()

    // ⚠️ IMPORTANTE: NO cerramos los inbox; así pueden volver a llamarte.
    try { await callCh?.unsubscribe() } catch {}
    setCallCh(null)
    callChRef.current = null

    setCallId(null); callIdRef.current = null
    setRole('idle'); roleRef.current = 'idle'
    setCallPeers(0)
    pendingIceRef.current = []
    setInCall(false)

    setEnding(false)
  }

  const cleanupPC = () => {
    try { pcRef.current?.getSenders().forEach(s => { try { s.track?.stop() } catch {} }) } catch {}
    try { localStreamRef.current?.getTracks().forEach(t => t.stop()) } catch {}
    if (localVideoRef.current?.srcObject) localVideoRef.current.srcObject = null
    if (remoteVideoRef.current?.srcObject) remoteVideoRef.current.srcObject = null
    try { pcRef.current?.close() } catch {}
    pcRef.current = null
    localStreamRef.current = null
  }

  const resetCall = () => {
    // No marcamos acá porque reject/cancel ya marcaron; si cae por otro camino:
    markHandled(callIdRef.current)
    setIncoming(null)

    setCallId(null); callIdRef.current = null
    setRole('idle'); roleRef.current = 'idle'
    setCallPeers(0)
    cleanupPC()
    try { callCh?.unsubscribe() } catch {}
    setCallCh(null)
    callChRef.current = null
    setInCall(false)
  }

  // Ocultar toast si volvemos a idle o perdemos callId
  useEffect(() => {
    if (!callId || role === 'idle') {
      if (incoming) setIncoming(null)
    }
  }, [callId, role]) // eslint-disable-line react-hooks/exhaustive-deps

  // ========= Render
  const showIncomingToast =
    !!incoming &&
    role === 'callee' &&
    !handledCallsRef.current.has(incoming.callId) &&
    handledBump >= 0 // fuerza recomputar cuando cambia handledBump

  return (
    <div className="min-h-screen w-full bg-orange-50 dark:bg-[#0d0d0d] text-foreground flex flex-col">
      <header className="sticky top-0 z-40 w-full">
        <div className="mx-4 mt-4 rounded-2xl border border-white/20 bg-white/20 dark:bg-white/10 backdrop-blur-md shadow-lg">
          <div className="flex items-center justify-between px-4 sm:px-6 py-3">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 shadow-md flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" className="text-white">
                  <path fill="currentColor" d="M23 7l-7 5 7 5V7zM1 5h14a2 2 0 012 2v10a2 2 0 01-2 2H1a1 1 0 01-1-1V6a1 1 0 011-1z"></path>
                </svg>
              </div>
              <div className="leading-tight">
                <div className="text-sm text-muted-foreground">Reunión</div>
                <div className="font-semibold">{callId ?? 'BOOM-—'}</div>
              </div>
              <span
                className={clsx(
                  'ml-2 hidden sm:inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs backdrop-blur-md',
                  inCall ? 'border-green-400/40 bg-white/20 text-green-600' : 'border-orange-400/40 bg-white/20 text-orange-600'
                )}
              >
                <span className={clsx('h-2 w-2 rounded-full', inCall ? 'bg-green-500' : 'bg-orange-500')} />
                {inCall ? 'En llamada' : role === 'idle' ? 'Lista' : 'Estableciendo…'}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <TimeBadge />
              <button
                className="hidden sm:inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/20 px-3 py-1.5 text-sm backdrop-blur-md hover:brightness-105"
                title="Copiar enlace de reunión"
                onClick={() => {
                  const url = new URL(window.location.href)
                  url.searchParams.set('peer', meId || '')
                  navigator.clipboard.writeText(url.toString())
                  log('→ enlace copiado con ?peer=' + (meId || ''))
                }}
              >
                <i data-feather="link" className="w-4 h-4" />
                Copiar enlace
              </button>
            </div>
          </div>

        </div>
      </header>

      {/* Main */}
      <main className="relative flex-1 overflow-visible">
        <div className={clsx('grid h-full w-full', panel === 'none' ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-[1fr_360px] lg:grid-cols-[1fr_420px]')}>
          <section className="p-4 sm:p-6 lg:p-8">
            <div className="grid gap-4 sm:gap-6 justify-center md:grid-cols-2">
              <VideoTile
                name={`${meName || 'Vos'}`}
                isYou
                camOn={camOn}
                micOn={micOn}
                inCall={!!callId}
                videoRef={localVideoRef}
                muted
              />
              <VideoTile
                name={'Invitado'}
                camOn={true}
                micOn={true}
                inCall={!!callId}
                videoRef={remoteVideoRef}
              />
            </div>

          </section>

          {panel !== 'none' && (
            <aside className="relative z-40 border-l border-white/20 bg-white/30 dark:bg-white/10 backdrop-blur-xl p-4 overflow-y-auto">
              {panel === 'chat' && <ChatPanel />}
              {panel === 'people' && <div className="text-sm opacity-80">Personas (placeholder)</div>}
              {panel === 'settings' && <div className="text-sm opacity-80">Ajustes (placeholder)</div>}
            </aside>
          )}
        </div>

        {/* === Barra de controles flotante === */}
        <CallControls
          micOn={micOn}
          camOn={camOn}
          captionsOn={captionsOn}
          shareOn={shareOn}
          translateOn={translateOn}
          onToggleMic={toggleLocalMic}
          onToggleCam={toggleLocalCam}
          onToggleCaptions={toggleCaptions}
          onToggleShare={toggleShare}
          onToggleTranslate={toggleTranslate}
          onOpenChat={openChat}
          onOpenPeople={openPeople}
          onOpenSettings={openSettings}
          onHangup={hangup}
        />

        {/* === Notificación de llamada entrante (local) === */}
        {showIncomingToast && (
          <IncomingCallToast
            fromName={incoming!.fromName || 'Invitado'}
            onAccept={accept}
            onReject={reject}
          />
        )}
      </main>
    </div>
  )
}

/* =================== Subcomponentes / Helpers UI =================== */

function LinkIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
      <path d="M10 13a5 5 0 007.07 0l1.41-1.41a5 5 0 10-7.07-7.07L10 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M14 11a5 5 0 00-7.07 0L5.5 12.43a5 5 0 107.07 7.07L14 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function TimeBadge() {
  const [mounted, setMounted] = useState(false)
  const [now, setNow] = useState('')
  useEffect(() => {
    setMounted(true)
    const formatter = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' })
    const tick = () => setNow(formatter.format(new Date()))
    tick()
    const id = setInterval(tick, 30_000)
    return () => clearInterval(id)
  }, [])
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/20 px-3 py-1.5 text-sm backdrop-blur-md">
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"><path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      <span suppressHydrationWarning>{mounted ? now : ''}</span>
    </div>
  )
}

function VideoTile({
  name, isYou, camOn, micOn, inCall, videoRef, muted,
}: {
  name: string
  isYou?: boolean
  camOn: boolean
  micOn: boolean
  inCall: boolean
  videoRef: RefObject<HTMLVideoElement | null>
  muted?: boolean
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/20 bg-white/20 dark:bg-white/10 backdrop-blur-md shadow-lg aspect-video">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        className={clsx('absolute inset-0 h-full w-full object-cover', camOn && inCall ? 'opacity-100' : 'opacity-0', isYou && 'scale-x-[-1]')}
      />
      <div className={clsx(
        'absolute inset-0 flex items-center justify-center select-none transition',
        camOn && inCall ? 'opacity-0' : 'opacity-100',
        'bg-gradient-to-br from-orange-200/60 to-orange-100/50 dark:from-orange-500/10 dark:to-orange-400/5'
      )}>
        <div className="flex flex-col items-center">
          <div className="mb-3 h-16 w-16 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-lg grid place-items-center text-2xl font-bold">
            {name.slice(0, 1)}
          </div>
          <div className="text-sm text-black/50 dark:text-white/70">{camOn && inCall ? 'Conectando…' : 'Cámara apagada'}</div>
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 p-2">
        <div className="flex items-center justify-between rounded-xl bg-black/30 backdrop-blur-md px-2 py-1 text-white">
          <span className="truncate text-xs font-medium">
            {name} {isYou && <em className="opacity-75">(tú)</em>}
          </span>
          <div className="flex items-center gap-1">
            <span className="rounded-md bg-white/20 p-1" title={micOn ? 'Micrófono encendido' : 'Micrófono silenciado'}>
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"><path d="M12 1v11a4 4 0 004-4V5a4 4 0 00-8 0v3a4 4 0 004 4" stroke="currentColor" strokeWidth="2"/></svg>
            </span>
            <span className="rounded-md bg-white/20 p-1" title={camOn ? 'Cámara encendida' : 'Cámara apagada'}>
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"><path d="M23 7l-7 5 7 5V7zM1 5h14a2 2 0 012 2v10a2 2 0 01-2 2H1z" stroke="currentColor" strokeWidth="2"/></svg>
            </span>
          </div>
        </div>
      </div>
      <div className={clsx('absolute inset-0 rounded-2xl pointer-events-none', inCall ? 'ring-1 ring-green-400/30' : 'ring-1 ring-orange-400/30')} />
    </div>
  )
}

/* =================== Barra de controles flotante =================== */

function CallControls({
  micOn, camOn, captionsOn, shareOn, translateOn,
  onToggleMic, onToggleCam, onToggleCaptions, onToggleShare, onToggleTranslate,
  onOpenChat, onOpenPeople, onOpenSettings, onHangup,
}: {
  micOn: boolean; camOn: boolean; captionsOn: boolean; shareOn: boolean; translateOn: boolean;
  onToggleMic: () => void; onToggleCam: () => void; onToggleCaptions: () => void; onToggleShare: () => void; onToggleTranslate: () => void;
  onOpenChat: () => void; onOpenPeople: () => void; onOpenSettings: () => void; onHangup: () => void;
}) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
      <div
        className={clsx(
          "pointer-events-auto flex items-center gap-2 rounded-[28px] px-3 py-2 sm:px-4",
          "bg-white/80 text-gray-800 shadow-xl ring-1 ring-black/5",
          "dark:bg-neutral-900/80 dark:text-neutral-100 dark:ring-white/10",
          "backdrop-blur-xl"
        )}
        style={{ maxWidth: 980, width: "100%", justifyContent: "center" }}
      >
        <RoundBtn active={micOn} onClick={onToggleMic} title={micOn ? 'Silenciar micrófono' : 'Activar micrófono'} icon="mic" />
        <RoundBtn active={camOn} onClick={onToggleCam} title={camOn ? 'Apagar cámara' : 'Encender cámara'} icon="video" />
        <RoundBtn active={shareOn} onClick={onToggleShare} title="Compartir pantalla" icon="monitor" />
        <RoundBtn active={captionsOn} onClick={onToggleCaptions} title="Subtítulos" icon="type" />
        <RoundBtn onClick={onOpenChat} title="Chat" icon="message-square" />
        <RoundBtn onClick={onOpenPeople} title="Personas" icon="users" />
        <RoundBtn onClick={onOpenSettings} title="Ajustes" icon="settings" />

        <span className="mx-3 hidden h-6 w-px bg-black/10 dark:bg-white/15 sm:inline" />

        <button
          onClick={onToggleTranslate}
          className={clsx(
            "hidden sm:inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition",
            translateOn
              ? "bg-gradient-to-r from-orange-400 to-orange-600 text-white shadow"
              : "bg-gradient-to-r from-orange-300 to-orange-500 text-white/95 hover:text-white"
          )}
          title="Traducción en tiempo real"
        >
          <i data-feather="globe" className="w-5 h-5" />
          {translateOn ? "Traducción ON" : "Traducción"}
        </button>

        <button
          onClick={onHangup}
          className="ml-2 inline-flex items-center justify-center rounded-full bg-rose-500 px-3 py-2 text-sm font-medium text-white shadow hover:bg-rose-600"
          title="Colgar"
        >
          <i data-feather="phone-off" className="w-5 h-5" />
          <span className="ml-2 hidden sm:inline">Colgar</span>
        </button>
      </div>
    </div>
  )
}

function RoundBtn({
  active, onClick, title, icon,
}: { active?: boolean; onClick?: () => void; title?: string; icon: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-pressed={!!active}
      className={clsx(
        "inline-flex h-11 w-11 items-center justify-center rounded-full transition",
        "ring-1 ring-black/10 dark:ring-white/10",
        active
          ? "bg-black/5 text-gray-900 hover:bg-black/10"
          : "bg-transparent text-gray-700 hover:bg-black/5",
        active
          ? "dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
          : "dark:bg-transparent dark:text-neutral-200 dark:hover:bg-white/10"
      )}
    >
      <i data-feather={icon} className="w-5 h-5" />
    </button>
  )
}

/* ============== Panel de Chat ============== */
function ChatPanel() {
  const [newMessage, setNewMessage] = useState('')
  
  // Datos hardcodeados del chat
  const chatMessages = [
    {
      id: 1,
      sender: 'María García',
      message: '¡Hola! ¿Cómo están todos?',
      timestamp: '10:30',
      isMe: false
    },
    {
      id: 2,
      sender: 'Carlos López',
      message: 'Todo bien, gracias. ¿Y tú?',
      timestamp: '10:32',
      isMe: false
    },
    {
      id: 3,
      sender: 'Yo',
      message: 'Perfecto, gracias por preguntar',
      timestamp: '10:35',
      isMe: true
    },
    {
      id: 4,
      sender: 'Ana Rodríguez',
      message: '¿Alguien puede compartir la pantalla para mostrar el proyecto?',
      timestamp: '10:37',
      isMe: false
    },
    {
      id: 5,
      sender: 'Yo',
      message: 'Claro, en un momento lo comparto',
      timestamp: '10:38',
      isMe: true
    },
    {
      id: 6,
      sender: 'María García',
      message: 'Excelente, gracias',
      timestamp: '10:39',
      isMe: false
    }
  ]

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      // Aquí se podría agregar lógica para enviar el mensaje
      setNewMessage('')
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/20">
        <i data-feather="message-square" className="w-5 h-5" />
        <h3 className="font-semibold">Chat de la reunión</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto space-y-3 mb-4">
        {chatMessages.map((msg) => (
          <div
            key={msg.id}
            className={clsx(
              'flex flex-col max-w-[85%]',
              msg.isMe ? 'ml-auto items-end' : 'mr-auto items-start'
            )}
          >
            {!msg.isMe && (
              <span className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                {msg.sender}
              </span>
            )}
            <div
              className={clsx(
                'rounded-2xl px-3 py-2 text-sm',
                msg.isMe
                  ? 'bg-gradient-to-r from-orange-400 to-orange-600 text-white'
                  : 'bg-white/20 dark:bg-white/10 text-gray-800 dark:text-gray-200'
              )}
            >
              {msg.message}
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {msg.timestamp}
            </span>
          </div>
        ))}
      </div>
      
      <div className="flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="Escribe un mensaje..."
          className="flex-1 rounded-full border border-white/20 bg-white/20 dark:bg-white/10 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400/50"
        />
        <button
          onClick={handleSendMessage}
          className="rounded-full bg-gradient-to-r from-orange-400 to-orange-600 text-white p-2 hover:from-orange-500 hover:to-orange-700 transition-colors"
        >
          <i data-feather="send" className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

/* ============== Toast de llamada entrante (local) ============== */
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
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.86 19.86 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.86 19.86 0 012.08 4.18 2 2 0 014.06 2h3a2 2 0 012 1.72c.12.9.37 1.77.73 2.58a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.5-1.25a2 2 0 012.11-.45c.81.36 1.68.61 2.58.73A2 2 0 0122 16.92z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Aceptar
              </button>
              <button
                onClick={onReject}
                className="inline-flex items-center gap-2 rounded-full bg-rose-500 px-3 py-1.5 text-white text-sm shadow hover:bg-rose-600"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"><path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Rechazar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
