import { resetPasswordAction } from "@/app/actions"
import { FormMessage, Message } from "@/components/form-message"
import { SubmitButton } from "@/components/submit-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default async function ResetPassword(props: {
  searchParams: Promise<Message>
}) {
  const searchParams = await props.searchParams

  return (
    <div className="flex min-h-screen items-center justify-center bg-orange-50 dark:bg-[#0d0d0d] px-4">
      <form className="w-full max-w-md bg-white/30 dark:bg-white/10 backdrop-blur-md rounded-xl p-6 shadow-lg border border-white/20 flex flex-col gap-4">
        <h1 className="text-2xl font-semibold text-orange-500">Resetear contraseña</h1>
        <p className="text-sm text-muted-foreground">
          Por favor ingresá tu nueva contraseña abajo.
        </p>

        <div>
          <Label htmlFor="password">Nueva contraseña</Label>
          <Input
            type="password"
            name="password"
            placeholder="Nueva contraseña"
            required
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
          <Input
            type="password"
            name="confirmPassword"
            placeholder="Confirmar contraseña"
            required
            className="mt-1"
          />
        </div>

        <SubmitButton formAction={resetPasswordAction}>
          Resetear contraseña
        </SubmitButton>

        <FormMessage message={searchParams} />
      </form>
    </div>
  )
}
