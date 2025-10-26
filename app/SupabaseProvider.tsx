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
  // NOTE: previously this component attempted to clear Supabase cookies on
  // initialization. That caused valid session cookies to be removed and
  // produced unexpected redirects to /sign-in. We no longer clear cookies
  // here. If you need to clear corrupt cookies during development, do it
  // manually or add a dev-only guarded method.

  return <SessionContextProvider supabaseClient={supabase}>{children}</SessionContextProvider>;
}
