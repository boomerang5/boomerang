'use client'

import { useState, useEffect } from "react"

const slides = [
  {
    icon: "🌍",
    title: "Conectá sin límites",
    desc: "Videollamadas con traducción en tiempo real para hablar con cualquier persona del mundo",
    gradient: "from-orange-500 to-red-500"
  },
  {
    icon: "🎤",
    title: "Traducción instantánea",
    desc: "Hablá en tu idioma y deja que la tecnología haga el resto. Sin barreras de comunicación",
    gradient: "from-purple-500 to-pink-500"
  },
  {
    icon: "💼",
    title: "Ideal para negocios",
    desc: "Cierra acuerdos internacionales sin preocuparte por el idioma. Profesional y eficiente",
    gradient: "from-blue-500 to-cyan-500"
  },
  {
    icon: "✏️",
    title: "Pizarra Aérea",
    desc: "Tu creatividad no tiene techo. Nuestra pizarra aérea tampoco.",
    gradient: "from-green-500 to-emerald-500"
  },
]

export function LoginSlideshow() {
  const [activeSlide, setActiveSlide] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="hidden md:flex flex-col items-center justify-center p-8 animate-fade-in">
      <div className="relative w-full max-w-md">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-400/30 to-red-500/30 rounded-full blur-3xl"></div>
        
        {/* Contenido visual con slides - mismo tamaño que el formulario */}
        <div className="relative bg-white/10 backdrop-blur-lg border-4 border-white/30 rounded-[2.5rem] shadow-2xl overflow-hidden" style={{ minHeight: '600px' }}>
          {/* Slides con transiciones - centrados */}
          <div className="absolute inset-0 flex items-center justify-center pb-12">
            {slides.map((slide, index) => (
              <div
                key={index}
                className={`absolute px-10 flex flex-col items-center justify-center transition-all duration-700 ${
                  activeSlide === index
                    ? 'opacity-100 scale-100'
                    : 'opacity-0 scale-95 pointer-events-none'
                }`}
              >
                <div className={`w-24 h-24 bg-gradient-to-br ${slide.gradient} rounded-full flex items-center justify-center shadow-xl mb-6 transition-transform duration-500 flex-shrink-0 ${
                  activeSlide === index ? 'scale-100 rotate-0' : 'scale-75 rotate-12'
                }`}>
                  <span className="text-5xl">{slide.icon}</span>
                </div>
                <h2 className="text-2xl font-bold text-white drop-shadow-lg mb-4 text-center leading-tight px-2">
                  {slide.title}
                </h2>
                <p className="text-base text-white/90 leading-relaxed text-center px-4">
                  {slide.desc}
                </p>
              </div>
            ))}
          </div>
          
          {/* Indicadores de slide - fijos en la parte inferior del contenedor principal */}
          <div className="absolute bottom-8 left-0 right-0 flex gap-3 justify-center z-20">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => setActiveSlide(index)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  activeSlide === index
                    ? 'w-8 bg-white'
                    : 'w-2 bg-white/40 hover:bg-white/60'
                }`}
                aria-label={`Ir a slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
