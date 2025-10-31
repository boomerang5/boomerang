import { signUpAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { GoogleSignInButton } from "@/components/google-sign-in-button";

export default async function Signup(props: {
  searchParams: Promise<Message>;
}) {
  const searchParams = await props.searchParams;

  if ("message" in searchParams) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-orange-200/50 max-w-md w-full text-center">
          <FormMessage message={searchParams} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md mx-auto py-8">
        <form className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-orange-200/50">
          <h1 className="text-4xl font-extrabold mb-3 text-center">
            <span className="bg-gradient-to-r from-orange-700 via-orange-600 to-orange-500 bg-clip-text text-transparent">
              Registrate
            </span>
          </h1>
          <p className="text-sm text-gray-700 mb-6 text-center">
            Ya tienes una cuenta?{" "}
            <Link className="text-orange-600 font-medium underline hover:text-orange-700 transition-colors" href="/sign-in">
              Iniciar sesión
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
              <Label htmlFor="password" className="text-gray-900 font-medium">Contraseña</Label>
              <Input
                type="password"
                name="password"
                placeholder="Tu contraseña"
                minLength={6}
                required
                className="mt-1.5 text-sm py-2.5 bg-white border-gray-300 focus:border-orange-500 focus:ring-orange-500"
              />
            </div>

            <SubmitButton
              formAction={signUpAction}
              pendingText="Registrando..."
              className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white font-bold px-4 py-3 rounded-full mt-2 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all text-sm"
            >
              Registrate
            </SubmitButton>

            <FormMessage message={searchParams} />

            <div className="mt-4">
              <GoogleSignInButton />
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
