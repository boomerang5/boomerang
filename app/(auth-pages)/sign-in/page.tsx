import { signInAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import styles from "@/app/styles/login.module.css";

export default async function Login(props: { searchParams: Promise<Message> }) {
  const searchParams = await props.searchParams;
  const supabase = createClientComponentClient();

  // Google login redirección
  async function handleGoogleLogin() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: "http://localhost:3000/auth/callback", // Asegurate que esto coincida
      },
    });
  }

  return (
    <div className={styles.loginContainer}>
      <form className={styles.loginForm}>
        <h1 className={styles.title}>Iniciar Sesión</h1>
        <p className={styles.subtitle}>
          Aún no tienes cuenta?{" "}
          <Link className={styles.link} href="/sign-up">
            Regístrate
          </Link>
        </p>
        <div className={styles.inputGroup}>
          <Label htmlFor="email">Email</Label>
          <Input name="email" placeholder="you@example.com" required className={styles.input} />
        </div>
        <div className={styles.inputGroup}>
          <div className={styles.labelRow}>
            <Label htmlFor="password">Contraseña</Label>
            <Link href="/forgot-password" className={styles.smallLink}>
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <Input
            type="password"
            name="password"
            placeholder="Tu contraseña"
            required
            className={styles.input}
          />
        </div>
        <SubmitButton
          pendingText="Ingresando..."
          formAction={signInAction}
          className={styles.button}
        >
          Iniciar Sesión
        </SubmitButton>

        <FormMessage message={searchParams} />
        <div className={styles.divider}>o</div>
        <button
          type="button"
          onClick={handleGoogleLogin}
          className={styles.googleButton}
        >
          Iniciar sesión con Google
        </button>
      </form>
    </div>
  );
}
