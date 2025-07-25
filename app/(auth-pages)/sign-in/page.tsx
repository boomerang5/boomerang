import { signInAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import Link from "next/link";

export default async function Login(props: { searchParams: Promise<Message> }) {
  const searchParams = await props.searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-100 via-white to-orange-50 px-4">
      <div className="w-full max-w-2xl mx-auto py-16">
        <form className="bg-white/70 backdrop-blur-xl rounded-2xl p-12 shadow-2xl border border-orange-200">
          <h1 className="text-4xl font-bold text-orange-600 mb-4 text-center">
            Iniciar sesión
          </h1>
          <p className="text-base text-muted-foreground mb-8 text-center">
            ¿Aún no tienes cuenta?{" "}
            <Link
              className="text-orange-600 font-medium underline"
              href="/sign-up"
            >
              Registrate
            </Link>
          </p>

          <div className="flex flex-col gap-6 text-base">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                name="email"
                placeholder="you@example.com"
                required
                className="mt-2 text-base py-2.5"
              />
            </div>

            <div>
              <div className="flex justify-between items-center">
                <Label htmlFor="password">Contraseña</Label>
                <Link
                  className="text-sm text-orange-600 underline"
                  href="/forgot-password"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <Input
                type="password"
                name="password"
                placeholder="Tu contraseña"
                required
                className="mt-2 text-base py-2.5"
              />
            </div>

            <SubmitButton
              pendingText="Ingresando..."
              formAction={signInAction}
              className="bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold px-4 py-3 rounded-full mt-2 hover:from-orange-600 hover:to-orange-700 transition text-base"
            >
              Iniciar Sesión
            </SubmitButton>

            <FormMessage message={searchParams} />

            <div className="mt-6">
              <GoogleSignInButton />
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
