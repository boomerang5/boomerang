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

  return (
    <>
      {/* HERO */}
      <section className="relative py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-orange-100 to-orange-50 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800"></div>
        
        <div className="relative w-full max-w-[1400px] mx-auto px-6">
          <div className="text-center space-y-8 mb-16">
            {/* Logo grande */}
            <div className="flex justify-center mb-8 animate-fade-in">
              <Image
                src="/boomerang.png"
                alt="Boomerang"
                width={600}
                height={400}
                priority
                className="h-20 md:h-28 w-auto object-contain drop-shadow-2xl"
              />
            </div>
            <h1 className="text-6xl md:text-7xl font-extrabold leading-tight">
              <span className="bg-gradient-to-r from-orange-600 via-orange-500 to-orange-600 bg-clip-text text-transparent">
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
                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-8 py-4 rounded-full font-bold text-lg shadow-lg hover:shadow-xl border-2 border-orange-300 dark:border-orange-600 hover:border-orange-500 dark:hover:border-orange-500 transition-all"
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
      <section id="features" className="py-24 bg-white dark:bg-gray-800">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold mb-4 text-gray-900 dark:text-white">
              Lo que hace única a Boomerang
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
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
                className="group relative bg-gradient-to-br from-orange-50 to-white dark:from-gray-700 dark:to-gray-800 p-8 rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-orange-200 dark:border-gray-600"
              >
                <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${gradient} rounded-t-3xl`}></div>
                <div className="text-5xl mb-4">{icon}</div>
                <h3 className="text-2xl font-bold mb-3 text-gray-900 dark:text-white">
                  {title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CÓMO FUNCIONA */}
      <section id="como-funciona" className="py-24 bg-gradient-to-br from-orange-50 via-orange-100 to-orange-50 dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-bold mb-4 text-gray-900 dark:text-white">
              Comenzá en segundos
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Simple, rápido y sin complicaciones
            </p>
          </div>

          <div className="relative">
            {/* Línea conectora */}
            <div className="hidden md:block absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-orange-300 via-orange-500 to-orange-300 transform -translate-y-1/2 opacity-30"></div>
            
            <div className="grid md:grid-cols-4 gap-8 relative">
              {[
                { icon: "👤", title: "Registrate", desc: "Creá tu cuenta gratis" },
                { icon: "➕", title: "Añadí contactos", desc: "Invitá a tus amigos" },
                { icon: "📹", title: "Conectá", desc: "Iniciá la videollamada" },
                { icon: "🌍", title: "Hablá sin barreras", desc: "Traducción automática" },
              ].map(({ icon, title, desc }, i) => (
                <div key={i} className="relative">
                  <div className="bg-white dark:bg-gray-700 rounded-2xl p-6 shadow-xl text-center hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-orange-200 dark:border-gray-600">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-3xl shadow-lg">
                      {icon}
                    </div>
                    <div className="absolute -top-3 -right-3 w-8 h-8 bg-gradient-to-br from-orange-600 to-red-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg">
                      {i + 1}
                    </div>
                    <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
                      {title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">
                      {desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
