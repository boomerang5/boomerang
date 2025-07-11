'use client';

import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { hasEnvVars } from '@/utils/supabase/check-env-vars';
import ConnectSupabaseSteps from '@/components/tutorial/connect-supabase-steps';
import { useEffect, useState } from 'react';


export default function LoginPage() {
  const supabase = createClientComponentClient();
  const [mounted, setMounted] = useState(false);

  // Evita errores de hidratación
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-8">
      {hasEnvVars ? (
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-bold mb-6 text-center">Iniciar sesión</h1>
          <Auth
            supabaseClient={supabase}
            appearance={{ theme: ThemeSupa }}
            providers={['google']} // o 'github', etc.
          />
        </div>
      ) : (
        <ConnectSupabaseSteps />
      )}
    </main>
  );
}
