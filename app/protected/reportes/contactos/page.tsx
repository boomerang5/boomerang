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

interface ContactosTemporal {
  periodo: string
  periodoFormateado?: string
  contactosAgregados: number
  solicitudesEnviadas: number
  solicitudesRecibidas: number
  solicitudesAceptadas: number
  solicitudesRechazadas: number
}

interface ContactoFavorito {
  usuarioId: number
  nombre: string
  apellido: string
  esFavorito: boolean
  fechaAgregado: string
  tiempoTotalLlamadas: number
  llamadasRecientes: number
}

interface ColaboracionData {
  usuarioId: number
  nombreUsuario: string
  apellidoUsuario: string
  llamadasComoHost: number
  llamadasComoParticipante: number
  tiempoTotalMinutos: number
  colaboracionesUnicas: number
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#FF6B6B'];

export default function ReportesContactos() {
  const [contactosTemporal, setContactosTemporal] = useState<ContactosTemporal[]>([])
  const [contactosFavoritos, setContactosFavoritos] = useState<ContactoFavorito[]>([])
  const [colaboracion, setColaboracion] = useState<ColaboracionData[]>([])
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
    fetchContactosData()
  }, [])

  const fetchContactosData = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        fechaInicio: fechaInicio.toISOString().split('T')[0],
        fechaFin: fechaFin.toISOString().split('T')[0]
      })

      // Llamar a las APIs de contactos
      const [temporalRes, favoritosRes, colaboracionRes] = await Promise.all([
        fetch(`/api/reports/contactos-temporal?${params}`),
        fetch(`/api/reports/contactos-favoritos`),
        fetch(`/api/reports/colaboracion?${params}`)
      ])
      
      if (!temporalRes.ok || !favoritosRes.ok || !colaboracionRes.ok) {
        throw new Error('Error al cargar los datos')
      }

      const temporalData = await temporalRes.json()
      const favoritosData = await favoritosRes.json()
      const colaboracionData = await colaboracionRes.json()

      // Transformar datos temporales con fechas formateadas
      const contactosConFechas = temporalData.map((item: ContactosTemporal) => ({
        ...item,
        periodoFormateado: formatearPeriodo(item.periodo)
      }))
      
      setContactosTemporal(contactosConFechas.slice(0, 14)) // Últimos 14 días
      setContactosFavoritos(favoritosData.slice(0, 10)) // Top 10 contactos
      setColaboracion(colaboracionData.slice(0, 8)) // Top 8 colaboradores
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  // Calcular estadísticas generales
  const estadisticasContactos = contactosTemporal.reduce((acc, item) => ({
    totalAgregados: acc.totalAgregados + item.contactosAgregados,
    totalEnviadas: acc.totalEnviadas + item.solicitudesEnviadas,
    totalRecibidas: acc.totalRecibidas + item.solicitudesRecibidas,
    totalAceptadas: acc.totalAceptadas + item.solicitudesAceptadas,
    totalRechazadas: acc.totalRechazadas + item.solicitudesRechazadas
  }), {
    totalAgregados: 0,
    totalEnviadas: 0,
    totalRecibidas: 0,
    totalAceptadas: 0,
    totalRechazadas: 0
  })

  const tasaAceptacion = estadisticasContactos.totalRecibidas > 0 
    ? (estadisticasContactos.totalAceptadas / estadisticasContactos.totalRecibidas * 100)
    : 0

  // Datos para gráfico de distribución de solicitudes
  const dataPieSolicitudes = [
    { name: 'Aceptadas', value: estadisticasContactos.totalAceptadas, color: '#00C49F' },
    { name: 'Rechazadas', value: estadisticasContactos.totalRechazadas, color: '#FF8042' },
    { name: 'Pendientes', value: estadisticasContactos.totalRecibidas - estadisticasContactos.totalAceptadas - estadisticasContactos.totalRechazadas, color: '#FFBB28' }
  ].filter(item => item.value > 0)

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Cargando reportes de contactos...</p>
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
                onClick={fetchContactosData}
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
        <h1 className="text-3xl font-bold tracking-tight">Reportes de Contactos</h1>
        <p className="text-muted-foreground">
          Análisis de conexiones sociales, colaboraciones y contactos nuevos
        </p>
      </div>

      {/* Estadísticas generales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contactos Nuevos</CardTitle>
            <i className="h-4 w-4 text-muted-foreground">👥</i>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{estadisticasContactos.totalAgregados}</div>
            <p className="text-xs text-muted-foreground">últimos 30 días</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Solicitudes Enviadas</CardTitle>
            <i className="h-4 w-4 text-muted-foreground">📤</i>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{estadisticasContactos.totalEnviadas}</div>
            <p className="text-xs text-muted-foreground">enviadas por ti</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Solicitudes Recibidas</CardTitle>
            <i className="h-4 w-4 text-muted-foreground">📥</i>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{estadisticasContactos.totalRecibidas}</div>
            <p className="text-xs text-muted-foreground">recibidas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa Aceptación</CardTitle>
            <i className="h-4 w-4 text-muted-foreground">✅</i>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{tasaAceptacion.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">de las recibidas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Colaboradores</CardTitle>
            <i className="h-4 w-4 text-muted-foreground">🤝</i>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{colaboracion.length}</div>
            <p className="text-xs text-muted-foreground">personas activas</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos principales */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Actividad temporal */}
        <Card>
          <CardHeader>
            <CardTitle>Actividad de Contactos por Día</CardTitle>
            <CardDescription>
              Solicitudes enviadas y recibidas en los últimos 14 días
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={contactosTemporal}>
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
                  dataKey="contactosAgregados" 
                  stroke="#00C49F" 
                  name="Contactos Agregados"
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="solicitudesEnviadas" 
                  stroke="#8884d8" 
                  name="Solicitudes Enviadas"
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="solicitudesRecibidas" 
                  stroke="#82ca9d" 
                  name="Solicitudes Recibidas"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Distribución de solicitudes */}
        <Card>
          <CardHeader>
            <CardTitle>Estado de Solicitudes</CardTitle>
            <CardDescription>
              Distribución de solicitudes recibidas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {dataPieSolicitudes.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={dataPieSolicitudes}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {dataPieSolicitudes.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[350px]">
                <p className="text-muted-foreground">No hay datos de solicitudes para mostrar</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top contactos por tiempo - ancho completo */}
      <Card>
        <CardHeader>
          <CardTitle>Top Contactos por Tiempo de Llamadas</CardTitle>
          <CardDescription>
            Contactos con más tiempo total en llamadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {contactosFavoritos.length > 0 ? (
              contactosFavoritos.map((contacto, index) => (
                <div key={contacto.usuarioId} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium">
                          {contacto.nombre} {contacto.apellido}
                          {contacto.esFavorito && <span className="ml-2">⭐</span>}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {contacto.llamadasRecientes} llamadas recientes
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatearTiempo(contacto.tiempoTotalLlamadas)}</div>
                      <div className="text-sm text-muted-foreground">tiempo total</div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-8">No hay datos de contactos</p>
              )}
            </div>
          </CardContent>
        </Card>

      {/* Resumen de actividad */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen de Actividad Social</CardTitle>
          <CardDescription>
            Tendencia de solicitudes y conexiones
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={contactosTemporal}>
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
              <Bar dataKey="solicitudesEnviadas" fill="#8884d8" name="Enviadas" />
              <Bar dataKey="solicitudesRecibidas" fill="#82ca9d" name="Recibidas" />
              <Bar dataKey="solicitudesAceptadas" fill="#00C49F" name="Aceptadas" />
              <Bar dataKey="contactosAgregados" fill="#FFBB28" name="Contactos Nuevos" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}