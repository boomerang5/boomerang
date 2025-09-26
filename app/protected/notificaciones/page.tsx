'use client'
import { useEffect, useState } from 'react'
import { useSupabaseClient } from '@supabase/auth-helpers-react'
import { toast } from 'sonner'
import { useNotifications } from '../hooks/useNotifications'
import type { NotificationItem } from '../hooks/useNotifications'

type Pending = {
  id: number
  id_solicitante: number
  id_receptor: number
  fecha_solicitud: string | null
  solicitante?: { id:number; nombre:string; apellido:string; apodo:string|null; mail:string }
}

export default function NotificacionesPage() {
  const supabase = useSupabaseClient<any>()
  const [idUsuario, setIdUsuario] = useState<number | null>(null)
  const [items, setItems] = useState<Pending[]>([])
  const [loading, setLoading] = useState(false)

  // Hook para notificaciones de eventos
  const { 
    notifications: eventNotifications, 
    loading: eventLoading, 
    markAsRead 
  } = useNotifications(supabase, idUsuario)

  // Resolver id interno
  useEffect(() => {
    (async () => {
      const { data: session } = await supabase.auth.getSession()
      const uuid = session.session?.user.id
      if (!uuid) return
      const { data } = await supabase.from('Usuario').select('id').eq('User_id', uuid).single()
      if (data?.id) setIdUsuario(Number(data.id))
    })()
  }, [supabase])

  // Carga inicial (pendientes entrantes)
  const load = async () => {
    if (!idUsuario) return
    try {
      setLoading(true)
      const { data: reqs, error } = await supabase
        .from('SolicitudContacto')
        .select('id,id_solicitante,id_receptor,fecha_solicitud,estado')
        .eq('id_receptor', idUsuario)
        .eq('estado', 'pendiente')
        .order('fecha_solicitud', { ascending: false })
      if (error) throw error

      const ids = Array.from(new Set((reqs ?? []).map((r: any) => r.id_solicitante)))
      const { data: us } = await supabase
        .from('Usuario')
        .select('id,nombre,apellido,apodo,mail')
        .in('id', ids)

      const byId: Record<number, any> = {}
      for (const u of us ?? []) byId[u.id] = u

      setItems(
        (reqs ?? []).map((r: any) => ({
          id: r.id,
          id_solicitante: r.id_solicitante,
          id_receptor: r.id_receptor,
          fecha_solicitud: r.fecha_solicitud,
          solicitante: byId[r.id_solicitante],
        }))
      )
    } catch (e: any) {
      console.error(e)
      toast.error('No se pudieron cargar las notificaciones')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (idUsuario) load() }, [idUsuario])

  // Realtime: INSERT nuevas pendientes y UPDATE (aceptada/rechazada)
  useEffect(() => {
    if (!idUsuario) return

    const ch = supabase
      .channel(`sc-in:${idUsuario}`)
      .on(
        'postgres_changes',
        { schema: 'public', table: 'SolicitudContacto', event: 'INSERT', filter: `id_receptor=eq.${idUsuario}` },
        async (payload) => {
          const r = payload.new as any
          if (r.estado !== 'pendiente') return
          const { data: u } = await supabase
            .from('Usuario')
            .select('id,nombre,apellido,apodo,mail')
            .eq('id', r.id_solicitante)
            .single()
          setItems(prev => [
            {
              id: r.id,
              id_solicitante: r.id_solicitante,
              id_receptor: r.id_receptor,
              fecha_solicitud: r.fecha_solicitud,
              solicitante: u ?? undefined,
            },
            ...prev,
          ])
        }
      )
      .on(
        'postgres_changes',
        { schema: 'public', table: 'SolicitudContacto', event: 'UPDATE', filter: `id_receptor=eq.${idUsuario}` },
        (payload) => {
          const r = payload.new as any
          if (r.estado !== 'pendiente') {
            setItems(prev => prev.filter(x => x.id !== r.id))
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [idUsuario, supabase])

  const respond = async (id: number, action: 'accept' | 'reject') => {
    try {
      const { error } = await supabase
        .from('SolicitudContacto')
        .update({
          estado: action === 'accept' ? 'aceptada' : 'rechazada',
          fecha_respuesta: new Date().toISOString(),
        })
        .eq('id', id)
      if (error) throw error
      setItems(prev => prev.filter(x => x.id !== id))
      toast.success(action === 'accept' ? 'Contacto agregado ✅' : 'Solicitud rechazada')
    } catch (e: any) {
      console.error(e)
      toast.error('No se pudo procesar la solicitud')
    }
  }

  // Función para responder a invitaciones de eventos
  const respondToEventInvite = async (notification: NotificationItem, response: 'accept' | 'decline') => {
    try {
      console.log('🔄 respondToEventInvite iniciado:', { notification, response, idUsuario })
      
      if (!notification.meta || !notification.meta.id_evento) {
        toast.error('No se encontró información del evento')
        return
      }

      if (!idUsuario) {
        toast.error('No se pudo identificar el usuario')
        return
      }

      const { data: sess } = await supabase.auth.getSession()
      const accessToken = sess.session?.access_token
      if (!accessToken) {
        toast.error('No hay sesión activa')
        return
      }

      const requestBody = {
        id_evento: notification.meta.id_evento,
        id_usuario: idUsuario,
        confirmado: response === 'accept'
      }
      
      console.log('📤 Enviando a API:', requestBody)

      const apiResponse = await fetch('/api/calendar/respond-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(requestBody),
      })

      if (!apiResponse.ok) {
        const errorText = await apiResponse.text()
        console.error('❌ Error de API:', {
          status: apiResponse.status,
          statusText: apiResponse.statusText,
          errorText
        })
        try {
          const errorData = JSON.parse(errorText)
          throw new Error(errorData.error || 'Error al responder invitación')
        } catch {
          throw new Error(`Error ${apiResponse.status}: ${errorText}`)
        }
      }

      // Marcar notificación como leída
      await markAsRead(notification.id)
      
      const message = response === 'accept' ? 'Evento confirmado ✅' : 'Invitación rechazada'
      toast.success(message)
      
      console.log('✅ respondToEventInvite completado exitosamente')
      
    } catch (error: any) {
      console.error('❌ Error en respondToEventInvite:', error)
      toast.error(`Error: ${error.message}`)
    }
  }

  // Filtrar notificaciones de eventos que no han sido respondidas
  const eventInvitations = eventNotifications.filter(n => 
    n.type === 'meeting_invite' && !n.meta?.respondida
  )

  return (
    <main className="flex-1 px-6 py-8">
      <h1 className="text-2xl font-semibold text-foreground mb-4">Notificaciones</h1>

      {/* Sección de Invitaciones a Eventos */}
      {eventInvitations.length > 0 && (
        <section className="bg-white/30 dark:bg-white/10 rounded-xl p-6 shadow-lg backdrop-blur-md border border-white/20 mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Invitaciones a Eventos
          </h2>
          
          {eventLoading && <p className="text-muted-foreground">Cargando eventos…</p>}
          
          <ul className="space-y-3 max-h-96 overflow-auto pr-1">
            {eventInvitations.map(notification => (
              <li key={notification.id} className="bg-white/20 dark:bg-white/5 border border-white/30 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-foreground flex items-center gap-2">
                      📅 {notification.meta?.titulo_evento || notification.meta?.nombre_evento || 'Evento sin nombre'}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {notification.message || `Te invitó: ${notification.meta?.organizador || 'Organizador'}`}
                    </p>
                    {notification.when && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(notification.when).toLocaleString('es-ES', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => respondToEventInvite(notification, 'decline')}
                      className="px-3 py-1.5 rounded-full border border-red-300 text-red-700/90 bg-red-50 hover:bg-red-100 text-sm transition-colors"
                      title="Rechazar invitación"
                    >
                      Rechazar
                    </button>
                    <button
                      onClick={() => respondToEventInvite(notification, 'accept')}
                      className="px-3 py-1.5 rounded-full bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold hover:brightness-105 text-sm transition-all"
                      title="Confirmar asistencia"
                    >
                      Confirmar
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Sección de Solicitudes de Contacto */}
      <section className="bg-white/30 dark:bg-white/10 rounded-xl p-6 shadow-lg backdrop-blur-md border border-white/20">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0z" />
          </svg>
          Solicitudes de Contacto
        </h2>
        
        {loading && <p className="text-muted-foreground">Cargando…</p>}
        {!loading && items.length === 0 && (
          <p className="text-muted-foreground">No tenés solicitudes pendientes.</p>
        )}

        <ul className="space-y-3 max-h-96 overflow-auto pr-1">
          {items.map(i => (
            <li key={i.id} className="flex items-center justify-between bg-white/20 dark:bg-white/5 border border-white/30 rounded-lg p-4">
              <div>
                <p className="font-medium">
                  {i.solicitante?.nombre} {i.solicitante?.apellido}{i.solicitante?.apodo ? ` (${i.solicitante.apodo})` : ''}
                </p>
                <p className="text-xs text-muted-foreground">{i.solicitante?.mail}</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => respond(i.id, 'reject')}
                  className="px-3 py-1.5 rounded-full border border-red-300 text-red-700/90 bg-red-50 hover:bg-red-100 text-sm"
                >
                  Rechazar
                </button>
                <button
                  onClick={() => respond(i.id, 'accept')}
                  className="px-3 py-1.5 rounded-full bg-gradient-to-r from-orange-400 to-orange-600 text-white font-semibold hover:brightness-105 text-sm"
                >
                  Aceptar
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
