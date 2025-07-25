import { forgotPasswordAction } from "@/app/actions"
import { FormMessage, Message } from "@/components/form-message"
import { SubmitButton } from "@/components/submit-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { SmtpMessage } from "../smtp-message"

export default async function ForgotPassword(props: {
  searchParams: Promise<Message>
}) {
  const searchParams = await props.searchParams

  return (
    <div className="flex min-h-screen items-center justify-center bg-orange-50 dark:bg-[#0d0d0d] px-4">
      <div className="w-full max-w-md bg-white/30 dark:bg-white/10 backdrop-blur-md rounded-xl p-6 shadow-lg border border-white/20 flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-orange-500">Reiniciá tu contraseña</h1>
          <p className="text-sm text-muted-foreground">
            ¿Ya tenés una cuenta?{" "}
            <Link href="/sign-in" className="text-orange-600 underline">
              Iniciar sesión
            </Link>
          </p>
        </div>

        <form className="flex flex-col gap-4" action={forgotPasswordAction}>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input name="email" placeholder="you@example.com" required className="mt-1" />
          </div>

          <SubmitButton>Reiniciar contraseña</SubmitButton>
          <FormMessage message={searchParams} />
        </form>

        <SmtpMessage />
      </div>
    </div>
  )
}
