import { signUpAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { LoginSlideshow } from "../sign-in/LoginSlideshow";

export default async function Signup(props: {
  searchParams: Promise<Message>;
}) {
  const searchParams = await props.searchParams;

  if ("message" in searchParams) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">
        {/* Elementos decorativos de fondo */}
        <div className="absolute top-10 left-10 w-72 h-72 bg-orange-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-red-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        
        <div className="bg-white/90 backdrop-blur-xl rounded-[2.5rem] p-8 shadow-2xl border-2 border-white/50 max-w-md w-full text-center relative z-10">
          <FormMessage message={searchParams} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Elementos decorativos de fondo */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-orange-400/20 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-red-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      
      <div className="w-full max-w-6xl mx-auto grid md:grid-cols-2 gap-8 items-center relative z-10">
        {/* Panel izquierdo - Visual con slideshow */}
        <LoginSlideshow />

        {/* Panel derecho - Formulario */}
        <div className="w-full max-w-md mx-auto animate-fade-in-right">
          <form className="bg-white/90 backdrop-blur-xl rounded-[2.5rem] p-10 shadow-2xl border-2 border-white/50">
            <h1 className="text-4xl font-extrabold mb-2 text-center">
              <span className="bg-gradient-to-r from-orange-600 via-orange-500 to-red-500 bg-clip-text text-transparent">
                Registrate
              </span>
            </h1>
            <p className="text-sm text-gray-600 mb-8 text-center">
              ¿Ya tienes una cuenta?{" "}
              <Link
                className="text-orange-600 font-bold hover:text-orange-700 transition-colors hover:underline"
                href="/sign-in"
              >
                Iniciar sesión
              </Link>
            </p>

            <div className="flex flex-col gap-5">
              <div>
                <Label htmlFor="email" className="text-gray-700 font-semibold text-sm">Email</Label>
                <Input
                  name="email"
                  placeholder="you@example.com"
                  required
                  className="mt-2 text-base py-3 px-4 bg-white/80 border-2 border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 rounded-xl transition-all"
                />
              </div>

              <div>
                <Label htmlFor="password" className="text-gray-700 font-semibold text-sm">Contraseña</Label>
                <Input
                  type="password"
                  name="password"
                  placeholder="Tu contraseña (mínimo 6 caracteres)"
                  minLength={6}
                  required
                  className="mt-2 text-base py-3 px-4 bg-white/80 border-2 border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 rounded-xl transition-all"
                />
              </div>

              <SubmitButton
                formAction={signUpAction}
                pendingText="Registrando..."
                className="group relative bg-gradient-to-r from-orange-600 to-red-500 hover:from-orange-700 hover:to-red-600 text-white font-bold px-6 py-4 rounded-xl mt-3 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all text-base overflow-hidden"
              >
                <span className="relative z-10">Registrate</span>
                <div className="absolute inset-0 bg-white/20 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"></div>
              </SubmitButton>

              <FormMessage message={searchParams} />

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white/90 text-gray-500 font-medium">O continúa con</span>
                </div>
              </div>

              <GoogleSignInButton />
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
