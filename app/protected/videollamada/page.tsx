'use client'

import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import clsx from 'clsx'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

type Panel = 'none' | 'chat' | 'people' | 'settings'
type Role = 'idle' | 'caller' | 'callee'
type SignalPayload =
  | { type: 'offer' | 'answer'; sdp: RTCSessionDescriptionInit; from: string }
  | { type: 'ice'; candidate: RTCIceCandidateInit; from: string }
  | { type: 'hangup'; from: string }

export default function VideoCallPage() {
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
  const callChRef = useRef<ReturnType<SupabaseClient['channel']> | null>(null) // NEW

  // ---- Identidad / control
  const [meId, setMeId] = useState<string>('1')
  const [meName, setMeName] = useState<string>('Nombre')
  const [peerId, setPeerId] = useState<string>('2')
  const meIdInt = useMemo(() => Number(meId), [meId])

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

  // ========= 2) Inbox user:<meId>
  useEffect(() => {
    if (!sb || !meId) return
    ;(async () => {
      if (inbox) { try { await inbox.unsubscribe() } catch {} setInbox(null) }

      const ch = sb.channel(`user:${meId}`, { config: { broadcast: { self: false } } })

      ch.on('broadcast', { event: 'ring' }, ({ payload }) => {
        const fromId = String(payload.from?.id ?? '')
        log(`← ring from ${fromId} (${payload.from?.name}) callId=${payload.callId}`)
        setCallId(payload.callId); callIdRef.current = payload.callId
        setRole('callee'); roleRef.current = 'callee'
        callerUserIdRef.current = fromId
        calleeUserIdRef.current = String(meId)
        setPeerId(fromId)
      })

      ch.on('broadcast', { event: 'accept' }, async ({ payload }) => {
        if (payload.callId !== callIdRef.current) return
        log(`← accept de ${payload.from}`)
        if (roleRef.current === 'caller') {
          setCallRowId(payload.id_llamada)
          if (!localStreamRef.current) await enableCam()
          await dbAddCallParticipant(payload.id_llamada, meIdInt, { host: true })
          await joinCallChannel(payload.callId)
          setInCall(true)
          await startCall()
        }
      })

      ch.on('broadcast', { event: 'reject' }, ({ payload }) => {
        if (payload.callId !== callIdRef.current) return
        log('← reject'); resetCall()
      })

      ch.on('broadcast', { event: 'cancel' }, ({ payload }) => {
        if (payload.callId !== callIdRef.current) return
        log('← cancel'); resetCall()
      })

      await ch.subscribe((status) => {
        if (status === 'SUBSCRIBED') log(`✓ SUBSCRIBED inbox user:${meId}`)
      })
      setInbox(ch)
    })()
  }, [sb, meId])

  // ========= 3) Acciones Call/Accept/Reject/Cancel
  const makeCall = async () => {
    if (!sb) return
    if (!inbox) return alert('Primero suscribite a tu inbox')
    if (!peerId) return alert('Falta Peer Usuario ID')
    if (!localStreamRef.current) await enableCam()

    const id = uuid()
    setCallId(id); callIdRef.current = id
    setRole('caller'); roleRef.current = 'caller'
    callerUserIdRef.current = String(meId)
    calleeUserIdRef.current = String(peerId)

    const peerChannel = sb.channel(`user:${String(peerId)}`)
    await peerChannel.subscribe()
    await peerChannel.send({
      type: 'broadcast',
      event: 'ring',
      payload: { callId: id, room: id, from: { id: meId, name: meName } },
    })
    log(`→ ring to user:${peerId} (callId=${id})`)
    await peerChannel.unsubscribe()
  }

  const accept = async () => {
    if (!sb) return
    if (!callIdRef.current) return alert('No hay llamada entrante')
    const toId = roleRef.current === 'callee' ? peerId : null
    if (!toId) { log('! Seteá Peer Usuario ID con el caller'); return }
    if (!localStreamRef.current) await enableCam()

    const idRow = await dbStartCall()
    if (!idRow) { log('! no se pudo crear la llamada en BD'); return }
    setCallRowId(idRow)

    await dbAddCallParticipant(idRow, meIdInt, { host: false })
    await joinCallChannel(callIdRef.current)
    setInCall(true)

    const ch = sb.channel(`user:${toId}`)
    await ch.subscribe()
    await ch.send({ type: 'broadcast', event: 'accept', payload: { callId: callIdRef.current, from: meId, id_llamada: idRow } })
    log(`→ accept to user:${toId} (callId=${callIdRef.current}, id_llamada=${idRow})`)
    await ch.unsubscribe()
  }

  const reject = async () => {
    if (!sb) return
    if (!callIdRef.current) return
    const toId = roleRef.current === 'callee' ? peerId : null
    if (!toId) { log('! Seteá Peer Usuario ID con el caller'); return }
    const ch = sb.channel(`user:${toId}`)
    await ch.subscribe()
    await ch.send({ type: 'broadcast', event: 'reject', payload: { callId: callIdRef.current, from: meId } })
    log(`→ reject to user:${toId}`)
    await ch.unsubscribe()
    resetCall()
  }

  const cancel = async () => {
    if (!sb) return
    if (!callIdRef.current) return
    if (roleRef.current !== 'caller') { log('! Cancel solo caller'); return }
    const ch = sb.channel(`user:${peerId}`)
    await ch.subscribe()
    await ch.send({ type: 'broadcast', event: 'cancel', payload: { callId: callIdRef.current, from: meId } })
    log(`→ cancel to user:${peerId}`)
    await ch.unsubscribe()
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

    const ch = sb.channel(`call:${id}`, {
      config: { broadcast: { self: false }, presence: { key: meId } },
    })

    ch.on('presence', { event: 'sync' }, () => {
      const state = ch.presenceState()
      setCallPeers(Object.keys(state).length)
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

    await ch.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await ch.track({ id: meId, name: meName })
        log(`✓ joined call:${id}`)
      }
    })
    setCallCh(ch)           // estado (async)
    callChRef.current = ch  // ref (inmediato)
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

  // ========= 5) RPCs BD
  const dbStartCall = async (): Promise<number | null> => {
    if (!sb || !callIdRef.current) return null
    const { data, error } = await sb.rpc('start_call', {
      p_id_grupo: null,
      p_titulo: callIdRef.current,
      p_descripcion: JSON.stringify({
        from: callerUserIdRef.current,
        to: calleeUserIdRef.current,
      }),
    })
    if (error) { log('! start_call: ' + error.message); return null }
    log('✓ DB start_call id=' + data)
    return data as number
  }

  const dbEndCall = async () => {
    if (!sb) return
    if (!callRowId) { log('! end_call: callRowId es null'); return }
    const { error } = await sb.rpc('end_call', { p_id_llamada: callRowId })
    if (error) log('! end_call: ' + error.message)
    else log('✓ DB end_call OK')
  }

  const dbAddCallParticipant = async (llamadaId: number, usuarioIdInt: number, { host = false } = {}) => {
    if (!sb) return
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

    cleanupPC()

    try { await callCh?.unsubscribe() } catch {}
    setCallCh(null)
    callChRef.current = null // limpiar ref

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
    setCallId(null); callIdRef.current = null
    setRole('idle'); roleRef.current = 'idle'
    setCallPeers(0)
    cleanupPC()
    try { callCh?.unsubscribe() } catch {}
    setCallCh(null)
    callChRef.current = null
    setInCall(false)
  }

  // ========= Render
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
              <div className="hidden md:flex items-center gap-2 text-xs opacity-80">
                <span className="px-2 py-1 rounded-full border border-white/30 bg-white/20">role: {role}</span>
                <span className="px-2 py-1 rounded-full border border-white/30 bg-white/20">peers: {callPeers}</span>
              </div>
              <TimeBadge />
              <button
                className="hidden sm:inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/20 px-3 py-1.5 text-sm backdrop-blur-md hover:brightness-105"
                title="Copiar enlace de reunión"
                onClick={() => navigator.clipboard.writeText(window.location.href)}
              >
                <LinkIcon />
                Copiar enlace
              </button>
            </div>
          </div>

          {/* Panel de control */}
          <div className="px-4 sm:px-6 pb-4 grid gap-2 md:grid-cols-3">
            <div className="flex items-center gap-2">
              <input
                className="flex-1 rounded-md border border-white/20 bg-white/20 px-3 py-2"
                value={meId} onChange={e => setMeId(e.target.value)} placeholder="Mi Usuario ID (numérico)"
              />
              <button className="rounded-md px-3 py-2 bg-white/20 hover:bg-white/30">Inbox ✓</button>
            </div>
            <input
              className="rounded-md border border-white/20 bg-white/20 px-3 py-2"
              value={meName} onChange={e => setMeName(e.target.value)} placeholder="Mi nombre"
            />
            <div className="flex items-center gap-2">
              <input
                className="flex-1 rounded-md border border-white/20 bg-white/20 px-3 py-2"
                value={peerId} onChange={e => setPeerId(e.target.value)} placeholder="Peer Usuario ID (uuid o id)"
              />
              <button className="rounded-md px-3 py-2 bg-white/20 hover:bg-white/30" onClick={makeCall}>Call</button>
              <button className="rounded-md px-3 py-2 bg-white/20 hover:bg-white/30" onClick={cancel}>Cancel</button>
            </div>
            <div className="md:col-span-3 flex items-center gap-2">
              <button className="rounded-md px-3 py-2 bg-white/20 hover:bg-white/30" onClick={accept}>Accept</button>
              <button className="rounded-md px-3 py-2 bg-white/20 hover:bg-white/30" onClick={reject}>Reject</button>
              <button className="rounded-md px-3 py-2 bg-white/20 hover:bg-white/30" onClick={enableCam}>Enable Cam/Mic</button>
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

            <div className="mt-4 flex items-center gap-2">
              <button className={btnToggle(micOn)} onClick={toggleLocalMic} title={micOn ? 'Silenciar micrófono' : 'Activar micrófono'}>
                {micOn ? 'Mic on' : 'Mic off'}
              </button>
              <button className={btnToggle(camOn)} onClick={toggleLocalCam} title={camOn ? 'Apagar cámara' : 'Encender cámara'}>
                {camOn ? 'Cam on' : 'Cam off'}
              </button>
              <button className="inline-flex items-center justify-center rounded-full bg-red-500/90 hover:bg-red-500 text-white px-4 py-2" onClick={hangup}>
                Colgar
              </button>
            </div>

            <pre ref={logRef} className="mt-6 rounded-xl bg-black/80 text-green-300 p-3 text-xs max-h-60 overflow-auto"></pre>
          </section>

          {panel !== 'none' && (
            <aside className="relative z-40 border-l border-white/20 bg-white/30 dark:bg-white/10 backdrop-blur-xl p-4 overflow-y-auto">
              {/* tu contenido */}
            </aside>
          )}
        </div>
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

const btnToggle = (on: boolean) =>
  clsx(
    'inline-flex h-10 px-4 items-center justify-center rounded-full transition',
    on ? 'bg-white/20 hover:bg-white/30' : 'bg-black/30 text-white hover:bg-black/40'
  )
