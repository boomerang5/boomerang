'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, User, Clock, Users, MessageCircle, Calendar, BarChart2, Edit3 } from 'lucide-react'

export default function ProtectedSidebar() {
  const pathname = usePathname()

  const isActive = (p: string) => {
    // For the homepage, only match exact path
    if (p === '/protected') {
      return pathname === '/protected'
    }
    // For other pages, match if pathname starts with the path
    return pathname === p || pathname.startsWith(p + '/')
  }
  const cls = (p: string) =>
    `w-5 h-5 ${isActive(p) ? 'text-orange-500' : 'text-black dark:text-white'} hover:text-orange-500 transition`

  return (
    //SIDEBAR
    <aside className="w-16 bg-orange-50 dark:bg-gray-700 flex flex-col justify-between items-center py-4">
  <div className="flex flex-col items-center gap-6 mt-4">
          {/* Inicio */}
          <Link href="/protected" aria-label="Inicio">
            <Home className={cls('/protected')} />
          </Link>

          {/* Perfil */}
          <Link href="/protected/perfil" aria-label="Perfil">
            <User className={cls('/protected/perfil')} />
          </Link>

          {/* Historial de llamadas */}
          <Link href="/protected/historial-llamada" aria-label="Historial de llamadas">
            <Clock className={cls('/protected/historial-llamada')} />
          </Link>

          {/* Contactos */}
          <Link href="/protected/contactos" aria-label="Contactos">
            <Users className={cls('/protected/contactos')} />
          </Link>

          {/* Chats */}
          <Link href="/protected/chats" aria-label="Chats">
            <MessageCircle className={cls('/protected/chats')} />
          </Link>

          {/* Calendario */}
          <Link href="/protected/calendario" aria-label="Calendario">
            <Calendar className={cls('/protected/calendario')} />
          </Link>

          {/* Reportes */}
          <Link href="/protected/reportes" aria-label="Reportes">
            <BarChart2 className={cls('/protected/reportes')} />
          </Link>

          {/* Pizarra */}
          <Link href="/protected/pizarra" aria-label="Pizarra">
            <Edit3 className={cls('/protected/pizarra')} />
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
        </div>
      </aside>

  )
}
