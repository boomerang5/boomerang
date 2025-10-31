import { signInAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export default async function Login(props: { searchParams: Promise<Message> }) {
  
  //nuevo - si ya hay sesion, salimos de /signin
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {redirect('/protected');}
  
  const searchParams = await props.searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md mx-auto py-8">
        <form className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-orange-200/50">
          <h1 className="text-4xl font-extrabold mb-3 text-center">
            <span className="bg-gradient-to-r from-orange-700 via-orange-600 to-orange-500 bg-clip-text text-transparent">
              Iniciar sesión
            </span>
          </h1>
          <p className="text-sm text-gray-700 mb-6 text-center">
            ¿Aún no tienes cuenta?{" "}
            <Link
              className="text-orange-600 font-medium underline hover:text-orange-700 transition-colors"
              href="/sign-up"
            >
              Registrate
            </Link>
          </p>

          <div className="flex flex-col gap-4 text-sm">
            <div>
              <Label htmlFor="email" className="text-gray-900 font-medium">Email</Label>
              <Input
                name="email"
                placeholder="you@example.com"
                required
                className="mt-1.5 text-sm py-2.5 bg-white border-gray-300 focus:border-orange-500 focus:ring-orange-500"
              />
            </div>

            <div>
              <div className="flex justify-between items-center">
                <Label htmlFor="password" className="text-gray-900 font-medium">Contraseña</Label>
                <Link
                  className="text-xs text-orange-600 underline hover:text-orange-700 transition-colors"
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
                className="mt-1.5 text-sm py-2.5 bg-white border-gray-300 focus:border-orange-500 focus:ring-orange-500"
              />
            </div>

            <SubmitButton
              pendingText="Ingresando..."
              formAction={signInAction}
              className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white font-bold px-4 py-3 rounded-full mt-2 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all text-sm"
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
