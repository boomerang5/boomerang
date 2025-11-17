'use client';

import React, { useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useSupabaseClient } from '@supabase/auth-helpers-react';
import { useUserUuid } from '@/contexts/UserUuidContext';
import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

type IncomingCall = { callId: string; fromId: string; fromName?: string; transcript?: boolean; id_llamada?: number };

// Mejor tipar explícito el canal
async function ensureSubscribed(ch: RealtimeChannel): Promise<void> {
  return new Promise((resolve) => {
    let done = false;
    // La callback de subscribe recibe el status ('SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED')
    ch.subscribe((status) => {
      if (!done && status === 'SUBSCRIBED') {
        done = true;
        resolve();
      }
    });
  });
}

async function fetchMyNumericId(sb: SupabaseClient, myUuid: string): Promise<number | null> {
  try {
    const { data, error } = await sb.from('Usuario').select('id').eq('User_id', myUuid).maybeSingle();
    if (error) return null;
    return data?.id ?? null;
  } catch {
    return null;
  }
}

export default function CallNotificationsProvider({
  children,
  callRoute = '/protected/videollamada',
}: { children: ReactNode; callRoute?: string }) {
  const router = useRouter();
  const user = useUser();
  const sb = useSupabaseClient() as SupabaseClient;
  const { uuid: cachedUuid, isLoading: uuidLoading } = useUserUuid();

  const [meUuid, setMeUuid] = useState('');
  const [meNumericId, setMeNumericId] = useState<number | null>(null);
  const [inboxReady, setInboxReady] = useState(false);

  const inboxesRef = useRef<RealtimeChannel[]>([]);
  const seenCallIdsRef = useRef<Set<string>>(new Set()); // dedupe entre user:uuid y user:id
  const currentCallIdRef = useRef<string | null>(null);
  const peerIdRef = useRef<string | null>(null);

  const [incoming, setIncoming] = useState<IncomingCall | null>(null);
  const log = (...args: any[]) => {
    try {
      console.log('[CallNotif]', ...args);
    } catch { }
  };

  // 1) Identidad usando UUID cacheado
  useEffect(() => {
    if (!sb || uuidLoading) return;

    (async () => {
      let uuid: string | null = cachedUuid;

      if (!uuid) {
        log('❌ No UUID available from cache');
        return;
      }

      log('✅ UUID from cache:', uuid);

      // c) fallback por pestaña
      if (!uuid) {
        const ss = sessionStorage.getItem('vc_uuid');
        if (ss) uuid = ss;
        else {
          const g =
            typeof crypto !== 'undefined' && 'randomUUID' in crypto
              ? crypto.randomUUID()
              : Math.random().toString(36).slice(2);
          sessionStorage.setItem('vc_uuid', g);
          uuid = g;
        }
        log('⚠️ Using per-tab UUID:', uuid);
      }

      setMeUuid(uuid!);

      // id numérico cacheado
      let idNum: number | null = null;
      const ls = typeof window !== 'undefined' ? localStorage.getItem('usuario_id') : null;
      if (ls && /^\d+$/.test(ls)) idNum = Number(ls);
      if (!idNum && uuid) {
        idNum = await fetchMyNumericId(sb, uuid);
        if (idNum && typeof window !== 'undefined') localStorage.setItem('usuario_id', String(idNum));
      }
      setMeNumericId(idNum ?? null);
      log('Resolved ids => uuid:', uuid, 'numeric:', idNum);
    })();
  }, [sb, user]);

  // 2) Suscripciones a user:<uuid> / user:<vc_uuid> / user:<id>
  useEffect(() => {
    if (!sb) return;
    if (!meUuid && meNumericId == null) return;

    let cancelled = false;
    (async () => {
      setInboxReady(false);
      // limpiar anteriores
      const prev = inboxesRef.current;
      inboxesRef.current = [];
      for (const ch of prev) {
        try {
          await ch.unsubscribe();
        } catch { }
      }

      const setup = async (key: string) => {
        const ch = sb.channel(`user:${key}`, { config: { broadcast: { self: false } } });

        ch.on('broadcast', { event: 'ring' }, ({ payload }) => {
          // Soportar varias formas de payload (desde distintos clientes/backends):
          //  - payload.callId + payload.from: { id, name }
          //  - payload.callId + payload.fromId + payload.fromName
          //  - payload.room as alias de callId
          const callId = String(payload?.callId ?? payload?.room ?? '');
          const fromId = String(
            payload?.from?.id ?? payload?.fromId ?? payload?.from_uuid ?? payload?.from_id ?? ''
          );
          const fromName = String(
            payload?.from?.name ?? payload?.fromName ?? payload?.from_name ?? payload?.name ?? 'Invitado'
          );
          if (!callId || !fromId) return;

          // ignorar rings míos (uuid o id numérico)
          if (fromId === meUuid || (meNumericId != null && fromId === String(meNumericId))) {
            log('~ ignore ring from self', fromId);
            return;
          }

          // dedupe entre múltiples inbox
          if (seenCallIdsRef.current.has(callId)) {
            // Solo log en debug mode, no en consola normal
            if (process.env.NODE_ENV === 'development') {
              console.debug('~ duplicate ring ignored', callId);
            }
            return;
          }
          seenCallIdsRef.current.add(callId);

          const transcriptFlag = Boolean(
            payload?.transcript || payload?.from?.transcript || payload?.from?.transcribe || payload?.from?.transcription
          );
          const idLlamada = payload?.id_llamada; // ⚠️ Capturar ID de llamada de BD
          currentCallIdRef.current = callId;
          peerIdRef.current = fromId;
          const incomingData = { callId, fromId, fromName, transcript: transcriptFlag, id_llamada: idLlamada };
          setIncoming(incomingData);

          log(`✅ Incoming call set: ${callId} from ${fromId} (${fromName}) transcript:${transcriptFlag}`);
          try {
            navigator.vibrate?.(200);
          } catch { }
          log('← ring', { key, callId, fromId, fromName });
        });

        ch.on('broadcast', { event: 'cancel' }, ({ payload }) => {
          if (payload.callId !== currentCallIdRef.current) return;
          setIncoming(null);
          currentCallIdRef.current = null;
          peerIdRef.current = null;
          log('← cancel', payload.callId);
        });

        ch.on('broadcast', { event: 'reject' }, ({ payload }) => {
          if (payload.callId !== currentCallIdRef.current) return;
          setIncoming(null);
          currentCallIdRef.current = null;
          peerIdRef.current = null;
          log('← reject', payload.callId);
        });

        await ensureSubscribed(ch);
        if (!cancelled) inboxesRef.current.push(ch);
        log('✓ SUBSCRIBED', `user:${key}`);
      };

      // uuid "real"
      if (meUuid) await setup(meUuid);
      // uuid por pestaña
      try {
        const vc = sessionStorage.getItem('vc_uuid');
        if (vc && vc !== meUuid) await setup(vc);
      } catch { }
      // id numérico
      if (meNumericId != null) await setup(String(meNumericId));

      if (!cancelled) setInboxReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [sb, meUuid, meNumericId, cachedUuid, uuidLoading]);

  async function resolvePeerUuidByAnyId(sb: SupabaseClient, raw: string): Promise<string | null> {
    const looksUuid = /[a-f0-9-]{8,}/i.test(raw);
    if (looksUuid) return raw;
    if (/^\d+$/.test(raw)) {
      const { data, error } = await sb.from('Usuario').select('User_id').eq('id', Number(raw)).maybeSingle();
      if (!error && data?.User_id) return String(data.User_id);
    }
    return null;
  }
  // 3) Acciones
  const onAccept = async () => {
    const callId = currentCallIdRef.current;
    const fromRaw = peerIdRef.current; // quien llamó (caller)
    if (!callId || !fromRaw) return;

    const peerUuid = await resolvePeerUuidByAnyId(sb, fromRaw);
    if (!peerUuid) {
      log('! could not resolve peer uuid on accept', { fromRaw });
      return;
    }

    try {
      sessionStorage.setItem(`aa:${callId}`, '1');
    } catch { }

    // Navegar a la página de llamada como callee. La page espera ?incoming=<id>&from=<caller>&autoaccept=1&aa=<token>
    const url = new URL(window.location.origin + callRoute);
    url.searchParams.set('incoming', callId);
    url.searchParams.set('room', callId);
    url.searchParams.set('from', peerUuid); // quien nos llamó
    url.searchParams.set('autoaccept', '1');
    url.searchParams.set('aa', callId);

    // Si la llamada entrante tiene transcript, pasarlo como parámetro
    if (incoming?.transcript) {
      url.searchParams.set('transcript', '1');
      log('📝 Passing transcript=1 to videollamada page');
    }

    // ⚠️ CRÍTICO: Pasar el ID de la llamada de BD para evitar crear una nueva
    if (incoming?.id_llamada) {
      url.searchParams.set('id_llamada', String(incoming.id_llamada));
      log('📋 Passing id_llamada to videollamada page:', incoming.id_llamada);
    }

    setIncoming(null);
    router.push(url.toString());
  };

  const onReject = async () => {
    const callId = currentCallIdRef.current;
    const from = peerIdRef.current;
    if (!sb || !callId || !from) return;

    // Mandar reject al remitente (si tenés variantes uuid/id, podés ampliar aquí)
    const ch = sb.channel(`user:${from}`, { config: { broadcast: { ack: true } } });
    await ensureSubscribed(ch);
    await ch.send({ type: 'broadcast', event: 'reject', payload: { callId, from: meUuid } });
    await ch.unsubscribe();

    setIncoming(null);
    currentCallIdRef.current = null;
    peerIdRef.current = null;
    log('→ reject sent', callId);
  };

  // 4) Limpieza total on unmount
  useEffect(() => {
    return () => {
      const prev = inboxesRef.current;
      inboxesRef.current = [];
      prev.forEach((ch) => {
        try {
          ch.unsubscribe();
        } catch { }
      });
    };
  }, []);





  return (
    <>
      {children}
      {incoming && (
        <Toast fromName={incoming.fromName || 'Invitado'} onAccept={onAccept} onReject={onReject} transcript={incoming.transcript} />
      )}
    </>
  );
}

function Toast({
  fromName,
  onAccept,
  onReject,
  transcript,
}: {
  fromName: string;
  onAccept: () => void;
  onReject: () => void;
  transcript?: boolean;
}) {
  return (
    <div className="fixed right-4 bottom-6 z-[100] max-w-md w-[92vw] sm:w-auto">
      <div className="rounded-2xl border border-white/25 bg-white/70 dark:bg-neutral-900/80 backdrop-blur-xl shadow-2xl px-4 py-3 sm:px-5 sm:py-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 h-9 w-9 shrink-0 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 text-white grid place-items-center shadow">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
              <path
                d="M22 16.92v3a2 2 0 01-2.18 2 19.86 19.86 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.86 19.86 0 012.08 4.18 2 2 0 014.06 2h3a2 2 0 012 1.72c.12.9.37 1.77.73 2.58a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.5-1.25a2 2 0 012.11-.45c.81.36 1.68.61 2.58.73A2 2 0 0122 16.92z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
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
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M22 16.92v3a2 2 0 01-2.18 2 19.86 19.86 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.86 19.86 0 012.08 4.18 2 2 0 014.06 2h3a2 2 0 012 1.72c.12.9.37 1.77.73 2.58a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.5-1.25a2 2 0 012.11-.45c.81.36 1.68.61 2.58.73A2 2 0 0122 16.92z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Aceptar
              </button>
              <button
                onClick={onReject}
                className="inline-flex items-center gap-2 rounded-full bg-rose-500 px-3 py-1.5 text-white text-sm shadow hover:bg-rose-600"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M6 18L18 6M6 6l12 12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Rechazar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
