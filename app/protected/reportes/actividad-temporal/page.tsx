'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts'

interface ActividadTemporalData {
  periodo: string
  totalLlamadas: number
  duracionTotal: number
  duracionPromedio: number
  participantesUnicos: number
}

export default function ActividadTemporalPage() {
  const [data, setData] = useState<ActividadTemporalData[]>([])
  const [agrupacion, setAgrupacion] = useState<'dia' | 'semana' | 'mes'>('dia')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fechas por defecto: últimos 30 días
  const [fechaFin, setFechaFin] = useState(new Date().toISOString().split('T')[0])
  const [fechaInicio, setFechaInicio] = useState(() => {
    const fecha = new Date()
    fecha.setDate(fecha.getDate() - 30)
    return fecha.toISOString().split('T')[0]
  })

  useEffect(() => {
    fetchData()
  }, [agrupacion, fechaInicio, fechaFin])

  const fetchData = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        fechaInicio,
        fechaFin,
        agrupacion
      })

      const response = await fetch(`/api/reports/actividad-temporal?${params}`)
      
      if (!response.ok) {
        throw new Error('Error al cargar los datos')
      }

      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  // Calculamos totales
  const totales = data.reduce((acc, item) => ({
    totalLlamadas: acc.totalLlamadas + item.totalLlamadas,
    duracionTotal: acc.duracionTotal + item.duracionTotal,
    participantesUnicos: Math.max(acc.participantesUnicos, item.participantesUnicos),
    duracionPromedio: 0 // Se calcula después
  }), { totalLlamadas: 0, duracionTotal: 0, participantesUnicos: 0, duracionPromedio: 0 })

  totales.duracionPromedio = totales.totalLlamadas > 0 ? totales.duracionTotal / totales.totalLlamadas : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Cargando datos de actividad temporal...</div>
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
      {/* Header */}
      <div className="mb-8">
        <Link href="/protected/reportes" className="text-blue-600 hover:underline mb-4 block">
          ← Volver a Reportes
        </Link>
        <h1 className="text-3xl font-bold mb-2">📊 Actividad Temporal</h1>
        <p className="text-gray-600">
          Análisis de patrones de uso y actividad a lo largo del tiempo
        </p>
      </div>

      {/* Controles */}
      <div className="mb-6 bg-gray-50 p-4 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Fecha Inicio</label>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Fecha Fin</label>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Agrupación</label>
            <select
              value={agrupacion}
              onChange={(e) => setAgrupacion(e.target.value as 'dia' | 'semana' | 'mes')}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="dia">Por Día</option>
              <option value="semana">Por Semana</option>
              <option value="mes">Por Mes</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={fetchData}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Actualizar
            </button>
          </div>
        </div>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Llamadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totales.totalLlamadas}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Tiempo Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(totales.duracionTotal / 60)}h</div>
            <p className="text-xs text-gray-500">{totales.duracionTotal} minutos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Duración Promedio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(totales.duracionPromedio)}min</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Participantes Únicos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totales.participantesUnicos}</div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Gráfico de línea - Número de llamadas */}
        <Card>
          <CardHeader>
            <CardTitle>Número de Llamadas por {agrupacion === 'dia' ? 'Día' : agrupacion === 'semana' ? 'Semana' : 'Mes'}</CardTitle>
            <CardDescription>Evolución temporal del número de llamadas</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="periodo" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="totalLlamadas" 
                  stroke="#2563eb" 
                  strokeWidth={2}
                  name="Llamadas"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de área - Duración total */}
        <Card>
          <CardHeader>
            <CardTitle>Duración Total por Período</CardTitle>
            <CardDescription>Tiempo total invertido en llamadas</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="periodo" />
                <YAxis />
                <Tooltip formatter={(value) => [`${value} min`, 'Duración']} />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="duracionTotal" 
                  stroke="#10b981" 
                  fill="#10b981" 
                  fillOpacity={0.3}
                  name="Duración (min)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de barras - Duración promedio */}
        <Card>
          <CardHeader>
            <CardTitle>Duración Promedio por Llamada</CardTitle>
            <CardDescription>Tiempo promedio de cada llamada por período</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="periodo" />
                <YAxis />
                <Tooltip formatter={(value) => [`${Math.round(Number(value))} min`, 'Duración Promedio']} />
                <Legend />
                <Bar 
                  dataKey="duracionPromedio" 
                  fill="#f59e0b" 
                  name="Duración Promedio (min)"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de línea - Participantes únicos */}
        <Card>
          <CardHeader>
            <CardTitle>Participantes Únicos por Período</CardTitle>
            <CardDescription>Número de usuarios diferentes que participaron</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="periodo" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="participantesUnicos" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  name="Participantes Únicos"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}