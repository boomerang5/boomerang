'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession } from '@supabase/auth-helpers-react'
import styles from './styles/landing.module.css'

export default function Home() {
  const session = useSession()
  const router = useRouter()

  // Redirigir a /dashboard si el usuario ya está autenticado
  useEffect(() => {
    if (session) {
      router.push('/dashboard')
    }
  }, [session])

  // Navbar hamburguesa
  useEffect(() => {
    const hamburger = document.getElementById('hamburger')
    const navList = document.getElementById('navList')

    const toggleMenu = () => {
      navList?.classList.toggle(styles.active)
    }

    hamburger?.addEventListener('click', toggleMenu)

    return () => {
      hamburger?.removeEventListener('click', toggleMenu)
    }
  }, [])

  return (
    <>
      <header className={styles.header}>
        <div className={`${styles.container} ${styles.navContainer}`}>
          <div className={styles.logo}>Boomerang</div>
          <nav>
            <ul className={styles.navList} id="navList">
              <li><a href="#features">Funciones</a></li>
              <li><Link href="/sign-in">Login</Link></li>
              <li>
                <Link href="/sign-up" className={styles.btnPrimary}>
                  Registrate
                </Link>
              </li>
            </ul>
            <div className={styles.hamburger} id="hamburger">&#9776;</div>
          </nav>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={`${styles.container} ${styles.heroContent}`}>
          <div className={styles.heroText}>
            <h1>
              Conectá el mundo<br />
              <span className={styles.gradientText}>en tiempo real.</span>
            </h1>
            <p>Videollamadas con traducción automática, sin fronteras ni barreras.</p>
            <div className={styles.ctaButtons}>
              <a href="#" className={styles.btnPrimary}>Iniciar llamada</a>
              <a href="#" className={styles.btnSecondary}>Unirse</a>
            </div>
          </div>
          <div className={styles.heroImg}>
            <img src="/img/videollamada.png" alt="Videollamada" />
          </div>
        </div>
      </section>

      <section className={styles.features} id="features">
        <div className={styles.container}>
          <h2>Lo que hace única a Boomerang</h2>
          <div className={styles.featureCards}>
            <div className={styles.card}>
              <h3>🎤 Traducción en vivo</h3>
              <p>Rompé las barreras del idioma con voz en tiempo real.</p>
            </div>
            <div className={styles.card}>
              <h3>💻 Sin instalaciones</h3>
              <p>Accedé desde cualquier dispositivo, sin descargas.</p>
            </div>
            <div className={styles.card}>
              <h3>🔒 Seguridad total</h3>
              <p>Cifrado extremo a extremo que protege tus conversaciones.</p>
            </div>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.container}>
          <p>&copy; 2025 Boomerang. Todos los derechos reservados.</p>
        </div>
      </footer>
    </>
  )
}
