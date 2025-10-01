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
  Area,
  ComposedChart
} from 'recharts'

interface ProductividadData {
  periodo: string
  reunionesProgramadas: number
  reunionesCompletadas: number
  tasaCompletitud: number
  tiempoEfectivo: number
  tiempoPromedioPorReunion: number
}

export default function ProductividadPage() {
  const [data, setData] = useState<ProductividadData[]>([])
  const [agrupacion, setAgrupacion] = useState<'dia' | 'semana' | 'mes'>('semana')
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

      const response = await fetch(`/api/reports/productividad?${params}`)
      
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

  // Calculamos totales y promedios
  const totales = data.reduce((acc, item) => ({
    reunionesProgramadas: acc.reunionesProgramadas + item.reunionesProgramadas,
    reunionesCompletadas: acc.reunionesCompletadas + item.reunionesCompletadas,
    tiempoEfectivo: acc.tiempoEfectivo + item.tiempoEfectivo,
    tasaCompletitudPromedio: 0, // Se calcula después
    tiempoPromedioPorReunionGeneral: 0 // Se calcula después
  }), { reunionesProgramadas: 0, reunionesCompletadas: 0, tiempoEfectivo: 0, tasaCompletitudPromedio: 0, tiempoPromedioPorReunionGeneral: 0 })

  totales.tasaCompletitudPromedio = totales.reunionesProgramadas > 0 ? 
    (totales.reunionesCompletadas / totales.reunionesProgramadas) * 100 : 0

  totales.tiempoPromedioPorReunionGeneral = totales.reunionesCompletadas > 0 ? 
    totales.tiempoEfectivo / totales.reunionesCompletadas : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Cargando datos de productividad...</div>
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
        <h1 className="text-3xl font-bold mb-2">⚡ Productividad</h1>
        <p className="text-gray-600">
          Análisis de eficiencia y productividad en reuniones
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
            <CardTitle className="text-sm font-medium text-gray-600">Reuniones Programadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totales.reunionesProgramadas}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Reuniones Completadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totales.reunionesCompletadas}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Tasa de Completitud</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {Math.round(totales.tasaCompletitudPromedio)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Tiempo Efectivo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(totales.tiempoEfectivo / 60)}h</div>
            <p className="text-xs text-gray-500">{totales.tiempoEfectivo} minutos</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Gráfico combinado - Reuniones programadas vs completadas */}
        <Card>
          <CardHeader>
            <CardTitle>Reuniones Programadas vs Completadas</CardTitle>
            <CardDescription>Comparación entre reuniones planificadas y realizadas</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="periodo" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="reunionesProgramadas" fill="#3b82f6" name="Programadas" />
                <Bar yAxisId="left" dataKey="reunionesCompletadas" fill="#10b981" name="Completadas" />
                <Line 
                  yAxisId="right" 
                  type="monotone" 
                  dataKey="tasaCompletitud" 
                  stroke="#f59e0b" 
                  strokeWidth={2}
                  name="Tasa Completitud (%)"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de línea - Tasa de completitud */}
        <Card>
          <CardHeader>
            <CardTitle>Evolución de la Tasa de Completitud</CardTitle>
            <CardDescription>Porcentaje de reuniones completadas exitosamente</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="periodo" />
                <YAxis domain={[0, 100]} />
                <Tooltip formatter={(value) => [`${Math.round(Number(value))}%`, 'Tasa de Completitud']} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="tasaCompletitud" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  name="Tasa de Completitud (%)"
                  dot={{ fill: '#10b981', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de área - Tiempo efectivo */}
        <Card>
          <CardHeader>
            <CardTitle>Tiempo Efectivo por Período</CardTitle>
            <CardDescription>Tiempo total invertido en reuniones completadas</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="periodo" />
                <YAxis />
                <Tooltip formatter={(value) => [`${value} min`, 'Tiempo Efectivo']} />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="tiempoEfectivo" 
                  stroke="#8b5cf6" 
                  fill="#8b5cf6" 
                  fillOpacity={0.3}
                  name="Tiempo Efectivo (min)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de barras - Tiempo promedio por reunión */}
        <Card>
          <CardHeader>
            <CardTitle>Duración Promedio por Reunión</CardTitle>
            <CardDescription>Tiempo promedio invertido en cada reunión completada</CardDescription>
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
                  dataKey="tiempoPromedioPorReunion" 
                  fill="#f59e0b" 
                  name="Duración Promedio (min)"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de métricas detalladas */}
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Métricas Detalladas por Período</CardTitle>
            <CardDescription>Información completa de productividad por período</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3">Período</th>
                    <th className="text-right p-3">Programadas</th>
                    <th className="text-right p-3">Completadas</th>
                    <th className="text-right p-3">Tasa (%)</th>
                    <th className="text-right p-3">Tiempo Efectivo</th>
                    <th className="text-right p-3">Promedio/Reunión</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((item, index) => (
                    <tr key={item.periodo} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                      <td className="p-3 font-medium">{item.periodo}</td>
                      <td className="text-right p-3">{item.reunionesProgramadas}</td>
                      <td className="text-right p-3">{item.reunionesCompletadas}</td>
                      <td className="text-right p-3">
                        <span className={`font-medium ${
                          item.tasaCompletitud >= 80 ? 'text-green-600' :
                          item.tasaCompletitud >= 60 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {Math.round(item.tasaCompletitud)}%
                        </span>
                      </td>
                      <td className="text-right p-3">
                        {Math.round(item.tiempoEfectivo / 60 * 10) / 10}h
                      </td>
                      <td className="text-right p-3">
                        {Math.round(item.tiempoPromedioPorReunion)}min
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}