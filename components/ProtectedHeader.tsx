'use client'

import Link from 'next/link'
import Image from 'next/image'
import SettingsMenu from '@/components/ui/settings-menu'

export default function ProtectedHeader() {
  return (
    <nav className="w-full h-18 md:h-20 bg-orange-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-600">
      <div className="w-full h-full flex items-center px-6">
        <Link href="/protected" className="flex items-center gap-2 shrink-0 hover:opacity-80 transition-opacity">
          <Image
            src="/boomerang.png"
            alt="Boomerang logo"
            width={450}
            height={300}
            priority
            className="h-10 md:h-14 w-auto object-contain dark:brightness-0 dark:invert"
          />
        </Link>
        <div className="flex-1"></div>
        <SettingsMenu />
      </div>
    </nav>
  )
}
