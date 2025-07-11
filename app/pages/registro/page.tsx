'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import styles from '../../styles/login.module.css'; 

export default function RegistrarsePage() {
  useEffect(() => {
    const hamburger = document.getElementById('hamburger');
    const navList = document.getElementById('navList');

    const toggleMenu = () => {
      navList?.classList.toggle('active');
    };

    hamburger?.addEventListener('click', toggleMenu);
    return () => {
      hamburger?.removeEventListener('click', toggleMenu);
    };
  }, []);

  return (
    <>
      <header className={styles.header}>
        <div className={`container ${styles.navContainer}`}>
          <div className={styles.logo}>Boomerang</div>
          <nav className={styles.nav}>
            <ul className={styles.navList} id="navList">
              <li>
                <Link href="/">Inicio</Link>
              </li>
              <li>
                <Link href="/login" className={styles.btnPrimary}>Login</Link>
              </li>
            </ul>
            <div className={styles.hamburger} id="hamburger">
              &#9776;
            </div>
          </nav>
        </div>
      </header>

      <main className={`container ${styles.formContainer}`}>
        <h2>Registrarse</h2>
        <form>
          <label htmlFor="name">Nombre completo</label>
          <input type="text" id="name" placeholder="Tu nombre" required />

          <label htmlFor="email">Correo electrónico</label>
          <input type="email" id="email" placeholder="correo@ejemplo.com" required />

          <label htmlFor="password">Contraseña</label>
          <input type="password" id="password" placeholder="********" required />

          <button type="submit" className={styles.btnPrimary}>Crear cuenta</button>
        </form>
        <p className={styles.footerLink}>
          ¿Ya tienes cuenta?{' '}
          <Link href="/login">Inicia sesión aquí</Link>
        </p>
      </main>
    </>
  );
}
