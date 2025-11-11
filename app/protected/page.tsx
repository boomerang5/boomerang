'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { useUserUuid } from '@/contexts/UserUuidContext';
// @ts-ignore
import feather from 'feather-icons';
import { Check, X, Calendar, UserPlus, Info } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useNotifications, type NotificationItem, type NotifType } from './hooks/useNotifications';
import StreakCardWrapper from "@/components/dashboard/StreakCardWrapper";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { pingDailyActivity } from "@/lib/activity";


type Perfil = { nombre: string | null; apellido: string | null; mail: string | null };

//los types de notificacion vienen del hook useNotifications

// ===== Helpers UI =====
function stateDot(estado: string) {
  const color =
    /busy|ocupado/i.test(estado)
      ? 'bg-red-500'
      : /away|ausente/i.test(estado)
        ? 'bg-yellow-500'
        : 'bg-green-500';
  return <span className={`inline-block w-2 h-2 rounded-full mr-1 align-middle ${color}`} />;
}
function labelEstado(estado: string) {
  if (/busy|ocupado/i.test(estado)) return 'Ocupado';
  if (/away|ausente/i.test(estado)) return 'Ausente';
  return 'Disponible';
}

// Debounce helper
function useDebouncedValue<T>(value: T, delay = 300) {
  const [v, setV] = useState(value);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (t.current) clearTimeout(t.current);
    t.current = setTimeout(() => setV(value), delay);
    return () => {
      if (t.current) clearTimeout(t.current);
    };
  }, [value, delay]);
  return v;
}

function useFeatherIcons(deps: any[] = []) {
  useEffect(() => {
    // esperar al próximo paint para que el DOM ya esté
    const id = requestAnimationFrame(() => feather.replace());
    return () => cancelAnimationFrame(id);
  }, deps);
}

// ===== Avatar con iniciales (como en chats) =====
function getInitials(nombre?: string | null, apellido?: string | null, mail?: string | null) {
  const n = (nombre ?? "").trim();
  const a = (apellido ?? "").trim();
  if (n || a) {
    const i1 = n ? n[0] : "";
    const i2 = a ? a[0] : (n.split(" ")[1]?.[0] ?? "");
    return (i1 + i2).toUpperCase() || "?";
  }
  // fallback por mail
  const local = (mail ?? "").split("@")[0] ?? "";
  if (local) {
    const parts = local.replace(/[^a-zA-Z]/g, " ").trim().split(/\s+/);
    const i1 = parts[0]?.[0] ?? "";
    const i2 = parts[1]?.[0] ?? "";
    return (i1 + i2).toUpperCase() || "?";
  }
  return "?";
}

function InitialsAvatar({
  nombre,
  apellido,
  mail,
  className = "",
}: {
  nombre?: string | null;
  apellido?: string | null;
  mail?: string | null;
  className?: string;
}) {
  const initials = getInitials(nombre, apellido, mail);
  return (
    <div
      className={`flex items-center justify-center rounded-full ${className} 
                  bg-gradient-to-br from-[#f68b1f] to-[#f16f24] text-white 
                  font-semibold border border-white/30 shadow-sm`}
      aria-label={`Avatar de ${nombre ?? ""} ${apellido ?? ""}`.trim()}
    >
      <span className="select-none">{initials}</span>
    </div>
  );
}

export default function DashboardPage() {

  const CARD_HEIGHT = 420; //para ajustar la altura de las cards
  const GAP = 42;            // gap-6 = 1.5rem = 24px
  const LEFT_TOP = 180;      // alto para "Iniciar reunión" (ajustá a gusto)
  const LEFT_BOTTOM = CARD_HEIGHT - LEFT_TOP - GAP; // racha = resto
  const FIX = 14;

  const supabase = useSupabaseClient<any>();
  const router = useRouter();
  const { uuid: cachedUuid, isLoading: uuidLoading } = useUserUuid();

  const [estado, setEstado] = useState('available');
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [cargando, setCargando] = useState(true);

  // ---- Hydration guard + formatters con zona horaria fija ----
  const [isHydrated, setIsHydrated] = useState(false);
  useEffect(() => {
    setIsHydrated(true);
  }, []);
  const timeFmt = useMemo(
    () =>
      new Intl.DateTimeFormat('es-AR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'America/Argentina/Cordoba',
      }),
    []
  );
  const dateFmt = useMemo(
    () =>
      new Intl.DateTimeFormat('es-AR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'America/Argentina/Cordoba',
      }),
    []
  );

  // ---- ID de usuario ----
  const [idUsuario, setIdUsuario] = useState<number | null>(null);

  // ---- Estadísticas de llamadas ----
  const [estadisticas, setEstadisticas] = useState<{
    totalLlamadas: number
    llamadasCompletadas: number
    totalMinutos: number
    participantesUnicos: number
  } | null>(null);

  // ---- Notificaciones (tabla Notificacion + Realtime)
  const { notifications, loading: notiLoading, markAsRead, hasMore, loadMore, loadingMore } =
    useNotifications(supabase, idUsuario, { pageSize: 8 });

  // Lista que realmente renderiza la card (para poder quitar optimista)
  const [localNotifs, setLocalNotifs] = useState<NotificationItem[]>([]);
  useEffect(() => { setLocalNotifs(notifications); }, [notifications]);

  // IDs/keys que están saliendo con animación
  const [leavingKeys, setLeavingKeys] = useState<number[]>([]);
  const isLeaving = (n: NotificationItem) =>
    leavingKeys.includes(reqKey(n));
  const startLeaving = (n: NotificationItem) => {
    const k = reqKey(n);
    if (!k) return;
    setLeavingKeys(prev => (prev.includes(k) ? prev : [...prev, k]));
  };


  // Estado para hora y fecha actual
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  // ===== UI helpers =====
  function iconFor(type: NotifType): string {
    switch (type) {
      case 'friend_request': return 'user-plus';
      case 'friend_request_accepted': return 'user-check';
      case 'friend_request_rejected': return 'user-x';
      case 'meeting_invite': return 'calendar';
      default: return 'info';
    }
  }

  // estado resuelto para solicitudes de amistad
  const isResolved = (n: NotificationItem) =>
    n.type === 'friend_request' &&
    (n.meta?.respuesta === 'aceptada' || n.meta?.respuesta === 'rechazada');

  const resolvedLabel = (n: NotificationItem) =>
    n.meta?.respuesta === 'aceptada' ? '✓ Amigos' : '✕ Rechazada';

  const resolvedClass = (n: NotificationItem) =>
    n.meta?.respuesta === 'aceptada'
      ? 'bg-green-500/15 text-green-700 border border-green-500/30'
      : 'bg-red-500/15 text-red-700 dark:text-red-400 border border-red-500/30';

  // clave de solicitud (sirve para borrar notis por la misma solicitud_id)
  const reqKey = (n: NotificationItem) =>
    Number((n.meta as any)?.id_solicitud ?? (n.meta as any)?.id ?? 0);

  function dropNotif(n: NotificationItem) {
    setLocalNotifs(prev =>
      prev.filter(x => x.id !== n.id && reqKey(x) !== reqKey(n))
    );

    // limpiar la marca de "leaving" para futuros items de esa solicitud
    const k = reqKey(n);
    if (k) setLeavingKeys(prev => prev.filter(x => x !== k));

  }

  async function handleNotifAccept(n: NotificationItem) {
    try {
      if (n.type === 'friend_request') {
        // IDs para la RPC (aceptar)
        const idSolicitante =
          Number((n.meta as any)?.id_solicitante) ??
          Number((n.meta as any)?.solicitante?.id) ??
          null;

        if (idUsuario && idSolicitante) {
          await supabase.rpc('accept_contact_request', {
            p_id_solicitante: idSolicitante,
            p_id_receptor: idUsuario,
          });
        }

        // Persistir resolución en la misma notificación + marcar leída
        if (typeof n.id === 'number') {
          const meta = { ...(n.meta ?? {}), respuesta: 'aceptada', responded_at: new Date().toISOString() };
          await supabase.from('Notificacion').update({ leida: true, meta }).eq('id', n.id);
          await markAsRead(n.id); // mantiene contadores en sync
        }
        // UI optimista (sin esfumar)
        setLocalNotifs(prev =>
          prev.map(x =>
            x.id === n.id ? { ...x, leida: true, meta: { ...(x.meta ?? {}), respuesta: 'aceptada' } } : x
          )
        );

        return;
      }

      if (n.type === 'meeting_invite') {
        startLeaving(n);
        router.push('/protected/calendario');
        if (typeof n.id === 'number') await markAsRead(n.id);
        setTimeout(() => dropNotif(n), 280);
        return;
      }
    } catch (e) {
      console.error(e);
    }
  }


  async function handleNotifReject(n: NotificationItem) {
    try {
      if (n.type === 'friend_request') {
        const id_solicitante = Number((n.meta as any)?.id_solicitante);
        if (idUsuario && id_solicitante) {
          await supabase.rpc('reject_contact_request_v2', {
            p_id_solicitante: id_solicitante,
            p_id_receptor: idUsuario,
          });
        }

        if (typeof n.id === 'number') {
          const meta = { ...(n.meta ?? {}), respuesta: 'rechazada', responded_at: new Date().toISOString() };
          await supabase.from('Notificacion').update({ leida: true, meta }).eq('id', n.id);
          await markAsRead(n.id);
        }
        // UI optimista (sin esfumar)
        setLocalNotifs(prev =>
          prev.map(x =>
            x.id === n.id ? { ...x, leida: true, meta: { ...(x.meta ?? {}), respuesta: 'rechazada' } } : x
          )
        );
        return;
      }
    } catch (e) {
      console.error(e);
    }
  }

  function whenLabel(iso?: string | null) {
    if (!iso) return null;
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  }



  // Render de íconos
  useEffect(() => {
    feather.replace();
  }, [localNotifs]);

  // Actualizar hora cada minuto
  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Función para formatear tiempo
  const formatearTiempo = (minutos: number): string => {
    if (minutos < 60) {
      return `${minutos.toFixed(0)}m`
    }
    const horas = Math.floor(minutos / 60)
    const mins = Math.floor(minutos % 60)
    return `${horas}h ${mins}m`
  }

  // Cargar estadísticas de llamadas
  useEffect(() => {
    const fetchEstadisticas = async () => {
      try {
        const fechaFin = new Date()
        const fechaInicio = new Date()
        fechaInicio.setDate(fechaFin.getDate() - 30)

        const params = new URLSearchParams({
          fechaInicio: fechaInicio.toISOString().split('T')[0],
          fechaFin: fechaFin.toISOString().split('T')[0]
        })

        const response = await fetch(`/api/reports/resumen?${params}`)
        if (response.ok) {
          const data = await response.json()
          setEstadisticas(data.estadisticasGenerales)
        }
      } catch (err) {
        console.error('Error cargando estadísticas:', err)
      }
    }

    fetchEstadisticas()
  }, [])

  // Perfil + resolver id_usuario (uuid -> Usuario.id)
  useEffect(() => {
    const fetchPerfil = async () => {
      if (uuidLoading) return;

      setCargando(true);

      const uuid = cachedUuid;

      if (!uuid) {
        setCargando(false);
        return;
      }

      const { data: row } = await supabase
        .from('Usuario')
        .select('id')
        .eq('User_id', uuid)
        .maybeSingle();

      if (!row?.id) {
        setCargando(false);
        return;
      }
      setIdUsuario(row.id);

      const { data: userData } = await supabase.rpc('get_user_by_id_usuario', {
        p_id_usuario: row.id,
      });
      const u = Array.isArray(userData) ? userData[0] : userData;
      if (u) {
        setPerfil({
          nombre: u.nombre ?? null,
          apellido: u.apellido ?? null,
          mail: u.mail ?? null,
        });
      }
      setCargando(false);
    };
    fetchPerfil();
  }, [supabase, cachedUuid, uuidLoading]);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) return;

      const { data: usuario, error } = await supabase
        .from("Usuario")
        .select("id")
        .eq("User_id", user.id)
        .single();

      if (error || !usuario?.id) return;

      await pingDailyActivity(supabase, usuario.id);
    })();
  }, [supabase]);


  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-semibold text-foreground">
            {cargando ? 'Cargando…' : `¡Bienvenido, ${perfil?.nombre ?? 'Usuario'}!`}
          </h1>
        </div>
      </header>

      {/* Banner con hora, fecha y mascota */}
      <div className="bg-gradient-to-r from-orange-400 to-orange-600 rounded-xl p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            {currentTime ? (
              <>
                <div className="text-3xl font-bold text-white">
                  {currentTime.toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                  })}
                </div>
                <div className="text-orange-100 text-lg">
                  {currentTime.toLocaleDateString('es-ES', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </div>
              </>
            ) : (
              <div className="text-3xl font-bold text-white">Cargando...</div>
            )}
          </div>
          <div className="flex items-center">
            <div className="text-right text-white mr-4">
              <div className="text-sm opacity-90">¡Hola!</div>
              <div className="text-xs opacity-75">¿En qué puedo ayudarte hoy?</div>
            </div>
            <div className="w-20 h-20 bg-orange-200 rounded-full flex items-center justify-center backdrop-blur-sm overflow-hidden">
              <img src="/mascota.png" alt="Mascota" className="w-16 h-16 object-contain" />
            </div>
          </div>
        </div>
      </div>

      {/* ====== Explorar con burbujas ====== */}
      <section className="space-y-4">
        {/*<h2 className="text-xl font-semibold text-foreground">Explorá Boomerang</h2>*/}


        <div
          className="grid grid-cols-3 sm:grid-cols-5 gap-6 justify-items-center"
        >
          <ActionBubble
            href="/protected/contactos"
            emoji="🎥"
            title="Iniciá una videollamada"
            subtitle="Cara a cara en segundos"
          />
          <ActionBubble
            href="/protected/pizarra"
            emoji="✏️"
            title="Usá la pizarra"
            subtitle="Escribí con tu mano, sin mouse"
          />
          <ActionBubble
            href="/protected/calendario"
            emoji="📅"
            title="Programá reuniones"
            subtitle="Organizate con tiempo"
          />
          <ActionBubble
            href="/protected/chatbot"
            emoji="🤖"
            title="Hablá con el chatbot"
            subtitle="Tu asistente en la app"
          />
          <ActionBubble
            href="/protected/chats"
            emoji="💬"
            title="Chateá con amigos"
            subtitle="De todo el mundo"
          />
        </div>
      </section>


      {/* ====== Cards ====== */}
      <section className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 items-stretch lg:auto-rows-fr mt-6">
        {/* Col 1 / Fila 1 - Estadísticas de Llamadas */}
        <Card
          className="flex flex-col"
          style={{ height: `${LEFT_TOP}px` }}
          title="Resumen de Llamadas"
          content={
            estadisticas ? (
              <div className="flex justify-center items-center gap-2 w-full mt-6">
                <div className="bg-orange-50/50 dark:bg-gray-700/50 rounded-lg p-2 text-center flex-1 flex flex-col justify-center">
                  <div className="text-l font-bold text-orange-600 dark:text-orange-400">{estadisticas.totalLlamadas}</div>
                  <div className="text-[10px] text-gray-600 dark:text-gray-400 whitespace-nowrap">Total Llamadas</div>
                </div>
                <div className="bg-green-50/50 dark:bg-gray-700/50 rounded-lg p-2 text-center flex-1 flex flex-col justify-center">
                  <div className="text-l font-bold text-green-600 dark:text-green-400">{estadisticas.llamadasCompletadas}</div>
                  <div className="text-[10px] text-gray-600 dark:text-gray-400">Conectadas</div>
                </div>
                <div className="bg-blue-50/50 dark:bg-gray-700/50 rounded-lg p-2 text-center flex-1 flex flex-col justify-center">
                  <div className="text-l font-bold text-blue-600 dark:text-blue-400">{formatearTiempo(estadisticas.totalMinutos)}</div>
                  <div className="text-[11px] text-gray-600 dark:text-gray-400 whitespace-nowrap">Tiempo Total</div>
                </div>
                <div className="bg-purple-50/50 dark:bg-gray-700/50 rounded-lg p-2 text-center flex-1 flex flex-col justify-center">
                  <div className="text-l font-bold text-purple-600 dark:text-purple-400">{estadisticas.participantesUnicos}</div>
                  <div className="text-[10px] text-gray-600 dark:text-gray-400 whitespace-nowrap">Contactos Únicos</div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-gray-500">Cargando estadísticas...</p>
              </div>
            )
          }
        />

        {/* Col 2 (alto: 2 filas) */}
        <Card
          className="lg:row-span-2 overflow-hidden"
          style={{ height: `${CARD_HEIGHT}px` }}
          title="Notificaciones"
          content={
            <div className="h-full flex flex-col min-h-0">
              {notiLoading ? (
                <p className="text-muted-foreground text-sm">Cargando…</p>
              ) : localNotifs.length === 0 ? (
                <p className="text-muted-foreground text-sm">No hay notificaciones nuevas.</p>
              ) : (
                // cuerpo flexible con altura real y scroll visible
                <div className="flex-1 min-h-0">
                  <ul
                    className="h-full divide-y divide-white/20 pr-2 overflow-y-auto scroll-thin overscroll-contain mr-[-15px] pb-3"
                    style={{
                      // mantiene tu cálculo, pero ahora la UL ocupa todo y scrollea
                      maxHeight: `calc(${CARD_HEIGHT}px - 140px)`,
                      minHeight: `calc(${CARD_HEIGHT}px - 140px)`,
                    }}
                  >
                    {localNotifs.map((n) => (
                      <li
                        key={n.id}
                        className={
                          "py-3 flex items-start gap-3 transition-all duration-300 " +
                          (isLeaving(n) ? "opacity-0 -translate-y-2" : "")
                        }
                      >
                        <div className="flex-shrink-0 mt-1">
                          <i data-feather={iconFor(n.type)} className="w-4 h-4 text-orange-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{n.title}</div>
                          {n.message && (
                            <div className="text-xs text-muted-foreground mt-1">{n.message}</div>
                          )}
                          {/* {n.when && <div className="text-xs text-muted-foreground mt-1">{whenLabel(n.when)}</div>} */}
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          {n.type === "friend_request" && !isResolved(n) && (
                            <>
                              <button
                                onClick={() => handleNotifAccept(n)}
                                className="p-1 rounded bg-green-500/20 hover:bg-green-500/30 text-green-600"
                                title="Aceptar"
                              >
                                <i data-feather="check" className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleNotifReject(n)}
                                className="p-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-600"
                                title="Rechazar"
                              >
                                <i data-feather="x" className="w-3 h-3" />
                              </button>
                            </>
                          )}
                          {n.type === "friend_request" && isResolved(n) && (
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-semibold ${resolvedClass(n)}`}
                            >
                              {resolvedLabel(n)}
                            </span>
                          )}
                          {n.type === "meeting_invite" && (
                            <button
                              onClick={() => handleNotifAccept(n)}
                              className="p-1 rounded bg-blue-500/20 hover:bg-blue-500/30 text-blue-600"
                              title="Ver en calendario"
                            >
                              <i data-feather="calendar" className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </li>
                    ))}

                    {/* Botón "Ver más" para cargar notificaciones reales adicionales */}
                    {hasMore && (
                      <li className="py-3 flex items-center justify-center">
                        <button
                          onClick={loadMore}
                          className="text-xs font-semibold px-3 py-1.5 rounded-full bg-orange-500/10 text-orange-600 hover:bg-orange-500/20 transition"
                          disabled={loadingMore}
                        >
                          {loadingMore ? "Cargando…" : "Ver más"}
                        </button>
                      </li>
                    )}

                    {/* pequeño espacio para que el último item no quede tapado por el scrollbar */}
                    <li className="h-1 list-none" aria-hidden />
                  </ul>
                </div>
              )}
            </div>
          }
        />


        {/* Col 3 / Fila 1 — Perfil (solo arriba) */}
        <Card
          className="lg:col-start-3 lg:row-start-1"
          style={{ height: `${LEFT_TOP}px` }}
          title="Perfil"
          content={
            <div className="h-full flex flex-col">
              {/* --- Contenido principal --- */}
              {cargando ? (
                <p className="text-sm text-muted-foreground">Cargando perfil...</p>
              ) : perfil ? (
                <div className="flex items-center gap-3">
                  <InitialsAvatar
                    nombre={perfil.nombre}
                    apellido={perfil.apellido}
                    mail={perfil.mail}
                    className="w-12 h-12 text-base"
                  />
                  <div className="min-w-0">
                    <p className="font-medium truncate">
                      {perfil.nombre ?? "—"} {perfil.apellido ?? ""}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {perfil.mail ?? "—"}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No se encontró el perfil.
                </p>
              )}

              {/* --- Botones al final --- */}
              <div className="flex gap-2 mt-5 justify-start">
                <Link
                  href="/protected/perfil"
                  className="bg-gradient-to-r from-orange-400 to-orange-600 text-white px-3 py-1.5 rounded-full text-xs font-semibold hover:brightness-105 transition"
                >
                  Ver perfil
                </Link>
                <Link
                  href="/protected/perfil/editar"
                  className="bg-orange-500/10 text-orange-600 px-3 py-1.5 rounded-full text-xs font-semibold hover:bg-orange-500/20 transition"
                >
                  Editar perfil
                </Link>
              </div>
            </div>
          }
        />


        {/* Col 1 / Fila 2 (debajo de "perfil??") */}
        <div
          className="h-full flex-shrink-0 lg:col-start-1 lg:row-start-2"
          style={{
            height: `calc(${LEFT_BOTTOM}px + ${FIX}px)`,
            marginBottom: `-${FIX}px`,
            marginTop: '-14px', // sube toda la card un poquito
          }}
        >
          {cargando ? <div>Cargando racha...</div> : <StreakCardWrapper />}
        </div>

        {/* Col 3 / Fila 2 — Próximamente */}
        <Card
          className="lg:col-start-3 lg:row-start-2"
          style={{
            height: `calc(${LEFT_BOTTOM}px + ${FIX}px)`,
            marginBottom: `-${FIX}px`,
            marginTop: '-14px', // alineado con la racha
          }}
          title="Próximamente en Boomerang 🚀"
          content={
            <div className="h-full flex flex-col justify-center px-0">
              <p className="text-sm font-medium text-foreground mb-1">
                Videollamadas grupales
              </p>
              <p className="text-sm text-muted-foreground mb-3">
                Reunite con tu equipo y amigos, ¡todos juntos!
              </p>
              <p className="text-sm font-medium text-foreground mb-1">
                Traducción de la página
              </p>
              <p className="text-sm text-muted-foreground">
                ¡En muchos más idiomas!
              </p>
            </div>
          }
        />
      </section>

      {/* Scrollbar fino y naranja (global) */}
      <style jsx global>{`
        /* Firefox */
        .scroll-thin {
          scrollbar-width: thin;
          scrollbar-color: rgba(241, 111, 36, 0.45) transparent;
        }
        /* WebKit (Chrome, Edge, Safari) */
        .scroll-thin::-webkit-scrollbar {
          width: 5px;
          margin-right: -2px;
        }
        .scroll-thin::-webkit-scrollbar-track {
          background: transparent;
          border-radius: 9999px;
        }
        .scroll-thin::-webkit-scrollbar-thumb {
          background: rgba(241, 111, 36, 0.4);
          border-radius: 9999px;
          margin-right: 3px;
        }
        .scroll-thin::-webkit-scrollbar-thumb:hover {
          background: rgba(241, 111, 36, 0.55);
        }
      `}</style>
    </div>
  );
}

/* Action bubble (emoji + título) */
function ActionBubble({
  href,
  emoji,
  title,
  subtitle,
}: {
  href: string;
  emoji: string;      // usa un emoji (🧑‍💻, 💬, 📅, 🤖, 🌍, etc.)
  title: string;
  subtitle?: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col items-center text-center gap-2"
    >
      <div className="relative">
        {/* círculo principal */}
        <div className="size-20 sm:size-24 rounded-full bg-orange-50/80 dark:bg-gray-700/50
                        border border-orange-200/50 dark:border-gray-600/40
                        shadow-sm group-hover:shadow-md transition
                        flex items-center justify-center">
          <span className="text-3xl sm:text-4xl">{emoji}</span>
        </div>
        {/* aro/halo al hover */}
        <div className="absolute inset-0 rounded-full ring-0 group-hover:ring-8
                        ring-orange-500/10 transition pointer-events-none" />
      </div>

      <div className="leading-tight">
        <div className="font-semibold text-sm sm:text-base">{title}</div>
        {subtitle && (
          <div className="text-xs sm:text-sm text-muted-foreground">{subtitle}</div>
        )}
      </div>
    </Link>
  );
}

/* Card component */
function Card({
  title,
  description,
  inputPlaceholder,
  list,
  content,
  buttonText,
  className,
  style,
}: {
  title: string;
  description?: string;
  inputPlaceholder?: string;
  list?: string[];
  content?: React.ReactNode;
  buttonText?: string | React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={style}
      className={`bg-orange-50/50 dark:bg-gray-700/50 rounded-xl p-6 shadow-lg backdrop-blur-md border border-orange-200/30 dark:border-gray-600/30 flex flex-col justify-between ${className ?? ''}`}
    >
      <div>
        <h2 className="text-orange-500 font-semibold text-lg mb-2">{title}</h2>
        {description && <p className="text-muted-foreground mb-4">{description}</p>}
        {inputPlaceholder && (
          <input
            type="text"
            placeholder={inputPlaceholder}
            className="w-full px-3 py-2 rounded-md bg-white/20 border border-white/30 text-foreground mb-4 backdrop-blur-sm"
          />
        )}
        {list && (
          <ul className="list-disc list-inside text-muted-foreground text-sm mb-4">
            {list.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        )}
        {content}
      </div>

      {buttonText &&
        (typeof buttonText === 'string' ? (
          <button className="bg-gradient-to-r from-orange-400 to-orange-600 text-white px-4 py-2 rounded-full font-semibold w-fit mt-3 hover:brightness-105 transition">
            {buttonText}
          </button>
        ) : (
          buttonText
        ))}
    </div>
  );
}
