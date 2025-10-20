'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
// @ts-ignore
import feather from 'feather-icons'
import { useEffect } from 'react'

export default function ProtectedSidebar() {
  const pathname = usePathname()
  useEffect(() => { feather.replace() }, [pathname])

  const isActive = (p: string) => pathname === p || pathname.startsWith(p + '/')
  const cls = (p: string) =>
    `w-5 h-5 ${isActive(p) ? 'text-orange-500' : 'text-black dark:text-white'} hover:text-orange-500 transition`

  return (
    //SIDEBAR
    <aside className="w-16 bg-orange-50 dark:bg-gray-700 flex flex-col justify-between items-center py-4">
  <div className="flex flex-col items-center gap-6 mt-4">
          {/* Inicio */}
          <Link href="/protected" aria-label="Inicio">
            <i data-feather="home" className={cls('/protected')} />
          </Link>

          {/* Perfil */}
          <Link href="/protected/perfil" aria-label="Perfil">
            <i data-feather="user" className={cls('/protected/perfil')} />
          </Link>

          {/* Video (placeholder) */}
          <div className="cursor-pointer">
            <i data-feather="video" className="w-5 h-5 text-black dark:text-white hover:text-orange-500 transition" />
          </div>

          {/* Historial de llamadas */}
          <Link href="/protected/historial-llamada" aria-label="Historial de llamadas">
            <i data-feather="clock" className={cls('/protected/historial-llamada')} />
          </Link>

          {/* Contactos */}
          <Link href="/protected/contactos" aria-label="Contactos">
            <i data-feather="users" className={cls('/protected/contactos')} />
          </Link>

          {/* Chats */}
          <Link href="/protected/chats" aria-label="Chats">
            <i data-feather="message-circle" className={cls('/protected/chats')} />
          </Link>

          {/* Calendario */}
          <Link href="/protected/calendario" aria-label="Calendario">
            <i data-feather="calendar" className={cls('/protected/calendario')} />
          </Link>

          {/* Reportes */}
          <Link href="/protected/reportes" aria-label="Reportes">
            <i data-feather="bar-chart-2" className={cls('/protected/reportes')} />
          </Link>

          {/* Chatbot (mascota como botón) */}
          <Link href="/protected/chatbot" aria-label="Chatbot">
            <img
              src="/mascota.png"
              alt="Mascota Boomerang"
              className={`w-8 h-8 rounded-full shadow ${isActive('/protected/chatbot') ? 'ring-2 ring-orange-500' : ''} hover:ring-2 hover:ring-orange-500 transition`} 
              style={{ objectFit: 'cover' }}
            />
          </Link>

          {/* Pizarra */}
          <Link href="/protected/pizarra" aria-label="Pizarra">
            <i data-feather="edit-3" className={cls('/protected/pizarra')} />
          </Link>
        </div>

        <div className="flex flex-col items-center gap-5 mb-4">
          <i data-feather="help-circle" className="w-5 h-5 text-black dark:text-white" />
        </div>
      </aside>

  )
}
