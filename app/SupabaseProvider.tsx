"use client";

import { useState } from "react";
import { SessionContextProvider } from "@supabase/auth-helpers-react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function SupabaseProvider({ children }: { children: React.ReactNode }) {
  // sin options: helpers ya manejan persist/refresh de sesión
  const [supabase] = useState(() => createClientComponentClient());
  return <SessionContextProvider supabaseClient={supabase}>{children}</SessionContextProvider>;
}
