'use client'

import { useEffect, useState } from 'react'
// @ts-ignore
import feather from 'feather-icons'
import { createClient } from '@/utils/supabase/client'

type Participant = {
  id_usuario: number
  nombre: string
  apellido: string
  apodo?: string | null
  es_iniciador?: boolean
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
}

type Filters = {
  search: string
  dateFrom?: string
  dateTo?: string
}

const initialFilters: Filters = {
  search: '',
}

export default function CallHistoryPage() {
  const [calls, setCalls] = useState<CallItem[]>([])
  const [myUserId, setMyUserId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<Filters>(initialFilters)
  const [expandedCall, setExpandedCall] = useState<number | null>(null)

  // Obtener ID del usuario autenticado
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
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
              setError('Error obteniendo información del usuario')
            }
          })
      }
    })
  }, [])

  // Renderizar iconos Feather
  useEffect(() => {
    feather.replace()
  }, [calls, expandedCall])

  // Cargar historial de llamadas
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
    fetch(`/api/llamadas/historial?${params.toString()}`, { 
      headers: { 'cache-control': 'no-store' } 
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text())
        return r.json()
      })
      .then((response) => {
        console.log('Response completo:', response)
        if (response.success && response.data) {
          setCalls(response.data)
          setError(null)
        } else {
          throw new Error(response.message || 'Respuesta inesperada')
        }
      })
      .catch((err) => {
        console.error('Error cargando historial:', err)
        setError(err.message || 'Error desconocido')
        setCalls([])
      })
      .finally(() => setLoading(false))
  }, [myUserId, filters])

  // Funciones de utilidad
  const formatDate = (isoString: string): string => {
    const date = new Date(isoString)
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDuration = (seconds?: number | null): string => {
    if (!seconds) return 'N/A'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  const getCallTitle = (call: CallItem): string => {
    if (call.titulo && call.titulo.trim()) {
      return call.titulo
    }
    if (call.otro_usuario_nombre) {
      return `Llamada con ${call.otro_usuario_nombre}`
    }
    if (call.id_grupo) {
      return 'Llamada grupal'
    }
    return 'Llamada'
  }

  const toggleExpanded = (callId: number) => {
    setExpandedCall(expandedCall === callId ? null : callId)
  }

  // Filtros aplicados
  const filteredCalls = calls.filter(call => {
    const searchTerm = filters.search.toLowerCase()
    if (searchTerm) {
      const title = getCallTitle(call).toLowerCase()
      const description = (call.descripcion || '').toLowerCase()
      const otherUser = (call.otro_usuario_nombre || '').toLowerCase()
      
      if (!title.includes(searchTerm) && 
          !description.includes(searchTerm) && 
          !otherUser.includes(searchTerm)) {
        return false
      }
    }
    
    if (filters.dateFrom) {
      const callDate = new Date(call.fecha_inicio).toISOString().split('T')[0]
      if (callDate < filters.dateFrom) return false
    }
    
    if (filters.dateTo) {
      const callDate = new Date(call.fecha_inicio).toISOString().split('T')[0]
      if (callDate > filters.dateTo) return false
    }
    
    return true
  })

  const clearFilters = () => {
    setFilters(initialFilters)
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Historial de llamadas
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Revisa tus llamadas anteriores y sus detalles
        </p>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Buscar
            </label>
            <div className="relative">
              <i data-feather="search" className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"></i>
              <input
                type="text"
                placeholder="Buscar por nombre o descripción..."
                className="w-full pl-10 pr-4 h-10 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Desde
            </label>
            <input
              type="date"
              className="w-full h-10 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              value={filters.dateFrom || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value || undefined }))}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Hasta
            </label>
            <input
              type="date"
              className="w-full h-10 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              value={filters.dateTo || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value || undefined }))}
            />
          </div>
        </div>
        
        <div className="mt-4 flex justify-end">
          <button
            onClick={clearFilters}
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
          >
            Limpiar filtros
          </button>
        </div>
      </div>

      {/* Lista de llamadas */}
      <div className="space-y-4">
        {loading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Cargando historial...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
            <i data-feather="alert-circle" className="w-6 h-6 text-red-500 mx-auto mb-2"></i>
            <p className="text-red-700 dark:text-red-300 font-medium">Error: {error}</p>
          </div>
        )}

        {!loading && !error && filteredCalls.length === 0 && (
          <div className="text-center py-12">
            <i data-feather="phone-off" className="w-12 h-12 text-gray-400 mx-auto mb-4"></i>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No hay llamadas
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {calls.length === 0 
                ? 'Aún no tienes llamadas en tu historial'
                : 'No se encontraron llamadas con los filtros aplicados'
              }
            </p>
          </div>
        )}

        {!loading && !error && filteredCalls.map((call) => (
          <div
            key={call.id}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-all hover:shadow-md"
          >
            {/* Información principal */}
            <div
              className="p-6 cursor-pointer"
              onClick={() => toggleExpanded(call.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                      <i data-feather="phone" className="w-6 h-6 text-orange-600 dark:text-orange-400"></i>
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                      {getCallTitle(call)}
                    </h3>
                    <div className="flex items-center space-x-4 mt-1">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(call.fecha_inicio)}
                      </span>
                      {call.duracion_calculada && (
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {formatDuration(call.duracion_calculada)}
                        </span>
                      )}
                      {call.es_host && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                          <i data-feather="user-check" className="w-3 h-3 mr-1"></i>
                          Host
                        </span>
                      )}
                      {call.id_grupo && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                          <i data-feather="users" className="w-3 h-3 mr-1"></i>
                          Grupal
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex-shrink-0">
                  <i 
                    data-feather={expandedCall === call.id ? "chevron-up" : "chevron-down"} 
                    className="w-5 h-5 text-gray-400 transition-transform"
                  ></i>
                </div>
              </div>
            </div>

            {/* Detalles expandidos */}
            {expandedCall === call.id && (
              <div className="px-6 pb-6 border-t border-gray-200 dark:border-gray-700">
                <div className="pt-4 space-y-4">
                  {/* Descripción */}
                  {call.descripcion && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                        Descripción
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {call.descripcion}
                      </p>
                    </div>
                  )}

                  {/* Participantes */}
                  {call.participantes && call.participantes.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                        Participantes ({call.participantes.length})
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {call.participantes.map((participant, index) => (
                          <div
                            key={`${participant.id_usuario}-${index}`}
                            className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                          >
                            <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                              {participant.nombre ? participant.nombre[0].toUpperCase() : '?'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {participant.nombre} {participant.apellido}
                              </p>
                              {participant.apodo && (
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                  @{participant.apodo}
                                </p>
                              )}
                            </div>
                            {participant.es_iniciador && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
                                Host
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Información técnica */}
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <h5 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        ID de llamada
                      </h5>
                      <p className="text-sm text-gray-900 dark:text-white mt-1">
                        #{call.id}
                      </p>
                    </div>
                    {call.fecha_fin && (
                      <div>
                        <h5 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                          Finalizada
                        </h5>
                        <p className="text-sm text-gray-900 dark:text-white mt-1">
                          {formatDate(call.fecha_fin)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}