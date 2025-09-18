import { useEffect, useMemo, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

export type NotifType = 'friend_request' | 'meeting_invite' | 'system';

export type NotificationItem = {
  id: number;
  type: NotifType;
  title: string;
  message?: string | null;
  when?: string | null;     // ISO
  leida?: boolean;
  meta?: any;
};

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
  idUsuario: number | null
) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  // ---- Carga inicial
  const refresh = async () => {
    if (!idUsuario) { setNotifications([]); setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      // Con RLS igual sólo vuelven las del usuario autenticado,
      // pero filtramos por las dudas para mejorar el plan de consulta.
      const { data, error } = await supabase
        .from('Notificacion')
        .select('id, id_usuario, tipo, mensaje, meta, leida, fecha_envio')
        .eq('id_usuario', idUsuario)
        .order('fecha_envio', { ascending: false });

      if (error) throw error;

      const mapped: NotificationItem[] = (data ?? []).map((n: any) => ({
        id: Number(n.id),
        type: (n.tipo as NotifType) ?? 'system',
        title: titleFor(n.tipo as NotifType),
        message: n.mensaje ?? null,
        when: n.fecha_envio ?? null,
        leida: !!n.leida,
        meta: n.meta ?? null,
      }));

      setNotifications(mapped);
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
          const n: any = payload.new;
          const item: NotificationItem = {
            id: Number(n.id),
            type: (n.tipo as NotifType) ?? 'system',
            title: titleFor(n.tipo as NotifType),
            message: n.mensaje ?? null,
            when: n.fecha_envio ?? null,
            leida: !!n.leida,
            meta: n.meta ?? null,
          };
          // Evitar duplicado si ya está
          setNotifications(prev =>
            prev.some(p => Number(p.id) === item.id) ? prev : [item, ...prev]
          );
        }
      )
      .on(
        'postgres_changes',
        { schema: 'public', table: 'Notificacion', event: 'UPDATE', filter: `id_usuario=eq.${idUsuario}` },
        payload => {
          const n: any = payload.new;
          setNotifications(prev =>
            prev.map(x =>
              Number(x.id) === Number(n.id)
                ? {
                    ...x,
                    message: n.mensaje ?? x.message,
                    when: n.fecha_envio ?? x.when,
                    leida: !!n.leida,
                    meta: n.meta ?? x.meta,
                  }
                : x
            )
          );
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

  return { notifications, loading, error, unreadCount, refresh, markAsRead, markAllAsRead };
}
