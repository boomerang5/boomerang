'use client';

import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { ThemeProvider } from 'next-themes';
import { createClient } from '@/utils/supabase/client';
import type { ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Toaster } from 'sonner'
//import { supabase } from '@/lib/supabaseClient' 

// ⚠️ tu util debe crear el cliente del BROWSER (usar NEXT_PUBLIC_*).
const supabase = createClient();

export default function ClientProviders({
  children,
  initialSession,
}: {
  children: ReactNode;
  initialSession?: Session | null;
}) {
  return (
    <SessionContextProvider
      supabaseClient={supabase}
      initialSession={initialSession ?? undefined}
    >
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        {children}
        {/* Toaster global (una sola vez) */}
          <Toaster
            // Lo ubicamos al centro vertical aprox.
            position="top-center"
            offset="50vh" 
            toastOptions={{duration: 3200}}         

          />
      </ThemeProvider>
    </SessionContextProvider>
  )
}