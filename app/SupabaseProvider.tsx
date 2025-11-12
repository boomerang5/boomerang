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

  // No limpiar cookies - dejar que funcione como antes
  // Las advertencias de cookies son solo warnings, no afectan funcionalidad

  return <SessionContextProvider supabaseClient={supabase}>{children}</SessionContextProvider>;
}
