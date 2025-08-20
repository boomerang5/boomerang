import { signUpAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { SmtpMessage } from "../smtp-message";
import { GoogleSignInButton } from "@/components/google-sign-in-button";

export default async function Signup(props: {
  searchParams: Promise<Message>;
}) {
  const searchParams = await props.searchParams;

  if ("message" in searchParams) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="bg-white/60 backdrop-blur-xl rounded-xl p-6 shadow-xl border border-orange-200 max-w-md w-full text-center">
          <FormMessage message={searchParams} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-100 via-white to-orange-50 px-4 py-16">
      <form className="w-full max-w-md bg-white/50 backdrop-blur-xl rounded-2xl p-10 shadow-2xl border border-orange-100">
        <h1 className="text-3xl font-bold text-orange-600 mb-2">Registrate</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Ya tienes una cuenta?{" "}
          <Link className="text-orange-600 font-medium underline" href="/sign-in">
            Iniciar sesión
          </Link>
        </p>

        <div className="flex flex-col gap-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              name="email"
              placeholder="you@example.com"
              required
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="password">Contraseña</Label>
            <Input
              type="password"
              name="password"
              placeholder="Tu contraseña"
              minLength={6}
              required
              className="mt-1"
            />
          </div>

          <SubmitButton
            formAction={signUpAction}
            pendingText="Registrando..."
            className="bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold px-4 py-2 rounded-full hover:from-orange-600 hover:to-orange-700"
          >
            Registrate
          </SubmitButton>

          <FormMessage message={searchParams} />

          <div className="mt-4">
            <GoogleSignInButton />
          </div>
        </div>

        <div className="mt-6 text-xs text-muted-foreground text-center">
          <SmtpMessage />
        </div>
      </form>
    </div>
  );
}
