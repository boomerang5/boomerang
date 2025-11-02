'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
// @ts-ignore
import feather from 'feather-icons'
import { createClient } from '@/utils/supabase/client'


type CallType = 'voice' | 'video'
type CallState = 'completed' | 'missed' | 'canceled' | 'ongoing'

type Participant = {
  id_usuario: number
  nombre: string
  apellido: string
  apodo?: string | null
  es_iniciador?: boolean // Mapea a 'host' del SP
}

type CallItem = {
  id: number                  
  fecha_inicio: string        
  fecha_fin?: string | null   
  duracion_calculada?: number | null  
  titulo?: string | null      
  descripcion?: string | null
  id_grupo?: number | null
  otro_usuario_nombre?: string | null
  participantes: Participant[] | null  
  es_host?: boolean
  fecha_solo?: string         // Campo agregado por el backend
  hora_solo?: string          // Campo agregado por el backend
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

function formatDateOnly(ts: string) {
  const d = new Date(ts)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

function formatTimeOnly(ts: string) {
  const d = new Date(ts)
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
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
  const [expandedCall, setExpandedCall] = useState<number | null>(null)

  const toggleExpanded = (callId: number) => {
    setExpandedCall(expandedCall === callId ? null : callId)
  }
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
          .eq('User_id', user.id)
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
      
      if (!q) return true
      
      // Búsqueda prioritaria por nombre de usuario y título de llamada
      const matchUserName = (it.otro_usuario_nombre || '').toLowerCase().includes(q)
      const matchCallTitle = (it.titulo || '').toLowerCase().includes(q)
      
      // Búsqueda secundaria en participantes y descripción
      const matchParticipants = (it.participantes || []).some((p) => 
        `${p.nombre} ${p.apellido} ${p.apodo ?? ''}`.toLowerCase().includes(q)
      )
      const matchDescription = (it.descripcion || '').toLowerCase().includes(q)
      
      const matchQ = matchUserName || matchCallTitle || matchParticipants || matchDescription
      
      const matchFrom = !filters.dateFrom || new Date(it.fecha_inicio) >= new Date(filters.dateFrom)
      const matchTo = !filters.dateTo || new Date(it.fecha_inicio) <= new Date(filters.dateTo + 'T23:59:59')
      return matchQ && matchFrom && matchTo
    })
  }, [items, filters])

  useEffect(() => {
    feather.replace()
  }, [filtered, loading])

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
              placeholder="Buscar por nombre, título o apodo"
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
            <div className="col-span-4">Llamada</div>
            <div className="col-span-2">Fecha</div>
            <div className="col-span-2">Hora</div>
            <div className="col-span-3">Duración</div>
            <div className="col-span-1"></div>
          </div>

        <div className="divide-y divide-white/10">
          {loading && <div className="p-6 text-center opacity-70">Cargando historial…</div>}
          {!loading && error && <div className="p-6 text-center text-rose-500">Error: {error}</div>}
          {!loading && !error && filtered.length === 0 && (
            <div className="p-6 text-center opacity-70">Sin resultados.</div>
          )}

          {!loading && !error && filtered.map((it) => {
            const userName = it.otro_usuario_nombre || it.titulo || 'Usuario desconocido'
            const duration = it.duracion_calculada || 0
            const isExpanded = expandedCall === it.id
            
            return (
              <div key={it.id} className="border border-zinc-200/20 rounded-xl bg-gradient-to-r from-white/5 to-white/10 backdrop-blur-sm hover:shadow-lg transition-all duration-200 mb-3">
                {/* Fila principal */}
                <div 
                  className="grid grid-cols-12 items-center px-4 py-4 hover:bg-white/10 transition cursor-pointer rounded-xl"
                  onClick={() => toggleExpanded(it.id)}
                >
                  <div className="col-span-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center border-2 border-orange-400/50 bg-gradient-to-br from-orange-200/20 to-orange-300/30 shadow-sm">
                      <i data-feather="phone" className="opacity-90 text-orange-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-base truncate text-zinc-900 dark:text-zinc-100">{userName}</div>
                      <div className="text-xs opacity-70 truncate text-zinc-600 dark:text-zinc-400">
                        {it.titulo || 'Llamada'}
                        {it.es_host && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                            Host
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="col-span-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {it.fecha_solo ? formatDateOnly(it.fecha_solo) : formatDateOnly(it.fecha_inicio)}
                  </div>
                  <div className="col-span-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {it.hora_solo || formatTimeOnly(it.fecha_inicio)}
                  </div>
                  <div className="col-span-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">{formatDuration(duration)}</div>
                  
                  <div className="col-span-1 flex justify-end">
                    <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                      <i 
                        data-feather={isExpanded ? "chevron-up" : "chevron-down"} 
                        className="w-4 h-4 opacity-70 transition-transform text-zinc-600 dark:text-zinc-400" 
                      />
                    </div>
                  </div>
                </div>

                {/* Panel expandido */}
                {isExpanded && (
                  <div className="border-t border-zinc-200/30 dark:border-zinc-700/30 bg-gradient-to-br from-zinc-50/80 to-white/50 dark:from-zinc-900/50 dark:to-zinc-800/30 rounded-b-xl">
                    <div className="px-4 py-5 space-y-5">
                      {/* Descripción */}
                      {it.descripcion && (
                        <div className="bg-white/60 dark:bg-zinc-800/60 rounded-lg p-4 border border-zinc-200/40 dark:border-zinc-700/40">
                          <h4 className="text-sm font-semibold text-orange-600 dark:text-orange-400 mb-3 flex items-center gap-2">
                            <i data-feather="file-text" className="w-4 h-4" />
                            Descripción
                          </h4>
                          <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{it.descripcion}</p>
                        </div>
                      )}

                      {/* Participantes */}
                      {it.participantes && it.participantes.length > 0 && (
                        <div className="bg-white/60 dark:bg-zinc-800/60 rounded-lg p-4 border border-zinc-200/40 dark:border-zinc-700/40">
                          <h4 className="text-sm font-semibold text-orange-600 dark:text-orange-400 mb-3 flex items-center gap-2">
                            <i data-feather="users" className="w-4 h-4" />
                            Participantes ({it.participantes.length})
                          </h4>
                          <div className="grid gap-3">
                            {it.participantes.map((p, idx) => (
                              <div key={p.id_usuario || idx} className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-zinc-100/80 to-zinc-50/80 dark:from-zinc-700/50 dark:to-zinc-800/50 border border-zinc-200/50 dark:border-zinc-600/30 hover:shadow-md transition-all">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-200/40 to-orange-300/60 dark:from-orange-600/30 dark:to-orange-700/40 flex items-center justify-center text-sm font-semibold text-orange-800 dark:text-orange-200 border-2 border-orange-300/40 dark:border-orange-500/30">
                                  {p.nombre?.[0]}{p.apellido?.[0]}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-semibold truncate text-zinc-800 dark:text-zinc-200">
                                    {p.nombre} {p.apellido}
                                  </div>
                                  {p.apodo && (
                                    <div className="text-xs text-zinc-600 dark:text-zinc-400 truncate">@{p.apodo}</div>
                                  )}
                                </div>
                                {p.es_iniciador && (
                                  <span className="text-xs px-3 py-1 rounded-full bg-gradient-to-r from-emerald-500/20 to-emerald-600/30 text-emerald-700 dark:text-emerald-300 border border-emerald-400/40 font-medium">
                                    Host
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </main>
  )
}