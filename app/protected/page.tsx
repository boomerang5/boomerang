'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
// @ts-ignore
import feather from 'feather-icons';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useContacts, type Contact } from './hooks/useContacts'; 
import { useNotifications } from './hooks/useNotifications'; 

type Perfil = { nombre: string | null; apellido: string | null; mail: string | null };

// ----- Tipos y helpers para Contactos (REST) -----

type NotifType =
  | 'friend_request'
  | 'meeting_invite'
  | 'calendar'
  | 'scheduled_call'
  | 'missed_call'
  | 'system'
  | 'meeting'
  | 'event_cancelled';

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

  // Hook de notificaciones - NUEVO: usar el hook existente
  const { notifications: dbNotifications, loading: notifsLoading, error: notifsError } = 
    useNotifications(supabase, idUsuario);

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

    // 🆕 AGREGAR NOTIFICACIONES DE LA BASE DE DATOS (meeting_invite, etc.)
    if (dbNotifications && dbNotifications.length > 0) {
      dbNotifications.forEach((dbNotif) => {
        notifications.push({
          id: `db_${dbNotif.id}`,
          type: dbNotif.type,
          title: dbNotif.title,
          message: dbNotif.message || '',
          when: dbNotif.when || new Date().toISOString(),
          meta: dbNotif.meta,
        });
      });
    }

    // Solicitudes de amistad (mantener el sistema existente)
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
  }, [dbNotifications, requests, reuniones, timeFmt]);

  // ===== UI helpers =====
  function iconFor(type: NotifType): string {
    switch (type) {
      case 'friend_request':
        return 'user-plus';
      case 'meeting_invite':
        return 'calendar';
      case 'event_cancelled':
        return 'x-circle';
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
      } else if (n.type === 'meeting_invite') {
        // Manejar confirmación de invitación a evento
        await handleEventInviteResponse(n, 'accept');
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
      console.error('No se pudo procesar la acción.');
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
      } else if (n.type === 'meeting_invite') {
        // Manejar rechazo de invitación a evento
        await handleEventInviteResponse(n, 'decline');
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
      console.error('No se pudo procesar la acción.');
    }
  }

  // 🆕 NUEVA FUNCIÓN: Manejar respuestas a invitaciones de eventos
  async function handleEventInviteResponse(n: NotificationItem, response: 'accept' | 'decline') {
    try {
      if (!n.meta || !n.meta.id_evento) {
        throw new Error('No se encontró información del evento en la notificación');
      }

      const { data: sess } = await supabase.auth.getSession();
      const accessToken = sess.session?.access_token ?? '';
      if (!accessToken) {
        throw new Error('No hay sesión activa');
      }

      // Usar el endpoint correcto de calendario
      const responseResult = await fetch('/api/calendar/respond-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          id_evento: n.meta.id_evento,
          id_usuario: idUsuario,
          confirmado: response === 'accept'
        }),
      });

      if (responseResult.ok) {
        console.log(`Invitación ${response === 'accept' ? 'aceptada' : 'rechazada'} exitosamente`);
        
        // 🆕 Marcar la notificación como respondida en el backend
        const notificationId = String(n.id).replace('db_', '');
        await fetch(`/api/notifications/${notificationId}/mark-responded`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            response: response
          }),
        });
        
        // El hook useNotifications se actualizará automáticamente por realtime
      } else {
        const errorData = await responseResult.text();
        throw new Error(`Error al responder invitación: ${errorData}`);
      }
    } catch (error) {
      console.error('Error al responder a invitación de evento:', error);
      console.error('No se pudo responder a la invitación.');
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

      {/* Cards */}
      <section className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 items-stretch">
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
                        {n.message && <div className="text-xs text-muted-foreground mt-1">{n.message}</div>}
                        
                        {/* 🆕 INFORMACIÓN PARA EVENTOS - NUEVO FORMATO */}
                        {n.type === 'meeting_invite' && n.meta && (
                          <div className="mt-2">
                            {/* Nombre del evento como link clickeable */}
                            <button
                              onClick={() => {
                                // Si tenemos el ID del evento, podríamos llevarlo a un modal específico
                                // Por ahora, llevamos al calendario general
                                router.push('/protected/calendario');
                              }}
                              className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline cursor-pointer transition-colors"
                              title="Ir al calendario para ver el evento"
                            >
                              📅 {n.meta.nombre_evento || 'Evento sin nombre'}
                            </button>
                          </div>
                        )}
                        
                        {/* 🆕 INFORMACIÓN PARA EVENTOS CANCELADOS */}
                        {n.type === 'event_cancelled' && n.meta && (
                          <div className="mt-2">
                            <div className="text-sm font-medium text-red-600 dark:text-red-400">
                              ❌ {n.meta.nombre_evento || 'Evento sin nombre'}
                            </div>
                          </div>
                        )}
                        
                        {/* 🆕 QUITAR n.when PARA EVENTOS, MANTENER PARA OTROS TIPOS */}
                        {n.when && n.type !== 'meeting_invite' && n.type !== 'event_cancelled' && (
                          <div className="text-xs text-muted-foreground mt-1">{whenLabel(n.when)}</div>
                        )}
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        {/* Botones para solicitudes de amistad */}
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
                        
                        {/* 🆕 BOTONES PARA INVITACIONES A EVENTOS - Solo si no ha sido respondida */}
                        {n.type === 'meeting_invite' && !n.meta?.respondida && (
                          <>
                            <button
                              onClick={() => handleNotifAccept(n)}
                              className="p-1 rounded bg-green-500/20 hover:bg-green-500/30 text-green-600"
                              title="Confirmar asistencia"
                            >
                              <i data-feather="check" className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleNotifReject(n)}
                              className="p-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-600"
                              title="Rechazar invitación"
                            >
                              <i data-feather="x" className="w-3 h-3" />
                            </button>
                          </>
                        )}
                        
                        {/* 🆕 ESTADO DE RESPUESTA PARA EVENTOS YA RESPONDIDOS */}
                        {n.type === 'meeting_invite' && n.meta?.respondida && (
                          <div className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                            {n.meta.respuesta === 'accept' ? '✅ Aceptado' : '❌ Rechazado'}
                          </div>
                        )}
                        
                        {/* Botón para reuniones programadas */}
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
                  <i
                    data-feather="search"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-orange-500 w-4 h-4"
                  />
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
                            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-xs">
                              👤
                            </div>
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
