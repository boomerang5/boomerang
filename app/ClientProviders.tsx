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
            position="top-center"
            richColors
            closeButton={false}
            offset="50vh" 
            toastOptions={{
              duration: 3500,
              style: {
                background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                border: '1px solid #86efac',
                borderRadius: '12px',
                padding: '8px 20px',
                fontSize: '14px',
                fontWeight: '500',
                boxShadow: '0 10px 25px -5px rgba(34, 197, 94, 0.2), 0 8px 10px -6px rgba(34, 197, 94, 0.1)',
                backdropFilter: 'blur(10px)',
                minWidth: '400px',
                maxWidth: '600px',
                whiteSpace: 'nowrap',
              },
              className: 'toast-modern',
            }}         
          />
      </ThemeProvider>
    </SessionContextProvider>
  )
}