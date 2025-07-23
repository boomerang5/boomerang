"use client";

import { useEffect, useState } from "react";
import { replace as featherReplace } from 'feather-icons';
import styles from "@/styles/home.module.css";

export default function HomePage() {
  const [estado, setEstado] = useState("available");

  useEffect(() => {
  featherReplace();
}, []);


  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <div className={styles.navIcons}>
          <i data-feather="home" className={styles.active}></i>
          <i data-feather="activity"></i>
          <i data-feather="message-circle"></i>
          <i data-feather="video"></i>
          <i data-feather="calendar"></i>
        </div>
        <div className={styles.bottomIcons}>
          <i data-feather="help-circle"></i>
          <i data-feather="settings"></i>
        </div>
      </aside>

      <main className={styles.mainContainer}>
        <header className={styles.headerHome}>
          <div className={styles.greetingStatus}>
            <h1 className={styles.greeting}>¡Bienvenido, Usuario!</h1>
            <select
              id="estadoUsuario"
              aria-label="Estado del usuario"
              className={styles[`status-${estado}`]}
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
            >
              <option value="available">Disponible</option>
              <option value="busy">Ocupado</option>
              <option value="away">Ausente</option>
            </select>
          </div>

          <div className={styles.searchBar}>
            <input type="text" placeholder="Buscar contactos, reuniones..." aria-label="Buscar" />
            <i data-feather="search"></i>
          </div>
        </header>

        <section className={styles.dashboard}>
          <div className={styles.card}>
            <h2>Iniciar reunión</h2>
            <p>Crea una sala e invita a otros.</p>
            <button>Crear reunión</button>
          </div>

          <div className={styles.card}>
            <h2>Unirse con código</h2>
            <input type="text" placeholder="Código de reunión" aria-label="Código de reunión" />
            <button>Unirse</button>
          </div>

          <div className={styles.card}>
            <h2>Contactos</h2>
            <input type="search" placeholder="Buscar contacto" aria-label="Buscar contacto" />
            <ul>
              <li>Juan Pérez</li>
              <li>María Gómez</li>
            </ul>
            <button>Agregar contacto</button>
          </div>

          <div className={styles.card}>
            <h2>Reuniones programadas</h2>
            <ul>
              <li>🗕️ 5 julio - Reunión equipo 10:00</li>
              <li>🗕️ 6 julio - Cliente Z 15:30</li>
            </ul>
            <button>Ver calendario</button>
          </div>

          <div className={styles.card}>
            <h2>Perfil</h2>
            <p>Nombre: Usuario Ejemplo</p>
            <p>Correo: usuario@ejemplo.com</p>
            <button>Editar perfil</button>
          </div>

          <div className={styles.card}>
            <h2>Chat reciente</h2>
            <div className={styles.chatBox}>
              <p>
                <strong>Juan:</strong> ¿Nos conectamos ahora?
              </p>
              <p>
                <strong>Vos:</strong> Dame 5 minutos 🙌
              </p>
            </div>
            <button>Ir al chat</button>
          </div>
        </section>
      </main>
    </div>
  );
}
