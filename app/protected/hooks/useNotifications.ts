import { useEffect, useMemo, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

function getNotifTitle(tipo: string): string {
  switch (tipo) {
    case 'friend_request':
      return 'Solicitud de amistad';
    case 'friend_request_accepted':
      return 'Solicitud aceptada';
    case 'friend_request_rejected':
      return 'Solicitud rechazada';
    default:
      return 'Notificación';
  }
}

export type NotificationItem = {
  id: number;
  type: NotifType;
  title: string;
  message?: string | null;
  when?: string | null;     // ISO
  leida?: boolean;
  meta?: any;
};

export type NotifType =
  | 'friend_request'
  | 'friend_request_accepted'
  | 'friend_request_rejected'
  | 'meeting_invite'
  | 'reinvite'
  | 'system';


function titleFor(type: NotifType) {
  switch (type) {
    case 'friend_request':   return 'Solicitud de amistad';
    case 'meeting_invite':   return 'Te invitaron a una reunión';
    default:                 return 'Notificación';
  }
}

/**
 * Hook único para leer y escuchar la tabla `Notificacion`.
 * - Carga inicial + Realtime (INSERT/UPDATE)
 * - Acciones: markAsRead, markAllAsRead, refresh
 */
export function useNotifications(
  supabase: SupabaseClient<any, 'public', any>,
  idUsuario: number | null,
  options?: { pageSize?: number }
) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const pageSize = options?.pageSize ?? 8; // tamaño de página por defecto

  const mapRow = (n: any): NotificationItem => {
    const t = (n.tipo as NotifType) ?? 'system';
    const nombre =
      n.meta?.receptor_name ??
      n.meta?.emisor_name ??
      n.meta?.from_name ??
      'Alguien';
    let msg: string | null = n.mensaje ?? null;
    if (!msg) {
     if (t === 'friend_request_accepted') msg = `${nombre} aceptó tu solicitud de amistad.`;
      else if (t === 'friend_request_rejected') msg = `${nombre} rechazó tu solicitud de amistad.`;
      else if (t === 'friend_request')        msg = `${nombre} quiere agregarte.`;
      else if (t === 'meeting_invite')        msg = `Invitación a reunión`;
    }
const title =
  t === 'friend_request_accepted' ? 'Solicitud aceptada' :
  t === 'friend_request_rejected' ? 'Solicitud rechazada' :
  t === 'friend_request'           ? 'Solicitud de amistad' :
  t === 'meeting_invite'
    ? (n.meta?.titulo_evento
        ? `Te invitaron al evento "${n.meta.titulo_evento}"`
        : 'Invitación a reunión')
  : t === 'reinvite'
    ? (n.meta?.titulo_evento
        ? `Nueva invitación: "${n.meta.titulo_evento}"`
        : 'Nueva invitación a evento')
  : 'Notificación';
    return {
      id: Number(n.id),                 // <-- id numérico consistente
      type: t,
      title,
      message: msg,
      when: n.fecha_envio ?? null,
      leida: !!n.leida,
      meta: n.meta ?? null,
    };
  };

  // ---- Carga inicial
  const refresh = async () => {
    if (!idUsuario) { setNotifications([]); setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      // Con RLS igual sólo vuelven las del usuario autenticado,
      // pero filtramos por las dudas para mejorar el plan de consulta.
      const { data, error, count } = await supabase
        .from('Notificacion')
        .select('id,id_usuario,tipo,mensaje,meta,leida,fecha_envio', { count: 'exact' })
        .eq('id_usuario', idUsuario)
        .order('fecha_envio', { ascending: false })
        .range(0, pageSize - 1);

    if (error) throw error;

    const arr = (data ?? []) as any[];
    const mapped: NotificationItem[] = arr.map(mapRow);

      // mantener TODO (incluidas friend_request leídas) para dejar evidencia
      setNotifications(mapped);
      setHasMore((count ?? 0) > mapped.length);

    } catch (e) {
      setError('Error al cargar notificaciones.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [idUsuario]);

  // ---- Realtime (INSERT/UPDATE)
  useEffect(() => {
    if (!idUsuario) return;
    const ch = supabase
      .channel(`notifs:${idUsuario}`)
      .on(
        'postgres_changes',
        { schema: 'public', table: 'Notificacion', event: 'INSERT', filter: `id_usuario=eq.${idUsuario}` },
       payload => {
         const item = mapRow(payload.new);
         // Si por alguna razón llega insert ya leído y es 'friend_request', lo ignoramos/limpiamos
         if (item.type === 'friend_request' && item.leida) {
           setNotifications(prev => prev.filter(x => x.id !== item.id));
           return;
         }
         // De-dupe + prepend (aparece arriba sin refrescar)
         setNotifications(prev =>
           prev.some(x => x.id === item.id) ? prev : [item, ...prev]
         );
       }
      )
      .on(
        'postgres_changes',
        { schema: 'public', table: 'Notificacion', event: 'UPDATE', filter: `id_usuario=eq.${idUsuario}` },
        payload => {
          const item = mapRow(payload.new);
          setNotifications(prev => prev.map(x => (x.id === item.id ? item : x)));
        }
      )
      .on(
        'postgres_changes',
        { schema: 'public', table: 'Notificacion', event: 'DELETE', filter: `id_usuario=eq.${idUsuario}` },
        payload => {
          const idDel = Number(payload.old?.id);
          if (!idDel) return;
          setNotifications(prev => prev.filter(x => x.id !== idDel));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [supabase, idUsuario]);

  // ---- Cargar más (paginación incremental)
  const loadMore = async () => {
    if (!idUsuario || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const offset = notifications.length;
      const { data, error, count } = await supabase
        .from('Notificacion')
        .select('id,id_usuario,tipo,mensaje,meta,leida,fecha_envio', { count: 'exact' })
        .eq('id_usuario', idUsuario)
        .order('fecha_envio', { ascending: false })
        .range(offset, offset + pageSize - 1);
      if (error) throw error;
      const mapped = (data ?? []).map(mapRow);
      setNotifications(prev => {
        // de-dupe por si llega algo repetido
        const ids = new Set(prev.map(x => x.id));
        const merged = [...prev, ...mapped.filter(x => !ids.has(x.id))];
        return merged;
      });
      const total = count ?? offset + mapped.length;
      setHasMore(total > (offset + mapped.length));
    } finally {
      setLoadingMore(false);
    }
  };

  // ---- Acciones
  async function markAsRead(id: number) {
    try {
      await supabase.from('Notificacion').update({ leida: true }).eq('id', id);
      // Optimista
      setNotifications(prev => prev.map(n => (n.id === id ? { ...n, leida: true } : n)));
    } catch {/* noop */}
  }

  async function markAllAsRead() {
    if (!idUsuario) return;
    try {
      await supabase.from('Notificacion')
        .update({ leida: true })
        .eq('id_usuario', idUsuario)
        .eq('leida', false);
      setNotifications(prev => prev.map(n => ({ ...n, leida: true })));
    } catch {/* noop */}
  }

  const unreadCount = useMemo(
    () => notifications.filter(n => !n.leida).length,
    [notifications]
  );

  return { notifications, loading, error, unreadCount, refresh, markAsRead, markAllAsRead, hasMore, loadMore, loadingMore };
}
