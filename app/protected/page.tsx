'use client'

import { useEffect, useState } from 'react'
import { useSupabaseClient } from "@supabase/auth-helpers-react";
// @ts-ignore
import feather from 'feather-icons'

export default function DashboardPage() {
  const supabase = useSupabaseClient();
  const [estado, setEstado] = useState('available')
  const [perfil, setPerfil] = useState<{ nombre: string; apellido: string; mail: string } | null>(null);

  useEffect(() => {
    feather.replace()
  }, [])

  useEffect(() => {
    const fetchPerfil = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const user_id = sessionData.session?.user.id;

      console.log("🔑 user_id:", user_id); // 👈 log 1

      if (!user_id) return;

      const { data, error } = await supabase.rpc("get_usuario_uuid", {
        p_user_id: user_id,
      });

      console.log("📦 Data recibida desde Supabase:", data); // 👈 log 2
      console.log("🐞 Error (si hay):", error); // 👈 log 3


      if (!error && data) {
        const perfilFinal = Array.isArray(data) ? data[0] : data;
        console.log("✅ Perfil seteado:", perfilFinal);
      setPerfil(perfilFinal);
      } else {
        console.error("❌ Error al obtener perfil:", JSON.stringify(error, null, 2));
      }
    };

    fetchPerfil();
  }, []);

  return (
    <div className="flex min-h-screen bg-orange-50 dark:bg-[#0d0d0d]">
      {/* Sidebar */}
      <aside className="w-20 bg-white/20 dark:bg-white/10 backdrop-blur-md flex flex-col justify-between items-center py-4">
        <div className="flex flex-col items-center gap-6 mt-4">
          <i data-feather="home" className="text-orange-500 hover:text-orange-400 w-5 h-5" />
          <i data-feather="user" className="text-black dark:text-white w-5 h-5" />
          <i data-feather="video" className="text-black dark:text-white w-5 h-5" />
          <i data-feather="users" className="text-black dark:text-white w-5 h-5" />
          <i data-feather="message-circle" className="text-black dark:text-white w-5 h-5" />
          <i data-feather="calendar" className="text-black dark:text-white w-5 h-5" />
        </div>
        <div className="flex flex-col items-center gap-5 mb-4">
          <i data-feather="help-circle" className="text-black dark:text-white w-5 h-5" />
          <i data-feather="settings" className="text-black dark:text-white w-5 h-5" />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 px-6 py-8 flex flex-col gap-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-semibold text-foreground">¡Bienvenido, Usuario!</h1>
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className="bg-white/30 dark:bg-white/10 border border-orange-400 text-orange-600 font-semibold text-sm px-3 py-1.5 rounded-md backdrop-blur-sm"
            >
              <option value="available">Disponible</option>
              <option value="busy">Ocupado</option>
              <option value="away">Ausente</option>
            </select>
          </div>

          <div className="relative max-w-md w-full">
            <input
              type="text"
              placeholder="Buscar contactos, reuniones..."
              className="w-full px-4 py-2 pr-10 rounded-md bg-white/40 dark:bg-white/10 border border-orange-300 text-foreground focus:ring-2 focus:ring-orange-400 backdrop-blur-md"
            />
            <i
              data-feather="search"
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-orange-500"
            />
          </div>
        </header>

        {/* Cards */}
        <section className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <Card title="Iniciar reunión" description="Crea una sala e invita a otros." buttonText="Crear reunión" />
          <Card title="Unirse con código" inputPlaceholder="Código de reunión" buttonText="Unirse" />
          <Card title="Contactos" inputPlaceholder="Buscar contacto" list={['Juan Pérez', 'María Gómez']} buttonText="Agregar contacto" />
          <Card title="Reuniones programadas" list={['🗓️ 5 julio - Reunión equipo 10:00', '🗓️ 6 julio - Cliente Z 15:30']} buttonText="Ver calendario" />
          <Card title="Perfil" content={<>
            {perfil ? (
              <>
                <p className="text-sm text-muted-foreground">Nombre: {perfil.nombre} {perfil.apellido}</p>
                <p className="text-sm text-muted-foreground mb-2">Correo: {perfil.mail}</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Cargando perfil...</p>
            )}
          </>} buttonText="Editar perfil" />
          <Card title="Chat reciente" content={<div className="bg-white/30 dark:bg-white/10 p-3 rounded-md text-sm text-muted-foreground backdrop-blur-md">
            <p><strong>Juan:</strong> ¿Nos conectamos ahora?</p>
            <p><strong>Vos:</strong> Dame 5 minutos 🙌</p>
          </div>} buttonText="Ir al chat" />
        </section>
      </main>
    </div>
  )
}

// Card component
function Card({ title, description, inputPlaceholder, list, content, buttonText }: {
  title: string
  description?: string
  inputPlaceholder?: string
  list?: string[]
  content?: React.ReactNode
  buttonText: string
}) {
  return (
    <div className="bg-white/30 dark:bg-white/10 rounded-xl p-6 shadow-lg backdrop-blur-md border border-white/20 flex flex-col justify-between">
      <div>
        <h2 className="text-orange-500 font-semibold text-lg mb-2">{title}</h2>
        {description && <p className="text-muted-foreground mb-4">{description}</p>}
        {inputPlaceholder && <input type="text" placeholder={inputPlaceholder} className="w-full px-3 py-2 rounded-md bg-white/20 border border-white/30 text-foreground mb-4 backdrop-blur-sm" />}
        {list && (
          <ul className="list-disc list-inside text-muted-foreground text-sm mb-4">
            {list.map((item, i) => <li key={i}>{item}</li>)}
          </ul>
        )}
        {content}
      </div>
      <button className="bg-gradient-to-r from-orange-400 to-orange-600 text-white px-4 py-2 rounded-full font-semibold w-fit mt-3 hover:brightness-105 transition">
        {buttonText}
      </button>
    </div>
  )
}
