'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
// @ts-ignore
import feather from 'feather-icons'
import clsx from 'clsx'
import Link from 'next/link'


type CallType = 'voice' | 'video'
type CallState = 'completed' | 'missed' | 'canceled' | 'ongoing'

type Participant = {
  id_usuario: number
  nombre: string
  apellido: string
  apodo?: string | null
  es_iniciador?: boolean
}

type CallItem = {
  id_llamada: number
  tipo: CallType
  estado: CallState
  fecha_inicio: string        // ISO
  fecha_fin?: string | null   // ISO
  duracion_seg?: number | null
  participantes: Participant[]
  id_chat?: number | null
  tiene_grabacion?: boolean
  id_archivo_grabacion?: number | null
  resumen?: string | null     // breve resumen si lo hubiere
}

type Filters = {
  search: string
  state: 'all' | CallState
  dateFrom?: string
  dateTo?: string
}

const initialFilters: Filters = {
  search: '',
  state: 'all',
}

const filterInputCls =
  "h-10 text-sm rounded-xl bg-white/90 dark:bg-zinc-900/60 " +
  "border border-orange-200/80 dark:border-orange-500/40 " +
  "text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 " +
  "shadow-sm hover:border-orange-300 dark:hover:border-orange-400 " +
  "focus:outline-none focus:ring-2 focus:ring-orange-400/70 focus:border-orange-400 " +
  "px-3";


function formatTime(ts: string) {
  const d = new Date(ts)
  return d.toLocaleString()
}

function formatDuration(sec?: number | null) {
  if (!sec || sec <= 0) return '—'
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  const parts: string[] = []
  if (h) parts.push(`${h}h`)
  if (m) parts.push(`${m}m`)
  if (s || parts.length === 0) parts.push(`${s}s`)
  return parts.join(' ')
}

function chipClass(state: CallState) {
  // paleta naranja; ajustá a tus tokens/variables si ya las tenés
  switch (state) {
    case 'completed':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200'
    case 'missed':
      return 'bg-rose-100 text-rose-800 border-rose-200'
    case 'canceled':
      return 'bg-amber-100 text-amber-800 border-amber-200'
    case 'ongoing':
      return 'bg-sky-100 text-sky-800 border-sky-200'
  }
}

function typeIcon(type: CallType) {
  return type === 'video' ? 'video' : 'phone'
}

export default function CallHistoryPage() {
  const [filters, setFilters] = useState<Filters>(initialFilters)
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<CallItem[]>([])
  const [selected, setSelected] = useState<CallItem | null>(null)
  const [error, setError] = useState<string | null>(null)

  // TODO: reemplazar por tu manera real de obtener el id_usuario (ya lo usás en Contacts)
  const [myUserId, setMyUserId] = useState<string>('')

  const fromRef = useRef<HTMLInputElement>(null);
  const toRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Si ya tenés el id en contexto, reemplazá esto
    const fromStorage = typeof window !== 'undefined' ? window.localStorage.getItem('boomerang_user_id') : null
    if (fromStorage) setMyUserId(fromStorage)
  }, [])

  useEffect(() => {
  feather.replace()
}, [])

  // Carga inicial + recargas por filtros (cuando el backend soporte query params pasaremos todo).
  useEffect(() => {
    if (!myUserId) return
    setLoading(true)
    setError(null)

    
    const params = new URLSearchParams()
    params.set('id_usuario', String(myUserId))
    if (filters.search) params.set('q', filters.search)
    if (filters.state !== 'all') params.set('state', filters.state)
    if (filters.dateFrom) params.set('from', filters.dateFrom)
    if (filters.dateTo) params.set('to', filters.dateTo)

    fetch(`/api/calls/history?${params.toString()}`, { headers: { 'cache-control': 'no-store' } })
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text())
        return r.json()
      })
      .then((data: CallItem[]) => {
        setItems(data || [])
      })
      .catch((e) => setError(e.message || 'Error al cargar historial'))
      .finally(() => setLoading(false))
  }, [myUserId, filters.search, filters.state, filters.dateFrom, filters.dateTo])

  const filtered = useMemo(() => {
    // Filtro adicional en cliente (útil mientras cerramos el backend)
    return items.filter((it) => {
      const q = filters.search.trim().toLowerCase()
      const matchQ =
        !q ||
        it.participantes.some((p) => `${p.nombre} ${p.apellido} ${p.apodo ?? ''}`.toLowerCase().includes(q)) ||
        (it.resumen ?? '').toLowerCase().includes(q)
      const matchState = filters.state === 'all' || it.estado === filters.state
      const matchFrom = !filters.dateFrom || new Date(it.fecha_inicio) >= new Date(filters.dateFrom)
      const matchTo = !filters.dateTo || new Date(it.fecha_inicio) <= new Date(filters.dateTo + 'T23:59:59')
      return matchQ && matchState && matchFrom && matchTo
    })
  }, [items, filters])

  useEffect(() => {
    feather.replace()
  }, [filtered, selected, loading])

    return (
    <main className="flex-1 px-4 md:px-8 py-6">
      {/* Título */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl font-semibold">Historial de llamadas</h1>
      </div>

      {/* Filtros (compactos) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end mb-6">
        {/* Buscar */}
        <div className="md:col-span-4">
          <div className="relative">
            <i
              data-feather="search"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-500/80"
            />
            <input
              type="text"
              className={`${filterInputCls} w-full pl-10`}
              placeholder="Buscar por nombre o apodo"
              value={filters.search ?? ""}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            />
          </div>
        </div>


        {/* Estado */}
        <div className="md:col-span-2">
          <label htmlFor="estado" className="block mb-1 text-xs text-zinc-600 dark:text-zinc-300">Estado</label>
          <select
            id="estado"
            className={`${filterInputCls} w-full pr-10`}
            value={filters.state}
            onChange={(e) =>
              setFilters((f) => ({ ...f, state: e.target.value as Filters['state'] }))
            }
          >
            <option value="" disabled hidden>Estado</option>
            <option value="all">Todos</option>
            <option value="completed">Finalizada</option>
            <option value="missed">Perdida</option>
          </select>
        </div>

        {/* Fecha desde */}
        <div className="md:col-span-2">
          <label htmlFor="from" className="block mb-1 text-xs opacity-70">Desde</label>
          <input
            id="from"
            type="date"
            ref={fromRef}
            className={`${filterInputCls} w-full min-w-[9.5rem] sm:min-w-[10.5rem] pr-3`}
            value={filters.dateFrom ?? ''}
            onChange={(e) => {
              const v = e.target.value;
              setFilters((f) => ({ ...f, dateFrom: /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined }));
            }}
          />
        </div>

        {/* Fecha hasta */}
        <div className="md:col-span-2">
          <label htmlFor="to" className="block mb-1 text-xs opacity-70">Hasta</label>
          <input
            id="to"
            type="date"
            ref={toRef}
            className={`${filterInputCls} w-full min-w-[9.5rem] sm:min-w-[10.5rem] pr-3`}
            value={filters.dateTo ?? ''}
            min={filters.dateFrom ?? undefined}
            onChange={(e) => {
              const v = e.target.value;
              setFilters((f) => ({ ...f, dateTo: /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined }));
            }}
          />
        </div>

        {/* Limpiar filtros */}
        <div className="md:col-span-2 flex md:justify-end">
          <button
            type="button"
            className="h-10 px-3 text-sm rounded-xl border … whitespace-nowrap"
            onClick={() => {
              setFilters({ ...initialFilters, dateFrom: undefined, dateTo: undefined });
              // Limpiar visualmente aunque el input tenga foco
              if (fromRef.current) fromRef.current.value = '';
              if (toRef.current)   toRef.current.value   = '';
              // (Opcional) quitar foco para que el navegador re-renderice el control
              (document.activeElement as HTMLElement | null)?.blur?.();
            }}
            title="Limpiar filtros"
          >
            Limpiar
          </button>
        </div>
      </div> 


        {/* Lista */}
        <div className="rounded-3xl border border-white/20 bg-white/5 backdrop-blur p-2">
          <div className="grid grid-cols-12 px-3 py-2 text-xs uppercase tracking-wide opacity-60">
            <div className="col-span-5 md:col-span-6">Llamada</div>
            <div className="col-span-3 md:col-span-2">Fecha</div>
            <div className="col-span-2 md:col-span-2">Duración</div>
            <div className="col-span-2 md:col-span-2 text-right">Acciones</div>
          </div>

        <div className="divide-y divide-white/10">
          {loading && <div className="p-6 text-center opacity-70">Cargando historial…</div>}
          {!loading && error && <div className="p-6 text-center text-rose-500">Error: {error}</div>}
          {!loading && !error && filtered.length === 0 && (
            <div className="p-6 text-center opacity-70">Sin resultados.</div>
          )}

          {!loading && !error && filtered.map((it) => {
            const otherNames = it.participantes.map((p) => `${p.nombre} ${p.apellido}`.trim()).join(', ')
            return (
              <div key={it.id_llamada} className="grid grid-cols-12 items-center px-3 py-3 hover:bg-white/5 transition">
                <div className="col-span-5 md:col-span-6 flex items-center gap-3">
                  <div className={clsx(
                    'w-10 h-10 rounded-2xl flex items-center justify-center border',
                    it.tipo === 'video' ? 'border-orange-300/40 bg-orange-200/10' : 'border-sky-300/40 bg-sky-200/10'
                  )}>
                    <i data-feather={typeIcon(it.tipo)} className="opacity-80" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium truncate">{otherNames || '—'}</div>
                    <div className="text-xs opacity-70 truncate">
                      {it.resumen ?? (it.tipo === 'video' ? 'Videollamada' : 'Llamada')}
                    </div>
                  </div>
                  <span className={clsx('ml-2 text-xs px-2 py-0.5 rounded-full border', chipClass(it.estado))}>
                    {it.estado === 'completed' ? 'Completada'
                      : it.estado === 'missed' ? 'Perdida'
                      : null}
                  </span>
                  {it.tiene_grabacion && (
                    <span className="ml-2 text-xs px-2 py-0.5 rounded-full border border-white/20 bg-white/10">Grabada</span>
                  )}
                </div>

                <div className="col-span-3 md:col-span-2 text-sm">{formatTime(it.fecha_inicio)}</div>
                <div className="col-span-2 md:col-span-2 text-sm">{formatDuration(it.duracion_seg)}</div>

                <div className="col-span-2 md:col-span-2 flex items-center justify-end gap-2">
                  <button
                    className="px-3 py-1.5 text-sm rounded-xl border border-white/20 hover:bg-white/10"
                    onClick={() => setSelected(it)}
                    title="Ver detalle"
                  >
                    Detalle
                  </button>
                  <button
                    className="px-3 py-1.5 text-sm rounded-xl border border-orange-400/40 bg-orange-500/10 hover:bg-orange-500/20"
                    onClick={() => { if (it.id_chat) window.location.href = `/chat/${it.id_chat}?rejoin=${it.id_llamada}` }}
                    title="Volver a llamar"
                  >
                    Llamar
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Drawer/Modal de detalle */}
      {selected && (
        <div className="fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelected(null)} />
          <div className="absolute right-0 top-0 h-full w-full max-w-xl bg-white/90 backdrop-blur text-black shadow-2xl p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Detalle de llamada</h2>
              <button className="p-2 rounded-xl hover:bg-black/5" onClick={() => setSelected(null)}>
                <i data-feather="x" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-2xl border border-black/10 bg-white">
                  <div className="text-xs opacity-60">Tipo</div>
                  <div className="font-medium">{selected.tipo === 'video' ? 'Videollamada' : 'Llamada'}</div>
                </div>
                <div className="p-3 rounded-2xl border border-black/10 bg-white">
                  <div className="text-xs opacity-60">Estado</div>
                  <div className="font-medium capitalize">{selected.estado}</div>
                </div>
                <div className="p-3 rounded-2xl border border-black/10 bg-white">
                  <div className="text-xs opacity-60">Inicio</div>
                  <div className="font-medium">{formatTime(selected.fecha_inicio)}</div>
                </div>
                <div className="p-3 rounded-2xl border border-black/10 bg-white">
                  <div className="text-xs opacity-60">Duración</div>
                  <div className="font-medium">{formatDuration(selected.duracion_seg)}</div>
                </div>
              </div>

              <div className="p-3 rounded-2xl border border-black/10 bg-white">
                <div className="text-xs opacity-60 mb-1">Participantes</div>
                <ul className="space-y-1">
                  {selected.participantes.map((p) => (
                    <li key={p.id_usuario} className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-black/10 flex items-center justify-center">
                        <i data-feather="user" className="w-3 h-3" />
                      </div>
                      <span className="text-sm">
                        {p.nombre} {p.apellido} {p.es_iniciador ? <em className="opacity-60">(iniciador)</em> : null}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {selected.tiene_grabacion && (
                <div className="p-3 rounded-2xl border border-black/10 bg-white">
                  <div className="text-xs opacity-60 mb-2">Grabación</div>
                  <div className="flex gap-2">
                    <a className="px-3 py-2 rounded-xl border border-black/10 hover:bg-black/5 text-sm"
                        href={`/api/calls/recording?id_archivo=${selected.id_archivo_grabacion}`} target="_blank">
                      Descargar
                    </a>
                    <a className="px-3 py-2 rounded-xl border border-black/10 hover:bg-black/5 text-sm"
                        href={`/api/calls/transcript?id_llamada=${selected.id_llamada}`} target="_blank">
                      Ver transcripción
                    </a>
                  </div>
                </div>
              )}

              {selected.resumen && (
                <div className="p-3 rounded-2xl border border-black/10 bg-white">
                  <div className="text-xs opacity-60 mb-1">Resumen</div>
                  <p className="text-sm leading-6">{selected.resumen}</p>
                </div>
              )}
            </div>
          </div>
        </div>  
      )}
    </main>
  )
}