'use client'

import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { useRouter } from 'next/navigation'
import clsx from 'clsx'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { useUserUuid } from '@/contexts/UserUuidContext'
// @ts-ignore — solo en cliente
import feather from 'feather-icons'
import { useTranscriptChat } from '../transcription/useTranscriptChat'
import type { TranscriptEntry } from '../transcription/TranscriptionService'
import SaveTranscriptModal from '../../../components/SaveTranscriptModal'
import {
  useTranslation,
  TranslationOverlay,
  DEFAULT_TRANSLATION_CONFIG,
  type TranslationConfig
} from './translation'

type Panel = 'none' | 'chat' | 'people' | 'settings'
type Role = 'idle' | 'caller' | 'callee'
type SignalPayload =
  | { type: 'offer' | 'answer'; sdp: RTCSessionDescriptionInit; from: string }
  | { type: 'ice'; candidate: RTCIceCandidateInit; from: string }
  | { type: 'hangup'; from: string }

type IncomingCall = {
  callId: string;
  fromId: string;
  fromName?: string;
  transcript?: boolean;
  id_llamada?: number; // ⚠️ Añadir esta línea
}

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
async function resolvePeerKeys(sb: SupabaseClient, peerInput: string, log?: (t: string) => void): Promise<string[]> {
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
    } catch (e: any) {
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
    } catch (e: any) {
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
    } catch (e: any) {
      log?.(`~ resolvePeerKeys: SELECT uuid→id error: ${e?.message}`)
    }
  }

  // SIEMPRE incluir la key original como válida (importante para UUIDs temporales de incógnito)
  keys.add(key)

  return Array.from(keys)
}

// Prioriza UUIDs; si no hay, usa lo que haya (numéricos)
// ⚠️ SOLO retorna el primer target para evitar duplicación de llamadas
function pickTargets(keys: string[]) {
  const uniq = Array.from(new Set(keys.filter(Boolean)))
  // Preferir UUIDs (no numéricos) primero
  const uuid = uniq.find(k => !/^\d+$/.test(k))
  return uuid ? [uuid] : uniq.slice(0, 1)
}

export default function VideoCallPage() {
  const router = useRouter()
  const { uuid: cachedUuid, isLoading: uuidLoading } = useUserUuid()

  // === DEBUG helpers (exposed to window) ===
  function startSenderDebug(sender: RTCRtpSender, tag = 'TTS') {
    let lastBytes = 0, lastTs = 0;
    const id = setInterval(async () => {
      try {
        const stats = await sender.getStats();
        stats.forEach((r: any) => {
          if (r.type === 'outbound-rtp' && r.kind === 'audio') {
            if (lastTs) {
              const dt = (r.timestamp - lastTs) / 1000;
              const db = r.bytesSent - lastBytes;
              const kbps = (db * 8) / 1000 / dt;
              console.log(`${tag}: outbound audio ~${kbps.toFixed(1)} kbps, packets=${r.packetsSent}`);
            }
            lastBytes = r.bytesSent; lastTs = r.timestamp;
          }
        });
      } catch { }
    }, 1000);
    return () => clearInterval(id);
  }

  function startInboundAudioDebug(pc: RTCPeerConnection, tag = 'PEER') {
    const rx = pc.getReceivers().find(r => r.track && r.track.kind === 'audio');
    if (!rx) { console.warn(tag + ': no audio receiver'); return () => { }; }
    let lastBytes = 0, lastTs = 0;
    const id = setInterval(async () => {
      try {
        const stats = await rx.getStats();
        stats.forEach((r: any) => {
          if (r.type === 'inbound-rtp' && r.kind === 'audio') {
            if (lastTs) {
              const dt = (r.timestamp - lastTs) / 1000;
              const db = r.bytesReceived - lastBytes;
              const kbps = (db * 8) / 1000 / dt;
              console.log(`${tag}: inbound audio ~${kbps.toFixed(1)} kbps, packets=${r.packetsReceived}`);
            }
            lastBytes = r.bytesReceived; lastTs = r.timestamp;
          }
        });
      } catch { }
    }, 1000);
    return () => clearInterval(id);
  }

  useEffect(() => {
    // Exponer helpers para debug desde consola
    ; (window as any).startSenderDebug = startSenderDebug;
    ; (window as any).startInboundAudioDebug = startInboundAudioDebug;
  }, [])

  // ...existing code...

  // ---- UI base
  const [inCall, setInCall] = useState(false)
  const [panel, setPanel] = useState<Panel>('none')
  // Flag: la llamada tiene transcripción activada (muestra aviso azul)
  const [callTranscriptActive, setCallTranscriptActive] = useState(false)  // Chat (ephemeral for the call) — keep in parent so it survives panel unmount/mount
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; from: string; fromId?: string; text: string; ts: number }>>([])
  const chatSeenRef = useRef<Set<string>>(new Set())

  // ---- Estados para guardar transcripción
  const [showSaveTranscriptModal, setShowSaveTranscriptModal] = useState(false)
  const [wasTranscriptionUsed, setWasTranscriptionUsed] = useState(false)
  const [isRemoteHangup, setIsRemoteHangup] = useState(false)
  const [hasTranscriptData, setHasTranscriptData] = useState(false) // Estado más persistente



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
  const [peerName, setPeerName] = useState<string | null>(null)

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



  // Hook de transcripción con chat colaborativo
  const {
    transcriptEntries,
    isTranscribing,
    error: transcriptionError
  } = useTranscriptChat({
    isActive: callTranscriptActive,
    localUserId: meId,
    localUserName: meName || 'Yo',
    callChannel: callCh
  })

  // Clear chat when call ends (callId becomes null)
  useEffect(() => {
    if (!callId) {
      setChatMessages([])
      try { chatSeenRef.current.clear() } catch { }
      // Reset transcript usage flag when call ends
      setWasTranscriptionUsed(false)
      setIsRemoteHangup(false) // Reset remote hangup flag
      setHasTranscriptData(false) // Reset transcript data flag
    }
  }, [callId])

  // Marcar que se usó transcripción cuando se active
  useEffect(() => {
    if (callTranscriptActive) {
      setWasTranscriptionUsed(true)
    }
  }, [callTranscriptActive])

  // Marcar que hay datos de transcripción cuando lleguen entradas
  useEffect(() => {
    if (transcriptEntries.length > 0) {
      setHasTranscriptData(true)
    }
  }, [transcriptEntries.length])

  // Solo activar transcripción manualmente (comentado auto-activación)
  /*
  useEffect(() => {
    console.log('🔵 useEffect transcripción ejecutándose - callId=', callId)
    if (!callId) {
      console.log('🔵 No callId, saliendo del useEffect')
      return
    }
    
    // Verificar parámetro transcript en URL
    let hasTranscript = false
    let source = 'none'
    
    try {
      if (typeof window !== 'undefined' && window.location) {
        hasTranscript = window.location.search.includes('transcript=1')
        if (hasTranscript) source = 'URL'
      }
    } catch (e) {
      console.log('🔵 Error leyendo URL, probando sessionStorage')
    }
    
    // Fallback a sessionStorage
    if (!hasTranscript) {
      try {
        hasTranscript = sessionStorage.getItem('vc_transcript') === '1'
        if (hasTranscript) source = 'sessionStorage'
      } catch {}
    }
    
    console.log('🔵 Resultado detección:', { hasTranscript, source, url: window.location?.search })
    
    if (hasTranscript) {
      console.log('🔵🔵🔵 ACTIVANDO TRANSCRIPCIÓN desde', source)
      setCallTranscriptActive(true)
      
      // Verificar inmediatamente que se activó
      setTimeout(() => {
        console.log('🔵 Estado después de setTimeout - callTranscriptActive debería ser true')
      }, 100)
    } else {
      console.log('❌ NO se activa transcripción')
    }
  }, [callId])
  */

  const callerUserIdRef = useRef<string | null>(null)
  const calleeUserIdRef = useRef<string | null>(null)

  // ---- Refs anti-closures
  const callIdRef = useRef<string | null>(null)
  const roleRef = useRef<Role>('idle')
  useEffect(() => { callIdRef.current = callId }, [callId])
  useEffect(() => { roleRef.current = role }, [role])
  
  // ⚠️ Refs para transcripción (evitar closures en eventos de canal)
  const wasTranscriptionUsedRef = useRef<boolean>(false)
  const transcriptEntriesCountRef = useRef<number>(0)
  useEffect(() => { wasTranscriptionUsedRef.current = wasTranscriptionUsed }, [wasTranscriptionUsed])
  useEffect(() => { transcriptEntriesCountRef.current = transcriptEntries.length }, [transcriptEntries.length])

  // ---- WebRTC
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const screenStreamRef = useRef<MediaStream | null>(null)
  const prevLocalStreamRef = useRef<MediaStream | null>(null)
  // Guard flags to avoid stop/start races when browser triggers multiple onended/oninactive events
  const suppressStartRef = useRef<boolean>(false)
  const stoppingRef = useRef<boolean>(false)
  // Cooldown timestamp to prevent immediate restart (ms since epoch)
  const disabledUntilRef = useRef<number>(0)
  const iceDownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([])
  const processingSignalRef = useRef<boolean>(false)
  // ⚠️ Ref para prevenir ejecuciones múltiples del AUTO-CALL
  const autoCallExecutedRef = useRef<boolean>(false)

  // ---- Controles de UI
  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(true)

  // ---- Controles extra
  const [shareOn, setShareOn] = useState(false)
  const [translateOn, setTranslateOn] = useState(false)
  const [peerSharing, setPeerSharing] = useState(false)

  // Estado de configuración de traducción
  const [translationConfig, setTranslationConfig] = useState<TranslationConfig>(DEFAULT_TRANSLATION_CONFIG)

  // Hook de traducción
  const translation = useTranslation({
    remoteVideoRef,
    isActive: translateOn,
    config: translationConfig
  })

  // Toggle screen sharing: capture display, replace tracks in-call, and revert when stopped
  const toggleShare = async () => {
    // Prevent concurrent stop/start races
    if (stoppingRef.current) {
      log('~ toggleShare ignored — stop in progress')
      return
    }

    // If already sharing, stop and revert to previous local stream
    if (shareOn) {
      stoppingRef.current = true
      try {
        screenStreamRef.current?.getTracks().forEach(t => t.stop())
      } catch { }
      screenStreamRef.current = null

      // restore previous local stream (camera) if present; if not, try to acquire camera
      let camStream = prevLocalStreamRef.current
      if (!camStream) {
        try {
          // attempt to re-enable camera (will prompt if needed)
          await enableCam()
          camStream = localStreamRef.current
        } catch (e) {
          // ignore
        }
      }

      localStreamRef.current = camStream
      if (localVideoRef.current) localVideoRef.current.srcObject = camStream

      if (pcRef.current && camStream) {
        const videoSender = pcRef.current.getSenders().find(s => s.track?.kind === 'video')
        const audioSender = pcRef.current.getSenders().find(s => s.track?.kind === 'audio')
        const camVideo = camStream.getVideoTracks()[0]
        const camAudio = camStream.getAudioTracks()[0]
        try {
          if (videoSender && camVideo) {
            await videoSender.replaceTrack(camVideo)
            log('→ video track replaced with camera')
          }
          if (audioSender && camAudio) {
            await audioSender.replaceTrack(camAudio)
            log('→ audio track replaced with camera')
          }
          // Force a renegotiation so the remote peer updates its stream immediately
          try {
            const offer = await pcRef.current.createOffer()
            await pcRef.current.setLocalDescription(offer)
            await sendSignal({ type: 'offer', sdp: pcRef.current.localDescription!, from: meId })
            log('→ renegotiation offer sent (restore camera)')
          } catch (e: any) {
            log('! renegotiate (restore) error: ' + (e?.message || e))
          }
        } catch (e: any) { log('! error replacing tracks: ' + e?.message) }
      }

      setShareOn(false)
      try { callChRef.current?.send({ type: 'broadcast', event: 'sharing', payload: { from: meId, sharing: false } }) } catch (e) { }
      stoppingRef.current = false
      log('× screen sharing stopped')
      return
    }

    // Start screen share
    // If we recently handled an external stop, suppress immediate restart
    if (suppressStartRef.current) {
      // also respect explicit cooldown window
      const now = Date.now()
      if (now < disabledUntilRef.current) {
        log('~ suppressed start due to recent external stop (cooldown)')
        suppressStartRef.current = false
        return
      }
      suppressStartRef.current = false
      log('~ suppressed start due to recent external stop')
      return
    }
    // Respect cooldown in case other code set it
    if (Date.now() < disabledUntilRef.current) {
      log('~ start suppressed by cooldown')
      return
    }

    let disp: MediaStream | null = null
    try {
      disp = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
    } catch (e: any) {
      log('! screen share cancelled or failed: ' + (e?.message || e))
      return
    }

    // save previous local stream so we can restore later
    prevLocalStreamRef.current = localStreamRef.current
    screenStreamRef.current = disp
    localStreamRef.current = disp
    if (localVideoRef.current) localVideoRef.current.srcObject = disp
    setShareOn(true)
    log('✓ screen sharing started')

    try {
      // notify peer we're sharing
      try { callChRef.current?.send({ type: 'broadcast', event: 'sharing', payload: { from: meId, sharing: true } }) } catch (e) { }
    } catch { }

    // Ensure we detect when the browser stops sharing via its UI (e.g. "Dejar de compartir")
    // Use an immediate, direct stop handler to avoid races that would re-open the picker
    const stopHandler = async () => {
      // mark suppression and cooldown to avoid immediate restart
      suppressStartRef.current = true
      disabledUntilRef.current = Date.now() + 2000 // 2s cooldown
      // perform immediate stop logic (avoid relying on toggleShare state closure)
      if (stoppingRef.current) return
      stoppingRef.current = true
      try {
        try { screenStreamRef.current?.getTracks().forEach(t => t.stop()) } catch { }
        screenStreamRef.current = null

        // restore previous local stream (camera) if present; if not, try to acquire camera
        let camStream = prevLocalStreamRef.current
        if (!camStream) {
          try { await enableCam(); camStream = localStreamRef.current } catch (e) { /* ignore */ }
        }

        localStreamRef.current = camStream
        if (localVideoRef.current) localVideoRef.current.srcObject = camStream

        if (pcRef.current && camStream) {
          const videoSender = pcRef.current.getSenders().find(s => s.track?.kind === 'video')
          const audioSender = pcRef.current.getSenders().find(s => s.track?.kind === 'audio')
          const camVideo = camStream.getVideoTracks()[0]
          const camAudio = camStream.getAudioTracks()[0]
          try {
            if (videoSender && camVideo) { await videoSender.replaceTrack(camVideo); log('→ video track replaced with camera (stopHandler)') }
            if (audioSender && camAudio) { await audioSender.replaceTrack(camAudio); log('→ audio track replaced with camera (stopHandler)') }
            try {
              const offer = await pcRef.current.createOffer()
              await pcRef.current.setLocalDescription(offer)
              await sendSignal({ type: 'offer', sdp: pcRef.current.localDescription!, from: meId })
              log('→ renegotiation offer sent (stopHandler)')
            } catch (e: any) { log('! renegotiate (stopHandler) error: ' + (e?.message || e)) }
          } catch (e: any) { log('! error replacing tracks (stopHandler): ' + e?.message) }
        }

        setShareOn(false)
        try { callChRef.current?.send({ type: 'broadcast', event: 'sharing', payload: { from: meId, sharing: false } }) } catch (e) { }
        log('× screen sharing stopped (stopHandler)')
      } finally {
        stoppingRef.current = false
      }
    }

    try {
      // oninactive fires when the stream becomes inactive
      (disp as any).oninactive = () => { void stopHandler() }
    } catch (e) { }
    // Also add onended to every track as a fallback
    try {
      disp.getTracks().forEach(t => {
        try { t.onended = () => { void stopHandler() } } catch (e) { }
      })
    } catch (e) { }

    // if in a call, replace tracks
    if (pcRef.current) {
      const screenVideo = disp.getVideoTracks()[0]
      const screenAudio = disp.getAudioTracks()[0] || null
      const videoSender = pcRef.current.getSenders().find(s => s.track?.kind === 'video')
      const audioSender = pcRef.current.getSenders().find(s => s.track?.kind === 'audio')
      try {
        if (videoSender && screenVideo) {
          await videoSender.replaceTrack(screenVideo)
          log('→ video track replaced with screen')
        }
        if (audioSender && screenAudio) {
          await audioSender.replaceTrack(screenAudio)
          log('→ audio track replaced with screen')
        }
        // Force renegotiation so peer updates the remote stream to show the screen share
        try {
          const offer = await pcRef.current.createOffer()
          await pcRef.current.setLocalDescription(offer)
          await sendSignal({ type: 'offer', sdp: pcRef.current.localDescription!, from: meId })
          log('→ renegotiation offer sent (screen share)')
        } catch (e: any) {
          log('! renegotiate (screen) error: ' + (e?.message || e))
        }
      } catch (e: any) { log('! error replacing tracks: ' + e?.message) }
    }

    // when user stops sharing from browser UI, revert — handled above via oninactive/onended
  }

  // Función para actualizar configuración de traducción
  const updateTranslationConfig = (updates: Partial<TranslationConfig>) => {
    setTranslationConfig(prev => ({ ...prev, ...updates }))
  }

  const toggleTranslate = () => { 
    setTranslateOn(v => {
      const newValue = !v;
      console.log(`🌐 [TRADUCCIÓN] ${newValue ? 'ACTIVADA' : 'DESACTIVADA'} - Video del peer será ${newValue ? 'silenciado' : 'restaurado'}`);
      return newValue;
    });
  }

  const toggleTranscript = () => {
    setCallTranscriptActive(v => {
      const newValue = !v

      // Notificar al peer del cambio de transcripción (solo en llamadas activas)
      if (callCh && inCall && peerId) {
        callCh.send({
          type: 'broadcast',
          event: 'transcript_sync',
          payload: {
            active: newValue,
            fromUserId: meId,
            requestSync: false
          }
        })
        log(`📝 Notified peer of transcript change: active=${newValue}`)
      }

      return newValue
    })
  }

  const openChat = () => setPanel(p => (p === 'chat' ? 'none' : 'chat'))

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
  }, [micOn, camOn, shareOn, translateOn, panel])

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
    if (uuidLoading) return // Esperar a que el contexto UUID termine de cargar

      ; (async () => {
        let finalUuid: string | null = null

        // a) override de pruebas: ?as=<uuid>
        const asQ = qp('as')
        if (asQ) {
          finalUuid = asQ
          sessionStorage.setItem('vc_uuid', finalUuid)
          log(`~ override via ?as=${finalUuid}`)
        }

        // b) UUID desde contexto cacheado (evita múltiples RPC calls)
        if (!finalUuid && cachedUuid) {
          finalUuid = cachedUuid
          log(`~ uuid from cached context = ${finalUuid}`)
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
          } catch { }
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
        // Prefill transcript flag from query (caller may pass ?transcript=1)
        const transcriptQ = qp('transcript')
        if (transcriptQ === '1') {
          try { sessionStorage.setItem('vc_transcript', '1') } catch { }
          log('~ auto-call will send transcript flag (from query)')
        }
      })()
  }, [sb, cachedUuid, uuidLoading])

  // === Intentar resolver y fijar mi nombre visible (para que los rings lleven el nombre correcto)
  useEffect(() => {
    if (!sb) return
      // Si ya tenemos un meName distinto del placeholder, no forzamos (pero igualmente intentamos rellenar si está vacío)
      ; (async () => {
        try {
          // Preferir id numérico (RPC más fiable)
          if (meNumericId != null) {
            try {
              const { data, error } = await sb.rpc('get_user_by_id_usuario', { p_id_usuario: Number(meNumericId) })
              if (!error && data) {
                const u = Array.isArray(data) ? data[0] : data
                const resolved = (u && (u.apodo || u.nombre || u.mail || u.User_id || u.user_id)) || null
                if (resolved) setMeName(String(resolved))
              }
            } catch (e) {
              // ignore
            }
          } else if (meId) {
            // Fallback por UUID usando la ruta interna del app router
            try {
              const res = await fetch(`/api/users/uuid/${meId}`)
              if (res.ok) {
                const json = await res.json()
                const resolved = (json && (json.apodo || json.nombre || json.mail || json.User_id || json.user_id)) || null
                if (resolved) setMeName(String(resolved))
              }
            } catch (e) {
              // ignore
            }
          }
        } catch (e) {
          // noop
        }
      })()
  }, [sb, meId, meNumericId])

  // ========= 2) Inbox user:<meId> y/o user:<meNumericId>
  const [incoming, setIncoming] = useState<IncomingCall | null>(null)

  // Detectar si la llamada tiene transcripción activada (para callee con incoming)
  useEffect(() => {
    if (callId && inCall && incoming?.transcript) {
      // Solo activar si es callee y hay flag de transcripción en incoming
      setCallTranscriptActive(true)
    }
  }, [callId, inCall, incoming])

  // Resolver nombre/apodo del peer cuando cambie peerId o recibamos incoming
  useEffect(() => {
    let mounted = true
      ; (async () => {
        try {
          // Si el incoming trae un nombre explícito, usarlo inmediatamente
          if (incoming && incoming.fromName) {
            setPeerName(incoming.fromName)
            return
          }

          // Si no hay peerId o no hay cliente supabase aún, limpiar
          if (!peerId || !sb) {
            if (mounted) setPeerName(null)
            return
          }

          // Intentar resolver por UUID/id vía la ruta interna del app
          try {
            const res = await fetch(`/api/users/uuid/${peerId}`)
            if (res.ok) {
              const json = await res.json()
              const resolved = (json && (json.apodo || json.nombre || json.mail || json.User_id || json.user_id)) || null
              if (mounted) setPeerName(resolved ? String(resolved) : null)
              return
            }
          } catch (e) { /* ignore */ }

          // fallback: dejar null (mostraremos 'Invitado' en la UI)
          if (mounted) setPeerName(null)
        } catch (e) { /* noop */ }
      })()
    return () => { mounted = false }
  }, [peerId, incoming, sb])

  // Transcript sync para llamadas 1-a-1: cuando me uno a una llamada, preguntar al peer por su estado de transcript
  useEffect(() => {
    if (!callCh || !inCall || !peerId) return

    log('📝 Setting up transcript sync for 1-a-1 call')

    // Enviar request de sync después de un delay para asegurar que el peer esté listo
    const syncTimer = setTimeout(() => {
      if (!callCh) return

      callCh.send({
        type: 'broadcast',
        event: 'transcript_sync',
        payload: {
          active: callTranscriptActive,
          fromUserId: meId,
          requestSync: true
        }
      })

      log(`📝 Sent transcript sync request: active=${callTranscriptActive}`)
    }, 2000) // 2 segundos de delay para asegurar que ambos estén conectados

    return () => clearTimeout(syncTimer)
  }, [callCh, inCall, peerId, callTranscriptActive, meId])

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
      ; (async () => {
        setInboxReady(false)
        if (inbox) { try { await inbox.unsubscribe() } catch { } setInbox(null) }
        const prev = inboxesRef.current
        inboxesRef.current = []
        for (const ch of prev) { try { await ch.unsubscribe() } catch { } }
      })()

    const setupInbox = async (key: string) => {
      const ch = sb.channel(`user:${key}`, { config: { broadcast: { self: false } } })

      ch.on('broadcast', { event: 'ring' }, ({ payload }) => {
        try { console.log('📨 ring payload received:', payload) } catch (e) { }
        // soportar varias formas de payload: payload.callId / payload.room, payload.from.{id,name} o payload.fromId/payload.fromName
        const cid = String(payload?.callId ?? payload?.room ?? '')
        if (!cid) return

        // 🚫 si el ring viene de mí misma, ignorar (uuid o id numérico)
        const fromId = String(payload?.from?.id ?? payload?.fromId ?? payload?.from_uuid ?? payload?.from_id ?? '')
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



        // Debug: verificar nombres en payload
        console.log('🏷️ [DEBUG] Ring payload recibido:', {
          'from.name': payload?.from?.name,
          'fromName': payload?.fromName,
          'from_name': payload?.from_name,
          'name': payload?.name,
          'fromId': fromId
        })

        const fromName = String(payload?.from?.name ?? payload?.fromName ?? payload?.from_name ?? payload?.name ?? 'Invitado')
        const transcriptFlag = Boolean(payload?.transcript || payload?.from?.transcript || payload?.from?.transcribe)
        const idLlamada = payload?.id_llamada ? Number(payload.id_llamada) : undefined
        
        console.log('🔧 Ring procesado:', { callId: cid, fromId, fromName, transcript: transcriptFlag, id_llamada: idLlamada })
        
        log(`← ring on user:${key} from ${fromId} (${fromName}) callId=${cid}`)
        setCallId(cid); callIdRef.current = cid
        setRole('callee'); roleRef.current = 'callee'
        callerUserIdRef.current = fromId
        calleeUserIdRef.current = String(meId || key)
        setPeerId(fromId)
        setIncoming({ 
          callId: cid, 
          fromId, 
          fromName, 
          transcript: transcriptFlag,
          id_llamada: idLlamada 
        }) // mostrar notificación
        try { navigator.vibrate?.(200) } catch { }
      })

      ch.on('broadcast', { event: 'accept' }, async ({ payload }) => {
        if (payload.callId !== callIdRef.current) return
        log(`← accept (via user:${key}) de ${payload.from}`)
        console.log('📞 [ACCEPT] Recibido evento accept:', { callId: payload.callId, from: payload.from, id_llamada: payload.id_llamada, role: roleRef.current })
        if (roleRef.current === 'caller') {
          console.log('📞 [ACCEPT] Soy caller, procesando aceptación...')
          setCallRowId(payload.id_llamada ?? null)
          if (!localStreamRef.current) {
            console.log('📞 [ACCEPT] Habilitando cámara...')
            await enableCam()
          }
          // ⚠️ NO agregar participante - ya se agregó en create_call_with_modal_data
          console.log('📞 [ACCEPT] Uniéndome al canal de llamada...')
          await joinCallChannel(payload.callId)        // **espera SUBSCRIBED**
          setInCall(true)
          console.log('📞 [ACCEPT] Iniciando llamada (enviando offer)...')
          await startCall()                            // ahora sí, offer
          console.log('📞 [ACCEPT] ✅ Proceso de aceptación completado')
        }
      })

      ch.on('broadcast', { event: 'reject' }, async ({ payload }) => {
        if (payload.callId !== callIdRef.current) return
        markHandled(payload.callId)
        log(`← reject (via user:${key})`)
        setIncoming(null) // cerrar banner

        // Si soy el caller (Usuario A), redirigir a pantalla principal
        if (roleRef.current === 'caller') {
          console.log('📞 [REJECT] Llamada rechazada por el peer, redirigiendo...')
          await resetCall()
          redirectToMainPage()
        } else {
          await resetCall()
        }
      })

      ch.on('broadcast', { event: 'cancel' }, async ({ payload }) => {
        if (payload.callId !== callIdRef.current) return
        markHandled(payload.callId)
        log(`← cancel (via user:${key})`)
        setIncoming(null) // cerrar banner

        // Si soy el callee (Usuario B), redirigir a pantalla principal
        if (roleRef.current === 'callee') {
          console.log('📞 [CANCEL] Llamada cancelada por el caller, redirigiendo...')
          await resetCall()
          redirectToMainPage()
        } else {
          await resetCall()
        }
      })

      await ensureSubscribed(ch)
      setInboxReady(true)
      log(`✓ SUBSCRIBED inbox user:${key}`)
      inboxesRef.current.push(ch)
      if (!inbox) setInbox(ch)
    }

      ; (async () => {
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
    
    // ⚠️ Prevenir ejecuciones múltiples con ref persistente
    if (autoCallExecutedRef.current) {
      return
    }
    
    setPeerId(to)
    autoCallExecutedRef.current = true
    
    ; (async () => {
      if (!localStreamRef.current) await enableCam()
      // Check if caller wanted transcript saved (sessionStorage or URL param)
      const fromStorage = sessionStorage.getItem('vc_transcript') === '1'
      const fromUrl = qp('transcript') === '1'
      const shouldTranscript = fromStorage || fromUrl
      await makeCall(to, shouldTranscript)
      try {
        sessionStorage.removeItem('vc_transcript')
        // ✅ NO limpiar vc_call_title y vc_call_description aquí
        // Se limpiarán solo al final de la llamada en endLocalCall
      } catch { }
    })()
  }, [sb, meId, inboxReady])

  // 3.b) AUTO-ACCEPT (con fallback a toast local si falta gate/token)
  useEffect(() => {
    if (!sb) return

    const incoming = qp('incoming') || qp('room');
    const from = qp('from') || qp('peer') || qp('to');
    const auto = qp('autoaccept');
    const token = qp('aa');
    const idLlamadaParam = qp('id_llamada'); // ⚠️ Leer ID de llamada desde URL

    if (!incoming || !from || auto !== '1') return;
    if (!inboxReady) return;

    const gateKey = `aa:${incoming}`;
    const ok = sessionStorage.getItem(gateKey) === '1';

    if (!ok || token !== incoming) {
      log('~ auto-accept bloqueado (sin gate o token inválido) → muestro toast local');
      setRole('callee');
      roleRef.current = 'callee';
      setPeerId(from);
      const existingCallId = idLlamadaParam ? Number(idLlamadaParam) : undefined;
      setIncoming({ callId: incoming, fromId: from, fromName: 'Invitado', id_llamada: existingCallId });
      return;
    }

    // ✅ Gate/Token OK → continuar auto-aceptación
    sessionStorage.removeItem(gateKey);

    setCallId(incoming); callIdRef.current = incoming;
    setRole('callee'); roleRef.current = 'callee';
    setPeerId(from);
    callerUserIdRef.current = from;
    calleeUserIdRef.current = String(meId || meNumericId || '');

    (async () => {
      if (!localStreamRef.current) await enableCam();
      
      // ✅ NO CREAR NUEVA LLAMADA - Usar la existente desde URL
      const existingCallId = idLlamadaParam ? Number(idLlamadaParam) : null;
      
      if (existingCallId && existingCallId > 0) {
        setCallRowId(existingCallId);
        // ⚠️ NO agregar participante - ya se agregó en create_call_with_modal_data
      }
      
      await joinCallChannel(incoming);
      setInCall(true);

      // avisar al caller que aceptamos
      const keys = await resolvePeerKeys(sb, String(from), log);
      const targets = pickTargets(keys);
      for (const key of targets) {
        const ch = sb.channel(`user:${key}`);
        await ensureSubscribed(ch);
        await ch.send({
          type: 'broadcast',
          event: 'accept',
          payload: { callId: incoming, from: meId, id_llamada: existingCallId ?? undefined },
        });
        await ch.unsubscribe();
      }
    })();
  }, [sb, inboxReady])

  // ========= 3) Acciones Call/Accept/Reject/Cancel
  const makeCall = async (peerOverride?: string, sendTranscript: boolean = false) => {
  // ACTIVAR TRANSCRIPCIÓN INMEDIATAMENTE SI ES SOLICITADA
  if (sendTranscript) {
    setCallTranscriptActive(true)
  }
  if (!sb) return
  if (!inboxReady) return alert('Aún suscribiéndose al inbox… probá de nuevo en un segundo')
  // 🔒 Prevent creating a call if one is already in progress
  if (callRowId !== null) {
    log('⚠️ Ya existe una llamada en curso, evitando duplicado')
    return
  }
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
  // Asegurar que enviamos un nombre válido (SIEMPRE resolver para evitar cache incorrecto)
  let nameToSend = meName
  // FORZAR resolución siempre (sin importar el valor actual de meName)
  try {
    if (meNumericId != null) {
      try {
        const { data, error } = await sb.rpc('get_user_by_id_usuario', { p_id_usuario: Number(meNumericId) })
        if (!error && data) {
          const u = Array.isArray(data) ? data[0] : data
          const resolved = (u && (u.apodo || u.nombre || u.mail || u.User_id || u.user_id)) || null
          if (resolved) { nameToSend = String(resolved); setMeName(nameToSend) }
        }
      } catch (e) {
        // Silently fail
      }
    } else if (meId) {
      try {
        const res = await fetch(`/api/users/uuid/${meId}`)
        if (res.ok) {
          const json = await res.json()
          const resolved = (json && (json.apodo || json.nombre || json.mail || json.User_id || json.user_id)) || null
          if (resolved) { nameToSend = String(resolved); setMeName(nameToSend) }
        }
      } catch (e) {
        // Silently fail
      }
    }
  } catch (e) {
    // Silently fail
  }
  // 🔥 CREAR LA LLAMADA EN LA BASE DE DATOS ANTES DE ENVIAR EL RING
  const idRow = await dbStartCall()
  if (idRow) setCallRowId(idRow)
  for (const key of finalTargets) {
    const ch = sb.channel(`user:${key}`)
    await ensureSubscribed(ch)
    const ringPayload = {
      callId: id,
      room: id,
      from: { id: meId, name: nameToSend, transcript: !!sendTranscript },
      transcript: !!sendTranscript,
      id_llamada: idRow // ⚠️ Pasar el ID de la llamada creada
    }
    await ch.send({
      type: 'broadcast',
      event: 'ring',
      payload: ringPayload,
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
    if (!localStreamRef.current) {
      await enableCam()
    }
    // ⚠️ NO agregar participante - ya se agregó en create_call_with_modal_data
    await joinCallChannel(currentCallId)
    setInCall(true)
    setCallRowId(incoming.id_llamada ?? null)
    // Avisar al caller que aceptamos
    const keys = await resolvePeerKeys(sb, String(toId), log)
    const targets = pickTargets(keys)
    for (const key of targets) {
      const ch = sb.channel(`user:${key}`)
      await ensureSubscribed(ch)
      await ch.send({
        type: 'broadcast',
        event: 'accept',
        payload: {
          callId: currentCallId,
          from: meId,
          id_llamada: incoming.id_llamada
        }
      })
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
    await resetCall()
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
    await resetCall()
  }

  // ========= 4) Canal de llamada + WebRTC
  const mkPC = () => {
    const existingPC = pcRef.current
    // ⚠️ Si ya existe una PC válida, no crear otra (previene duplicación)
    if (existingPC && existingPC.connectionState !== 'closed' && existingPC.connectionState !== 'failed') {
      return
    }
    
    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] })

    pc.onicecandidate = (e) => {
      if (e.candidate) sendSignal({ type: 'ice', candidate: e.candidate.toJSON(), from: meId })
    }

    pc.ontrack = (e) => {
      log('← track ' + e.track.kind)
      const stream = e.streams[0]
      if (!stream) return
      
      if (remoteVideoRef.current) {
        const videoEl = remoteVideoRef.current
        videoEl.srcObject = stream
        // Esperar a que el metadata esté listo antes de reproducir
        videoEl.onloadedmetadata = () => {
          videoEl.play().catch(err => {
            // Ignorar errores de play() cuando el componente se desmonta
            if (err.name !== 'AbortError') {
              log('! remote video play() blocked: ' + err?.message)
            }
          })
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
    if (callCh) { try { await callCh.unsubscribe() } catch { } }

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

    ch.on('broadcast', { event: 'ring' }, ({ payload }) => {
  // soportar varias formas de payload: payload.callId / payload.room, payload.from.{id,name} o payload.fromId/payload.fromName
  const cid = String(payload?.callId ?? payload?.room ?? '')
  // 🚫 si el ring viene de mí misma, ignorar (uuid o id numérico)
  const fromId = String(payload?.from?.id ?? payload?.fromId ?? payload?.from_uuid ?? payload?.from_id ?? '')
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
  const fromName = String(payload?.from?.name ?? payload?.fromName ?? payload?.from_name ?? payload?.name ?? 'Invitado')
  const transcriptFlag = Boolean(payload?.transcript || payload?.from?.transcript || payload?.from?.transcribe)
  const idLlamada = payload?.id_llamada // ⚠️ Obtener el ID de la llamada original
  log(`← ring from ${fromId} (${fromName}) callId=${cid}`)
  setCallId(cid); callIdRef.current = cid
  setRole('callee'); roleRef.current = 'callee'
  callerUserIdRef.current = fromId
  calleeUserIdRef.current = String(meId)
  setPeerId(fromId)
  setIncoming({
    callId: cid,
    fromId,
    fromName,
    transcript: transcriptFlag,
    id_llamada: idLlamada // ⚠️ Guardar el ID de la llamada original
  }) // mostrar notificación
  try { navigator.vibrate?.(200) } catch { }
})

    // handle remote peer announcing they started/stopped sharing (so we can adjust fit)
    ch.on('broadcast', { event: 'sharing' }, ({ payload }: any) => {
      try {
        const from = String(payload?.from ?? '')
        if (!from || from === meId) return
        const sharing = !!payload?.sharing
        setPeerSharing(sharing)
        log(`← sharing ${sharing ? 'START' : 'STOP'} from ${from}`)
      } catch (e) { }
    })

    // handle transcript sync between peers (1-a-1 calls only)
    ch.on('broadcast', { event: 'transcript_sync' }, ({ payload }: any) => {
      try {
        const fromUserId = String(payload?.fromUserId ?? '')
        const isActive = Boolean(payload?.active)
        const requestSync = Boolean(payload?.requestSync)

        // Ignorar mis propios mensajes
        if (fromUserId === meId || fromUserId === String(meNumericId)) return

        log(`📝 transcript_sync from ${fromUserId}: active=${isActive}, requestSync=${requestSync}`)

        // Si el peer solicita sync, enviarle mi estado actual
        if (requestSync) {
          ch.send({
            type: 'broadcast',
            event: 'transcript_sync',
            payload: {
              active: callTranscriptActive,
              fromUserId: meId,
              requestSync: false
            }
          })
          log(`📝 Responded to transcript sync request: active=${callTranscriptActive}`)
        }

        // Si el peer tiene transcript activo y yo no, activarlo automáticamente
        if (isActive && !callTranscriptActive) {
          log('📝 Auto-enabling transcript to sync with peer')
          setCallTranscriptActive(true)
        }
      } catch (e) {
        log('! Error handling transcript_sync: ' + (e as Error)?.message)
      }
    })

    ch.on('broadcast', { event: 'signal' }, async ({ payload }) => {
      const m = payload as SignalPayload & { from: string }
      if (m.from === meId) return
      if (!pcRef.current) {
        mkPC()
      }

      // Evitar procesamiento concurrente de señales
      // Queue signal processing instead of dropping it
      if (processingSignalRef.current && (m.type === 'offer' || m.type === 'answer')) {
        log(`! queuing ${m.type}, already processing signal`)
        // Wait a bit and retry
        setTimeout(() => {
          if (callChRef.current) {
            callChRef.current.send({ type: 'broadcast', event: 'signal', payload: m })
          }
        }, 100)
        return
      }

      if (m.type === 'offer') {
        log('← offer')
        processingSignalRef.current = true
        try {
          // Handle glare condition (both trying to call simultaneously)
          if (pcRef.current!.signalingState === 'have-local-offer') {
            await pcRef.current!.setLocalDescription({type: 'rollback'} as RTCSessionDescriptionInit)
          }
          if (pcRef.current!.signalingState === 'stable' || pcRef.current!.signalingState === 'have-remote-offer') {
            if (!localStreamRef.current) {
              await enableCam()
            }
            await pcRef.current!.setRemoteDescription(m.sdp)
            
            // Agregar tracks sin duplicados
            const senders = pcRef.current!.getSenders()
            localStreamRef.current!.getTracks().forEach(t => {
              const existingSender = senders.find(s => s.track && s.track.id === t.id && s.track.kind === t.kind)
              if (!existingSender) {
                const senderOfSameKind = senders.find(s => s.track && s.track.kind === t.kind)
                if (senderOfSameKind && senderOfSameKind.track) {
                  senderOfSameKind.replaceTrack(t).catch(e => console.error('Error replacing track:', e))
                } else {
                  try {
                    pcRef.current!.addTrack(t, localStreamRef.current!)
                  } catch (e) { console.error('Error adding track:', e) }
                }
              }
            })
            
            const answer = await pcRef.current!.createAnswer()
            await pcRef.current!.setLocalDescription(answer)
            await sendSignal({ type: 'answer', sdp: pcRef.current!.localDescription!, from: meId })
            log('→ answer enviado')
            drainIceQueue()
          } else {
            log(`! skipping offer, wrong state: ${pcRef.current!.signalingState}`)
          }
        } catch (error) {
          log(`! error processing offer: ${error}`)
        } finally {
          processingSignalRef.current = false
        }
      } else if (m.type === 'answer') {
        log('← answer')
        processingSignalRef.current = true
        try {
          if (pcRef.current!.signalingState === 'have-local-offer') {
            await pcRef.current!.setRemoteDescription(m.sdp)
            drainIceQueue()
          } else {
            log(`! skipping answer, wrong state: ${pcRef.current!.signalingState}`)
          }
        } catch (error) {
          log(`! error processing answer: ${error}`)
          console.error('📞 [SIGNAL-ANSWER] ❌ Error procesando answer:', error)
        } finally {
          processingSignalRef.current = false
        }
      } else if (m.type === 'ice') {
        if (!pcRef.current) mkPC()
        if (!pcRef.current!.remoteDescription) {
          pendingIceRef.current.push(m.candidate)
          return
        }
        try { await pcRef.current!.addIceCandidate(m.candidate) } catch (e) { log('! addIceCandidate: ' + (e as Error).message) }
      } else if (m.type === 'hangup') {
        log('← hangup')
        setIsRemoteHangup(true)
        
        // ⚠️ Solo mostrar modal si se usó transcripción Y hay datos (usar refs para valores actuales)
        if (wasTranscriptionUsedRef.current && transcriptEntriesCountRef.current > 0) {
          setShowSaveTranscriptModal(true)
        } else {
          // Si no hay transcripción, colgar directamente sin modal
          endLocalCall('remote_hangup')
          redirectToMainPage()
        }
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
      ; (async () => {
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

    if (!pcRef.current) {
      mkPC()
    }
    // Agregar tracks sin duplicados
    const senders = pcRef.current!.getSenders()
    localStreamRef.current.getTracks().forEach(t => {
      const existingSender = senders.find(s => s.track && s.track.id === t.id && s.track.kind === t.kind)
      if (!existingSender) {
        const senderOfSameKind = senders.find(s => s.track && s.track.kind === t.kind)
        if (senderOfSameKind && senderOfSameKind.track) {
          senderOfSameKind.replaceTrack(t).catch(e => console.error('Error replacing track:', e))
        } else {
          try {
            pcRef.current!.addTrack(t, localStreamRef.current!)
          } catch (e) { console.error('Error adding track:', e) }
        }
      }
    })
    
    const offer = await pcRef.current!.createOffer()
    await pcRef.current!.setLocalDescription(offer)
    await sendSignal({ type: 'offer', sdp: pcRef.current!.localDescription!, from: meId })
    log('→ offer enviado')
  }

  const sendSignal = async (payload: SignalPayload) => {
    const ch = callChRef.current
    if (!ch) { log('sendSignal: no call channel'); return }
    
    try {
      await ch.send({ type: 'broadcast', event: 'signal', payload })
      if (payload.type !== 'ice') setInCall(true)
      log('→ signal ' + payload.type)
    } catch (e) {
      console.error(`❌ Error enviando señal ${payload.type}:`, e)
      // Retry once after a short delay
      if (payload.type !== 'ice') {
        console.log(`🔄 Reintentando envío de ${payload.type}...`)
        await new Promise(r => setTimeout(r, 500))
        try {
          await ch.send({ type: 'broadcast', event: 'signal', payload })
          log('→ signal ' + payload.type + ' (retry ok)')
        } catch (retryError) {
          console.error(`❌ Reintento fallido para ${payload.type}:`, retryError)
        }
      }
    }
  }

  const dbStartCall = async (): Promise<number | null> => {

  if (!sb) {
    console.log('❌ No hay cliente Supabase');
    return null;
  }

  try {
    // 🔍 PASO 1: Leer datos del modal desde sessionStorage
    const storedTitle = sessionStorage.getItem('vc_call_title');
    const storedDescription = sessionStorage.getItem('vc_call_description');

    console.log('📖 Datos del modal leídos:');
    console.log('   - Título:', storedTitle);
    console.log('   - Descripción:', storedDescription);

    // 🔍 PASO 2: Preparar valores finales (modal o fallbacks)
    const finalTitle = (storedTitle && storedTitle.trim())
      ? storedTitle.trim()
      : 'Llamada Boomerang';

    const finalDescription = (storedDescription && storedDescription.trim())
      ? storedDescription.trim()
      : 'Llamada realizada desde la aplicación';

    // 🔍 PASO 3: Obtener IDs de usuarios
    const callerNumericId = meNumericId;
    if (!callerNumericId) {
      console.error('❌ No se pudo obtener el ID numérico del caller');
      return null;
    }

    // Convertir callee ID (puede ser UUID o número)
    let calleeNumericId: number | null = null;
    const calleeInput = calleeUserIdRef.current;

    if (!calleeInput) {
      console.error('❌ No se proporcionó un ID de callee');
      return null;
    }

    if (/^\d+$/.test(calleeInput)) {
      // Es un número, usarlo directamente
      calleeNumericId = Number(calleeInput);
    } else {
      // Es UUID, convertir a ID numérico
      try {
        const { data: userData, error: userError } = await sb
          .from('Usuario')
          .select('id')
          .eq('User_id', calleeInput)
          .maybeSingle();

        if (userError) {
          console.error('❌ Error al buscar el ID numérico del callee:', userError);
          return null;
        }

        if (!userData?.id) {
          console.error('❌ No se encontró el ID numérico para el UUID:', calleeInput);
          return null;
        }

        calleeNumericId = userData.id;
      } catch (e) {
        console.error('❌ Error al convertir UUID a ID numérico:', e);
        return null;
      }
    }

    console.log('🔍 IDs de usuarios:');
    console.log('   - Caller (yo):', callerNumericId);
    console.log('   - Callee (contactado):', calleeNumericId);

    // 🔍 PASO 4: Validar que los IDs sean válidos
    if (!calleeNumericId || calleeNumericId <= 0) {
      console.error('❌ ID de callee inválido:', calleeNumericId);
      return null;
    }

    // 🔍 PASO 5: Preparar parámetros para el SP
    const rpcParams = {
      p_titulo: finalTitle,
      p_descripcion: finalDescription,
      p_caller_id: callerNumericId,
      p_callee_id: calleeNumericId,
      p_id_grupo: null
    };

    console.log('📞 Llamando a create_call_with_modal_data con:', rpcParams);

    // 🔍 PASO 6: Ejecutar el stored procedure
    const { data, error } = await sb.rpc('create_call_with_modal_data', rpcParams);

    console.log('📋 RESPUESTA DEL SP:');
    console.log('   - data:', data);
    console.log('   - error:', error);

    if (error) {
      console.error('❌ ERROR del SP:', error.message);
      return null;
    }

    if (data && typeof data === 'number' && data > 0) {
      console.log('🎉 ¡Llamada creada exitosamente! ID:', data);
      return data;
    } else {
      console.error('❌ Respuesta inválida del SP:', data);
      return null;
    }

  } catch (e: any) {
    console.error('💥 Error crítico en dbStartCall:', e?.message || e);
    return null;
  }
};


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
  if (llamadaId == null || llamadaId <= 0) { log('! add_call_participant: llamadaId inválido, omito'); return }
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
        try { await localVideoRef.current.play() } catch { }
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
    // Verificar si se usó transcripción durante la llamada
    if (wasTranscriptionUsed && transcriptEntries.length > 0) {
      setShowSaveTranscriptModal(true)
      return // No colgar aún, esperar decisión del usuario
    }

    // Si no se usó transcripción, colgar normalmente
    await performHangup()
  }

  const performHangup = async () => {
    if (callChRef.current && callIdRef.current) {
      try { await sendSignal({ type: 'hangup', from: meId }) } catch { }
    }
    await endLocalCall('local_hangup')
    // Redirigir a pantalla principal
    redirectToMainPage()
  }

  const saveTranscription = async (callTitle: string) => {
    console.log('📝 [SAVE] Guardando transcripción con título:', callTitle)

    // Sanitizar título para evitar problemas con caracteres especiales
    const sanitizedTitle = callTitle
      .normalize('NFD') // Descomponer caracteres acentuados
      .replace(/[\u0300-\u036f]/g, '') // Eliminar marcas diacríticas (tildes, acentos)
      .replace(/[^\w\s-]/g, '') // Eliminar caracteres especiales excepto palabras, espacios y guiones
      .replace(/\s+/g, '_') // Reemplazar espacios con guiones bajos
      .trim()

    // Validación temprana: si no hay entradas, no hay nada que guardar
    if (transcriptEntries.length === 0) {
      console.log('⚠️ [SAVE] No hay entradas de transcripción para guardar')
      return { success: false, message: 'No hay transcripción para guardar' }
    }

    if (!sb || !transcriptEntries.length) {
      throw new Error('No hay datos de transcripción para guardar')
    }

    // Usar meId que ya está disponible y autenticado en el componente
    if (!meId) {
      throw new Error('Usuario no identificado en la sesión')
    }

    console.log('📝 [SAVE] Usuario actual meId:', meId)

    // **NUEVA ESTRATEGIA: Usar API para convertir UUID a ID numérico**
    console.log('📝 [SAVE] Convirtiendo UUID a ID numérico usando API')

    // Función helper para convertir UUID a ID usando tu API
    const convertUuidToNumericId = async (uuid: string): Promise<number | null> => {
      try {
        console.log(`📝 [SAVE] Convirtiendo UUID ${uuid} a ID numérico...`)
        const response = await fetch(`/api/users/uuid/${uuid}`)

        if (!response.ok) {
          console.error(`📝 [SAVE] Error API para UUID ${uuid}:`, response.status, response.statusText)
          return null
        }

        const data = await response.json()
        console.log(`📝 [SAVE] Respuesta API para UUID ${uuid}:`, data)

        return data.id || null
      } catch (error) {
        console.error(`📝 [SAVE] Error convirtiendo UUID ${uuid}:`, error)
        return null
      }
    }

    // Obtener ID numérico del usuario actual
    let currentUserId: number



    // Preferir meNumericId si está disponible (usuario autenticado)
    if (meNumericId !== null) {
      currentUserId = meNumericId
    } else if (meId.includes('-')) {
      // Es UUID, verificar si es válido en BD
      const validUuids = [
        '685a4741-f1d4-4c03-8ec6-4d200ff67682', // ID=2
        '4b268139-258c-4dc4-9a0f-12b536dfc637'  // ID=3
      ]

      if (!validUuids.includes(meId)) {
        // UUID temporal/anónimo - generar ID temporal basado en hash
        const tempId = Math.abs(meId.split('-').join('').slice(0, 8).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0))
        currentUserId = tempId
      } else {
        // UUID válido, convertir a ID numérico usando API
        const numericId = await convertUuidToNumericId(meId)
        if (!numericId) {
          throw new Error(`No se pudo convertir UUID válido ${meId} a ID numérico`)
        }
        currentUserId = numericId
      }
    } else {
      // Ya es ID numérico
      currentUserId = parseInt(meId)
      if (isNaN(currentUserId)) {
        throw new Error('ID de usuario inválido')
      }
    }

    console.log('📝 [SAVE] ID numérico del usuario actual:', currentUserId)

    // Obtener todos los usuarios únicos que participaron en la transcripción
    const uniqueUserIds = new Set(transcriptEntries.map(entry => entry.userId))
    const participantUserIds = Array.from(uniqueUserIds)
    console.log('📝 [SAVE] Usuarios participantes (raw):', participantUserIds)

    // Debug: Mostrar TODAS las entradas de transcripción para entender de dónde vienen los UUIDs
    console.log('📝 [SAVE] TODAS las transcriptEntries para debug:',
      transcriptEntries.map((entry, index) => ({
        index,
        userId: entry.userId,
        userName: entry.userName,
        timestamp: entry.timestamp,
        text: entry.text.substring(0, 30) + '...',
        isValidUuid: ['685a4741-f1d4-4c03-8ec6-4d200ff67682', '4b268139-258c-4dc4-9a0f-12b536dfc637'].includes(entry.userId)
      }))
    )

    // Mostrar qué UUIDs únicos están presentes
    const uniqueUuids = new Set(transcriptEntries.map(entry => entry.userId))
    const allUuids = Array.from(uniqueUuids)
    console.log('📝 [SAVE] UUIDs únicos encontrados en transcriptEntries:', allUuids)
    console.log('📝 [SAVE] Análisis de UUIDs:')
    allUuids.forEach(uuid => {
      const isValid = ['685a4741-f1d4-4c03-8ec6-4d200ff67682', '4b268139-258c-4dc4-9a0f-12b536dfc637'].includes(uuid)
      const count = transcriptEntries.filter(e => e.userId === uuid).length
      console.log(`  - ${uuid}: ${isValid ? '✅ VÁLIDO' : '❌ INVÁLIDO'} (${count} entradas)`)
    })

    // Convertir participantes a IDs numéricos
    const validUuids = [
      '685a4741-f1d4-4c03-8ec6-4d200ff67682', // ID=2
      '4b268139-258c-4dc4-9a0f-12b536dfc637'  // ID=3
    ]

    const numericParticipantIds: number[] = []

    for (const userId of participantUserIds) {
      let numericId: number | null = null

      if (userId.includes('-')) {
        // Es UUID, verificar si es válido antes de llamar API
        if (!validUuids.includes(userId)) {
          // UUID temporal/anónimo - generar ID temporal consistente
          const tempId = Math.abs(userId.split('-').join('').slice(0, 8).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0))
          numericId = tempId
        } else {
          // UUID válido, convertir usando API
          numericId = await convertUuidToNumericId(userId)
          if (!numericId) {
            continue // Omitir si no se puede convertir
          }
        }
      } else {
        // Ya es ID numérico
        const parsed = parseInt(userId)
        if (isNaN(parsed)) {
          console.warn(`⚠️ [SAVE] ID inválido ${userId}, omitiendo...`)
          continue
        }
        numericId = parsed
      }

      numericParticipantIds.push(numericId)
      console.log(`📝 [SAVE] Participante ${userId} → ID numérico ${numericId}`)
    }

    console.log('📝 [SAVE] Participantes con IDs numéricos finales:', numericParticipantIds)

    // Convertir transcriptEntries a formato legible pero JSON válido
    const readableContent = transcriptEntries
      .map(entry => `{"${entry.userName}": "${entry.text.replace(/"/g, '\\"')}"}`)
      .join('\n')

    // Crear timestamp para el nombre del archivo
    const now = new Date()
    const timestamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, '').replace('T', '_')
    const filename = `transcript_${timestamp}.ndjson`

    // Crear un blob con el contenido legible en formato NDJSON
    const blob = new Blob([readableContent], { type: 'application/x-ndjson' })

    const savedPaths: string[] = []

    // Guardar archivo para el usuario actual
    const folderPath = `${currentUserId}/${sanitizedTitle}/${filename}`

    try {
      const { data: storageData, error: storageError } = await sb.storage
        .from('calls')
        .upload(folderPath, blob, {
          cacheControl: '3600',
          upsert: false // No sobrescribir si existe
        })

      if (storageError) {
        if (!storageError.message.includes('already exists')) {
          console.warn(`⚠️ [SAVE] Error subiendo archivo:`, storageError.message)
        }
      }

      if (storageData) {
        savedPaths.push(storageData.path)
        console.log(`✅ [SAVE] Transcripción guardada exitosamente`)
      }

    } catch (error) {
      console.error(`❌ [SAVE] Error guardando archivo:`, error)
      // No parar el proceso - continuar con colgado
    }

    // **ÉXITO GARANTIZADO**: Aunque no se guarde en storage, la llamada debe continuar
    if (savedPaths.length === 0) {
      console.warn('⚠️ [SAVE] No se pudo guardar en storage, pero continuamos con el colgado')
    } else {
      console.log(`✅ [SAVE] Transcripción guardada en storage para ${savedPaths.length} usuarios`)
    }

    // **OPCIONAL**: Intentar guardar en BD solo si es posible (no crítico para el colgado)
    try {
      // Intentar guardar registro en tabla Transcripcion
      const { data, error } = await sb
        .from('Transcripcion')
        .insert({
          id_usuario: currentUserId, // Ahora tenemos el ID numérico correcto
          titulo: callTitle, // Título original para mostrar
          path_archivo: `${currentUserId}/${sanitizedTitle}/${filename}` // Ruta sanitizada para el chatbot
        })
        .select()
        .single()

      if (!error && data) {
        console.log('✅ [SAVE] Registro guardado en BD exitosamente')
        return data
      }
    } catch (dbError) {
      console.warn('⚠️ [SAVE] Error guardando en BD:', dbError)
    }

    console.log('✅ [SAVE] Proceso completado (archivos en storage)')
    return { success: true, message: 'Archivos guardados en storage' }
  }

  const handleSaveTranscriptChoice = async (saveTranscript: boolean, title?: string) => {
    setShowSaveTranscriptModal(false)

    if (saveTranscript && title) {
      console.log('📝 [SAVE] Guardando transcripción con título:', title)
      console.log('📝 [SAVE] Número de entradas de transcripción:', transcriptEntries.length)
      console.log('📝 [SAVE] Estado de Supabase (sb):', !!sb)
      console.log('📝 [SAVE] ID del usuario (meId):', meId)

      // **CRÍTICO**: El guardado NO puede impedir que la llamada se cuelgue
      try {
        await Promise.race([
          saveTranscription(title),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout guardando transcripción')), 5000)
          )
        ])
        console.log('✅ [SAVE] Transcripción guardada exitosamente')
      } catch (error) {
        console.error('❌ [SAVE] Error guardando transcripción (no crítico):', error)
        // NO mostrar alert que bloquee el colgado - solo log
        console.warn('⚠️ [SAVE] Continuando con colgado a pesar del error de guardado')
      }
    } else {
      console.log('❌ [SAVE] Usuario decidió no guardar la transcripción')
    }

    // **NUEVO**: Verificar si es hangup local o remoto
    if (isRemoteHangup) {
      // Es hangup remoto - limpiar y redirigir
      setIsRemoteHangup(false) // Reset del estado
      await endLocalCall('remote_hangup')
      redirectToMainPage()
    } else {
      // Es hangup local - proceder con colgado
      await performHangup()
    }
  }

  const endLocalCall = async (reason: string = 'normal') => {
    if (ending) return
    setEnding(true)
    log('~ endLocalCall (' + reason + ')')

    try { await dbEndCall() } catch { }

    // Marcar llamada como manejada y cerrar toast
    markHandled(callIdRef.current)
    setIncoming(null)

    cleanupPC()

    // ⚠️ IMPORTANTE: NO cerramos los inbox; así pueden volver a llamarte.
    try { await callCh?.unsubscribe() } catch { }
    setCallCh(null)
    callChRef.current = null

    setCallId(null); callIdRef.current = null
    setCallRowId(null) // 🔧 Reset call row ID
    setRole('idle'); roleRef.current = 'idle'
    setCallPeers(0)
    pendingIceRef.current = []
    setInCall(false)
    setCallTranscriptActive(false)

    // 🧹 LIMPIAR sessionStorage del modal AL FINAL de la llamada
    try {
      sessionStorage.removeItem('vc_call_title')
      sessionStorage.removeItem('vc_call_description')
      log('🧹 SessionStorage del modal limpiado al finalizar llamada')
    } catch (e) {
      log('⚠️ Error limpiando sessionStorage: ' + e)
    }

    setEnding(false)
  }

  const cleanupPC = () => {
    try { pcRef.current?.getSenders().forEach(s => { try { s.track?.stop() } catch { } }) } catch { }
    try { localStreamRef.current?.getTracks().forEach(t => t.stop()) } catch { }
    if (localVideoRef.current?.srcObject) localVideoRef.current.srcObject = null
    if (remoteVideoRef.current?.srcObject) remoteVideoRef.current.srcObject = null
    try { pcRef.current?.close() } catch { }
    pcRef.current = null
    localStreamRef.current = null
  }

  const resetCall = async () => {
    // Finalizar llamada en DB antes de limpiar
    try { await dbEndCall() } catch { }
    
    // No marcamos acá porque reject/cancel ya marcaron; si cae por otro camino:
    markHandled(callIdRef.current)
    setIncoming(null)

    setCallId(null); callIdRef.current = null
    setCallRowId(null) // 🔧 Reset call row ID
    setRole('idle'); roleRef.current = 'idle'
    setCallPeers(0)
    cleanupPC()
    try { callCh?.unsubscribe() } catch { }
    setCallCh(null)
    callChRef.current = null
    setInCall(false)
    setCallTranscriptActive(false)
  }

  // Función para redirigir a la pantalla principal cuando se rechaza la llamada
  const redirectToMainPage = () => {
    console.log('🔄 [REDIRECT] Redirigiendo a pantalla principal...')
    router.push('/protected')
  }

  // Ocultar toast si volvemos a idle o perdemos callId
  useEffect(() => {
    if (!callId || role === 'idle') {
      if (incoming) setIncoming(null)
    }
  }, [callId, role]) // eslint-disable-line react-hooks/exhaustive-deps

  // Abrir pizarra en ventana aparte (ruta interna de la app)
  const openWhiteboard = () => {
    const whiteboardUrl = '/protected/pizarra'
    const screenWidth = window.screen.availWidth
    const screenHeight = window.screen.availHeight
    const whiteboardWindow = window.open(
      whiteboardUrl,
      'whiteboard',
      `width=${screenWidth},height=${screenHeight},left=0,top=0,scrollbars=no,toolbar=no,menubar=no,location=no,status=no,resizable=yes`
    )
    if (!whiteboardWindow) {
      alert('No se pudo abrir la pizarra. Por favor permitir pop-ups en tu navegador.')
      return
    }
    setTimeout(() => {
      try { whiteboardWindow.moveTo(0, 0); whiteboardWindow.resizeTo(screenWidth, screenHeight) } catch (e) { console.log('No se pudo maximizar automáticamente:', e) }
    }, 500)
    log('🎨 Pizarra aérea abierta en pantalla completa')
    log("💡 Para compartirla: usa 'Compartir pantalla' y seleccioná la ventana 'whiteboard'")
  }

  // ========= Render
  const showIncomingToast =
    !!incoming &&
    role === 'callee' &&
    !handledCallsRef.current.has(incoming.callId) &&
    handledBump >= 0 // fuerza recomputar cuando cambia handledBump

  // Nombre a mostrar en el header: preferir incoming.fromName, luego peerName, luego fallback 'Invitado'
  const headerDisplayName = (incoming && incoming.fromName) || peerName || 'Invitado'

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
                <div className="font-semibold truncate">{headerDisplayName}</div>
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
              {/* Badge azul: Transcripción activada */}
              {callTranscriptActive && (
                <span className="ml-2 inline-flex items-center gap-2 rounded-full border border-blue-400/40 bg-white/20 text-blue-600 px-2.5 py-1 text-xs backdrop-blur-md">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  Transcripción Activada
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <TimeBadge />
            </div>
          </div>

        </div>
      </header>

      {/* Main */}
      <main className="relative flex-1 min-h-0 overflow-hidden">


        {/* Traducción en tiempo real */}
        <TranslationOverlay
          isActive={translateOn}
          config={translationConfig}
          onConfigChange={updateTranslationConfig}
          state={translation.state}
        />
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
                // No mirror when sharing screen — el peer ya ve correctamente
                mirrored={!shareOn}
              />
              <VideoTile
                name={'Invitado'}
                camOn={true}
                micOn={true}
                inCall={!!callId}
                videoRef={remoteVideoRef}
                muted={translateOn}
                peerSharing={peerSharing}
              />
            </div>

          </section>

          {panel !== 'none' && (
            <aside className="relative z-40 border-l border-white/20 bg-white/30 dark:bg-white/10 backdrop-blur-xl p-4 overflow-hidden h-full max-h-[75vh]">
              {panel === 'chat' && (
                <ChatPanel
                  callCh={callCh}
                  meName={meName}
                  meId={meId}
                  callId={callId}
                  messages={chatMessages}
                  setMessages={setChatMessages}
                  seenMsgIdsRef={chatSeenRef}
                />
              )}
              {panel === 'people' && <div className="text-sm opacity-80">Personas (placeholder)</div>}
              {panel === 'settings' && <div className="text-sm opacity-80">Ajustes (placeholder)</div>}
            </aside>
          )}
        </div>

        {/* === Barra de controles flotante === */}
        <CallControls
          micOn={micOn}
          camOn={camOn}
          shareOn={shareOn}
          translateOn={translateOn}
          transcriptActive={callTranscriptActive}
          translationError={translation.state.error}
          transcriptionError={transcriptionError}
          onToggleMic={toggleLocalMic}
          onToggleCam={toggleLocalCam}
          onToggleShare={toggleShare}
          onToggleTranslate={toggleTranslate}
          onToggleTranscript={toggleTranscript}
          onOpenChat={openChat}
          onOpenWhiteboard={openWhiteboard}
          onHangup={hangup}
        />

        {/* === Notificación de llamada entrante (local) === */}
        {showIncomingToast && (
          <IncomingCallToast
            fromName={incoming!.fromName || 'Invitado'}
            onAccept={accept}
            onReject={reject}
            transcript={incoming!.transcript}
          />
        )}

        {/* === Modal para guardar transcripción === */}
        <SaveTranscriptModal
          open={showSaveTranscriptModal}
          onClose={() => setShowSaveTranscriptModal(false)}
          onChoose={handleSaveTranscriptChoice}
          question="¿Querés guardar la transcripción de esta llamada?"
          submitButtonText="Guardar"
        />
      </main>
    </div>
  )
}

/* =================== Subcomponentes / Helpers UI =================== */

function LinkIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
      <path d="M10 13a5 5 0 007.07 0l1.41-1.41a5 5 0 10-7.07-7.07L10 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 11a5 5 0 00-7.07 0L5.5 12.43a5 5 0 107.07 7.07L14 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"><path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      <span suppressHydrationWarning>{mounted ? now : ''}</span>
    </div>
  )
}

function VideoTile({
  name, isYou, camOn, micOn, inCall, videoRef, muted, peerSharing, mirrored = true,
}: {
  name: string
  isYou?: boolean
  camOn: boolean
  micOn: boolean
  inCall: boolean
  videoRef: RefObject<HTMLVideoElement | null>
  muted?: boolean
  peerSharing?: boolean
  mirrored?: boolean
}) {
  // Debug: Log cuando cambie el estado de muted para video remoto
  useEffect(() => {
    if (!isYou && videoRef.current) {
      console.log(`🔇 [VIDEO] Video remoto muted=${muted}, elemento.muted=${videoRef.current.muted}`);
    }
  }, [muted, isYou, videoRef]);

  const handleToggleFullscreen = async () => {
    const v = videoRef.current
    if (!v) return
    try {
      if (!document.fullscreenElement) {
        if (v.requestFullscreen) await v.requestFullscreen()
        else if ((v as any).webkitRequestFullscreen) (v as any).webkitRequestFullscreen()
        else if ((v as any).msRequestFullscreen) (v as any).msRequestFullscreen()
      } else {
        if (document.exitFullscreen) await document.exitFullscreen()
        else if ((document as any).webkitExitFullscreen) (document as any).webkitExitFullscreen()
        else if ((document as any).msExitFullscreen) (document as any).msExitFullscreen()
      }
    } catch (e) {
      // ignore fullscreen errors
    }
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/20 bg-white/20 dark:bg-white/10 backdrop-blur-md shadow-lg aspect-video">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        onDoubleClick={() => { if (!isYou) void handleToggleFullscreen() }}
        title={isYou ? undefined : 'Doble click para ver en pantalla completa'}
        // Select fit mode: local previews keep cover; remote tiles use cover by default
        // but switch to contain when the peer is sharing a screen so the whole screen fits.
        className={clsx(
          'absolute inset-0 h-full w-full',
          isYou ? 'object-cover' : (peerSharing ? 'object-contain' : 'object-cover'),
          camOn && inCall ? 'opacity-100' : 'opacity-0',
          isYou && mirrored && 'scale-x-[-1]'
        )}
      />
      {/* Fullscreen button for remote tile */}
      {!isYou && camOn && inCall && (
        <button
          onClick={() => { void handleToggleFullscreen() }}
          title="Pantalla completa"
          className="absolute top-2 right-2 z-20 bg-black/60 text-white rounded px-2 py-1 text-xs hover:bg-black/80"
        >
          ⛶
        </button>
      )}
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
      <div className={clsx('absolute inset-0 rounded-2xl pointer-events-none', inCall ? 'ring-1 ring-green-400/30' : 'ring-1 ring-orange-400/30')} />
    </div>
  )
}

/* =================== Barra de controles flotante =================== */

function CallControls({
  micOn, camOn, shareOn, translateOn, transcriptActive, translationError, transcriptionError,
  onToggleMic, onToggleCam, onToggleShare, onToggleTranslate, onToggleTranscript,
  onOpenChat, onOpenWhiteboard, onHangup,
}: {
  micOn: boolean; camOn: boolean; shareOn: boolean; translateOn: boolean; transcriptActive: boolean; translationError: string | null; transcriptionError: string | null;
  onToggleMic: () => void; onToggleCam: () => void; onToggleShare: () => void; onToggleTranslate: () => void; onToggleTranscript: () => void;
  onOpenChat: () => void; onOpenWhiteboard: () => void; onHangup: () => void;
}) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
      <div
        className={clsx(
          "pointer-events-auto flex items-center gap-1.5 rounded-[20px] px-2 py-1.5",
          "bg-white/80 text-gray-800 shadow-xl ring-1 ring-black/5",
          "dark:bg-neutral-900/80 dark:text-neutral-100 dark:ring-white/10",
          "backdrop-blur-xl"
        )}
        style={{ maxWidth: 600, width: "auto", justifyContent: "center" }}
      >
        <RoundBtn active={micOn} onClick={onToggleMic} title={micOn ? 'Silenciar micrófono' : 'Activar micrófono'} icon="mic" />
        <RoundBtn active={camOn} onClick={onToggleCam} title={camOn ? 'Apagar cámara' : 'Encender cámara'} icon="video" />
        <RoundBtn active={shareOn} onClick={onToggleShare} title="Compartir pantalla" icon="monitor" />
        <RoundBtn onClick={onOpenWhiteboard} title="Pizarra" icon="edit" />
        <RoundBtn onClick={onOpenChat} title="Chat" icon="message-square" />

        <span className="mx-3 hidden h-6 w-px bg-black/10 dark:bg-white/15 sm:inline" />

        <button
          onClick={onToggleTranslate}
          className={clsx(
            "hidden sm:inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-all whitespace-nowrap",
            translateOn
              ? "bg-gradient-to-r from-orange-400 to-orange-600 text-white shadow-lg ring-2 ring-orange-300"
              : "bg-gradient-to-r from-orange-300 to-orange-500 text-white/95 hover:text-white hover:shadow-md"
          )}
          title={translateOn ? "Desactivar traducción en tiempo real" : "Activar traducción en tiempo real"}
        >
          <i data-feather="globe" className={clsx("w-4 h-4", translateOn && "animate-pulse")} />
          <span className="text-xs">{translateOn ? "Traducir ON" : "Traducir"}</span>
          {translateOn && translationError && (
            <span className="ml-1 text-xs">⚠️</span>
          )}
        </button>

        <button
          onClick={onToggleTranscript}
          className={clsx(
            "hidden sm:inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-all whitespace-nowrap",
            transcriptActive
              ? "bg-gradient-to-r from-blue-400 to-blue-600 text-white shadow-lg ring-2 ring-blue-300"
              : "bg-gradient-to-r from-blue-300 to-blue-500 text-white/95 hover:text-white hover:shadow-md"
          )}
          title={transcriptActive ? "Desactivar transcripción de llamada" : "Activar transcripción de llamada"}
        >
          <i data-feather="file-text" className={clsx("w-4 h-4", transcriptActive && "animate-pulse")} />
          <span className="text-xs">{transcriptActive ? "ON" : "Transcript"}</span>
          {transcriptActive && transcriptionError && (
            <span className="ml-1 text-xs">⚠️</span>
          )}
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
function ChatPanel({ callCh, meName, meId, callId, messages, setMessages, seenMsgIdsRef }:
  { callCh: any; meName: string; meId: string; callId: string | null; messages: Array<{ id: string; from: string; fromId?: string; text: string; ts: number }>; setMessages: (m: any) => void; seenMsgIdsRef: RefObject<Set<string>> }) {
  const [newMessage, setNewMessage] = useState('')
  const containerRef = useRef<HTMLDivElement | null>(null)

  // Append message locally and optionally send over the call channel
  const sendMessage = async (text: string) => {
    if (!text.trim()) return
    const msgId = String(Date.now()) + Math.random().toString(36).slice(2, 8)
    const msg = { id: msgId, from: meName || 'Yo', fromId: meId, text: text.trim(), ts: Date.now() }
    // mark seen so we don't add again when the channel echoes the message back
    try { seenMsgIdsRef.current?.add(msgId) } catch { }
    setMessages((m: any) => [...m, msg])
    setNewMessage('')
    // Try to send over realtime channel if available
    try {
      if (callCh) {
        await callCh.send({ type: 'broadcast', event: 'chat', payload: msg })
      }
    } catch (e) {
      // ignore send errors — this chat is ephemeral
      console.warn('chat send failed', e)
    }
  }

  // Listen for incoming chat messages on the call channel
  useEffect(() => {
    if (!callCh) return
    const handler = ({ payload }: any) => {
      try {
        const p = payload
        if (!p || !p.text) return
        const incomingId = String(p.id ?? (Date.now() + Math.random().toString(36).slice(2, 8)))
        // ignore messages we've already seen (e.g. our own echoed message)
        if (seenMsgIdsRef.current && seenMsgIdsRef.current.has(incomingId)) return
        try { seenMsgIdsRef.current?.add(incomingId) } catch { }
        setMessages((m: any) => [...m, { id: incomingId, from: p.from || 'Invitado', fromId: p.fromId, text: p.text, ts: Number(p.ts || Date.now()) }])
      } catch (e) { console.warn('chat payload parse error', e) }
    }
    try { callCh.on('broadcast', { event: 'chat' }, handler) } catch (e) { /* ignore */ }
    return () => {
      try { callCh.off('broadcast', { event: 'chat' }, handler) } catch (e) { /* ignore */ }
    }
  }, [callCh])


  // Auto-scroll when new messages arrive
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages.length])

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/20">
        <i data-feather="message-square" className="w-5 h-5" />
        <h3 className="font-semibold">Chat de la reunión</h3>
      </div>

      <div ref={containerRef} className="flex-1 overflow-y-auto space-y-3 mb-4 px-1">
        {messages.map((msg) => (
          <div key={msg.id} className={clsx('flex flex-col max-w-[85%]', msg.fromId === meId ? 'ml-auto items-end' : 'mr-auto items-start')}>
            {msg.fromId !== meId && (
              <span className="text-xs text-gray-600 dark:text-gray-400 mb-1">{msg.from}</span>
            )}
            <div className={clsx(
              'rounded-2xl px-3 py-2 text-sm',
              msg.fromId === meId
                ? 'bg-gradient-to-r from-orange-400 to-orange-600 text-white'
                : 'bg-white dark:bg-neutral-900/70 text-gray-800 dark:text-gray-200 ring-1 ring-black/5'
            )}>
              {msg.text}
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">{new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage(newMessage)}
          placeholder="Escribe un mensaje..."
          className="flex-1 rounded-full border border-white/20 bg-white/20 dark:bg-white/10 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400/50"
        />
        <button
          onClick={() => sendMessage(newMessage)}
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
  transcript,
}: {
  fromName: string
  onAccept: () => void
  onReject: () => void
  transcript?: boolean
}) {
  return (
    <div className="fixed right-4 bottom-24 z-[60] max-w-md w-[92vw] sm:w-auto">
      <div className="rounded-2xl border border-white/25 bg-white/70 dark:bg-neutral-900/80 backdrop-blur-xl shadow-2xl px-4 py-3 sm:px-5 sm:py-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 h-9 w-9 shrink-0 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 text-white grid place-items-center shadow">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.86 19.86 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.86 19.86 0 012.08 4.18 2 2 0 014.06 2h3a2 2 0 012 1.72c.12.9.37 1.77.73 2.58a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.5-1.25a2 2 0 012.11-.45c.81.36 1.68.61 2.58.73A2 2 0 0122 16.92z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="text-sm text-black/60 dark:text-white/70">Llamada entrante</div>
            <div className="font-semibold truncate">{fromName}</div>
            {transcript && (
              <div className="text-xs text-gray-500 mt-1 font-semibold">*Aviso: Transcripción Activada</div>
            )}
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={onAccept}
                className="inline-flex items-center gap-2 rounded-full bg-green-500 px-3 py-1.5 text-white text-sm shadow hover:bg-green-600"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.86 19.86 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.86 19.86 0 012.08 4.18 2 2 0 014.06 2h3a2 2 0 012 1.72c.12.9.37 1.77.73 2.58a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.5-1.25a2 2 0 012.11-.45c.81.36 1.68.61 2.58.73A2 2 0 0122 16.92z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                Aceptar
              </button>
              <button
                onClick={onReject}
                className="inline-flex items-center gap-2 rounded-full bg-rose-500 px-3 py-1.5 text-white text-sm shadow hover:bg-rose-600"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"><path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                Rechazar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
