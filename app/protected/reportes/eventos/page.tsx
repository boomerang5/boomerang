'use client'

import React, { useState, useEffect } from 'react'
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
  Cell,
  BarChart,
  Bar
} from 'recharts'

interface EventosTemporal {
  periodo: string
  periodoFormateado?: string
  eventosOrganizados: number
  eventosInvitado: number
  eventosConfirmados: number
  eventosRechazados: number
  eventosPendientes: number
}

interface EventosEstadisticas {
  totalOrganizados: number
  totalInvitacionesRecibidas: number
  totalConfirmados: number
  totalRechazados: number
  totalPendientes: number
  tasaConfirmacion: number
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function ReportesEventos() {
  const [eventosTemporal, setEventosTemporal] = useState<EventosTemporal[]>([])
  const [estadisticas, setEstadisticas] = useState<EventosEstadisticas | null>(null)
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
      return periodo
    }
  }

  // Fechas por defecto: últimos 30 días
  const fechaFin = new Date()
  const fechaInicio = new Date()
  fechaInicio.setDate(fechaFin.getDate() - 30)

  useEffect(() => {
    fetchEventosData()
  }, [])

  const fetchEventosData = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        fechaInicio: fechaInicio.toISOString().split('T')[0],
        fechaFin: fechaFin.toISOString().split('T')[0]
      })

      // Llamar a las APIs de eventos
      const [temporalRes, estadisticasRes] = await Promise.all([
        fetch(`/api/reports/eventos-temporal?${params}`),
        fetch(`/api/reports/eventos-estadisticas?${params}`)
      ])
      
      if (!temporalRes.ok || !estadisticasRes.ok) {
        throw new Error('Error al cargar los datos')
      }

      const temporalData = await temporalRes.json()
      const estadisticasData = await estadisticasRes.json()

      // Transformar datos temporales con fechas formateadas
      const eventosConFechas = temporalData.map((item: EventosTemporal) => ({
        ...item,
        periodoFormateado: formatearPeriodo(item.periodo)
      }))
      
      setEventosTemporal(eventosConFechas.slice(0, 14)) // Últimos 14 días
      setEstadisticas(estadisticasData)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  // Datos para gráfico circular de distribución de eventos
  const dataPieEventos = estadisticas ? [
    { name: 'Confirmados', value: estadisticas.totalConfirmados, color: '#00C49F' },
    { name: 'Rechazados', value: estadisticas.totalRechazados, color: '#FF8042' },
    { name: 'Pendientes', value: estadisticas.totalPendientes, color: '#FFBB28' }
  ].filter(item => item.value > 0) : []

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Cargando reportes de eventos...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-600">
              <p>Error al cargar los datos: {error}</p>
              <button 
                onClick={fetchEventosData}
                className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
              >
                Reintentar
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Botón de navegación */}
      <div className="mb-4">
        <button 
          onClick={() => window.location.href = '/protected/reportes'}
          className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <span>←</span>
          <span>Volver al Dashboard</span>
        </button>
      </div>

      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Reportes de Eventos</h1>
        <p className="text-muted-foreground">
          Análisis de eventos organizados, invitaciones y confirmaciones
        </p>
      </div>

      {/* Estadísticas generales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Organizados</CardTitle>
            <i className="h-4 w-4 text-muted-foreground">📅</i>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{estadisticas?.totalOrganizados || 0}</div>
            <p className="text-xs text-muted-foreground">eventos creados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Invitaciones</CardTitle>
            <i className="h-4 w-4 text-muted-foreground">📨</i>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{estadisticas?.totalInvitacionesRecibidas || 0}</div>
            <p className="text-xs text-muted-foreground">invitaciones recibidas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confirmados</CardTitle>
            <i className="h-4 w-4 text-muted-foreground">✅</i>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{estadisticas?.totalConfirmados || 0}</div>
            <p className="text-xs text-muted-foreground">eventos confirmados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <i className="h-4 w-4 text-muted-foreground">⏳</i>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{estadisticas?.totalPendientes || 0}</div>
            <p className="text-xs text-muted-foreground">sin responder</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa Confirmación</CardTitle>
            <i className="h-4 w-4 text-muted-foreground">📊</i>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {estadisticas?.tasaConfirmacion?.toFixed(1) || 0}%
            </div>
            <p className="text-xs text-muted-foreground">eventos confirmados</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Gráfico temporal de eventos */}
        <Card>
          <CardHeader>
            <CardTitle>Actividad de Eventos por Día</CardTitle>
            <CardDescription>
              Eventos organizados e invitaciones recibidas en los últimos 14 días
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={eventosTemporal}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="periodoFormateado" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(label, payload) => {
                    const item = payload?.[0]?.payload
                    return item ? `Fecha: ${formatearPeriodo(item.periodo)}` : label
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="eventosOrganizados" 
                  stroke="#8884d8" 
                  name="Organizados"
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="eventosInvitado" 
                  stroke="#82ca9d" 
                  name="Invitado"
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="eventosConfirmados" 
                  stroke="#00C49F" 
                  name="Confirmados"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Distribución de respuestas */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución de Respuestas</CardTitle>
            <CardDescription>
              Estado de las invitaciones recibidas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {dataPieEventos.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={dataPieEventos}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {dataPieEventos.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[350px]">
                <p className="text-muted-foreground">No hay datos de eventos para mostrar</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de barras de actividad */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen de Actividad</CardTitle>
          <CardDescription>
            Comparación de eventos organizados vs participaciones
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={eventosTemporal}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="periodoFormateado" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis />
              <Tooltip 
                labelFormatter={(label, payload) => {
                  const item = payload?.[0]?.payload
                  return item ? `Fecha: ${formatearPeriodo(item.periodo)}` : label
                }}
              />
              <Legend />
              <Bar dataKey="eventosOrganizados" fill="#8884d8" name="Organizados" />
              <Bar dataKey="eventosConfirmados" fill="#00C49F" name="Confirmados" />
              <Bar dataKey="eventosPendientes" fill="#FFBB28" name="Pendientes" />
              <Bar dataKey="eventosRechazados" fill="#FF8042" name="Rechazados" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}