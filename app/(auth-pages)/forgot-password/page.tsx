import { forgotPasswordAction } from "@/app/actions"
import { FormMessage, Message } from "@/components/form-message"
import { SubmitButton } from "@/components/submit-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"

export default async function ForgotPassword(props: {
  searchParams: Promise<Message>
}) {
  const searchParams = await props.searchParams

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-xl mx-auto py-12">
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-12 shadow-2xl border border-orange-200/50">
          {/* Icono decorativo */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center shadow-lg">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
          </div>

          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 text-center">
            <span className="bg-gradient-to-r from-orange-700 via-orange-600 to-orange-500 bg-clip-text text-transparent">
              Restablece tu contraseña
            </span>
          </h1>
          <p className="text-base text-gray-700 mb-8 text-center max-w-md mx-auto">
            Ingresá tu email y te enviaremos un link para restablecer tu contraseña
          </p>

          <form className="flex flex-col gap-6" action={forgotPasswordAction}>
            <div>
              <Label htmlFor="email" className="text-gray-900 font-medium text-base">Email</Label>
              <Input 
                name="email" 
                placeholder="you@example.com" 
                required 
                className="mt-2 text-base py-3 bg-white border-gray-300 focus:border-orange-500 focus:ring-orange-500" 
              />
              <div className="mt-2">
                <FormMessage message={searchParams} />
              </div>
            </div>

            <SubmitButton className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white font-bold px-6 py-4 rounded-full mt-2 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all text-base">
              Enviar link de recuperación
            </SubmitButton>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-600">
              ¿Ya tenés una cuenta?{" "}
              <Link href="/sign-in" className="text-orange-600 font-semibold underline hover:text-orange-700 transition-colors">
                Iniciar sesión
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
