'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  PieChart,
  Pie,
  Cell
} from 'recharts'

interface ColaboracionData {
  usuarioId: number
  nombreUsuario: string
  llamadasOrganizadas: number
  llamadasParticipadas: number
  tiempoTotalMinutos: number
  colaboracionesUnicas: number
}

export default function ColaboracionPage() {
  const [data, setData] = useState<ColaboracionData[]>([])
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
  }, [fechaInicio, fechaFin])

  const fetchData = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        fechaInicio,
        fechaFin
      })

      const response = await fetch(`/api/reports/colaboracion?${params}`)
      
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

  // Preparar datos para gráficos
  const topUsuarios = data
    .sort((a, b) => (b.llamadasOrganizadas + b.llamadasParticipadas) - (a.llamadasOrganizadas + a.llamadasParticipadas))
    .slice(0, 10)

  // Datos para gráfico de dispersión (colaboraciones vs tiempo)
  const scatterData = data.map(user => ({
    x: user.colaboracionesUnicas,
    y: user.tiempoTotalMinutos,
    name: user.nombreUsuario
  }))

  // Datos para gráfico circular de distribución de roles
  const rolesData = [
    { 
      name: 'Organizadores', 
      value: data.reduce((sum, user) => sum + user.llamadasOrganizadas, 0),
      color: '#3b82f6'
    },
    { 
      name: 'Participantes', 
      value: data.reduce((sum, user) => sum + user.llamadasParticipadas, 0),
      color: '#10b981'
    }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Cargando datos de colaboración...</div>
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
        <h1 className="text-3xl font-bold mb-2">🤝 Colaboración</h1>
        <p className="text-gray-600">
          Análisis de colaboración e interacción entre usuarios
        </p>
      </div>

      {/* Controles */}
      <div className="mb-6 bg-gray-50 p-4 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

      {/* Estadísticas generales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Usuarios</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Tiempo Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(data.reduce((sum, user) => sum + user.tiempoTotalMinutos, 0) / 60)}h
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Promedio Colaboraciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.length > 0 ? Math.round(data.reduce((sum, user) => sum + user.colaboracionesUnicas, 0) / data.length) : 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Usuario Más Activo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {topUsuarios[0]?.nombreUsuario || 'N/A'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Top usuarios por actividad */}
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Usuarios por Actividad</CardTitle>
            <CardDescription>Llamadas organizadas vs participadas</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={topUsuarios} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="nombreUsuario" type="category" width={80} />
                <Tooltip />
                <Legend />
                <Bar dataKey="llamadasOrganizadas" stackId="a" fill="#3b82f6" name="Organizadas" />
                <Bar dataKey="llamadasParticipadas" stackId="a" fill="#10b981" name="Participadas" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Distribución de roles */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución de Roles</CardTitle>
            <CardDescription>Proporción entre organizadores y participantes</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={rolesData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {rolesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de dispersión - Colaboraciones vs Tiempo */}
        <Card>
          <CardHeader>
            <CardTitle>Colaboraciones vs Tiempo Invertido</CardTitle>
            <CardDescription>Relación entre número de colaboraciones y tiempo total</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <ScatterChart>
                <CartesianGrid />
                <XAxis 
                  type="number" 
                  dataKey="x" 
                  name="Colaboraciones" 
                  label={{ value: 'Colaboraciones Únicas', position: 'insideBottom', offset: -5 }}
                />
                <YAxis 
                  type="number" 
                  dataKey="y" 
                  name="Tiempo (min)" 
                  label={{ value: 'Tiempo Total (min)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3' }}
                  formatter={(value, name) => [value, name === 'y' ? 'Tiempo (min)' : 'Colaboraciones']}
                  labelFormatter={(value) => `Usuario: ${scatterData.find(d => d.x === value || d.y === value)?.name || ''}`}
                />
                <Scatter name="Usuarios" data={scatterData} fill="#8884d8" />
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Tiempo promedio por usuario */}
        <Card>
          <CardHeader>
            <CardTitle>Tiempo Total por Usuario (Top 10)</CardTitle>
            <CardDescription>Usuarios que más tiempo han invertido en llamadas</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart 
                data={data
                  .sort((a, b) => b.tiempoTotalMinutos - a.tiempoTotalMinutos)
                  .slice(0, 10)
                }
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nombreUsuario" />
                <YAxis />
                <Tooltip formatter={(value) => [`${value} min`, 'Tiempo Total']} />
                <Legend />
                <Bar dataKey="tiempoTotalMinutos" fill="#f59e0b" name="Tiempo Total (min)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tabla detallada */}
      <Card>
        <CardHeader>
          <CardTitle>Detalle por Usuario</CardTitle>
          <CardDescription>Información completa de colaboración por usuario</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">Usuario</th>
                  <th className="text-right p-3">Organizadas</th>
                  <th className="text-right p-3">Participadas</th>
                  <th className="text-right p-3">Total</th>
                  <th className="text-right p-3">Tiempo (h)</th>
                  <th className="text-right p-3">Colaboraciones</th>
                </tr>
              </thead>
              <tbody>
                {data
                  .sort((a, b) => (b.llamadasOrganizadas + b.llamadasParticipadas) - (a.llamadasOrganizadas + a.llamadasParticipadas))
                  .map((user, index) => (
                  <tr key={user.usuarioId} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                    <td className="p-3 font-medium">{user.nombreUsuario}</td>
                    <td className="text-right p-3">{user.llamadasOrganizadas}</td>
                    <td className="text-right p-3">{user.llamadasParticipadas}</td>
                    <td className="text-right p-3 font-medium">
                      {user.llamadasOrganizadas + user.llamadasParticipadas}
                    </td>
                    <td className="text-right p-3">
                      {Math.round(user.tiempoTotalMinutos / 60 * 10) / 10}h
                    </td>
                    <td className="text-right p-3">{user.colaboracionesUnicas}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}