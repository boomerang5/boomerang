'use client'

import { useState, useTransition } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export function LanguageSelector() {
  const router = useRouter()
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Extraer el locale del pathname directamente
  const locale = pathname.split('/')[1] || 'es'

  const languages = [
    { code: 'es', name: 'Español' },
    { code: 'en', name: 'English' },
  ]

  const currentLanguage = languages.find(lang => lang.code === locale)

  const handleLanguageChange = (newLocale: string) => {
    if (newLocale === locale) {
      setIsOpen(false)
      return
    }

    setIsOpen(false)
    
    startTransition(() => {
      // Construir nueva ruta: reemplazar el primer segmento del locale
      const segments = pathname.split('/')
      segments[1] = newLocale
      const newPathname = segments.join('/')
      
      router.push(newPathname)
      router.refresh()
    })
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        className="flex items-center gap-2 bg-white/10 backdrop-blur-md border-2 border-white hover:border-white text-white px-6 py-3 rounded-full font-bold text-base transition-all duration-300 hover:scale-105 hover:bg-white/20 disabled:opacity-50"
      >
        <span>{currentLanguage?.name || locale.toUpperCase()}</span>
        <svg
          className={`w-4 h-4 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Overlay para cerrar al hacer click afuera */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute top-full right-0 mt-2 w-40 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border-2 border-white/50 overflow-hidden z-20 animate-fade-in">
            {languages.map((language) => (
              <button
                key={language.code}
                onClick={() => handleLanguageChange(language.code)}
                disabled={isPending}
                className={`w-full flex items-center justify-between px-4 py-3 text-left transition-all duration-200 disabled:opacity-50 ${
                  locale === language.code
                    ? 'bg-orange-500 text-white font-bold'
                    : 'text-gray-700 hover:bg-orange-50'
                }`}
              >
                <span className="font-medium">{language.name}</span>
                {locale === language.code && (
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
