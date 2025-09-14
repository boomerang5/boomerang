'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSupabaseClient } from '@supabase/auth-helpers-react'
import type { SupabaseClient } from '@supabase/supabase-js'
// @ts-ignore
import { Search, Phone, X, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { isPrerenderInterruptedError } from 'next/dist/server/app-render/dynamic-rendering'



/* =============== Tipos =============== */
type ContactoAgenda = {
  id?: number | string
  id_usuario_contacto?: number | string
  nombre?: string
  apellido?: string
  apodo?: string | null
  favorito?: boolean
  fh_alta?: string | null
  id_estado?: number | null
  nombreEstado?: string | null 
  pendiente?: boolean
}

type UsuarioBusqueda = {
  id: number
  nombre: string
  apellido: string
  apodo: string | null
  mail: string
  en_agenda: boolean
  pendiente?: boolean
}

/* =============== Helpers =============== */

async function fetchPendientesSalientes(
  supabase: any,
  idUsuario: number
): Promise<ContactoAgenda[]> {
  // 1) Pendientes salientes
  const { data: outs, error } = await supabase
    .from('SolicitudContacto')
    .select('id,id_receptor,fecha_solicitud,estado')
    .eq('id_solicitante', idUsuario)
    .eq('estado', 'pendiente')

  if (error || !outs?.length) return []

  const ids = Array.from(new Set(outs.map((o: any) => o.id_receptor)))
  const { data: usuarios } = await supabase
    .from('Usuario')
    .select('id,nombre,apellido,apodo')
    .in('id', ids)

  const byId: Record<number, any> = {}
  for (const u of usuarios ?? []) byId[u.id] = u

  return outs.map((o: any) => ({
    id: `pending-${o.id}`,
    id_usuario_contacto: o.id_receptor,
    nombre: byId[o.id_receptor]?.nombre ?? '',
    apellido: byId[o.id_receptor]?.apellido ?? '',
    fh_alta: null,
    nombreEstado: '(pendiente)',
    pendiente: true,
  }))
}


async function getJwt(supabaseClient: SupabaseClient | any) {
  const { data } = await supabaseClient.auth.getSession()
  return data.session?.access_token ?? ''
}

function fullName(n?: string, a?: string) {
  return `${n ?? ''} ${a ?? ''}`.trim()
}

function formatARDate(iso?: string | null) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('es-AR')
  } catch {
    return '—'
  }
}

export default function ContactosPage() {
  const supabase = useSupabaseClient<any>()

  // ====== Estado general
  const [contactos, setContactos] = useState<ContactoAgenda[]>([])
  const [loadingAgenda, setLoadingAgenda] = useState(false)
  const [agendaError, setAgendaError] = useState<string | null>(null)

  const [q, setQ] = useState('')
  const [results, setResults] = useState<UsuarioBusqueda[]>([])
  const [loadingSearch, setLoadingSearch] = useState(false)

  const [idUsuario, setIdUsuario] = useState<number | null>(null)

  // ====== Modal "Añadir contacto"
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalQ, setModalQ] = useState('')
  const [modalResults, setModalResults] = useState<UsuarioBusqueda[]>([])
  const [modalLoading, setModalLoading] = useState(false)
  
  const [selectedUser, setSelectedUser] = useState<UsuarioBusqueda | null>(null)

  // Estado de solicitud
  const [pendingOut, setPendingOut] = useState<Set<number>>(new Set()) // ids de receptores con solicitud pendiente

  // ====== Feather
  //useEffect(() => { feather.replace() }, [])
  //useEffect(() => { feather.replace() }, [contactos.length, results.length, q, isModalOpen, modalResults.length, selectedUser])

  // ====== Obtener idUsuario interno (SIN RPC, consultando la tabla Usuario)
  useEffect(() => {
    (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const user_uuid = sessionData.session?.user.id
        if (!user_uuid) return

        // Buscamos el id interno con el User_id (uuid) del usuario autenticado
        const { data, error, status } = await supabase
          .from('Usuario')
          .select('id')
          .eq('User_id', user_uuid)
          .single()

        if (error || !data?.id) {
          console.error('No se pudo obtener id interno desde Usuario:', { status, error, data })
          return
        }

        const idNum = Number(data.id)
        if (!Number.isNaN(idNum)) setIdUsuario(idNum)
      } catch (err) {
        console.error('Error al resolver idUsuario:', err)
      }
    })()
  }, [supabase])

  const agendaIds = useMemo(() => {
    const ids = new Set<number>()
    for (const c of contactos) {
      const id = Number(c.id_usuario_contacto ?? c.id)
      if (!Number.isNaN(id)) ids.add(id)
    }
    return ids
  }, [contactos])

  // ====== Cargar solicitudes PENDIENTES que YO envié (para marcar "Pendiente" en UI)
  async function loadMyOutgoingPendings(uid: number) {
    const { data, error } = await supabase
      .from('SolicitudContacto')
      .select('id_receptor, estado')
      .eq('id_solicitante', uid)
      .eq('estado', 'pendiente')
    if (!error) {
      setPendingOut(new Set((data ?? []).map(r => Number(r.id_receptor))))
    }
  }

  useEffect(() => {
    if (!idUsuario) return
    void loadMyOutgoingPendings(idUsuario)
  }, [idUsuario])

  // ====== Traer agenda (Supabase + merge con pendientes OUT)
  const fetchAgenda = useCallback(
    async (busqueda: string = '') => {
      if (!idUsuario) return
      setLoadingAgenda(true)
      setAgendaError(null)
      try {
        // 1) Confirmados (ContactoUsuario -> ids)
        let q = supabase
          .from('ContactoUsuario')
          .select('id,id_usuario_contacto,fh_alta,favorito')
          .eq('id_usuario', idUsuario)

        const { data: base, error: e1 } = await q
        if (e1) throw e1

        // 2) Resolver datos del Usuario
        const ids = Array.from(new Set((base ?? []).map((c: any) => c.id_usuario_contacto)))
        const { data: usuarios } = await supabase
          .from('Usuario')
          .select('id,nombre,apellido,apodo')
          .in('id', ids)

        const byId: Record<number, any> = {}
        for (const u of usuarios ?? []) byId[u.id] = u

        // 3) Filtrar por búsqueda (en cliente, para simplificar)
        const confirmados: ContactoAgenda[] = (base ?? [])
          .map((c: any) => ({
            id: c.id,
            id_usuario_contacto: c.id_usuario_contacto,
            nombre: byId[c.id_usuario_contacto]?.nombre ?? '',
            apellido: byId[c.id_usuario_contacto]?.apellido ?? '',
            apodo: byId[c.id_usuario_contacto]?.apodo ?? null,
            favorito: !!c.favorito,
            fh_alta: c.fh_alta,
            id_estado: null,
            nombreEstado: '—',
            pendiente: false,
          }))
          .filter(c => {
            const t = busqueda.trim().toLowerCase()
            if (!t) return true
            return (
              c.nombre?.toLowerCase().includes(t) ||
              c.apellido?.toLowerCase().includes(t) ||
              (c.apodo ?? '').toLowerCase().includes(t)
            )
          })

        // 4) Pendientes salientes
        const outs = await fetchPendientesSalientes(supabase, idUsuario)

        // 5) Merge sin duplicar
        const map = new Map<string, ContactoAgenda>()
        for (const c of confirmados) {
          map.set(String(c.id_usuario_contacto ?? c.id), c)
        }
        for (const p of outs) {
          const key = String(p.id_usuario_contacto ?? p.id)
          if (!map.has(key)) map.set(key, p)
        }
        setContactos(Array.from(map.values()))
      } catch (e: any) {
        console.error(e)
        setAgendaError('No se pudieron cargar los contactos.')
        setContactos([])
      } finally {
        setLoadingAgenda(false)
      }
    },
    [idUsuario, supabase]
  )


  useEffect(() => {
    if (idUsuario && q.trim() === '') {
      void fetchAgenda('')
    }
  }, [q, idUsuario, fetchAgenda])

  // refrescar agenda cuando volvés
  useEffect(() => {
    const reload = () => { if (idUsuario) void fetchAgenda('') }
    const onVisibility = () => { if (document.visibilityState === 'visible') reload() }
    window.addEventListener('focus', reload)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('focus', reload)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [idUsuario, fetchAgenda])

  // ====== Búsqueda de la página (debounce) — vía API /api/users/contacts
  useEffect(() => {
    const t = setTimeout(async () => {
      if (!idUsuario) return
      const term = q.trim()
      if (!term) { setResults([]); return }

      try {
        setLoadingSearch(true)
        const token = await getJwt(supabase)
        const params = new URLSearchParams({
          id_usuario: String(idUsuario),
          busqueda: term,
        });
        const url = `/api/users/contacts?${params.toString()}`;
        const r = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        })
        if (!r.ok) {
          const txt = await r.text().catch(() => '')
          console.error('search error', r.status, txt)
          setResults([])
        } else {
          const data = await r.json().catch(() => [])
          const mapped: UsuarioBusqueda[] = (data ?? []).map((u: any) => ({
            id: Number(u.id),
            nombre: u.nombre,
            apellido: u.apellido,
            apodo: u.apodo ?? null,
            mail: u.mail,
            en_agenda: agendaIds.has(Number(u.id)),
            pendiente: pendingOut.has(Number(u.id)),
          }))
          setResults(mapped)
        }
      } finally {
        setLoadingSearch(false)
      }
    }, 350)
    return () => clearTimeout(t)
  }, [q, idUsuario, supabase, agendaIds, pendingOut])

    // ====== Agregar contacto — vía Supabase (realtime)
    const addContacto = useCallback(
      async (idUsuarioContacto: number) => {
        if (!idUsuario) return
        try {
          // Insertamos la solicitud como 'pendiente'
          const { data, error, status } = await supabase
            .from('SolicitudContacto')
            .insert([
              {
                id_solicitante: idUsuario,
                id_receptor: idUsuarioContacto,
                estado: 'pendiente',
                fecha_solicitud: new Date().toISOString(),
              },
            ])
            .select('id')
            .single()

          if (error) throw error

          // 1) Marcá el usuario de resultados como pendiente
          setResults(prev =>
            prev.map(r => (r.id === idUsuarioContacto ? { ...r, pendiente: true } : r))
          )

          // 2) Mostralo en tu agenda como "(pendiente)" si todavía no estaba
          setContactos(prev => {
            const exists = prev.some(
              c => Number(c.id_usuario_contacto ?? c.id) === idUsuarioContacto
            )
            if (exists) return prev
            return [
              ...prev,
              {
                id: `pending-${data?.id ?? crypto.randomUUID()}`,
                id_usuario_contacto: idUsuarioContacto,
                nombre: '', // si querés, los resolvemos abajo con un fetch al Usuario
                apellido: '',
                fh_alta: null,
                nombreEstado: '(pendiente)',
                pendiente: true,
              } as any,
            ]
          })

          toast.success('Solicitud enviada ✅')
          if (isModalOpen) handleCloseModal()
        } catch (e: any) {
          console.error(e)
          toast.error(e?.message || 'No se pudo enviar la solicitud.')
        }
      },
      [idUsuario, supabase, isModalOpen]
    )



  // ====== Acciones fake
  const handleLlamada = (c: ContactoAgenda) =>
    alert(`Iniciando llamada de audio con ${fullName(c.nombre, c.apellido)}`)
  const handleVideollamada = (c: ContactoAgenda) =>
    alert(`Iniciando videollamada con ${fullName(c.nombre, c.apellido)}`)

  // ====== Modal handlers
  const handleOpenModal = () => {
    setIsModalOpen(true)
    setModalQ('')
    setModalResults([])
    setSelectedUser(null)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setModalQ('')
    setModalResults([])
    setSelectedUser(null)
  }

  // ====== Búsqueda dentro del modal — vía API /api/users/contacts
  useEffect(() => {
    if (!isModalOpen) return
    const t = setTimeout(async () => {
      if (!idUsuario) return
      const term = modalQ.trim()
      if (!term) { setModalResults([]); return }

      try {
        setModalLoading(true)
        const token = await getJwt(supabase)
        const params = new URLSearchParams({
          id_usuario: String(idUsuario),
          busqueda: term,
        });
        const url = `/api/users/contacts?${params.toString()}`;

        const r = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        })

        if (!r.ok) {
          const txt = await r.text().catch(() => '')
          console.error('search (modal) error', r.status, txt)
          setModalResults([])
        } else {
          const data = await r.json().catch(() => [])
          const mapped: UsuarioBusqueda[] = (data ?? []).map((u: any) => ({
            id: Number(u.id),
            nombre: u.nombre,
            apellido: u.apellido,
            apodo: u.apodo ?? null,
            mail: u.mail,
            en_agenda: agendaIds.has(Number(u.id)),
            pendiente: pendingOut.has(Number(u.id)),
          }))
          setModalResults(mapped)
        }
      } finally {
        setModalLoading(false)
      }
    }, 350)
    return () => clearTimeout(t)
  }, [modalQ, idUsuario, supabase, isModalOpen, agendaIds, pendingOut])

  // Cerrar con ESC / confirmar con Enter
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!isModalOpen) return
      if (e.key === 'Escape') handleCloseModal()
      if (e.key === 'Enter' && selectedUser) addContacto(selectedUser.id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isModalOpen, selectedUser, addContacto])

  const hayBusqueda = useMemo(() => q.trim().length > 0, [q])

   // ====== Realtime: mis solicitudes enviadas + contactos aceptados
  useEffect(() => {
    if (!idUsuario) return
    const ch = supabase
      .channel(`contactos-${idUsuario}`)
      // Cualquier cambio en solicitudes que YO envié
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'SolicitudContacto',
        filter: `id_solicitante=eq.${idUsuario}`,
      }, (payload) => {
        const row: any = payload.new ?? payload.old
        if (!row) return
        const receptor = Number(row.id_receptor)
        setPendingOut(prev => {
          const next = new Set(prev)
          if (row.estado === 'pendiente') next.add(receptor)
          else next.delete(receptor) // aceptada / rechazada / cancelada
          return next
        })
      })
      // Cuando me aceptan (se crea ContactoUsuario para mí), refresco agenda
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'ContactoUsuario',
        filter: `id_usuario=eq.${idUsuario}`,
      }, () => { void fetchAgenda('') })
      .subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [idUsuario, supabase, fetchAgenda])
  

  useEffect(() => {
    if (!idUsuario) return;
    const ch = supabase
      .channel(`agenda-${idUsuario}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'Usuario_Contacto', filter: `id_usuario=eq.${idUsuario}` },
        () => { void fetchAgenda(''); }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [idUsuario, supabase, fetchAgenda]);

  // Realtime: Solicitudes (OUT) y Contactos (mis filas)
  useEffect(() => {
    if (!idUsuario) return

    // 1) INSERT de mis pendientes salientes (refrescar/inyectar)
    const chOut = supabase
      .channel(`sc-out:${idUsuario}`)
      .on(
        'postgres_changes',
        {
          schema: 'public',
          table: 'SolicitudContacto',
          event: 'INSERT',
          filter: `id_solicitante=eq.${idUsuario}`,
        },
        async (payload) => {
          const r = payload.new as any
          // Traer los datos del receptor para mostrar lindo
          const { data: u } = await supabase
            .from('Usuario')
            .select('id,nombre,apellido,apodo')
            .eq('id', r.id_receptor)
            .single()

          setContactos(prev => {
            const key = String(r.id_receptor)
            const exists = prev.some(c => String(c.id_usuario_contacto ?? c.id) === key)
            if (exists) return prev
            return [
              ...prev,
              {
                id: `pending-${r.id}`,
                id_usuario_contacto: r.id_receptor,
                nombre: u?.nombre ?? '',
                apellido: u?.apellido ?? '',
                fh_alta: null,
                nombreEstado: '(pendiente)',
                pendiente: true,
              } as any,
            ]
          })
        }
      )
      .on(
        'postgres_changes',
        {
          schema: 'public',
          table: 'SolicitudContacto',
          event: 'UPDATE',
          filter: `id_solicitante=eq.${idUsuario}`,
        },
        (payload) => {
          const r = payload.new as any
          // Si aceptaron/rechazaron -> recargar agenda (ahora aparecerá como confirmado)
          if (r.estado !== 'pendiente') {
            void fetchAgenda('')
          }
        }
      )
      .subscribe()

    // 2) INSERT en ContactoUsuario para mi usuario (me agregaron/aceptaron)
    const chMyContacts = supabase
      .channel(`contactos:${idUsuario}`)
      .on(
        'postgres_changes',
        {
          schema: 'public',
          table: 'ContactoUsuario',
          event: 'INSERT',
          filter: `id_usuario=eq.${idUsuario}`,
        },
        () => {
          // Apareció un contacto nuevo confirmado
          void fetchAgenda('')
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(chOut)
      supabase.removeChannel(chMyContacts)
    }
  }, [idUsuario, supabase, fetchAgenda])


  return (
    <>
    <main className="flex-1 px-6 py-8 flex flex-col gap-8">
        {/* Header + botón + buscador */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-foreground">Contactos</h1>

          <div className="flex w-full md:max-w-xl items-center gap-3">
            <button
              onClick={handleOpenModal}
              className="bg-gradient-to-r from-orange-400 to-orange-600 text-white px-4 py-2 rounded-md font-semibold hover:brightness-105 transition"
            >
              Añadir contacto
            </button>

            <div className="relative flex-1">
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por nombre, apellido o apodo…"
                className="w-full px-4 py-2 pr-10 rounded-md bg-white/40 dark:bg-white/10 border border-orange-300 text-foreground focus:ring-2 focus:ring-orange-400 backdrop-blur-md"
              />
              <Search className="w-4 h-4 pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-orange-500" />
            </div>
          </div>
        </header>

        {/* Resultados de búsqueda */}
        {hayBusqueda && (
          <section className="bg-white/30 dark:bg-white/10 rounded-xl p-6 shadow-lg backdrop-blur-md border border-white/20 flex flex-col gap-2">
            {loadingSearch && <p className="text-muted-foreground">Buscando…</p>}
            {!loadingSearch && results.length === 0 && (
              <p className="text-muted-foreground">
                No hay resultados para “{q.trim()}”.
              </p>
            )}

            {!loadingSearch && results.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between bg-white/20 dark:bg-white/5 p-3 rounded-lg"
              >
                <div>
                  <p className="font-medium">
                    {u.nombre} {u.apellido}{u.apodo ? ` (${u.apodo})` : ''}
                  </p>
                  <p className="text-xs text-muted-foreground">{u.mail}</p>
                </div>

                <div className="flex items-center gap-2">
                  {u.pendiente ? (
                    <span className="text-xs px-2 py-1 rounded-full border border-orange-300 bg-orange-50 text-orange-700">
                      Pendiente
                    </span>
                  ) : u.en_agenda ? (
                    <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-700 border border-green-500/30">
                      Ya en tu lista
                    </span>
                  ) : (
                    <button
                      onClick={() => addContacto(u.id)}
                      className="text-sm bg-gradient-to-r from-orange-400 to-orange-600 text-white px-3 py-1.5 rounded-full font-semibold hover:brightness-105 transition"
                    >
                      Agregar
                    </button>
                  )}
                </div>

              </div>
            ))}
          </section>
        )}

        {/* Agenda */}
        <section className="bg-white/30 dark:bg-white/10 rounded-xl p-6 shadow-lg backdrop-blur-md border border-white/20 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-orange-600">Mi agenda</h2>

          {loadingAgenda && <p className="text-muted-foreground">Cargando contactos…</p>}
          {!loadingAgenda && agendaError && (
            <p className="text-red-600 dark:text-red-400">{agendaError}</p>
          )}
          {!loadingAgenda && !agendaError && contactos.length === 0 && (
            <p className="text-muted-foreground">
              {hayBusqueda
                ? 'No hay contactos que coincidan con tu búsqueda.'
                : 'No tienes contactos agregados.'}
            </p>
          )}
          {!loadingAgenda && !agendaError && contactos.map((c, idx) => (
            <div
              key={String(c.id ?? c.id_usuario_contacto ?? idx)}
              className="flex justify-between items-center bg-white/20 dark:bg-white/5 p-4 rounded-lg hover:bg-white/30 transition"
            >
              <div>
               <p className="font-semibold text-lg">
                {fullName(c.nombre, c.apellido)}
                { (c as any).pendiente && <span className="ml-2 text-xs text-orange-600">(pendiente)</span> }
              </p>

                <p className="text-sm text-muted-foreground">
                  Estado: {c.nombreEstado ?? '—'}
                </p>
              </div>
              <div className="flex">
                <button
                  onClick={() => !c.pendiente && handleLlamada(c)}
                  disabled={!!c.pendiente}
                  title={c.pendiente ? 'Solicitud pendiente' : 'Llamada'}
                  className={[
                    'phone-chip inline-flex h-8 w-8 items-center justify-center rounded-full',
                    c.pendiente
                      ? 'opacity-50 cursor-not-allowed'
                      : 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow'
                  ].join(' ')}
                >
                  <i data-feather="phone" className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </section>
      </main>

      {/* ====== MODAL AÑADIR CONTACTO ====== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" aria-modal="true" role="dialog">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleCloseModal} />

          {/* Content */}
          <div className="relative z-10 w-[90%] max-w-xl rounded-2xl bg-white dark:bg-[#111] border border-white/20 shadow-2xl p-6">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Añadir contacto</h3>
              <button className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10" onClick={handleCloseModal} aria-label="Cerrar" title="Cerrar">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Input de búsqueda */}
            <div className="relative mb-4">
              <input
                autoFocus
                type="text"
                value={modalQ}
                onChange={(e) => { setModalQ(e.target.value); setSelectedUser(null) }}
                placeholder="Nombre, apellido o apodo…"
                className="w-full px-4 py-2 pr-10 rounded-md bg-white/60 dark:bg-white/10 border border-orange-300 text-foreground focus:ring-2 focus:ring-orange-400 backdrop-blur"
              />
              <Search className="w-4 h-4 pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-orange-500" />
            </div>

            {/* Resultados */}
            <div className="max-h-72 overflow-auto space-y-2">
              {modalLoading && <p className="text-muted-foreground">Buscando…</p>}
              {!modalLoading && modalQ.trim() && modalResults.length === 0 && (
                <p className="text-muted-foreground">Sin resultados.</p>
              )}

              {!modalLoading && modalResults.map(u => (
                <button
                  key={u.id}
                  onClick={() => setSelectedUser(u)}
                  className={`w-full text-left bg-white/60 dark:bg-white/5 border border-white/30 rounded-lg p-3 hover:bg-white/80 dark:hover:bg-white/10 transition ${
                    selectedUser?.id === u.id ? 'ring-2 ring-orange-400' : ''
                  }`}
                >
                  <p className="font-medium">
                    {u.nombre} {u.apellido}{u.apodo ? ` (${u.apodo})` : ''}
                  </p>
                  <p className="text-xs text-muted-foreground">{u.mail}</p>
                  {u.en_agenda && (
                    <span className="text-[11px] inline-block mt-1 px-2 py-0.5 rounded-full bg-green-500/20 text-green-700 dark:text-green-400 border border-green-500/30">
                      Ya en tu lista
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Confirmación */}
            <div className="mt-5 flex items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">
                {selectedUser &&
                  <>¿Agregar a <span className="font-medium">{selectedUser.nombre} {selectedUser.apellido}</span>?</>
                }
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleCloseModal}
                  className="px-4 py-2 rounded-md border border-white/30 bg-white/50 dark:bg-white/10 hover:bg-white/70 dark:hover:bg-white/20 transition"
                >
                  Cancelar
                </button>
                <button
                  disabled={!selectedUser || selectedUser.en_agenda}
                  onClick={() => selectedUser && addContacto(selectedUser.id)}
                  className={`px-4 py-2 rounded-md font-semibold transition ${
                    !selectedUser || selectedUser.en_agenda
                      ? 'bg-gray-300 dark:bg-white/10 text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-orange-400 to-orange-600 text-white hover:brightness-105'
                  }`}
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}