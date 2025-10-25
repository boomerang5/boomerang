"use client";

import { useState, useEffect } from "react";
import { SessionContextProvider } from "@supabase/auth-helpers-react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [supabase] = useState(() => {
    try {
      return createClientComponentClient();
    } catch (error) {
      console.warn('Error creating Supabase client:', error);
      // Retornar un cliente básico si hay problemas
      return createClientComponentClient();
    }
  });

  // Limpiar cookies corruptas al inicializar
  useEffect(() => {
    try {
      // Intentar limpiar cookies de Supabase que puedan estar corruptas
      const cookies = document.cookie.split(';');
      cookies.forEach(cookie => {
        const [name] = cookie.trim().split('=');
        if (name.includes('supabase') || name.includes('sb-')) {
          // Limpiar cookies de Supabase que puedan estar corruptas
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        }
      });
    } catch (error) {
      console.warn('Error cleaning cookies:', error);
    }
  }, []);

  return <SessionContextProvider supabaseClient={supabase}>{children}</SessionContextProvider>;
}
