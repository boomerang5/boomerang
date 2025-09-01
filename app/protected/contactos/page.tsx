'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSupabaseClient } from '@supabase/auth-helpers-react'
import type { SupabaseClient } from '@supabase/supabase-js'
// @ts-ignore
import feather from 'feather-icons'

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
}

type UsuarioBusqueda = {
  id: number
  nombre: string
  apellido: string
  apodo: string | null
  mail: string
  en_agenda: boolean
}

/* =============== Helpers =============== */
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

  // ====== Feather
  useEffect(() => { feather.replace() }, [])
  useEffect(() => { feather.replace() }, [contactos.length, results.length, q, isModalOpen, modalResults.length, selectedUser])

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

  // ====== Traer agenda (vía API /api/contactos/misContactos)
  const fetchAgenda = useCallback(
    async (busqueda: string = '') => {
      if (!idUsuario) return
      setLoadingAgenda(true)
      setAgendaError(null)
      try {
        const token = await getJwt(supabase)
        const url = `/api/contactos/misContactos?id_usuario=${encodeURIComponent(idUsuario)}&busqueda=${encodeURIComponent(busqueda.trim())}`
        const r = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        })
        if (!r.ok) {
          const t = await r.text().catch(() => '')
          console.error('misContactos error', r.status, t)
          setAgendaError('No se pudieron cargar los contactos.')
          setContactos([])
        } else {
          const data = await r.json().catch(() => [])
          setContactos(Array.isArray(data) ? (data as ContactoAgenda[]) : [])
        }
      } finally {
        setLoadingAgenda(false)
      }
    },
    [idUsuario, supabase]
  )

  useEffect(() => {
    if (idUsuario) void fetchAgenda('')
  }, [idUsuario, fetchAgenda])

  // refrescar agenda cuando volvés
  useEffect(() => {
    const reload = () => { if (idUsuario) void fetchAgenda(q) }
    const onVisibility = () => { if (document.visibilityState === 'visible') reload() }
    window.addEventListener('focus', reload)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('focus', reload)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [idUsuario, q, fetchAgenda])

  // ====== Búsqueda de la página (debounce) — vía API /api/contactos/buscarContacto
  useEffect(() => {
    const t = setTimeout(async () => {
      if (!idUsuario) return
      const term = q.trim()
      if (!term) { setResults([]); return }

      try {
        setLoadingSearch(true)
        const token = await getJwt(supabase)
        const url = `/api/contactos/buscarContacto?id_usuario=${encodeURIComponent(idUsuario)}&busqueda=${encodeURIComponent(term.trim())}`
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
          }))
          setResults(mapped)
        }
      } finally {
        setLoadingSearch(false)
      }
    }, 350)
    return () => clearTimeout(t)
  }, [q, idUsuario, supabase, agendaIds])

  // ====== Agregar contacto — vía API /api/contactos/agregarContacto
  const addContacto = useCallback(
    async (idUsuarioContacto: number) => {
      if (!idUsuario) return
      try {
        const token = await getJwt(supabase)
        const res = await fetch('/api/contactos/agregarContacto', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            id_usuario: idUsuario,
            id_usuario_contacto: idUsuarioContacto,
          }),
        })
        if (res.ok) {
          setResults(prev => prev.map(r => r.id === idUsuarioContacto ? { ...r, en_agenda: true } : r))
          await fetchAgenda(q)
          alert('Contacto agregado ✅')
          if (isModalOpen) handleCloseModal()
        } else if (res.status === 409) {
          alert('Ese contacto ya está en tu lista.')
        } else {
          const payload = await res.json().catch(() => ({}))
          console.error('Add contact error:', res.status, payload)
          alert(payload?.message || 'No se pudo agregar el contacto.')
        }
      } catch (e) {
        console.error(e)
        alert('Error de red al agregar el contacto.')
      }
    },
    [idUsuario, supabase, fetchAgenda, q, isModalOpen]
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

  // ====== Búsqueda dentro del modal — vía API /api/contactos/buscarContacto
  useEffect(() => {
    if (!isModalOpen) return
    const t = setTimeout(async () => {
      if (!idUsuario) return
      const term = modalQ.trim()
      if (!term) { setModalResults([]); return }

      try {
        setModalLoading(true)
        const token = await getJwt(supabase)
        const url = `/api/contactos/buscarContacto?id_usuario=${encodeURIComponent(idUsuario)}&busqueda=${encodeURIComponent(term.trim())}`

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
          }))
          setModalResults(mapped)
        }
      } finally {
        setModalLoading(false)
      }
    }, 350)
    return () => clearTimeout(t)
  }, [modalQ, idUsuario, supabase, isModalOpen, agendaIds])

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

  return (
    <div className="flex min-h-screen bg-orange-50 dark:bg-[#0d0d0d]">
      {/* Sidebar */}
      <aside className="w-20 bg-white/20 dark:bg-white/10 backdrop-blur-md flex flex-col justify-between items-center py-4">
        <div className="flex flex-col items-center gap-6 mt-4">
          <i data-feather="home" className="text-black dark:text-white w-5 h-5" />
          <i data-feather="user" className="text-black dark:text-white w-5 h-5" />
          <i data-feather="video" className="text-black dark:text-white w-5 h-5" />
          <i data-feather="users" className="text-orange-500 w-5 h-5" />
          <i data-feather="message-circle" className="text-black dark:text-white w-5 h-5" />
          <i data-feather="calendar" className="text-black dark:text-white w-5 h-5" />
        </div>
        <div className="flex flex-col items-center gap-5 mb-4">
          <i data-feather="help-circle" className="text-black dark:text-white w-5 h-5" />
          <i data-feather="settings" className="text-black dark:text-white w-5 h-5" />
        </div>
      </aside>

      {/* Main */}
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
              <i
                data-feather="search"
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-orange-500"
              />
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
                  {u.en_agenda ? (
                    <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-700 dark:text-green-400 border border-green-500/30">
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
                <p className="font-semibold text-lg">{fullName(c.nombre, c.apellido)}</p>
                <p className="text-sm text-muted-foreground">
                  Estado: {c.nombreEstado ?? '—'} · Alta: {formatARDate(c.fh_alta)}
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => handleLlamada(c)}
                  className="bg-green-500 p-2 rounded-full hover:bg-green-600"
                  title="Llamada"
                >
                  <i data-feather="phone" />
                </button>
                <button
                  onClick={() => handleVideollamada(c)}
                  className="bg-blue-500 p-2 rounded-full hover:bg-blue-600"
                  title="Videollamada"
                >
                  <i data-feather="video" />
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
                <i data-feather="x" className="w-5 h-5" />
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
              <i data-feather="search" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-orange-500" />
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
    </div>
  )
}