'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
// @ts-ignore
import feather from 'feather-icons';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useNotifications, type NotificationItem, type NotifType } from './hooks/useNotifications';

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

export default function DashboardPage() {
  const supabase = useSupabaseClient<any>();
  const router = useRouter();

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

// ---- Notificaciones (tabla Notificacion + Realtime)
  const { notifications, loading: notiLoading, markAsRead } =
    useNotifications(supabase, idUsuario);

// Lista que realmente renderiza la card (para poder quitar optimista)
  const [localNotifs, setLocalNotifs] = useState<NotificationItem[]>([]);
  useEffect(() => { setLocalNotifs(notifications); }, [notifications]);


  // Estado para hora y fecha actual
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  // ===== UI helpers =====
  function iconFor(type: NotifType): string {
    switch (type) {
      case 'friend_request':
        return 'user-plus';
      case 'meeting_invite':
        return 'calendar';
      default:
        return 'info';
    }
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

      if (typeof n.id === 'number') await markAsRead(n.id);

      // Oculto esta tarjeta en la UI
      setLocalNotifs(prev => prev.filter(x => x.id !== n.id));
      return;
    }

    if (n.type === 'meeting_invite') {
      router.push('/protected/calendario');
      if (typeof n.id === 'number') await markAsRead(n.id);
      setLocalNotifs(prev => prev.filter(x => x.id !== n.id));
      return;
    }
  } catch (e) {
    console.error(e);
  }
}


  async function handleNotifReject(n: NotificationItem) {
  try {
    if (n.type === 'friend_request') {
      const idSolicitante =
        Number((n.meta as any)?.id_solicitante) ??
        Number((n.meta as any)?.solicitante?.id) ??
        null;
      if (idUsuario && idSolicitante) {
        await supabase.rpc('reject_contact_request', {
          p_id_solicitante: idSolicitante,
          p_id_receptor: idUsuario,
        });
      }
      if (typeof n.id === 'number') await markAsRead(n.id);
      setLocalNotifs(prev => prev.filter(x => x.id !== n.id));
      return;
    }

    if (n.type === 'meeting_invite') {
      if (typeof n.id === 'number') await markAsRead(n.id);
      setLocalNotifs(prev => prev.filter(x => x.id !== n.id));
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
  }, [notifications]);

  // Actualizar hora cada minuto
  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);


  // Perfil + resolver id_usuario (uuid -> Usuario.id)
  useEffect(() => {
    const fetchPerfil = async () => {
      setCargando(true);

      const { data: sessionData } = await supabase.auth.getSession();
      const sessionUuid = sessionData?.session?.user?.id ?? null;
      const { data: uuidData } = await supabase.rpc('get_usuario_uuid');
      const uuid =
        (typeof uuidData === 'string' && uuidData) ||
        (uuidData && (uuidData as any).uuid) ||
        (uuidData && (uuidData as any).user_uuid) ||
        sessionUuid;

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
  }, [supabase]);


    return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-semibold text-foreground">
            {cargando ? 'Cargando…' : `¡Bienvenido, ${perfil?.nombre ?? 'Usuario'}!`}
          </h1>
          <select
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
            className="bg-white/30 dark:bg-white/10 border border-orange-400 text-orange-600 font-semibold text-sm px-3 py-1.5 rounded-md backdrop-blur-sm"
          >
            <option value="available">Disponible</option>
            <option value="busy">Ocupado</option>
            <option value="away">Ausente</option>
          </select>
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
            href="/protected/videollamada"
            emoji="🎥"
            title="Videollamá"
            subtitle="Cara a cara en segundos"
          />
          <ActionBubble
            href="/protected/chats"
            emoji="💬"
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
            href="/protected/contactos"
            emoji="🌍"
            title="Conocé gente"
            subtitle="De todo el mundo"
          />
        </div>
      </section>


      {/* ====== Cards (reordenadas y con row-span) ====== */}
      <section className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 items-stretch lg:auto-rows-fr mt-6">
        {/* Col 1 / Fila 1 */}
        <Card
          title="Iniciar reunión"
          description="Crea una sala e invita a otros."
          buttonText="Crear reunión"
        />

        {/* Col 2 (alto: 2 filas) */}
        <Card
          className="lg:row-span-2"
          title="Notificaciones"
          content={
            <div className="flex flex-col h-80">
              {notiLoading ? (
                <p className="text-muted-foreground text-sm">Cargando…</p>
              ) : notifications.length === 0 ? (
                <p className="text-muted-foreground text-sm">No hay notificaciones nuevas.</p>
              ) : (
                <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-orange-300 scrollbar-track-orange-100 dark:scrollbar-thumb-orange-600 dark:scrollbar-track-gray-800">
                  <ul className="divide-y divide-white/20 pr-2">
                    {localNotifs.map((n) => (
                      <li key={n.id} className="py-3 flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">
                          <i data-feather={iconFor(n.type)} className="w-4 h-4 text-orange-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{n.title}</div>
                          {n.message && <div className="text-xs text-muted-foreground mt-1">{n.message}</div>}
                          {n.when && <div className="text-xs text-muted-foreground mt-1">{whenLabel(n.when)}</div>}
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          {n.type === 'friend_request' && (
                            <>
                              <button 
                                onClick={() => handleNotifAccept(n)} 
                                className="w-6 h-6 rounded-md bg-green-500/20 hover:bg-green-500/30 text-green-600 flex items-center justify-center font-bold text-sm transition-all hover:scale-105" 
                                title="Aceptar"
                              >
                                ✓
                              </button>
                              <button 
                                onClick={() => handleNotifReject(n)} 
                                className="w-6 h-6 rounded-md bg-red-500/20 hover:bg-red-500/30 text-red-600 flex items-center justify-center font-bold text-sm transition-all hover:scale-105" 
                                title="Rechazar"
                              >
                                ✕
                              </button>
                            </>
                          )}
                          {n.type === 'meeting_invite' && (
                            <button 
                              onClick={() => handleNotifAccept(n)} 
                              className="w-6 h-6 rounded-md bg-blue-500/20 hover:bg-blue-500/30 text-blue-600 flex items-center justify-center transition-all hover:scale-105" 
                              title="Ver en calendario"
                            >
                              <i data-feather="calendar" className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          }
        />

        {/* Col 3 (alto: 2 filas) */}
        <Card
          className="lg:row-span-2"
          title="Perfil"
          content={
            <>
              {cargando ? (
                <p className="text-sm text-muted-foreground">Cargando perfil...</p>
              ) : perfil ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Nombre: {perfil.nombre ?? '—'} {perfil.apellido ?? ''}
                  </p>
                  <p className="text-sm text-muted-foreground mb-2">Correo: {perfil.mail ?? '—'}</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No se encontró el perfil.</p>
              )}
            </>
          }
          buttonText={
            <div className="flex gap-2 mt-3">
              <Link href="/protected/perfil" className="bg-gradient-to-r from-orange-400 to-orange-600 text-white px-4 py-2 rounded-full font-semibold hover:brightness-105 transition">
                Ver perfil
              </Link>
              <Link href="/protected/perfil/editar" className="bg-gradient-to-r from-orange-400 to-orange-600 text-white px-4 py-2 rounded-full font-semibold hover:brightness-105 transition">
                Editar perfil
              </Link>
            </div>
          }
        />

        {/* Col 1 / Fila 2 (debajo de "Iniciar reunión") */}
        <Card
          title="Reuniones programadas"
          list={['🗓 5 julio - Reunión equipo 10:00', '🗓 6 julio - Cliente Z 15:30']}
          buttonText="Ver calendario"
        />
      </section>

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
}: {
  title: string;
  description?: string;
  inputPlaceholder?: string;
  list?: string[];
  content?: React.ReactNode;
  buttonText?: string | React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-orange-50/50 dark:bg-gray-700/50 rounded-xl p-6 shadow-lg backdrop-blur-md border border-orange-200/30 dark:border-gray-600/30 flex flex-col justify-between ${
        className ?? ''
      }`}
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
