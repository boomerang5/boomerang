'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
// @ts-ignore
import feather from 'feather-icons'
import clsx from 'clsx'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'


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
  duracion_segundos?: number | null
  participantes: Participant[]
  id_chat?: number | null
  tiene_grabacion?: boolean
  id_archivo_grabacion?: number | null
  tiene_transcripcion?: boolean // Indica si la llamada guardó transcripción para consultas al chatbot
  resumen?: string | null     // breve resumen si lo hubiere
  titulo?: string | null      // UUID del otro usuario
  otro_usuario_nombre?: string // Nombre del otro usuario (lo obtendremos después)
}

type Filters = {
  search: string
  dateFrom?: string
  dateTo?: string
}

const initialFilters: Filters = {
  search: '',
}

const filterInputCls =
  "h-10 text-sm rounded-xl bg-white/90 dark:bg-zinc-900/60 " +
  "border border-orange-200/80 dark:border-orange-500/40 " +
  "text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 " +
  "shadow-sm hover:border-orange-300 dark:hover:border-orange-400 " +
  "focus:outline-none focus:ring-2 focus:ring-orange-400/70 focus:border-orange-400 " +
  "px-3 " +
  "[&::-webkit-calendar-picker-indicator]:hidden " +
  "[&::-webkit-inner-spin-button]:hidden";


function formatTime(ts: string) {
  const d = new Date(ts)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${day}/${month}/${year}, ${hours}:${minutes}`
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
  const [dateWarning, setDateWarning] = useState<{ from?: string; to?: string }>({})

  const [myUserId, setMyUserId] = useState<number | null>(null)

  const fromRef = useRef<HTMLInputElement>(null);
  const toRef = useRef<HTMLInputElement>(null);

  // Función auxiliar para mostrar warning temporal
  const showDateWarning = (field: 'from' | 'to', message: string) => {
    setDateWarning((prev) => ({ ...prev, [field]: message }))
    setTimeout(() => {
      setDateWarning((prev) => ({ ...prev, [field]: undefined }))
    }, 2000)
  }

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        // Obtener el id_usuario de la tabla Usuario usando el UUID
        supabase
          .from('Usuario')
          .select('id')
          .eq('uuid', user.id)
          .single()
          .then(({ data, error }) => {
            if (data && !error) {
              console.log('ID de usuario obtenido:', data.id)
              setMyUserId(data.id)
            } else {
              console.error('Error obteniendo id_usuario:', error)
            }
          })
      }
    })
  }, [])

  useEffect(() => {
  feather.replace()
}, [])

  // Carga inicial + recargas por filtros (cuando el backend soporte query params pasaremos todo).
  useEffect(() => {
    if (!myUserId) {
      console.log('myUserId no está definido aún')
      return
    }
    console.log('Cargando historial para usuario:', myUserId)
    setLoading(true)
    setError(null)

    
    const params = new URLSearchParams()
    params.set('id_usuario', String(myUserId))
    if (filters.search) params.set('q', filters.search)
    if (filters.dateFrom) params.set('from', filters.dateFrom)
    if (filters.dateTo) params.set('to', filters.dateTo)

    console.log('Fetching:', `/api/llamadas/historial?${params.toString()}`)
    fetch(`/api/llamadas/historial?${params.toString()}`, { headers: { 'cache-control': 'no-store' } })
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text())
        return r.json()
      })
      .then((response) => {
        // El PI devuelve { success: true, data: [...] }
        const data = response.data || response
        console.log('Datos recibidos del API:', data)
        if (Array.isArray(data) && data.length > 0) {
          console.log('Primer item:', data[0])
        }
        
        if (Array.isArray(data)) {
          setItems(data)
        } else {
          console.error('El API no devolvió un array:', response)
          setItems([])
        }
      })
      .catch((e) => setError(e.message || 'Error al cargar historial'))
      .finally(() => setLoading(false))
  }, [myUserId, filters.search, filters.dateFrom, filters.dateTo])

  const filtered = useMemo(() => {
    // Filtro adicional en cliente (útil mientras cerramos el backend)
    return items.filter((it) => {
      const q = filters.search.trim().toLowerCase()
      const matchQ =
        !q ||
        (it.otro_usuario_nombre || '').toLowerCase().includes(q) ||
        (it.participantes || []).some((p) => `${p.nombre} ${p.apellido} ${p.apodo ?? ''}`.toLowerCase().includes(q)) ||
        (it.resumen ?? '').toLowerCase().includes(q)
      const matchFrom = !filters.dateFrom || new Date(it.fecha_inicio) >= new Date(filters.dateFrom)
      const matchTo = !filters.dateTo || new Date(it.fecha_inicio) <= new Date(filters.dateTo + 'T23:59:59')
      return matchQ && matchFrom && matchTo
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
      <div className="flex flex-wrap gap-3 items-end mb-6">
        {/* Buscar */}
        <div className="w-full sm:w-auto sm:flex-1 sm:max-w-[280px]">
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

        {/* Fecha desde */}
        <div className="w-full sm:w-auto sm:max-w-[180px] relative">
          <label htmlFor="from" className="block mb-1 text-xs opacity-70">Desde</label>
          <input
            id="from"
            type="date"
            ref={fromRef}
            className={`${filterInputCls} w-full pr-3`}
            value={filters.dateFrom ?? ''}
            max={new Date().toISOString().split('T')[0]}
            onChange={(e) => {
              const v = e.target.value;
              if (!v) {
                setFilters((f) => ({ ...f, dateFrom: undefined }));
                return;
              }
              
              // Solo validar si el formato está completo
              if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) {
                return; // Esperar a que termine de escribir
              }
              
              // Validar inmediatamente si selecciona desde el calendario
              const selectedDate = new Date(v + 'T00:00:00');
              const today = new Date();
              today.setHours(23, 59, 59, 999);
              
              // Rechazar fecha futura
              if (selectedDate > today) {
                showDateWarning('from', 'No puede ser fecha futura');
                if (fromRef.current) fromRef.current.value = filters.dateFrom ?? '';
                return;
              }
              
              // Si hay una fecha "hasta" y la nueva fecha "desde" es posterior, ajustar
              if (filters.dateTo && v > filters.dateTo) {
                setFilters((f) => ({ ...f, dateFrom: v, dateTo: v }));
              } else {
                setFilters((f) => ({ ...f, dateFrom: v }));
              }
            }}
            onBlur={(e) => {
              const v = e.target.value;
              if (!v) return;
              
              // Validar que sea una fecha válida
              const selectedDate = new Date(v + 'T00:00:00');
              const today = new Date();
              today.setHours(23, 59, 59, 999);
              
              if (isNaN(selectedDate.getTime())) {
                showDateWarning('from', 'Fecha inválida');
                setFilters((f) => ({ ...f, dateFrom: undefined }));
                if (fromRef.current) fromRef.current.value = '';
                return;
              }
              
              // Asegurar que no sea futura
              if (selectedDate > today) {
                showDateWarning('from', 'No puede ser fecha futura');
                setFilters((f) => ({ ...f, dateFrom: undefined }));
                if (fromRef.current) fromRef.current.value = '';
                return;
              }
              
              // Si hay una fecha "hasta" y la nueva fecha "desde" es posterior, ajustar
              if (filters.dateTo && v > filters.dateTo) {
                setFilters((f) => ({ ...f, dateFrom: v, dateTo: v }));
              }
            }}
          />
          {dateWarning.from && (
            <div className="absolute top-full left-0 mt-1 px-2 py-1 text-xs bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700 rounded-lg shadow-sm whitespace-nowrap z-10 animate-in fade-in slide-in-from-top-1 duration-200">
              ⚠️ {dateWarning.from}
            </div>
          )}
        </div>

        {/* Fecha hasta */}
        <div className="w-full sm:w-auto sm:max-w-[180px] relative">
          <label htmlFor="to" className="block mb-1 text-xs opacity-70">Hasta</label>
          <input
            id="to"
            type="date"
            ref={toRef}
            className={`${filterInputCls} w-full pr-3`}
            value={filters.dateTo ?? ''}
            min={filters.dateFrom ?? undefined}
            max={new Date().toISOString().split('T')[0]}
            onChange={(e) => {
              const v = e.target.value;
              if (!v) {
                setFilters((f) => ({ ...f, dateTo: undefined }));
                return;
              }
              
              // Solo validar si el formato está completo
              if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) {
                return; // Esperar a que termine de escribir
              }
              
              // Validar inmediatamente si selecciona desde el calendario
              const selectedDate = new Date(v + 'T00:00:00');
              const today = new Date();
              today.setHours(23, 59, 59, 999);
              
              // Rechazar fecha futura
              if (selectedDate > today) {
                showDateWarning('to', 'No puede ser fecha futura');
                if (toRef.current) toRef.current.value = filters.dateTo ?? '';
                return;
              }
              
              // Rechazar si es anterior a fecha "desde"
              if (filters.dateFrom && v < filters.dateFrom) {
                showDateWarning('to', 'Debe ser mayor a la fecha desde');
                if (toRef.current) toRef.current.value = filters.dateTo ?? '';
                return;
              }
              
              // Aplicar el valor si pasa las validaciones
              setFilters((f) => ({ ...f, dateTo: v }));
            }}
            onBlur={(e) => {
              const v = e.target.value;
              if (!v) return;
              
              // Validar que sea una fecha válida
              const selectedDate = new Date(v + 'T00:00:00');
              const today = new Date();
              today.setHours(23, 59, 59, 999);
              
              if (isNaN(selectedDate.getTime())) {
                showDateWarning('to', 'Fecha inválida');
                setFilters((f) => ({ ...f, dateTo: undefined }));
                if (toRef.current) toRef.current.value = '';
                return;
              }
              
              // Asegurar que no sea futura
              if (selectedDate > today) {
                showDateWarning('to', 'No puede ser fecha futura');
                setFilters((f) => ({ ...f, dateTo: undefined }));
                if (toRef.current) toRef.current.value = '';
                return;
              }
              
              // Asegurar que no sea anterior a la fecha "desde"
              if (filters.dateFrom && v < filters.dateFrom) {
                showDateWarning('to', 'Debe ser mayor a la fecha desde');
                setFilters((f) => ({ ...f, dateTo: undefined }));
                if (toRef.current) toRef.current.value = '';
                return;
              }
            }}
          />
          {dateWarning.to && (
            <div className="absolute top-full left-0 mt-1 px-2 py-1 text-xs bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700 rounded-lg shadow-sm whitespace-nowrap z-10 animate-in fade-in slide-in-from-top-1 duration-200">
              ⚠️ {dateWarning.to}
            </div>
          )}
        </div>

        {/* Limpiar filtros */}
        <div className="w-full sm:w-auto">
          <button
            type="button"
            className="h-10 px-5 text-sm rounded-xl bg-white/90 dark:bg-zinc-900/60 border border-orange-200/80 dark:border-orange-500/40 text-zinc-900 dark:text-zinc-100 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors whitespace-nowrap"
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
            <div className="col-span-6 md:col-span-6">Llamada</div>
            <div className="col-span-3 md:col-span-2">Fecha</div>
            <div className="col-span-2 md:col-span-2">Duración</div>
            <div className="col-span-1 md:col-span-2 text-center">Transcripción</div>
          </div>

        <div className="divide-y divide-white/10">
          {loading && <div className="p-6 text-center opacity-70">Cargando historial…</div>}
          {!loading && error && <div className="p-6 text-center text-rose-500">Error: {error}</div>}
          {!loading && !error && filtered.length === 0 && (
            <div className="p-6 text-center opacity-70">Sin resultados.</div>
          )}

          {!loading && !error && filtered.map((it) => {
            // Mostrar el titulo (UUID) hasta que tengamos la forma correcta de obtener el nombre
            const userName = it.otro_usuario_nombre || it.titulo || 'Usuario desconocido'
            return (
              <div key={it.id_llamada} className="grid grid-cols-12 items-center px-3 py-3 hover:bg-white/5 transition">
                <div className="col-span-6 md:col-span-6 flex items-center gap-3">
                  <div className={clsx(
                    'w-10 h-10 rounded-2xl flex items-center justify-center border',
                    it.tipo === 'video' ? 'border-orange-300/40 bg-orange-200/10' : 'border-sky-300/40 bg-sky-200/10'
                  )}>
                    <i data-feather={typeIcon(it.tipo)} className="opacity-80" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-base truncate">{userName}</div>
                    <div className="text-xs opacity-70 truncate">
                      {it.tipo === 'video' ? 'Videollamada' : 'Llamada de voz'}
                    </div>
                  </div>
                  {(it.estado === 'completed' || it.estado === 'missed') && (
                    <span className={clsx('ml-2 text-xs px-2 py-0.5 rounded-full border whitespace-nowrap', chipClass(it.estado))}>
                      {it.estado === 'completed' ? 'Completada' : 'Perdida'}
                    </span>
                  )}
                  {it.tiene_grabacion && (
                    <span className="ml-2 text-xs px-2 py-0.5 rounded-full border border-white/20 bg-white/10 whitespace-nowrap">Grabada</span>
                  )} 
                </div>

                <div className="col-span-3 md:col-span-2 text-sm opacity-80 border-0">{formatTime(it.fecha_inicio)}</div>
                <div className="col-span-2 md:col-span-2 text-sm opacity-80 border-0">{formatDuration(it.duracion_segundos)}</div>

                <div className="col-span-1 md:col-span-2 flex items-center justify-center">
                  {it.tiene_transcripcion ? (
                    <span className="text-xs px-2 py-0.5 rounded-full border border-emerald-300/40 bg-emerald-200/10 text-emerald-700 dark:text-emerald-300 whitespace-nowrap">
                      Sí
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full border border-zinc-300/40 bg-zinc-200/10 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                      No
                    </span>
                  )}
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
                  <div className="font-medium">{formatDuration(selected.duracion_segundos)}</div>
                </div>
              </div>

              <div className="p-3 rounded-2xl border border-black/10 bg-white">
                <div className="text-xs opacity-60 mb-1">Participantes</div>
                <ul className="space-y-1">
                  {(selected.participantes || []).map((p) => (
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
                        href={`/api/llamadas/recording?id_archivo=${selected.id_archivo_grabacion}`} target="_blank">
                      Descargar
                    </a>
                    <a className="px-3 py-2 rounded-xl border border-black/10 hover:bg-black/5 text-sm"
                        href={`/api/llamadas/transcript?id_llamada=${selected.id_llamada}`} target="_blank">
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