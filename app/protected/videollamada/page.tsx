'use client'

import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
// @ts-ignore
import feather from 'feather-icons'
import clsx from 'clsx'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

type Panel = 'none' | 'chat' | 'people' | 'settings'
type Role = 'idle' | 'caller' | 'callee'

type Participant = {
  id: string
  name: string
  isYou?: boolean
  micOn: boolean
  camOn: boolean
}

type SignalPayload =
  | { type: 'offer' | 'answer'; sdp: RTCSessionDescriptionInit; from: string }
  | { type: 'ice'; candidate: RTCIceCandidateInit; from: string }
  | { type: 'hangup'; from: string }

export default function VideoCallPage() {
  /* ======== UI base ======== */
  const [inCall, setInCall] = useState(true)
  const [screenOn, setScreenOn] = useState(false)
  const [captionsOn, setCaptionsOn] = useState(false)
  const [translationOn, setTranslationOn] = useState(false)
  const [panel, setPanel] = useState<Panel>('none')

  // 2 participantes fijos (vos + invitado)
  const [participants, setParticipants] = useState<Participant[]>([
    { id: 'you', name: 'Vos', isYou: true, micOn: true, camOn: false },
    { id: 'peer', name: 'Invitado', micOn: true, camOn: false },
  ])
  const me = useMemo(() => participants.find(p => p.isYou)!, [participants])

  const [micOn, setMicOn] = useState(me?.micOn ?? true)
  const [camOn, setCamOn] = useState(me?.camOn ?? false)

  useEffect(() => { setMicOn(me.micOn); setCamOn(me.camOn) }, [me.micOn, me.camOn])

  const controlsRef = useRef<HTMLDivElement | null>(null)
  const [controlsH, setControlsH] = useState<number>(128)
  useEffect(() => {
    const el = controlsRef.current
    if (!el) return
    const update = () => setControlsH(el.getBoundingClientRect().height + 24)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    window.addEventListener('resize', update)
    return () => { ro.disconnect(); window.removeEventListener('resize', update) }
  }, [])

  useEffect(() => { feather.replace() }, [inCall, micOn, camOn, screenOn, captionsOn, translationOn, panel, participants])

  /* ======== Refs de video (embed en mosaicos) ======== */
  const localVideoRef = useRef<HTMLVideoElement | null>(null)
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null)

  /* ======== Supabase + señalización ======== */
  const [sb, setSb] = useState<SupabaseClient | null>(null)
  const [inbox, setInbox] = useState<ReturnType<SupabaseClient['channel']> | null>(null)
  const [callCh, setCallCh] = useState<ReturnType<SupabaseClient['channel']> | null>(null)

  // IDs (en tu app, reemplazá por valores reales del usuario y su peer)
  const [meId, setMeId] = useState<string>('userA-uuid')   // TODO: setear con user.id real
  const [meName, setMeName] = useState<string>('cliente1') // TODO: setear nombre real
  const [peerId, setPeerId] = useState<string>('userB-uuid')

  const [role, setRole] = useState<Role>('idle')
  const [callId, setCallId] = useState<string | null>(null)
  const [callPeers, setCallPeers] = useState<number>(0)

  const [callRowId, setCallRowId] = useState<number | null>(null)
  const [ending, setEnding] = useState(false)

  // WebRTC
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const iceDownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([])

  const uuid = () =>
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2)

  /* ========= Crear cliente Supabase ========= */
  useEffect(() => {
    // Si ya tenés client global, reemplazá esto por tu import
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const client = createClient(url, key, { realtime: { params: { eventsPerSecond: 10 } } })
    setSb(client)
  }, [])

  /* ========= INBOX ========= */
  const subscribeInbox = async () => {
    if (!sb) return
    if (!meId) { alert('Mi Usuario ID requerido'); return }

    const ch = sb.channel(`user:${meId}`, { config: { broadcast: { self: false } } })

    ch.on('broadcast', { event: 'ring' }, ({ payload }) => {
      // llamada entrante
      setCallId(payload.callId)
      setRole('callee')
      setUiField('callId', payload.callId)
      setUiField('role', 'callee')
      log(`← ring from ${payload.from?.id} (${payload.from?.name}) callId=${payload.callId}`)
    })

    ch.on('broadcast', { event: 'accept' }, async ({ payload }) => {
      if (payload.callId !== callId) return
      log(`← accept de ${payload.from}`)
      // el caller inicia offer
      if (role === 'caller') {
        setCallRowId(payload.id_llamada) // importante
        if (!localStreamRef.current) await enableCam()
        await joinCallChannel(payload.callId)
        await startCall() // crea offer
      }
    })

    ch.on('broadcast', { event: 'reject' }, () => { log('← reject'); resetCall() })
    ch.on('broadcast', { event: 'cancel' }, () => { log('← cancel'); resetCall() })

    await ch.subscribe((status) => {
      if (status === 'SUBSCRIBED') log(`✓ SUBSCRIBED inbox user:${meId}`)
    })
    setInbox(ch)
  }

  /* ========= FLUJO DE BOTONES ========= */

  const makeCall = async () => {
    if (!sb) return
    if (!inbox) { alert('Suscribite al inbox primero'); return }
    if (!peerId) { alert('Peer Usuario ID requerido'); return }

    if (!localStreamRef.current) await enableCam() // gesto del usuario

    const id = uuid()
    setCallId(id)
    setRole('caller')
    setUiField('callId', id)
    setUiField('role', 'caller')

    const peerChannel = sb.channel(`user:${peerId}`)
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
    if (!callId) { alert('No hay llamada entrante'); return }
    const toId = role === 'callee' ? peerId : null
    if (!toId) { log('! Seteá Peer Usuario ID con el caller'); return }

    if (!localStreamRef.current) await enableCam() // gesto del usuario

    // 1) DB start
    const id = await dbStartCall()
    if (!id) { log('! no se pudo crear la llamada en BD'); return }

    // 2) Unirse al canal de llamada
    await joinCallChannel(callId)

    // 3) Notificar accept al caller con id_llamada
    const ch = sb.channel(`user:${toId}`)
    await ch.subscribe()
    await ch.send({ type: 'broadcast', event: 'accept', payload: { callId, from: meId, id_llamada: id } })
    log(`→ accept to user:${toId} (callId=${callId}, id_llamada=${id})`)
    await ch.unsubscribe()
  }

  const reject = async () => {
    if (!sb) return
    if (!callId) return
    const toId = role === 'callee' ? peerId : null
    if (!toId) { log('! Seteá Peer Usuario ID con el caller'); return }
    const ch = sb.channel(`user:${toId}`)
    await ch.subscribe()
    await ch.send({ type: 'broadcast', event: 'reject', payload: { callId, from: meId } })
    log(`→ reject to user:${toId}`)
    await ch.unsubscribe()
    resetCall()
  }

  const cancel = async () => {
    if (!sb) return
    if (!callId) return
    if (role !== 'caller') { log('! Cancel solo caller'); return }
    const ch = sb.channel(`user:${peerId}`)
    await ch.subscribe()
    await ch.send({ type: 'broadcast', event: 'cancel', payload: { callId, from: meId } })
    log(`→ cancel to user:${peerId}`)
    await ch.unsubscribe()
    resetCall()
  }

  /* ========= CANAL DE LLAMADA + WebRTC ========= */

  const mkPC = () => {
    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] })
    pc.onicecandidate = (e) => {
      if (e.candidate) sendSignal({ type: 'ice', candidate: e.candidate.toJSON(), from: meId })
    }
    pc.ontrack = (e) => {
      if (remoteVideoRef.current && !remoteVideoRef.current.srcObject) {
        remoteVideoRef.current.srcObject = e.streams[0]
        log('~ remote stream set')
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

  const joinCallChannel = async (id: string) => {
    if (!sb) return
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
        await pcRef.current!.setRemoteDescription(m.sdp)
        if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => pcRef.current!.addTrack(t, localStreamRef.current!))
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
    setCallCh(ch)
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
    if (role !== 'caller') { log('Start call: solo caller'); return }
    if (!callCh) { log('Start call: no call channel'); return }
    if (!localStreamRef.current) { log('Start call: primero Enable camera'); return }

    if (!pcRef.current) mkPC()
    localStreamRef.current.getTracks().forEach(t => pcRef.current!.addTrack(t, localStreamRef.current!))
    const offer = await pcRef.current!.createOffer()
    await pcRef.current!.setLocalDescription(offer)
    await sendSignal({ type: 'offer', sdp: pcRef.current!.localDescription!, from: meId })
    log('→ offer enviado')
  }

  const sendSignal = async (payload: SignalPayload) => {
    if (!callCh) return
    await callCh.send({ type: 'broadcast', event: 'signal', payload })
    log('→ signal ' + payload.type)
  }

  /* ========= DB RPC ========= */

  const dbStartCall = async (): Promise<number | null> => {
    if (!sb || !callId) return null
    const { data, error } = await sb.rpc('start_call', {
      p_id_grupo: null,
      p_titulo: callId,
      p_descripcion: JSON.stringify({ from: meId, to: peerId }),
    })
    if (error) { log('! start_call: ' + error.message); return null }
    setCallRowId(data as number)
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

  /* ========= Medios ========= */

  const enableCam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
      localStreamRef.current = stream
      if (localVideoRef.current) localVideoRef.current.srcObject = stream
      log('✓ local stream ready')
    } catch (e: any) {
      alert('No se pudo acceder a cámara/mic: ' + e.message)
    }
  }

  const toggleLocalMic = () => {
    setMicOn(v => !v)
    updateParticipant('you', { micOn: !me.micOn })
    localStreamRef.current?.getAudioTracks().forEach(t => (t.enabled = !me.micOn))
  }

  const toggleLocalCam = () => {
    setCamOn(v => !v)
    updateParticipant('you', { camOn: !me.camOn })
    localStreamRef.current?.getVideoTracks().forEach(t => (t.enabled = !me.camOn))
  }

  const hangup = async () => {
    if (callCh && callId) {
      try { await sendSignal({ type: 'hangup', from: meId }) } catch {}
    }
    await endLocalCall('local_hangup')
  }

  const endLocalCall = async (reason: string = 'normal') => {
    if (ending) return
    setEnding(true)
    log('~ endLocalCall (' + reason + ')')

    // 1) DB
    try { await dbEndCall() } catch {}

    // 2) Cerrar WebRTC + medios
    cleanupPC()

    // 3) Salir del canal
    try { await callCh?.unsubscribe() } catch {}
    setCallCh(null)

    // 4) Reset UI
    setCallId(null)
    setRole('idle')
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
    setCallId(null)
    setRole('idle')
    setCallPeers(0)
    cleanupPC()
    try { callCh?.unsubscribe() } catch {}
    setCallCh(null)
  }

  const updateParticipant = (id: string, changes: Partial<Participant>) => {
    setParticipants(prev => prev.map(p => (p.id === id ? { ...p, ...changes } : p)))
  }

  /* ========= Log auxiliar ========= */
  const logRef = useRef<HTMLPreElement | null>(null)
  const log = (t: string) => {
    const el = logRef.current
    if (!el) return
    el.textContent += t + '\n'
    el.scrollTop = el.scrollHeight
  }
  const setUiField = (id: 'callId' | 'role', v: string) => {
    // opcional: ya mostramos arriba en UI
  }

  /* ========= Render ========= */
  return (
    <div className="min-h-screen w-full bg-orange-50 dark:bg-[#0d0d0d] text-foreground flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-40 w-full">
        <div className="mx-4 mt-4 rounded-2xl border border-white/20 bg-white/20 dark:bg-white/10 backdrop-blur-md shadow-lg">
          <div className="flex items-center justify-between px-4 sm:px-6 py-3">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 shadow-md flex items-center justify-center">
                <i data-feather="video" className="w-4 h-4 text-white" />
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
                <i data-feather="link-2" className="w-4 h-4" />
                Copiar enlace
              </button>
            </div>
          </div>

          {/* Panel de control dev (IDs + acciones) */}
          <div className="px-4 sm:px-6 pb-4 grid gap-2 md:grid-cols-3">
            <div className="flex items-center gap-2">
              <input className="flex-1 rounded-md border border-white/20 bg-white/20 px-3 py-2" value={meId} onChange={e => setMeId(e.target.value)} placeholder="Mi Usuario ID (uuid)" />
              <button className="rounded-md px-3 py-2 bg-white/20 hover:bg-white/30" onClick={subscribeInbox}>Inbox</button>
            </div>
            <input className="rounded-md border border-white/20 bg-white/20 px-3 py-2" value={meName} onChange={e => setMeName(e.target.value)} placeholder="Mi nombre" />
            <div className="flex items-center gap-2">
              <input className="flex-1 rounded-md border border-white/20 bg-white/20 px-3 py-2" value={peerId} onChange={e => setPeerId(e.target.value)} placeholder="Peer Usuario ID (uuid)" />
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

      {/* Main layout */}
      <main className="relative flex-1 overflow-visible">
        <div className={clsx('grid h-full w-full', panel === 'none' ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-[1fr_360px] lg:grid-cols-[1fr_420px]')}>
          {/* Mosaicos */}
          <section
            className="p-4 sm:p-6 lg:p-8"
            style={{ paddingBottom: `calc(${controlsH}px + env(safe-area-inset-bottom))` }}
          >
            <div className="grid gap-4 sm:gap-6 justify-center md:grid-cols-2">
              {/* Local */}
              <VideoTile
                name={me.name}
                isYou
                camOn={camOn}
                micOn={micOn}
                inCall={!!callId}
                videoRef={localVideoRef}
                muted
              />
              {/* Remoto */}
              <VideoTile
                name={participants.find(p => !p.isYou)?.name ?? 'Invitado'}
                camOn={participants.find(p => !p.isYou)?.camOn ?? false}
                micOn={participants.find(p => !p.isYou)?.micOn ?? true}
                inCall={!!callId}
                videoRef={remoteVideoRef}
              />
            </div>

            {/* Log de depuración */}
            <pre ref={logRef} className="mt-6 rounded-xl bg-black/80 text-green-300 p-3 text-xs max-h-60 overflow-auto"></pre>
          </section>

          {/* Panel lateral */}
          {panel !== 'none' && (
            <aside className="relative z-40 border-l border-white/20 bg-white/30 dark:bg-white/10 backdrop-blur-xl p-4 overflow-y-auto">
              <div className="h-full rounded-2xl border border-white/20 bg-white/30 dark:bg-white/10 backdrop-blur-xl shadow-2xl flex flex-col">
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/20">
                  <div className="flex items-center gap-2">
                    {panel === 'chat' && <i data-feather="message-circle" className="w-4 h-4" />}
                    {panel === 'people' && <i data-feather="users" className="w-4 h-4" />}
                    {panel === 'settings' && <i data-feather="settings" className="w-4 h-4" />}
                    <span className="font-medium capitalize">{panel}</span>
                  </div>
                  <button className="rounded-full p-2 hover:bg-white/20" onClick={() => setPanel('none')} title="Cerrar panel">
                    <i data-feather="x" className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  {panel === 'chat' && <ChatMock />}
                  {panel === 'people' && <PeopleMock participants={participants} />}
                  {panel === 'settings' && <SettingsMock />}
                </div>
              </div>
            </aside>
          )}
        </div>

        {/* Controles inferiores */}
        <div className={clsx('pointer-events-none fixed left-0 right-0 bottom-0 mb-4 flex items-end justify-center z-30', panel !== 'none' && 'md:mr-[380px] lg:mr-[440px]')}>
          <div ref={controlsRef} className="pointer-events-auto rounded-full border border-white/20 bg-white/30 dark:bg-white/10 backdrop-blur-xl shadow-2xl px-2 sm:px-3 py-2 flex items-center gap-1 sm:gap-2">
            <ToggleButton active={micOn} onToggle={toggleLocalMic} title={micOn ? 'Silenciar micrófono (M)' : 'Activar micrófono (M)'} activeIcon="mic" inactiveIcon="mic-off" />
            <ToggleButton active={camOn} onToggle={toggleLocalCam} title={camOn ? 'Apagar cámara (V)' : 'Encender cámara (V)'} activeIcon="video" inactiveIcon="video-off" />
            <ToggleButton active={screenOn} onToggle={() => setScreenOn(v => !v)} title={screenOn ? 'Detener compartir pantalla' : 'Compartir pantalla'} activeIcon="monitor" inactiveIcon="monitor" />

            <ToggleButton active={captionsOn} onToggle={() => setCaptionsOn(v => !v)} title={captionsOn ? 'Ocultar subtítulos' : 'Mostrar subtítulos'} activeIcon="type" inactiveIcon="type" />
            <button
              title={translationOn ? 'Desactivar traducción' : 'Activar traducción'}
              onClick={() => setTranslationOn(v => !v)}
              className={clsx('hidden sm:inline-flex items-center gap-2 rounded-full px-4 py-2 font-semibold text-white transition',
                              'bg-gradient-to-r from-orange-400 to-orange-600 hover:brightness-105',
                              translationOn && 'ring-2 ring-orange-400/60 shadow-lg')}
            >
              <i data-feather="globe" className="w-4 h-4" />
              Traducción
            </button>

            <span className="mx-1 h-6 w-px bg-white/30" />

            <IconButton title="Abrir chat (C)" onClick={() => setPanel(panel === 'chat' ? 'none' : 'chat')} icon="message-circle" />
            <IconButton title="Ver participantes (P)" onClick={() => setPanel(panel === 'people' ? 'none' : 'people')} icon="users" />
            <IconButton title="Ajustes" onClick={() => setPanel(panel === 'settings' ? 'none' : 'settings')} icon="settings" />

            <span className="mx-1 h-6 w-px bg-white/30" />

            <button title="Salir de la reunión (Esc)" onClick={hangup} className="ml-1 inline-flex items-center justify-center rounded-full bg-red-500/90 hover:bg-red-500 text-white w-10 h-10">
              <i data-feather="phone-off" className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

/* =============== Sub-componentes =============== */

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
      <i data-feather="clock" className="w-4 h-4" />
      <span suppressHydrationWarning>{mounted ? now : ''}</span>
    </div>
  )
}

function VideoTile({
  name,
  isYou,
  camOn,
  micOn,
  inCall,
  videoRef,
  muted,
}: {
  name: string
  isYou?: boolean
  camOn: boolean
  micOn: boolean
  inCall: boolean
  videoRef: RefObject<HTMLVideoElement | null>   // ← acepta null
  muted?: boolean
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/20 bg-white/20 dark:bg-white/10 backdrop-blur-md shadow-lg aspect-video">
      {/* Capa de video */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        className={clsx(
          'absolute inset-0 h-full w-full object-cover',
          camOn && inCall ? 'opacity-100' : 'opacity-0'
        )}
      />
      {/* Fondo cálido / avatar */}
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

      {/* Footer del mosaico */}
      <div className="absolute inset-x-0 bottom-0 p-2">
        <div className="flex items-center justify-between rounded-xl bg-black/30 backdrop-blur-md px-2 py-1 text-white">
          <span className="truncate text-xs font-medium">
            {name} {isYou && <em className="opacity-75">(tú)</em>}
          </span>
          <div className="flex items-center gap-1">
            <span className="rounded-md bg-white/20 p-1" title={micOn ? 'Micrófono encendido' : 'Micrófono silenciado'}>
              <i data-feather={micOn ? 'mic' : 'mic-off'} className="w-3.5 h-3.5" />
            </span>
            <span className="rounded-md bg-white/20 p-1" title={camOn ? 'Cámara encendida' : 'Cámara apagada'}>
              <i data-feather={camOn ? 'video' : 'video-off'} className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </div>

      {/* Borde de estado */}
      <div className={clsx('absolute inset-0 rounded-2xl pointer-events-none', inCall ? 'ring-1 ring-green-400/30' : 'ring-1 ring-orange-400/30')} />
    </div>
  )
}

function ToggleButton({
  active,
  onToggle,
  title,
  activeIcon,
  inactiveIcon,
}: {
  active: boolean
  onToggle: () => void
  title: string
  activeIcon: string
  inactiveIcon: string
}) {
  return (
    <button
      className={clsx(
        'inline-flex h-10 w-10 items-center justify-center rounded-full transition',
        active ? 'bg-white/20 hover:bg-white/30' : 'bg-black/30 text-white hover:bg-black/40'
      )}
      onClick={onToggle}
      title={title}
    >
      <i data-feather={active ? activeIcon : inactiveIcon} className="w-4 h-4" />
    </button>
  )
}

function IconButton({ icon, title, onClick }: { icon: string; title: string; onClick: () => void }) {
  return (
    <button className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition" onClick={onClick} title={title}>
      <i data-feather={icon} className="w-4 h-4" />
    </button>
  )
}

/* ===== Paneles mock ===== */

function ChatMock() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        <p className="text-sm text-muted-foreground">Aquí aparecerán los mensajes del chat de la reunión.</p>
        <div className="rounded-xl bg-white/40 dark:bg-white/10 p-3">
          <div className="text-xs text-muted-foreground">Invitado • 10:02</div>
          <div className="text-sm">¿Arrancamos la demo?</div>
        </div>
        <div className="rounded-xl bg-white/40 dark:bg-white/10 p-3 self-end">
          <div className="text-xs text-muted-foreground text-right">Vos • 10:03</div>
          <div className="text-sm">Un minuto y empiezo ✨</div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <input className="flex-1 rounded-full border border-white/30 bg-white/30 px-3 py-2 backdrop-blur-sm" placeholder="Escribe un mensaje…" />
        <button className="rounded-full bg-gradient-to-r from-orange-400 to-orange-600 px-4 py-2 text-white font-semibold hover:brightness-105">
          Enviar
        </button>
      </div>
    </div>
  )
}

function PeopleMock({ participants }: { participants: { id: string; name: string }[] }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Participantes ({participants.length})</p>
      <ul className="space-y-2">
        {participants.map((p) => (
          <li key={p.id} className="flex items-center justify-between rounded-xl border border-white/20 bg-white/30 dark:bg-white/10 px-3 py-2">
            <span className="truncate text-sm">{p.name}</span>
            <div className="flex items-center gap-2">
              <button title="Silenciar" className="rounded-full p-2 hover:bg-white/20"><i data-feather="mic-off" className="w-4 h-4" /></button>
              <button title="Fijar" className="rounded-full p-2 hover:bg-white/20"><i data-feather="thumbtack" className="w-4 h-4" /></button>
              <button title="Quitar" className="rounded-full p-2 hover:bg-white/20"><i data-feather="user-x" className="w-4 h-4" /></button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function SettingsMock() {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-medium mb-2">Audio</h3>
        <div className="grid gap-2">
          <select className="rounded-md border border-white/30 bg-white/30 px-3 py-2 backdrop-blur-sm">
            <option>Micrófono predeterminado</option>
          </select>
          <select className="rounded-md border border-white/30 bg-white/30 px-3 py-2 backdrop-blur-sm">
            <option>Parlantes predeterminados</option>
          </select>
        </div>
      </div>
      <div>
        <h3 className="font-medium mb-2">Video</h3>
        <div className="grid gap-2">
          <select className="rounded-md border border-white/30 bg-white/30 px-3 py-2 backdrop-blur-sm">
            <option>Cámara predeterminada</option>
          </select>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4" />
            Efecto desenfoque de fondo
          </label>
        </div>
      </div>
      <div>
        <h3 className="font-medium mb-2">Subtítulos y traducción</h3>
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" className="h-4 w-4" defaultChecked />
          Activar subtítulos automáticos
        </label>
        <select className="mt-2 w-full rounded-md border border-white/30 bg-white/30 px-3 py-2 backdrop-blur-sm">
          <option>Auto (detectar idioma)</option>
          <option>Español → Inglés</option>
          <option>Inglés → Español</option>
          <option>Portugués → Español</option>
        </select>
      </div>
    </div>
  )
}
