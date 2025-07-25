'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@supabase/auth-helpers-react'

export default function Home() {
  const session = useSession()
  const router = useRouter()

  useEffect(() => {
    if (session) router.push('/dashboard')
  }, [session])

  return (
    <>
      {/* HERO */}
      <section className="py-24 text-center bg-gradient-to-br from-orange-100/50 to-white/30 dark:from-orange-950/20 dark:to-orange-900/10 backdrop-blur-md rounded-xl mx-4 my-6 shadow-lg border border-orange-200 dark:border-orange-800 transition">
        <div className="w-full max-w-[1400px] mx-auto px-6 flex flex-col md:flex-row items-center gap-10">
          <div className="flex-1 space-y-6 text-left">
            <h1 className="text-5xl font-bold leading-tight text-foreground">
              Conectá el mundo<br />
              <span className="bg-gradient-to-r from-orange-500 to-orange-700 bg-clip-text text-transparent">
                en tiempo real.
              </span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Videollamadas con traducción automática, sin fronteras ni barreras.
            </p>
            <div className="flex flex-wrap gap-4">
              <a
                href="#"
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-6 py-3 rounded-full font-semibold shadow-md transition"
              >
                Iniciar llamada
              </a>
              <a
                href="#"
                className="border-2 border-orange-500 text-orange-600 hover:bg-orange-600 hover:text-white px-6 py-3 rounded-full font-semibold transition"
              >
                Unirse
              </a>
            </div>
          </div>
          <div className="flex-1 text-center">
            <img
              src="/videollamada.png"
              alt="Videollamada"
              className="max-w-full rounded-xl shadow-xl border border-orange-200 dark:border-orange-700"
            />
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-20 text-center">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-4xl font-bold mb-12 text-foreground">
            Lo que hace única a Boomerang
          </h2>
          <div className="flex flex-wrap justify-center gap-8">
            {[
              {
                icon: "🎤",
                title: "Traducción en vivo",
                desc: "Rompé las barreras del idioma con voz en tiempo real.",
              },
              {
                icon: "💻",
                title: "Sin instalaciones",
                desc: "Accedé desde cualquier dispositivo, sin descargas.",
              },
              {
                icon: "🔒",
                title: "Seguridad total",
                desc: "Cifrado extremo a extremo que protege tus conversaciones.",
              },
            ].map(({ icon, title, desc }, i) => (
              <div
                key={i}
                className="bg-white/60 dark:bg-white/10 backdrop-blur-md border border-orange-100 dark:border-orange-700 p-6 rounded-2xl w-72 shadow-md hover:shadow-xl transition text-left"
              >
                <h3 className="text-xl font-semibold mb-2 text-orange-600 dark:text-orange-400">
                  {icon} {title}
                </h3>
                <p className="text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
