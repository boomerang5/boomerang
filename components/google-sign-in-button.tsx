'use client'

import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export function GoogleSignInButton() {
  const supabase = createClient()
  const router = useRouter()

  const handleLoginWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    })

    if (error) {
      console.error('Error al iniciar sesión con Google:', error.message)
    }
  }

  return (
    <button
      onClick={handleLoginWithGoogle}
      className="mt-4 w-full flex items-center justify-center gap-2 border border-gray-300 rounded px-4 py-2 hover:bg-gray-100 transition"
    >
      <img
        src="https://www.svgrepo.com/show/475656/google-color.svg"
        alt="Google logo"
        className="w-5 h-5"
      />
      <span className="text-sm text-gray-700 font-medium">Continuar con Google</span>
    </button>
  )
}
