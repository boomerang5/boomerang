'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@supabase/auth-helpers-react'
import { useTranslations } from 'next-intl'

const features = [
  {
    id: 0,
    icon: "🎤",
    translationKey: "liveTranslation",
    color: "from-orange-400 to-red-500"
  },
  {
    id: 1,
    icon: "💻",
    translationKey: "noInstall",
    color: "from-blue-400 to-purple-500"
  },
  {
    id: 2,
    icon: "🔒",
    translationKey: "security",
    color: "from-green-400 to-emerald-600"
  },
]

const steps = [
  { icon: "👤", translationKey: "step1", color: "from-blue-500 to-cyan-500" },
  { icon: "➕", translationKey: "step2", color: "from-purple-500 to-pink-500" },
  { icon: "📹", translationKey: "step3", color: "from-orange-500 to-red-500" },
  { icon: "🌍", translationKey: "step4", color: "from-green-500 to-emerald-500" },
]

function FeatureShowcase() {
  const t = useTranslations('HomePage.features')
  const [activeFeature, setActiveFeature] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % features.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="grid md:grid-cols-2 gap-16 items-center">
      {/* Icono grande a la izquierda */}
      <div className="relative flex items-center justify-center">
        <div className="relative w-80 h-80 md:w-96 md:h-96">
          {features.map((feature, i) => (
            <div
              key={feature.id}
              className={`absolute inset-0 flex items-center justify-center transition-all duration-700 ${activeFeature === i
                ? 'opacity-100 scale-100 rotate-0'
                : 'opacity-0 scale-50 rotate-12'
                }`}
            >
              <div className={`w-full h-full rounded-[3rem] bg-gradient-to-br ${feature.color} flex items-center justify-center shadow-2xl`}>
                <span className="text-[10rem] md:text-[12rem] filter drop-shadow-lg">
                  {feature.icon}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lista de características a la derecha */}
      <div className="space-y-4">
        {features.map((feature, i) => (
          <div
            key={feature.id}
            onClick={() => setActiveFeature(i)}
            onMouseEnter={() => setActiveFeature(i)}
            className={`cursor-pointer p-6 rounded-2xl transition-all duration-300 ${activeFeature === i
              ? 'bg-white/20 backdrop-blur-md scale-105 shadow-xl border-2 border-white/40'
              : 'bg-white/5 backdrop-blur-sm hover:bg-white/10 border-2 border-transparent'
              }`}
          >
            <div className="flex items-start gap-4">
              <div className={`text-5xl transition-transform duration-300 ${activeFeature === i ? 'scale-110' : 'scale-100'
                }`}>
                {feature.icon}
              </div>
              <div className="flex-1">
                <h3 className={`text-2xl font-bold mb-2 transition-colors ${activeFeature === i ? 'text-white' : 'text-white/80'
                  }`}>
                  {t(`${feature.translationKey}.title`)}
                </h3>
                <p className={`leading-relaxed transition-colors ${activeFeature === i ? 'text-white/90' : 'text-white/60'
                  }`}>
                  {t(`${feature.translationKey}.description`)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function StepsShowcase() {
  const t = useTranslations('HomePage.howItWorks')
  const [activeStep, setActiveStep] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length)
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="relative max-w-6xl mx-auto">
      <div className="flex items-center justify-center gap-4 md:gap-6 flex-wrap md:flex-nowrap">
        {steps.map((step, i) => (
          <React.Fragment key={i}>
            <div
              onClick={() => setActiveStep(i)}
              onMouseEnter={() => setActiveStep(i)}
              className={`relative cursor-pointer transition-all duration-500 ${activeStep === i ? 'scale-110 z-10' : 'scale-100'
                }`}
              style={{ width: '220px', flexShrink: 0 }}
            >
              <div
                className={`rounded-3xl p-8 shadow-lg transition-all duration-500 text-center flex flex-col items-center justify-center border-4 ${activeStep === i
                  ? 'bg-white shadow-2xl border-white transform'
                  : 'bg-white/80 backdrop-blur-sm border-white/40 hover:bg-white/90'
                  }`}
                style={{ width: '220px', height: '260px' }}
              >
                {/* Número de paso */}
                <div
                  className={`absolute -top-4 -right-4 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-xl transition-all duration-500 ${activeStep === i ? 'scale-125' : 'scale-100'
                    } bg-gradient-to-br ${step.color}`}
                >
                  {i + 1}
                </div>

                {/* Icono */}
                <div
                  className={`w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center shadow-md transition-all duration-500 bg-gradient-to-br ${step.color} ${activeStep === i ? 'scale-110 rotate-0' : 'scale-100 rotate-3'
                    }`}
                >
                  <span className="text-4xl">{step.icon}</span>
                </div>

                {/* Contenido */}
                <h3
                  className={`text-xl font-bold mb-2 transition-all duration-300 ${activeStep === i ? 'text-gray-900' : 'text-gray-700'
                    }`}
                >
                  {t(`${step.translationKey}.title`)}
                </h3>
                <p
                  className={`text-sm transition-all duration-300 ${activeStep === i ? 'text-gray-600' : 'text-gray-500'
                    }`}
                >
                  {t(`${step.translationKey}.description`)}
                </p>
              </div>
            </div>

            {/* Flecha animada entre cards (excepto después de la última) */}
            {i < steps.length - 1 && (
              <div className="hidden md:flex items-center justify-center flex-shrink-0">
                <svg
                  className={`w-8 h-8 transition-all duration-500 ${activeStep === i ? 'text-white scale-125' : 'text-white/40 scale-100'
                    }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}

export default function Home() {
  const t = useTranslations('HomePage')
  const session = useSession()
  const router = useRouter()

  useEffect(() => {
    if (session) router.push('/protected')
  }, [session, router])

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
      <section className="relative py-20 md:py-32 overflow-hidden bg-transparent">
        {/* Elementos decorativos flotantes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white/5 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        <div className="relative w-full max-w-[1400px] mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Contenido de texto */}
            <div className="text-left space-y-6 animate-fade-in">
              <h1 className="text-5xl md:text-7xl font-bold leading-tight text-white drop-shadow-2xl">
                {t('hero.title')}
                <br />
                <span className="text-white bg-gradient-to-r from-orange-400 via-orange-500 to-red-500 bg-clip-text text-transparent animate-gradient">
                  {t('hero.titleHighlight')}
                </span>
              </h1>
              <p className="text-xl md:text-2xl text-white/90 drop-shadow-lg">
                {t('hero.subtitle')}
                <br />
                {t('hero.subtitleLine2')}
              </p>
              <div className="flex flex-wrap gap-4 pt-4">
                <a
                  href="/sign-up"
                  className="group relative bg-white/10 backdrop-blur-md border-2 border-white hover:bg-white hover:scale-105 text-white hover:text-orange-600 px-8 py-4 rounded-full font-bold text-lg transition-all duration-300 shadow-xl hover:shadow-2xl overflow-hidden"
                >
                  <span className="relative z-10">{t('hero.ctaPrimary')}</span>
                  <div className="absolute inset-0 bg-white transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"></div>
                </a>
                <a
                  href="#como-funciona"
                  onClick={(e) => handleSmoothScroll(e, 'como-funciona')}
                  className="group relative bg-transparent border-2 border-white/80 hover:border-white hover:bg-white/10 text-white px-8 py-4 rounded-full font-bold text-lg transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  {t('hero.ctaSecondary')}
                </a>
              </div>
            </div>

            {/* Demo Visual */}
            <div className="relative animate-fade-in-right">
              {/* Glow effect detrás de la imagen */}
              <div className="absolute inset-0 bg-gradient-to-br from-orange-400/20 to-red-500/20 rounded-3xl blur-2xl scale-105"></div>

              {/* Marco con efecto glassmorphism */}
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white/20 backdrop-blur-sm bg-white/5 p-3 hover:scale-105 transition-transform duration-500">
                <img
                  src="/videollamada.png"
                  alt="Videollamada con traducción"
                  className="w-full h-auto object-contain rounded-2xl"
                />

                {/* Badge flotante */}
                <div className="absolute top-6 right-6 bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg animate-bounce-slow">
                  {t('hero.badge')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-6xl font-extrabold mb-4">
              <span className="text-white">
                {t('features.sectionTitle')}
              </span>
            </h2>
            <p className="text-xl md:text-2xl text-white">
              {t('features.sectionSubtitle')}
            </p>
          </div>

          <FeatureShowcase />
        </div>
      </section>

      {/* CÓMO FUNCIONA */}
      <section id="como-funciona" className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-6xl font-extrabold mb-4">
              <span className="text-white">
                {t('howItWorks.sectionTitle')}
              </span>
            </h2>
            <p className="text-xl md:text-2xl text-white">
              {t('howItWorks.sectionSubtitle')}
            </p>
          </div>

          <StepsShowcase />
        </div>
      </section>
    </>
  )
}
