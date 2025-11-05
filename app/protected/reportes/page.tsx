'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'

interface EstadisticasGenerales {
  totalLlamadas: number
  totalMinutos: number
  participantesUnicos: number
  promedioParticipantesPorLlamada: number
  llamadasCompletadas: number
  tasaExito: number
}

interface ActividadTemporalData {
  periodo: string
  periodoFormateado?: string
  totalLlamadas: number
  duracionTotal: number
  duracionPromedio: number
  participantesUnicos: number
}

interface DashboardMetricas {
  llamadasHoy: number
  llamadasSemana: number
  tiempoTotalHoy: number
  tiempoPromedioLlamada: number
  llamadasConectadas: number
  llamadasNoConectadas: number
}

interface TopContacto {
  usuarioId: number
  nombre: string
  apellido: string
  tiempoTotalMinutos: number
  totalLlamadas: number
}

export default function ReportesDashboard() {
  const [estadisticas, setEstadisticas] = useState<EstadisticasGenerales | null>(null)
  const [actividadTemporal, setActividadTemporal] = useState<ActividadTemporalData[]>([])
  const [dashboardMetricas, setDashboardMetricas] = useState<DashboardMetricas | null>(null)
  const [topContactos, setTopContactos] = useState<TopContacto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Función para formatear fechas de manera legible
  const formatearPeriodo = (periodo: string) => {
    try {
      const fecha = new Date(periodo)
      const opciones: Intl.DateTimeFormatOptions = { 
        month: 'short', 
        day: 'numeric' 
      }
      return fecha.toLocaleDateString('es-ES', opciones)
    } catch {
      // Si no es una fecha válida, devolver el periodo original
      return periodo
    }
  }

  // Función para formatear tiempo
  const formatearTiempo = (minutos: number): string => {
    if (minutos < 60) {
      return `${minutos.toFixed(0)}m`
    }
    const horas = Math.floor(minutos / 60)
    const mins = Math.floor(minutos % 60)
    return `${horas}h ${mins}m`
  }

  // Fechas por defecto: últimos 30 días
  const fechaFin = new Date()
  const fechaInicio = new Date()
  fechaInicio.setDate(fechaFin.getDate() - 30)

  useEffect(() => {
    fetchResumenData()
  }, [])

  const fetchResumenData = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        fechaInicio: fechaInicio.toISOString().split('T')[0],
        fechaFin: fechaFin.toISOString().split('T')[0]
      })

      // Cargar datos de reportes tradicionales y métricas del dashboard
      const [resumenRes, metricasRes, contactosRes] = await Promise.all([
        fetch(`/api/reports/resumen?${params}`),
        fetch('/api/dashboard/metricas'),
        fetch('/api/dashboard/top-contactos?limite=5')
      ])
      
      if (!resumenRes.ok) {
        throw new Error('Error al cargar los datos de reportes')
      }

      const data = await resumenRes.json()
      setEstadisticas(data.estadisticasGenerales)
      
      // Transformar los datos de actividad temporal para mostrar fechas legibles
      const actividadConFechasFormateadas = (data.actividadTemporal || []).map((item: ActividadTemporalData) => ({
        ...item,
        periodoFormateado: formatearPeriodo(item.periodo)
      }))
      
      setActividadTemporal(actividadConFechasFormateadas.slice(0, 7)) // Últimos 7 días para el dashboard

      // Cargar métricas del dashboard
      if (metricasRes.ok) {
        const metricasData = await metricasRes.json()
        setDashboardMetricas(metricasData)
      }

      if (contactosRes.ok) {
        const contactosData = await contactosRes.json()
        setTopContactos(contactosData)
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  // Datos para gráfico circular de estado de llamadas
  const dataTasaExito = estadisticas ? [
    { name: 'Completadas', value: estadisticas.llamadasCompletadas, color: '#22c55e' },
    { name: 'No completadas', value: estadisticas.totalLlamadas - estadisticas.llamadasCompletadas, color: '#ef4444' }
  ] : []

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Cargando reportes...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-red-600">Error: {error}</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header del Dashboard */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2" style={{ color: '#EA580C' }}>Dashboard de reportes</h1>
        <p className="text-muted-foreground">Análisis completo de actividad y métricas de llamadas</p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="text-lg text-muted-foreground">Cargando datos...</div>
        </div>
      )}

      {error && (
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-lg mb-6">
          Error: {error}
        </div>
      )}

      {!loading && !error && (
        <div className="space-y-8">
          {/* Métricas del Dashboard */}
          {dashboardMetricas && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Llamadas Hoy */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Llamadas Hoy</CardTitle>
                  <div className="h-4 w-4 text-blue-600">📞</div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dashboardMetricas.llamadasHoy}</div>
                  <p className="text-xs text-muted-foreground">
                    Tiempo: {formatearTiempo(dashboardMetricas.tiempoTotalHoy)}
                  </p>
                </CardContent>
              </Card>

              {/* Llamadas Esta Semana */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Esta Semana</CardTitle>
                  <div className="h-4 w-4 text-green-600">📅</div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dashboardMetricas.llamadasSemana}</div>
                  <p className="text-xs text-muted-foreground">
                    Promedio: {formatearTiempo(dashboardMetricas.tiempoPromedioLlamada)}
                  </p>
                </CardContent>
              </Card>

              {/* Tasa de Conexión */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Tasa Conexión</CardTitle>
                  <div className="h-4 w-4 text-green-600">✅</div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {dashboardMetricas.llamadasConectadas + dashboardMetricas.llamadasNoConectadas > 0 
                      ? Math.round((dashboardMetricas.llamadasConectadas / (dashboardMetricas.llamadasConectadas + dashboardMetricas.llamadasNoConectadas)) * 100)
                      : 0}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {dashboardMetricas.llamadasConectadas} de {dashboardMetricas.llamadasConectadas + dashboardMetricas.llamadasNoConectadas} conectadas
                  </p>
                </CardContent>
              </Card>

              {/* Tiempo Promedio */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Tiempo Promedio</CardTitle>
                  <div className="h-4 w-4 text-orange-600">⏱️</div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatearTiempo(dashboardMetricas.tiempoPromedioLlamada)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Por llamada conectada
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Top Contactos */}
          {topContactos && topContactos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Personas más Activas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topContactos.map((contacto, index) => (
                    <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-medium">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium">{contacto.nombre} {contacto.apellido}</div>
                          <div className="text-sm text-muted-foreground">
                            {contacto.totalLlamadas} llamadas
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatearTiempo(contacto.tiempoTotalMinutos)}</div>
                        <div className="text-sm text-muted-foreground">
                          {Math.round(contacto.tiempoTotalMinutos / contacto.totalLlamadas)}m promedio
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actividad Temporal */}
          {actividadTemporal && actividadTemporal.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Actividad de los Últimos 7 Días</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {actividadTemporal.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                      <div className="font-medium">{item.periodoFormateado}</div>
                      <div className="flex items-center space-x-4">
                        <span className="text-sm text-muted-foreground">
                          {item.totalLlamadas} llamadas
                        </span>
                        <span className="font-medium">
                          {formatearTiempo(item.duracionTotal)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navegación a Reportes Detallados */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => window.location.href = '/protected/reportes/eventos'}>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <span>📊</span>
                  <span>Análisis de Eventos</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Análisis temporal detallado de llamadas por día, semana y patrones de actividad.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => window.location.href = '/protected/reportes/contactos'}>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <span>👥</span>
                  <span>Análisis de Contactos</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Análisis social y de contactos: frecuencia, duración y patrones de comunicación.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Estadísticas Generales */}
          {estadisticas && (
            <Card>
              <CardHeader>
                <CardTitle>Estadísticas Generales (Últimos 30 días)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <div className="text-2xl font-bold text-blue-600">{estadisticas.totalLlamadas}</div>
                    <div className="text-sm text-muted-foreground">Total Llamadas</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <div className="text-2xl font-bold text-green-600">{estadisticas.llamadasCompletadas}</div>
                    <div className="text-sm text-muted-foreground">Conectadas</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <div className="text-2xl font-bold text-orange-600">{formatearTiempo(estadisticas.totalMinutos)}</div>
                    <div className="text-sm text-muted-foreground">Tiempo Total</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <div className="text-2xl font-bold text-purple-600">{estadisticas.participantesUnicos}</div>
                    <div className="text-sm text-muted-foreground">Contactos Únicos</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}