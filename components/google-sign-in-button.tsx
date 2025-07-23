'use client'

import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import styles from '@/app/styles/login.module.css' 

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
    <button onClick={handleLoginWithGoogle} className={styles.googleButton}>
      <img
        src="https://www.svgrepo.com/show/475656/google-color.svg"
        alt="Google logo"
        className={styles.googleLogo}
      />
      <span>Continuar con Google</span>
    </button>
  )
}
