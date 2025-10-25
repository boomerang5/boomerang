"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import StreakCard from "./StreakCard";

// Wrapper que maneja la inicialización de Supabase de manera más robusta
export default function StreakCardWrapper() {
  const [isReady, setIsReady] = useState(false);
  const [supabase, setSupabase] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    
    const initializeSupabase = async () => {
      try {
        // Esperar un poco para que el DOM esté listo
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (!mounted) return;
        
        const client = createClientComponentClient();
        setSupabase(client);
        setIsReady(true);
      } catch (error) {
        console.warn('Error initializing Supabase client:', error);
        if (mounted) {
          setIsReady(true); // Mostrar el componente de todas formas
        }
      }
    };

    initializeSupabase();

    return () => {
      mounted = false;
    };
  }, []);

  if (!isReady) {
    return <StreakCardSkeleton />;
  }

  return <StreakCard />;
}

// Skeleton de carga
function StreakCardSkeleton() {
  return (
    <div className="w-full h-full rounded-2xl p-4 bg-[var(--surface)] border border-[#ffffff1a] backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded bg-black/10 dark:bg-white/10 animate-pulse" />
          <div className="h-5 w-24 rounded bg-black/10 dark:bg-white/10 animate-pulse" />
        </div>
        <div className="h-6 w-16 rounded-full bg-black/10 dark:bg-white/10 animate-pulse" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl p-3 border border-orange-500/20 bg-orange-500/10">
          <div className="h-4 w-24 rounded bg-black/10 dark:bg-white/10 animate-pulse" />
          <div className="h-7 w-20 mt-2 rounded bg-black/10 dark:bg-white/10 animate-pulse" />
        </div>
        <div className="rounded-xl p-3 border border-amber-500/20 bg-amber-500/10">
          <div className="h-4 w-28 rounded bg-black/10 dark:bg-white/10 animate-pulse" />
          <div className="h-7 w-20 mt-2 rounded bg-black/10 dark:bg-white/10 animate-pulse" />
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <div className="h-4 w-48 rounded bg-black/10 dark:bg-white/10 animate-pulse" />
          <div className="h-4 w-8 rounded bg-black/10 dark:bg-white/10 animate-pulse" />
        </div>
        <div className="h-2 w-full rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
          <div className="h-full w-1/3 rounded-full bg-orange-500/60 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
