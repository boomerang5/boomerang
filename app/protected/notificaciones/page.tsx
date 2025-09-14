'use client'
import { useEffect, useState } from 'react'
import { useSupabaseClient } from '@supabase/auth-helpers-react'
import { toast } from 'sonner'

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

  return (
    <main className="flex-1 px-6 py-8">
      <h1 className="text-2xl font-semibold text-foreground mb-4">Notificaciones</h1>

      <section className="bg-white/30 dark:bg-white/10 rounded-xl p-6 shadow-lg backdrop-blur-md border border-white/20">
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
