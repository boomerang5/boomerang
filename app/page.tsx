'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@supabase/auth-helpers-react'
import Image from 'next/image'

export default function Home() {
  const session = useSession()
  const router = useRouter()

  useEffect(() => {
    if (session) router.push('/dashboard')
  }, [session])

  const handleSmoothScroll = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault()
    const element = document.getElementById(targetId)
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }
  }

  return (
    <>
      {/* HERO */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        <div className="relative w-full max-w-[1400px] mx-auto px-6">
          <div className="text-center space-y-8 mb-16">
            <h1 className="text-5xl md:text-7xl font-extrabold leading-tight animate-fade-in">
              <span className="bg-gradient-to-r from-orange-700 via-orange-600 to-orange-500 bg-clip-text text-transparent">
                Comunicación sin barreras
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-700 dark:text-gray-300 max-w-3xl mx-auto">
              Videollamadas con traducción automática en tiempo real.<br />
              Hablá en tu idioma, ellos escuchan en el suyo.
            </p>
            <div className="flex flex-wrap justify-center gap-4 pt-4">
              <a
                href="/sign-up"
                className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white px-8 py-4 rounded-full font-bold text-lg shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all"
              >
                Comenzar gratis
              </a>
              <a
                href="#como-funciona"
                onClick={(e) => handleSmoothScroll(e, 'como-funciona')}
                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-8 py-4 rounded-full font-bold text-lg shadow-lg hover:shadow-xl border-2 border-orange-300 dark:border-orange-600 hover:border-orange-500 dark:hover:border-orange-500 transition-all cursor-pointer"
              >
                Ver cómo funciona
              </a>
            </div>
          </div>

          {/* Demo Visual */}
          <div className="relative max-w-5xl mx-auto mt-8">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-white dark:border-gray-700 bg-gray-900">
              <img
                src="/videollamada.png"
                alt="Videollamada con traducción"
                className="w-full h-auto object-contain"
              />
              {/* Overlay decorativo */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>
            </div>
            {/* Elementos decorativos flotantes */}
            <div className="absolute -top-6 -right-6 w-32 h-32 bg-gradient-to-br from-orange-300 to-orange-400 rounded-full opacity-20 blur-2xl"></div>
            <div className="absolute -bottom-6 -left-6 w-40 h-40 bg-gradient-to-br from-orange-400 to-orange-500 rounded-full opacity-20 blur-2xl"></div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-5xl md:text-5xl font-extrabold mb-4">
              <span className="bg-gradient-to-r from-orange-700 via-orange-600 to-orange-500 bg-clip-text text-transparent">
                Lo que hace única a Boomerang
              </span>
            </h2>
            <p className="text-xl md:text-2xl text-gray-700 dark:text-gray-300">
              Tecnología de vanguardia para conectar personas
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: "🎤",
                title: "Traducción en vivo",
                desc: "Rompé las barreras del idioma con voz en tiempo real.",
                gradient: "from-orange-500 to-orange-600"
              },
              {
                icon: "💻",
                title: "Sin instalaciones",
                desc: "Accedé desde cualquier dispositivo, sin descargas.",
                gradient: "from-orange-600 to-orange-700"
              },
              {
                icon: "🔒",
                title: "Seguridad total",
                desc: "Cifrado extremo a extremo que protege tus conversaciones.",
                gradient: "from-orange-500 to-red-600"
              },
            ].map(({ icon, title, desc, gradient }, i) => (
              <div
                key={i}
                className="group relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-10 rounded-[2rem] shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-3 border border-orange-200/50 dark:border-gray-600/50 overflow-hidden"
              >
                <div className={`absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br ${gradient} rounded-full opacity-10 group-hover:opacity-20 transition-opacity duration-300`}></div>
                <div className="relative z-10">
                  <div className="text-6xl mb-6">{icon}</div>
                  <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
                    {title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-base">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CÓMO FUNCIONA */}
      <section id="como-funciona" className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-5xl font-extrabold mb-4">
              <span className="bg-gradient-to-r from-orange-700 via-orange-600 to-orange-500 bg-clip-text text-transparent">
                Comenzá en segundos
              </span>
            </h2>
            <p className="text-xl md:text-2xl text-gray-700 dark:text-gray-300">
              Simple, rápido y sin complicaciones
            </p>
          </div>

          <div className="relative">
            <div className="flex items-center justify-center gap-4 md:gap-6">
              {[
                { icon: "👤", title: "Registrate", desc: "Creá tu cuenta gratis" },
                { icon: "➕", title: "Añadí contactos", desc: "Invitá a tus amigos" },
                { icon: "📹", title: "Conectá", desc: "Iniciá la videollamada" },
                { icon: "🌍", title: "Hablá sin barreras", desc: "Traducción automática" },
              ].map(({ icon, title, desc }, i, arr) => (
                <>
                  <div key={i} className="relative group flex-1 max-w-xs">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border border-orange-200 dark:border-gray-600 text-center flex flex-col items-center justify-start" style={{height: '100%', minHeight: '200px'}}>
                      {/* Número de paso */}
                      <div className="absolute -top-3 -right-3 w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-md ring-2 ring-white dark:ring-gray-800">
                        {i + 1}
                      </div>
                      
                      {/* Icono */}
                      <div className="w-16 h-16 mx-auto mb-4 bg-orange-200 dark:bg-orange-800/40 rounded-full flex items-center justify-center text-3xl shadow-sm">
                        {icon}
                      </div>
                      
                      {/* Contenido */}
                      <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
                        {title}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-300 text-sm">
                        {desc}
                      </p>
                    </div>
                  </div>
                  
                  {/* Flecha sutil entre cards (excepto después de la última) */}
                  {i < arr.length - 1 && (
                    <div className="hidden md:flex items-center justify-center flex-shrink-0">
                      <svg 
                        className="w-8 h-8 text-orange-400/40 dark:text-orange-500/30" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M13 7l5 5m0 0l-5 5m5-5H6" 
                        />
                      </svg>
                    </div>
                  )}
                </>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
