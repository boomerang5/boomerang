'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
// @ts-ignore
import feather from 'feather-icons';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useContacts, type Contact } from './hooks/useContacts'; 

type Perfil = { nombre: string | null; apellido: string | null; mail: string | null };

// ----- Tipos y helpers para Contactos (REST) -----

type NotifType =
  | 'friend_request'
  | 'calendar'
  | 'scheduled_call'
  | 'missed_call'
  | 'system'
  | 'meeting';

type NotificationItem = {
  id: string | number;
  type: NotifType;
  title: string;
  message?: string | null;
  when?: string | null;
  avatar?: string | null;
  meta?: Record<string, any>;
};

type FriendRequest = {
  id: number;
  id_solicitante: number;
  id_receptor: number;
  estado: string;
  mensaje?: string | null;
  fecha_solicitud?: string | null;
  solicitante?: { id:number; nombre:string; apellido:string; apodo:string|null; mail?:string|null};
};

type Reunion = {
  id: number;
  titulo: string;
  fecha_programada: string;
};

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

  // ---- Estado Contactos (REST) ----
  const [q, setQ] = useState('');
  const qDebounced = useDebouncedValue(q, 350);
  // Hook de contactos - trae, mapea y expone refresh
  const { contacts, loading: contactsLoading, error: contactsError, refresh: refreshContacts } =
    useContacts(supabase, idUsuario);

  // Estado de notificaciones
  const [notifs, setNotifs] = useState<NotificationItem[]>([]);
  const [notifsLoading, setNotifsLoading] = useState(true);
  const [notifsError, setNotifsError] = useState<string | null>(null);

  // Solicitudes de amistad (realtime)
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [reqLoading, setReqLoading] = useState(false);

  // Reuniones de hoy
  const [reuniones, setReuniones] = useState<Reunion[]>([]);

  // Estado para hora y fecha actual
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  // ===== Mezcla de notificaciones para la card =====
  const combinedNotifications = useMemo(() => {
    const notifications: NotificationItem[] = [];

    requests.forEach((req) => {

      const nombre = 
        [req.solicitante?.nombre, req.solicitante?.apellido].filter(Boolean).join(' ') ||
        req.solicitante?.apodo ||
        `Usuario ${req.id_solicitante}`;
      notifications.push({
        id: `req_${req.id}`,
        type: 'friend_request',
        title: 'Solicitud de amistad',
        message: req.mensaje || `${nombre} quiere agregarte`,
        when: req.fecha_solicitud || new Date().toISOString(),
        meta: req,
      });
    });

    reuniones.forEach((reunion) => {
      const meetingTime = new Date(reunion.fecha_programada);
      const now = new Date();
      const timeDiff = meetingTime.getTime() - now.getTime();
      const hoursUntil = Math.floor(timeDiff / (1000 * 60 * 60));

      let title = 'Reunión programada';
      if (hoursUntil <= 1 && hoursUntil >= 0) title = 'Reunión próxima';
      else if (hoursUntil < 0) title = 'Reunión pasada';

      notifications.push({
        id: `meeting_${reunion.id}`,
        type: 'meeting',
        title,
        message: `${reunion.titulo} - ${meetingTime.toLocaleTimeString()}`,
        when: reunion.fecha_programada,
        meta: reunion,
      });
    });
  

    return notifications.sort((a, b) => {
      const dateA = new Date(a.when || 0).getTime();
      const dateB = new Date(b.when || 0).getTime();
      return dateB - dateA;
    });
  }, [requests, reuniones, timeFmt]);

  // ===== UI helpers =====
  function iconFor(type: NotifType): string {
    switch (type) {
      case 'friend_request':
        return 'user-plus';
      case 'calendar':
        return 'calendar';
      case 'scheduled_call':
        return 'phone-outgoing';
      case 'missed_call':
        return 'phone-missed';
      case 'meeting':
        return 'calendar';
      default:
        return 'info';
    }
  }

  async function handleNotifAccept(n: NotificationItem) {
    try {
      const { data: sess } = await supabase.auth.getSession();
      const accessToken = sess.session?.access_token ?? '';

      if (n.type === 'friend_request') {
        const req = n.meta as FriendRequest;
        await handleAccept(req);
        //luego de aceptar, refresca contactos, se va el pendiente 
        refreshContacts(qDebounced || undefined);
      } else if (n.type === 'meeting') {
        router.push('/protected/calendario');
      } else if (n.type === 'calendar') {
        // abrir detalle / marcar como leída
      } else if (n.type === 'scheduled_call') {
        // unirse / abrir sala programada
      }

      // update optimista 
       if (n.type === 'friend_request' && n.meta) {
        const req = n.meta as FriendRequest;
        setRequests(prev => prev.filter(r => r.id !== req.id));
      }     
    } catch {
      setNotifsError('No se pudo procesar la acción.');
    }
  }

  async function handleNotifReject(n: NotificationItem) {
    try {
      const { data: sess } = await supabase.auth.getSession();
      const accessToken = sess.session?.access_token ?? '';

      if (n.type === 'friend_request' && n.meta) {
        const req = n.meta as FriendRequest;
        await handleReject(req);
        //si rechaza, tmb refresca 
        refreshContacts(qDebounced || undefined);
      } else {
        console.log('Descartar notificación:', n);
      }

      // Update optimista (Realtime igual va a confirmar con el UPDATE)
      if (n.type === 'friend_request' && n.meta) {
        const req = n.meta as FriendRequest;
        setRequests((prev) => prev.filter((r) => r.id !== req.id));
      }
    } catch (e) {
      console.error(e);
      setNotifsError('No se pudo procesar la acción.');
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
  }, [combinedNotifications, contacts, q]);

  // Actualizar hora cada minuto
  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // ---- Contactos (via proxy)
  useEffect(() => {
    if (idUsuario === null) return;
    refreshContacts(qDebounced || undefined);
  }, [idUsuario, qDebounced]);

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

  // ---- Notificaciones (tu API)
  useEffect(() => {
    const ctrl = new AbortController();

    (async () => {
      if (!idUsuario) {
        setNotifs([]);
        setNotifsLoading(false);
        return;
      }

      setNotifsLoading(true);
      setNotifsError(null);
      try {
        const { data: sess } = await supabase.auth.getSession();
        const accessToken = sess.session?.access_token ?? '';
        if (!accessToken) throw new Error('Sin sesión');

        const params = new URLSearchParams({ id_usuario: String(idUsuario) });
        const res = await fetch(`/api/notificaciones?${params.toString()}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: ctrl.signal,
          cache: 'no-store',
        });

        if (!res.ok) throw new Error(await res.text().catch(() => `Error ${res.status}`));

        const json = await res.json();
        const arr = Array.isArray(json) ? json : json?.items ?? json?.data ?? [];

        const mapped: NotificationItem[] = arr.map((n: any) => ({
          id: n.id ?? crypto.randomUUID(),
          type: (n.type as NotifType) ?? (n.kind as NotifType) ?? (n.categoria as NotifType) ?? 'system',
          title: n.title ?? n.titulo ?? n.asunto ?? 'Notificación',
          message: n.message ?? n.mensaje ?? null,
          when: n.when ?? n.fecha ?? n.created_at ?? null,
          avatar: n.avatar ?? n.foto ?? n.path_foto_perfil ?? null,
          meta: n,
        }));

        setNotifs(mapped);
      } catch (e) {
        if ((e as any)?.name !== 'AbortError') setNotifsError('Error al cargar notificaciones.');
      } finally {
        if (!ctrl.signal.aborted) setNotifsLoading(false);
      }
    })();

    return () => ctrl.abort();
  }, [idUsuario, supabase]);

  // ---- Solicitudes pendientes entrantes + Realtime (filtrado por receptor)
  useEffect(() => {
    if (!idUsuario) return;

    let mounted = true;

    const load = async () => {
      setReqLoading(true);
      try {
        const { data: reqs, error } = await supabase
          .from('SolicitudContacto')
          .select('id,id_solicitante,id_receptor,estado,mensaje,fecha_solicitud')
          .eq('id_receptor', idUsuario)
          .eq('estado', 'pendiente')
          .order('fecha_solicitud', { ascending: false });
        if (error) throw error;
        if (!mounted) return;
        
        // Enriquecer con los datos del solicitante
        const solicitantes = Array.from(
          new Set((reqs ?? []).map(r => Number(r.id_solicitante)).filter(Boolean))
        );
        let byId: Record<number, any> = {};
        if (solicitantes.length) {
          const { data: usuarios } = await supabase
            .from('Usuario')
            .select('id,nombre,apellido,apodo,mail')
            .in('id', solicitantes);
          for (const u of usuarios ?? []) byId[Number(u.id)] = u;
        }
        const enriched: FriendRequest[] = (reqs ?? []).map(r => ({
          ...r,
          solicitante: byId[Number(r.id_solicitante)]
            ? {
                id: Number(byId[Number(r.id_solicitante)].id),
                nombre: byId[Number(r.id_solicitante)].nombre ?? '',
                apellido: byId[Number(r.id_solicitante)].apellido ?? '',
                apodo: byId[Number(r.id_solicitante)].apodo ?? null,
                mail: byId[Number(r.id_solicitante)].mail ?? null,
              }
            : undefined,
        }));
        setRequests(enriched);

      } finally {
        if (mounted) setReqLoading(false);
      }
    };

    // carga inicial
    load();


  // suscripción realtime SOLO a mis filas (INSERT cuando yo soy receptor,
  // y UPDATE tanto si soy receptor como si soy solicitante)
  const ch = supabase
    .channel(`home-req:${idUsuario}`)
    // INSERT cuando me llegan solicitudes nuevas
    .on(
      'postgres_changes',
      { schema: 'public', table: 'SolicitudContacto', event: 'INSERT', filter: `id_receptor=eq.${idUsuario}` },
      async (payload) => {
        const r = payload.new as any;
        if (r?.estado !== 'pendiente') return;

        // Enriquecer con datos del solicitante
        const { data: u } = await supabase
          .from('Usuario')
          .select('id,nombre,apellido,apodo,mail')
          .eq('id', r.id_solicitante)
          .maybeSingle();

        const enriched: FriendRequest = {
          ...r,
          solicitante: u
            ? { id: Number(u.id), nombre: u.nombre ?? '', apellido: u.apellido ?? '', apodo: u.apodo ?? null, mail: u.mail ?? null }
            : undefined,
        };
        setRequests(prev => (prev.some(x => x.id === enriched.id) ? prev : [enriched, ...prev]));
      }
    )
    // UPDATE cuando cambia el estado y yo soy RECEPTOR
    .on(
      'postgres_changes',
      { schema: 'public', table: 'SolicitudContacto', event: 'UPDATE', filter: `id_receptor=eq.${idUsuario}` },
      (payload) => {
        const r = payload.new as FriendRequest;
        if (r?.estado !== 'pendiente') {
          setRequests(prev => prev.filter(x => x.id !== r.id));
        }
      }
    )
    // UPDATE cuando cambia el estado y yo soy SOLICITANTE  ⬅️ NUEVO
    .on(
      'postgres_changes',
      { schema: 'public', table: 'SolicitudContacto', event: 'UPDATE', filter: `id_solicitante=eq.${idUsuario}` },
      (payload) => {
        const r = payload.new as FriendRequest;
        if (r?.estado !== 'pendiente') {
          setRequests(prev => prev.filter(x => x.id !== r.id));
        }
      }
    )
    .subscribe();
      
    
    return () => {
      mounted = false;
      supabase.removeChannel(ch);
    };
  }, [idUsuario, supabase]);

  /* ===== Reuniones de hoy ===== */
  useEffect(() => {
    if (!idUsuario) return;
    const fetchReuniones = async () => {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;

      const { data, error } = await supabase
        .from('EventoLlamada')
        .select('id, titulo, fecha_programada')
        .gte('fecha_programada', `${dateStr} 00:00:00`)
        .lte('fecha_programada', `${dateStr} 23:59:59`);

      if (!error && data) setReuniones(data as Reunion[]);
    };
    fetchReuniones();
  }, [idUsuario, supabase]);

  /* ===== Acciones solicitudes ===== */
  async function handleAccept(r: FriendRequest) {
    await supabase.rpc('accept_contact_request', {
      p_id_solicitante: r.id_solicitante,
      p_id_receptor: r.id_receptor,
    });
  }
  async function handleReject(r: FriendRequest) {
    await supabase.rpc('reject_contact_request', {
      p_id_solicitante: r.id_solicitante,
      p_id_receptor: r.id_receptor,
    });
  }
  async function handleCancel(r: FriendRequest) {
    await supabase.rpc('cancel_contact_request', {
      p_id_solicitante: r.id_solicitante,
      p_id_receptor: r.id_receptor,
    });
  }

  const filteredContacts = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return contacts;
    return contacts.filter((c) => {
      const full = `${c.nombre ?? ''} ${c.apellido ?? ''} ${c.apodo ?? ''}`.toLowerCase();
      return full.includes(needle);
    });
  }, [contacts, q]);

  function handleCall(c: Contact) {
    console.log('Llamar a', c);
  }
  function handleVideo(c: Contact) {
    console.log('Videollamar a', c);
  }
  function handleChat(c: Contact) {
    console.log('Chat con', c);
  }

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
            <div className="flex flex-col gap-3 min-h-0">
              {reqLoading ? (
                <p className="text-muted-foreground text-sm">Cargando…</p>
              ) : combinedNotifications.length === 0 ? (
                <p className="text-muted-foreground text-sm">No hay notificaciones nuevas.</p>
              ) : (
                <ul className="divide-y divide-white/20 overflow-y-auto pr-2 min-h-0">
                  {combinedNotifications.map((n) => (
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
                        {n.type === 'friend_request' && (n.meta as any).estado === 'pendiente' && (
                          <>
                            <button onClick={() => handleNotifAccept(n)} className="p-1 rounded bg-green-500/20 hover:bg-green-500/30 text-green-600" title="Aceptar">
                              <i data-feather="check" className="w-3 h-3" />
                            </button>
                            <button onClick={() => handleNotifReject(n)} className="p-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-600" title="Rechazar">
                              <i data-feather="x" className="w-3 h-3" />
                            </button>
                          </>
                        )}
                        {n.type === 'meeting' && (
                          <button onClick={() => handleNotifAccept(n)} className="p-1 rounded bg-blue-500/20 hover:bg-blue-500/30 text-blue-600" title="Ver en calendario">
                            <i data-feather="calendar" className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
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
