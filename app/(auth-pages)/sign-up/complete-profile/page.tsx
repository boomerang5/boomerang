"use client";

import { completeProfileAction } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { useSearchParams } from "next/navigation";
import styles from "@/app/styles/login.module.css";

export default function CompleteProfilePage() {
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId");

  return (
    <div className={styles.container}>
      <form action={completeProfileAction} className={styles.card}>
        <h1 className={styles.title}>Completá tu perfil</h1>

        <input type="hidden" name="userId" value={userId || ""} />

        <div className={styles.inputGroup}>
          <label htmlFor="nombre">Nombre</label>
          <input
            name="nombre"
            placeholder="Ej: Paula"
            required
            className={styles.input}
          />
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="apellido">Apellido</label>
          <input
            name="apellido"
            placeholder="Ej: Arrascaeta"
            required
            className={styles.input}
          />
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="apodo">Apodo</label>
          <input
            name="apodo"
            placeholder="Ej: Peu"
            required
            className={styles.input}
          />
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="fecha_nacimiento">Fecha de nacimiento</label>
          <input
            type="date"
            name="fecha_nacimiento"
            required
            className={styles.input}
          />
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="sexo">Sexo</label>
          <select name="sexo" required className={styles.input}>
            <option value="">Seleccioná una opción</option>
            <option value="1">Masculino</option>
            <option value="2">Femenino</option>
            <option value="3">Otro</option>
          </select>
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="pais">País</label>
          <select name="pais" required className={styles.input}>
            <option value="">Seleccioná tu país</option>
            <option value="AR">Argentina</option>
            <option value="UY">Uruguay</option>
            <option value="CL">Chile</option>
            <option value="PE">Perú</option>
            <option value="CO">Colombia</option>
            <option value="MX">México</option>
            <option value="ES">España</option>
            <option value="US">Estados Unidos</option>
          </select>
        </div>

        <div className={styles.footer}>
          <SubmitButton pendingText="Guardando...">Finalizar registro</SubmitButton>
        </div>
      </form>
    </div>
  );
}
