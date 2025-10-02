import { useEffect, useMemo, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

/* ================== Tipos ================== */
export type NotifType =
  | 'friend_request'
  | 'friend_request_accepted'
  | 'friend_request_rejected'
  | 'meeting_invite'
  | 'system';

export type NotificationItem = {
  id: number;
  type: NotifType;
  title: string;
  message?: string | null;
  when?: string | null;     // ISO
  leida?: boolean;
  meta?: any;
};

/* =============== Helpers de título =============== */
function titleFor(type: NotifType, mensaje?: string | null, meta?: any): string {
  switch (type) {
    case 'friend_request':
      return 'Solicitud de amistad';
    case 'friend_request_accepted':
      return 'Solicitud aceptada';
    case 'friend_request_rejected':
      return 'Solicitud rechazada';
    case 'meeting_invite':
      // Si hay nombre de evento, mostralo
      if (meta?.titulo_evento) return `Invitación a "${meta.titulo_evento}"`;
      return 'Invitación a reunión';
    default:
      return 'Notificación';
  }
}

/* Mapear fila cruda -> NotificationItem unificado (tolerante a columnas) */
function mapRow(n: any): NotificationItem {
  const t = (n.tipo as NotifType) ?? (n.type as NotifType) ?? 'system';

  const nombre =
    n.meta?.receptor_name ??
    n.meta?.emisor_name ??
    n.meta?.from_name ??
    'Alguien';

  let msg: string | null = n.mensaje ?? n.message ?? null;
  if (!msg) {
    if (t === 'friend_request_accepted') msg = `${nombre} aceptó tu solicitud de amistad.`;
    else if (t === 'friend_request_rejected') msg = `${nombre} rechazó tu solicitud de amistad.`;
    else if (t === 'friend_request') msg = `${nombre} quiere agregarte.`;
    else if (t === 'meeting_invite') msg = 'Invitación a reunión';
  }

  const meta = n.meta ?? null;

  return {
    id: Number(n.id),                 // id numérico consistente
    type: t,
    title: titleFor(t, msg, meta),
    message: msg,
    when: n.fecha_envio ?? n.when ?? n.created_at ?? null,
    leida: !!(n.leida ?? n.read ?? n.is_read),
    meta,
  };
}

/**
 * Hook único para leer y escuchar la tabla `Notificacion`.
 * - Carga inicial + Realtime (INSERT/UPDATE/DELETE)
 * - Acciones: markAsRead, markAllAsRead, refresh
 */
export function useNotifications(
  supabase: SupabaseClient<any, 'public', any>,
  idUsuario: number | null
) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ---- Carga inicial
  const refresh = async () => {
    if (!idUsuario) { setNotifications([]); setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('Notificacion')
        .select('id,id_usuario,tipo,mensaje,meta,leida,fecha_envio,created_at')
        .eq('id_usuario', idUsuario)
        .order('fecha_envio', { ascending: false });

      if (error) throw error;

      const mapped: NotificationItem[] = (data ?? []).map(mapRow);
      setNotifications(mapped);
    } catch (e) {
      console.error(e);
      setError('Error al cargar notificaciones.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idUsuario]);

  // ---- Realtime (INSERT/UPDATE/DELETE)
  useEffect(() => {
    if (!idUsuario) return;

    const ch = supabase
      .channel(`notifs:${idUsuario}`)
      .on(
        'postgres_changes',
        { schema: 'public', table: 'Notificacion', event: 'INSERT', filter: `id_usuario=eq.${idUsuario}` },
        (payload) => {
          const item = mapRow(payload.new);
          // Si llega friend_request ya leída, limpiamos (caso edge)
          if (item.type === 'friend_request' && item.leida) {
            setNotifications(prev => prev.filter(x => x.id !== item.id));
            return;
          }
          // De-dupe + prepend
          setNotifications(prev =>
            prev.some(x => x.id === item.id) ? prev : [item, ...prev]
          );
        }
      )
      .on(
        'postgres_changes',
        { schema: 'public', table: 'Notificacion', event: 'UPDATE', filter: `id_usuario=eq.${idUsuario}` },
        (payload) => {
          const item = mapRow(payload.new);
          setNotifications(prev => prev.map(x => (x.id === item.id ? item : x)));
        }
      )
      .on(
        'postgres_changes',
        { schema: 'public', table: 'Notificacion', event: 'DELETE', filter: `id_usuario=eq.${idUsuario}` },
        (payload) => {
          const idDel = Number(payload.old?.id);
          if (!idDel) return;
          setNotifications(prev => prev.filter(x => x.id !== idDel));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [supabase, idUsuario]);

  // ---- Acciones
  async function markAsRead(id: number) {
    try {
      await supabase.from('Notificacion').update({ leida: true }).eq('id', id);
      // Optimista
      setNotifications(prev => prev.map(n => (n.id === id ? { ...n, leida: true } : n)));
    } catch {
      /* noop */
    }
  }

  async function markAllAsRead() {
    if (!idUsuario) return;
    try {
      await supabase
        .from('Notificacion')
        .update({ leida: true })
        .eq('id_usuario', idUsuario)
        .eq('leida', false);
      setNotifications(prev => prev.map(n => ({ ...n, leida: true })));
    } catch {
      /* noop */
    }
  }

  const unreadCount = useMemo(
    () => notifications.filter(n => !n.leida).length,
    [notifications]
  );

  return { notifications, loading, error, unreadCount, refresh, markAsRead, markAllAsRead };
}