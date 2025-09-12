'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
// @ts-ignore
import feather from 'feather-icons';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Perfil = { nombre: string | null; apellido: string | null; mail: string | null };

// ----- Tipos y helpers para Contactos (REST) -----
type RawContact = Record<string, any>;
type Contact = {
  id: number | string;
  nombre: string;
  apellido?: string | null;
  apodo?: string | null;
  estado?: 'available' | 'busy' | 'away' | string | null;
  foto?: string | null;
};

type NotifType = 'friend_request' | 'calendar' | 'scheduled_call' | 'missed_call' | 'system' | 'meeting';

type NotificationItem = {
  id: string | number;
  type: NotifType;
  title: string; //ej: solicitud de amistad
  message?: string | null; //algun detalle
  when?: string | null;
  avatar?: string | null; //foto por las dudas
  meta?: Record<string, any>; //payload extra 
};

type FriendRequest = {
  id: number;
  id_solicitante: number;
  id_receptor: number;
  estado: string;
  mensaje?: string | null;
  fecha_solicitud?: string | null;
};

type Reunion = {
  id: number;
  titulo: string;
  fecha_programada: string;
};

//HELPERS
function stateDot(estado: string) {
  const color =
    /busy|ocupado/i.test(estado) ? 'bg-red-500' :
    /away|ausente/i.test(estado) ? 'bg-yellow-500' :
    'bg-green-500';
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
    return () => { if (t.current) clearTimeout(t.current); };
  }, [value, delay]);
  return v;
}

export default function DashboardPage() {
  const supabase = useSupabaseClient();
  const router = useRouter();
  const [estado, setEstado] = useState('available');
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [cargando, setCargando] = useState(true);

  // ---- Hydration guard + formatters con zona horaria fija ----
  const [isHydrated, setIsHydrated] = useState(false);
  useEffect(() => { setIsHydrated(true); }, []);
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
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [contactsError, setContactsError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const qDebounced = useDebouncedValue(q, 350);

  //Estado de notificaciones 
  const [notifs, setNotifs] = useState<NotificationItem[]>([]);
  const [notifsLoading, setNotifsLoading] = useState(true);
  const [notifsError, setNotifsError] = useState<string | null>(null);

  //Notificaciones de solicitudes de amistad (para acciones rápidas) //MOCKEADO
  const [requests, setRequests] = useState<FriendRequest[]>([
    {
      id: 1,
      id_solicitante: 123,
      id_receptor: 456,
      estado: 'pendiente',
      mensaje: 'Hola! Me gustaría agregarte como contacto',
      fecha_solicitud: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 horas atrás
    },
    {
      id: 2,
      id_solicitante: 789,
      id_receptor: 456,
      estado: 'pendiente',
      mensaje: null,
      fecha_solicitud: new Date(Date.now() - 30 * 60 * 1000).toISOString() // 30 min atrás
    }
  ]);
  const [reqLoading, setReqLoading] = useState(false);

  // Reuniones de hoy //MOCKEADO
  const [reuniones, setReuniones] = useState<Reunion[]>([
    {
      id: 1,
      titulo: "Reunión de equipo semanal",
      fecha_programada: new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 min en el futuro
    },
    {
      id: 2,
      titulo: "Presentación con cliente",
      fecha_programada: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() // 2 horas en el futuro
    },
    {
      id: 3,
      titulo: "Reunión de seguimiento",
      fecha_programada: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString() // 1 hora atrás (pasada)
    }
  ]);

  // Estado para hora y fecha actual
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  // Combinar solicitudes y reuniones en una sola lista de notificaciones
  const combinedNotifications = useMemo(() => {
    const notifications: NotificationItem[] = [];
    
    // Agregar solicitudes de amistad
    requests.forEach(req => {
      notifications.push({
        id: `req_${req.id}`,
        type: 'friend_request',
        title: 'Solicitud de amistad',
        message: req.mensaje || `Usuario ${req.id_solicitante} quiere agregarte`,
        when: req.fecha_solicitud || new Date().toISOString(),
        meta: req
      });
    });
    
    // Agregar reuniones de hoy
    reuniones.forEach(reunion => {
      const meetingTime = new Date(reunion.fecha_programada);
      const now = new Date();
      const timeDiff = meetingTime.getTime() - now.getTime();
      const hoursUntil = Math.floor(timeDiff / (1000 * 60 * 60));
      
      let title = 'Reunión programada';
      if (hoursUntil <= 1 && hoursUntil >= 0) {
        title = 'Reunión próxima';
      } else if (hoursUntil < 0) {
        title = 'Reunión pasada';
      }
      
      notifications.push({
        id: `meeting_${reunion.id}`,
        type: 'meeting',
        title,
        message: `${reunion.titulo} - ${meetingTime.toLocaleTimeString()}`,
        when: reunion.fecha_programada,
        meta: reunion
      });
    });
    
    // Ordenar por fecha (más recientes primero)
    return notifications.sort((a, b) => {
      const dateA = new Date(a.when || 0).getTime();
      const dateB = new Date(b.when || 0).getTime();
      return dateB - dateA;
    });
  }, [requests, reuniones, timeFmt]);


  //Helpers
  function iconFor(type: NotifType): string {
    switch (type) {
      case 'friend_request':  return 'user-plus';
      case 'calendar':        return 'calendar';
      case 'scheduled_call':  return 'phone-outgoing';
      case 'missed_call':     return 'phone-missed';
      case 'meeting':         return 'calendar';
      default:                return 'info';
    }
  }

  async function handleNotifAccept(n: NotificationItem) {
    try {
      const { data: sess } = await supabase.auth.getSession();
      const accessToken = sess.session?.access_token ?? '';
      
      if (n.type === 'friend_request') {
        const req = n.meta as FriendRequest;
        await handleAccept(req);
      } else if (n.type === 'meeting') {
        // Navegar al calendario para ver la reunión
        router.push('/protected/calendario');
      } else if (n.type === 'calendar') {
        // abrir detalle / marcar como leída
      } else if (n.type === 'scheduled_call') {
        // unirse / abrir sala programada
      }
      
      // Actualizar la lista de solicitudes si era una solicitud
      if (n.type === 'friend_request') {
        fetchRequests();
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
      } else {
        // marcar como descartada / leída
        console.log('Descartar notificación:', n);
      }
      
      // Actualizar la lista de solicitudes si era una solicitud
      if (n.type === 'friend_request') {
        fetchRequests();
      }
    } catch (e) {
      console.error(e);
      setNotifsError('No se pudo procesar la acción.');
    }
  }

  function whenLabel(iso?: string | null) {
    if (!iso) return null;
    try { return new Date(iso).toLocaleString(); } catch { return iso; }
  }
    
  // Render de íconos
  useEffect(() => { feather.replace();});

  // Actualizar hora cada minuto
  useEffect(() => {
    // Establecer tiempo inicial
    setCurrentTime(new Date());
    
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Actualizar cada minuto

    return () => clearInterval(timer);
  }, []);

  // ---- Cargar notificaciones
  // Contactos desde tu backend vía PROXY
  useEffect(() => {
    const ctrl = new AbortController();

    function mapContact(c: RawContact): Contact {
      return {
        id: c.id ?? c.id_usuario ?? c.user_id ?? String(Math.random()),
        nombre: c.nombre ?? c.first_name ?? c.name ?? '—',
        apellido: c.apellido ?? c.last_name ?? null,
        apodo: c.apodo ?? c.nickname ?? null,
        estado: c.estado ?? c.status ?? null,
        foto: c.path_foto_perfil ?? c.avatar_url ?? c.foto ?? null,
      };
    }

    (async () => {
      if (!idUsuario) {
        setContacts([]);
        setContactsLoading(false);
        return;
      }

      setContactsLoading(true);
      setContactsError(null);
      try {
        const { data: sess } = await supabase.auth.getSession();
        const accessToken = sess.session?.access_token ?? '';
        if (!accessToken) throw new Error('Sin sesión');

        const params = new URLSearchParams();
        params.set('id_usuario', String(idUsuario));
        if (qDebounced) params.set('busqueda', qDebounced);

        const url = `/api/contacts/misContactos?` + params.toString();
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: ctrl.signal,
          cache: 'no-store',
        });

        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(text || `Error ${res.status}`);
        }

        const json = await res.json();
        const arr: RawContact[] = Array.isArray(json) ? json : (json?.items ?? json?.data ?? []);
        setContacts(arr.map(mapContact));
      } catch (e: any) {
        if (e?.name !== 'AbortError') {
          setContactsError('Error de red al obtener contactos.');
        }
      } finally {
        if (!ctrl.signal.aborted) setContactsLoading(false);
      }
    })();

    return () => ctrl.abort();
  }, [idUsuario, qDebounced, supabase]);


  // Perfil + resolvemos id_usuario desde Supabase (uuid -> Usuario.id)
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

      if (!uuid) { setCargando(false); return; }

      const { data: row } = await supabase
        .from('Usuario')
        .select('id')
        .eq('User_id', uuid)
        .maybeSingle();

      if (!row?.id) { setCargando(false); return; }
      setIdUsuario(row.id);

      const { data: userData } = await supabase.rpc('get_user_by_id_usuario', { p_id_usuario: row.id });
      const u = Array.isArray(userData) ? userData[0] : userData;
      if (u) {
        setPerfil({ nombre: u.nombre ?? null, apellido: u.apellido ?? null, mail: u.mail ?? null });
      }
      setCargando(false);
    };
    fetchPerfil();
  }, [supabase]);

  // ---- Cargar notificaciones
  useEffect(() => {
    const ctrl = new AbortController();

    (async () => {
      if (!idUsuario) { setNotifs([]); setNotifsLoading(false); return; }

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
        const arr = Array.isArray(json) ? json : (json?.items ?? json?.data ?? []);

        // Mapeo flexible para normalizar tu payload
        const mapped: NotificationItem[] = arr.map((n: any) => ({
          id: n.id ?? crypto.randomUUID(),
          type:
            (n.type as NotifType) ??
            (n.kind as NotifType) ??
            (n.categoria as NotifType) ??
            'system',
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

  // ---- Cargar solicitudes de amistad
  const fetchRequests = async () => {
    if (!idUsuario) return;
    
    setReqLoading(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const accessToken = sess.session?.access_token ?? '';
      if (!accessToken) throw new Error('Sin sesión');

      const res = await fetch(`/api/solicitudes?usuario_id=${idUsuario}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      });

      if (res.ok) {
        const data = await res.json();
        setRequests(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('Error cargando solicitudes:', e);
    } finally {
      setReqLoading(false);
    }
  };

  // Cargar solicitudes iniciales - movido al useEffect

  // ---- Realtime para solicitudes
  useEffect(() => {
    if (!idUsuario) return;

    fetchRequests(); // Cargar inicial

    const channel = supabase
      .channel('solicitudes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'SolicitudContacto' },
        payload => { //que onda esto no lo lee
          fetchRequests();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
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

  function handleCall(c: Contact)  { console.log('Llamar a', c); }
  function handleVideo(c: Contact) { console.log('Videollamar a', c); }
  function handleChat(c: Contact)  { console.log('Chat con', c); }


  return (
    <div className="flex min-h-screen bg-orange-50 dark:bg-gray-600">
      {/* aca antes estaba el Sidebar */}

      {/* Main content */}
      <main className="flex-1 px-6 py-8 flex flex-col gap-8">
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

          <div className="relative max-w-md w-full">
            <input
              type="text"
              placeholder="Buscar contactos, reuniones..."
              className="w-full px-4 py-2 pr-10 rounded-md bg-white/40 dark:bg-white/10 border border-orange-300 text-foreground focus:ring-2 focus:ring-orange-400 backdrop-blur-md"
            />
            <i data-feather="search" className="absolute right-3 top-1/2 transform -translate-y-1/2 text-orange-500" />
          </div>
        </header>

        {/* Banner con hora, fecha y mascota */}
        <div className="bg-gradient-to-r from-orange-400 to-orange-600 rounded-xl p-4 mb-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              {currentTime ? (
                <>
                  <div className="text-3xl font-bold text-white">
                    {currentTime.toLocaleTimeString('es-ES', { 
                      hour: '2-digit', 
                      minute: '2-digit',
                      hour12: true 
                    })}
                  </div>
                  <div className="text-orange-100 text-lg">
                    {currentTime.toLocaleDateString('es-ES', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
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
                <img 
                  src="/mascota.png" 
                  alt="Mascota" 
                  className="w-16 h-16 object-contain" 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Cards */}
        <section className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 items-stretch auto-rows-[minmax(0,1fr)]">
          <Card title="Iniciar reunión" description="Crea una sala e invita a otros." buttonText="Crear reunión" />
          
          {/* Notificaciones */}
          <Card
            title="Notificaciones"
            content={
              <div className="flex flex-col gap-3">
                {reqLoading ? (
                  <p className="text-muted-foreground text-sm">Cargando…</p>
                ) : combinedNotifications.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No hay notificaciones nuevas.</p>
                ) : (
                  <ul className="divide-y divide-white/20 max-h-48 overflow-y-auto pr-2">
                    {combinedNotifications.map((n: NotificationItem) => (
                      <li key={n.id} className="py-3 flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">
                          <i data-feather={iconFor(n.type)} className="w-4 h-4 text-orange-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{n.title}</div>
                          {n.message && (
                            <div className="text-xs text-muted-foreground mt-1">{n.message}</div>
                          )}
                          {n.when && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {whenLabel(n.when)}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          {n.type === 'friend_request' && (n.meta as FriendRequest).estado === 'pendiente' && (
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
                          {n.type === 'meeting' && (
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
                  </ul>
                )}
              </div>
            }
          />

          {/* Contactos */}
          <div className="md:row-span-2 flex flex-col">
            <Card        
              className="flex flex-col flex-1 min-h-0"
              title="Contactos"
              content={
                <div className="flex flex-col gap-4 flex-1 min-h-0">
                  <div className="relative flex-shrink-0">
                    <input
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="Buscar por nombre, apellido o apodo…"
                      className="w-full px-3 py-2 pr-8 rounded-md bg-white/20 border border-white/30 text-foreground backdrop-blur-sm"
                    />
                    <i data-feather="search" className="absolute right-2 top-1/2 -translate-y-1/2 text-orange-500 w-4 h-4" />
                  </div>

                  <div className="flex-1 min-h-0">
                    {contactsLoading ? (
                      <p className="text-sm text-muted-foreground">Cargando…</p>
                    ) : contactsError ? (
                      <p className="text-sm text-red-500">Error de red al obtener contactos.</p>
                    ) : filteredContacts.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Sin resultados.</p>
                    ) : (
                      <ul className="divide-y divide-white/20 max-h-96 overflow-y-auto pr-1">
                        {filteredContacts.map((c: Contact) => (
                          <li key={c.id} className="py-2 flex items-center gap-3">
                            {c.foto ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={c.foto} alt={c.apodo ?? c.nombre} className="w-9 h-9 rounded-full object-cover" />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-xs">👤</div>
                            )}

                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">
                                {c.nombre} {c.apellido ?? ''}
                                {c.apodo ? <span className="opacity-70"> · {c.apodo}</span> : null}
                              </div>
                              {c.estado ? (
                                <span className="text-xs opacity-70">
                                  {stateDot(c.estado)} {labelEstado(c.estado)}
                                </span>
                              ) : null}
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                title="Llamar"
                                className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition"
                                onClick={() => handleCall(c)}
                              >
                                <i data-feather="phone" className="w-4 h-4" />
                              </button>
                              <button
                                title="Videollamada"
                                className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition"
                                onClick={() => handleVideo(c)}
                              >
                                <i data-feather="video" className="w-4 h-4" />
                              </button>
                              <button
                                title="Chat"
                                className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition"
                                onClick={() => handleChat(c)} 
                              >
                                <i data-feather="message-circle" className="w-4 h-4" />
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              }
            />
          </div> 
      
          <Card
            title="Reuniones programadas"
            list={['🗓 5 julio - Reunión equipo 10:00', '🗓 6 julio - Cliente Z 15:30']}
            buttonText="Ver calendario"
          />

          {/* Perfil con links */}
          <Card
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
                <Link
                  href="/protected/perfil"
                  className="bg-gradient-to-r from-orange-400 to-orange-600 text-white px-4 py-2 rounded-full font-semibold hover:brightness-105 transition"
                >
                  Ver perfil
                </Link>
                <Link
                  href="/protected/perfil/editar"
                  className="bg-gradient-to-r from-orange-400 to-orange-600 text-white px-4 py-2 rounded-full font-semibold hover:brightness-105 transition"
                >
                  Editar perfil
                </Link>
              </div>  
            }
          />

        </section>
      </main>
    </div>
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
    <div className={`bg-orange-50/50 dark:bg-gray-700/50 rounded-xl p-6 shadow-lg backdrop-blur-md border border-orange-200/30 dark:border-gray-600/30 flex flex-col justify-between ${className ?? ''}`}>
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
            {list.map((item, i) => <li key={i}>{item}</li>)}
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
