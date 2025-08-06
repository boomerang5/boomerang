'use client'

import { useEffect, useState } from 'react'
import { useSupabaseClient } from "@supabase/auth-helpers-react";
// @ts-ignore
import feather from 'feather-icons'

export default function ContactosPage() {
  const supabase = useSupabaseClient();
  const [contactos, setContactos] = useState<any[]>([]);
  
  //simulando llamada (por ahora) despues cambiar cuando tengamos la ruta a la llamada
  const handleLlamada = (contacto: any) => {
    alert(`Iniciando llamada de audio con ${contacto.nombre} ${contacto.apellido}`);
  }
  
  //simulando videollamada (por ahora) despues cambiar cuando tengamos la ruta a la llamada real
  const handleVideollamada = (contacto: any) => {
    alert(`Iniciando videollamada con ${contacto.nombre} ${contacto.apellido}`);    
  }

  useEffect(() => {
    feather.replace()
  }, [])

  useEffect(() => {
    const fetchContactos = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const user_id = sessionData.session?.user.id;
      if (!user_id) return;

      // Reemplazar con tu RPC real de contactos
      const { data, error } = await supabase.rpc("get_my_contacts", {
        p_user_id: user_id,
      });

      if (!error && data) {
        setContactos(data);
      } else {
        console.error("Error al obtener contactos:", error);
      }
    };

    fetchContactos();
  }, []);

  return (
    <div className="flex min-h-screen bg-orange-50 dark:bg-[#0d0d0d]">
      {/* Sidebar */}
      <aside className="w-20 bg-white/20 dark:bg-white/10 backdrop-blur-md flex flex-col justify-between items-center py-4">
        <div className="flex flex-col items-center gap-6 mt-4">
          <i data-feather="home" className="text-black dark:text-white w-5 h-5" />
          <i data-feather="user" className="text-orange-500 w-5 h-5" /> {/* Activo en Contactos */}
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
        <header className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-foreground">Contactos</h1>
        </header>

        {/* Lista de contactos */}
        <section className="bg-white/30 dark:bg-white/10 rounded-xl p-6 shadow-lg backdrop-blur-md border border-white/20 flex flex-col gap-4">
          {contactos.length === 0 ? (
            <p className="text-muted-foreground">No tienes contactos agregados.</p>
          ) : (
            contactos.map((contacto) => (
              <div
                key={contacto.id}
                className="flex justify-between items-center bg-white/20 dark:bg-white/5 p-4 rounded-lg hover:bg-white/30 transition"
              >
                <div>
                  <p className="font-semibold text-lg">
                    {contacto.nombre} {contacto.apellido}
                  </p>
                  <p className="text-sm text-muted-foreground">Idioma: {contacto.idioma}</p>
                </div>
                <div className="flex space-x-3">
                  <button 
                  onClick={() => handleLlamada(contacto)} 
                  className="bg-green-500 p-2 rounded-full hover:bg-green-600">
                    <i data-feather="phone" />
                  </button>
                  <button 
                  onClick={() => handleVideollamada(contacto)} 
                  className="bg-blue-500 p-2 rounded-full hover:bg-blue-600">
                    <i data-feather="video" />
                  </button>
                </div>
              </div>
            ))
          )}
        </section>
      </main>
    </div>
  )
}
