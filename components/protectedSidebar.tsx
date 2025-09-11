'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
// @ts-ignore
import feather from 'feather-icons'
import { useEffect, useRef, useState } from 'react'
import { signOutAction } from '@/app/actions'
import { Button } from './ui/button'

export default function ProtectedSidebar() {
  const pathname = usePathname()
  useEffect(() => { feather.replace() }, [pathname])

  const isActive = (p: string) => pathname === p || pathname.startsWith(p + '/')
  const cls = (p: string) =>
    `w-5 h-5 ${isActive(p) ? 'text-orange-500' : 'text-black dark:text-white'} hover:text-orange-500 transition`

  return (
    <aside className="w-20 bg-white/20 dark:bg-white/10 backdrop-blur-md flex flex-col justify-between items-center py-4">
      <div className="flex flex-col items-center gap-6 mt-4">
        <Link href="/protected" aria-label="Inicio"><i data-feather="home" className={cls('/protected')} /></Link>
        <Link href="/protected/perfil" aria-label="Perfil"><i data-feather="user" className={cls('/protected/perfil')} /></Link>
        <Link href="/protected/historial-llamada" aria-label="Historial de llamadas">
          <i data-feather="clock" className={cls('/protected/historial-llamada')} />
        </Link>
        <Link href="/protected/contactos" aria-label="Contactos"><i data-feather="users" className={cls('/protected/contactos')} /></Link>
        <Link href="/protected/chats" aria-label="Chats"><i data-feather="message-circle" className={cls('/protected/chats')} /></Link>
        <i data-feather="calendar" className="w-5 h-5 text-black dark:text-white" />
      </div>

      <SettingsMenu />
    </aside>
  )
}

function SettingsMenu() {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (open && buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [open])

  return (
    <div className="flex flex-col items-center gap-5 mb-4 relative">
      <i data-feather="help-circle" className="w-5 h-5 text-black dark:text-white" />
      <Button
        ref={buttonRef}
        aria-label="Ajustes"
        type="button"
        variant="ghost"
        size="icon"
        className="h-6 w-6 p-0"
        onClick={() => setOpen((v) => !v)}
      >
        <i data-feather="settings" className="w-5 h-5 text-black dark:text-white" />
      </Button>
      {open && (
        <div className="absolute left-8 bottom-0 z-50 min-w-[10rem] rounded-md border bg-popover p-1 shadow-md">
          <form action={signOutAction}>
            <button type="submit" className="w-full text-left px-2 py-1.5 text-sm hover:bg-accent">
              Cerrar Sesion
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
