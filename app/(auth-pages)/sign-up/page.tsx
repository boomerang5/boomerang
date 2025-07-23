import { signUpStep1Action } from "@/app/actions";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { SmtpMessage } from "../smtp-message";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import styles from "@/app/styles/login.module.css";

export default async function Signup(props: {
  searchParams: Promise<Message>;
}) {
  const searchParams = await props.searchParams;

  if ("message" in searchParams) {
    return (
      <div className="w-full flex-1 flex items-center h-screen sm:max-w-md justify-center gap-2 p-4">
        <FormMessage message={searchParams} />
      </div>
    );
  }

  return (
    <div className={styles.loginContainer}>
      <div className={styles.card}>
        <form className={styles.loginForm}>
          <h1 className={styles.title}>Regístrate</h1>
          <p className={styles.subtitle}>
            ¿Ya tienes una cuenta?{" "}
            <Link href="/sign-in" className={styles.link}>
              Iniciar Sesión
            </Link>
          </p>

          <div className={styles.inputGroup}>
            <Label htmlFor="email">Email</Label>
            <Input
              name="email"
              placeholder="you@example.com"
              required
              className={styles.input}
            />
          </div>

          <div className={styles.inputGroup}>
            <Label htmlFor="password">Contraseña</Label>
            <Input
              type="password"
              name="password"
              placeholder="Tu contraseña"
              minLength={6}
              required
              className={styles.input}
            />
          </div>

          <SubmitButton
            formAction={signUpStep1Action}
            pendingText="Registrando..."
            className={styles.button}
          >
            Registrate
          </SubmitButton>

          <FormMessage message={searchParams} />

          <div className={styles.divider}>o</div>

          <div className={styles.footer}>
            <GoogleSignInButton />
          </div>
        </form>

        <SmtpMessage />
      </div>
    </div>
  );
}
