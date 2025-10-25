"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Flame, Trophy } from "lucide-react";

type StreakRow = {
  current_streak: number;
  longest_streak: number;
  last_active_at: string | null;
};

function StreakSkeleton() {
  return (
    <div className="w-full h-full rounded-2xl p-4 bg-[var(--surface)] border border-[#ffffff1a] backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-[#f16f24]" />
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

export default function StreakCard() {
  const supabase = createClientComponentClient<any>();
  const [data, setData] = useState<StreakRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Función para obtener y actualizar la racha
  const fetchStreak = async (uid: string) => {
    try {
      const { data: userData, error: userError } = await supabase
        .from('Usuario')
        .select('id')
        .eq('User_id', uid)
        .single();

      if (userError || !userData?.id) {
        console.warn('User not found, using fallback data:', userError);
        // Fallback a datos por defecto si no se encuentra el usuario
        const fallbackData: StreakRow = {
          current_streak: 0,
          longest_streak: 0,
          last_active_at: null,
        };
        setData(fallbackData);
        setLoading(false);
        return;
      }

      // Intentar usar la función RPC real
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        "get_user_streak",
        { p_user_id: userData.id }
      );

      if (rpcError) {
        console.warn('RPC function not found, using fallback data:', rpcError);
        // Fallback a datos por defecto si la función RPC no existe
        const fallbackData: StreakRow = {
          current_streak: 0,
          longest_streak: 0,
          last_active_at: null,
        };
        setData(fallbackData);
      } else {
        const row = (rpcData?.[0] as StreakRow | undefined) ?? {
          current_streak: 0,
          longest_streak: 0,
          last_active_at: null,
        };
        setData(row);
      }
      setLoading(false);
    } catch (error: any) {
      console.warn('Error fetching streak (non-critical):', error);
      // No mostrar error al usuario, usar datos por defecto
      setData({
        current_streak: 0,
        longest_streak: 0,
        last_active_at: null,
      });
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    const getSession = async () => {
      try {
        if (!isMounted) return;
        
        // Esperar un poco para que la sesión se inicialice completamente
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (!isMounted) return;
        setLoading(true);
        setErr(null);
        
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.warn('Session error (non-critical):', sessionError);
          // No lanzar error, solo mostrar datos por defecto
          setData({
            current_streak: 0,
            longest_streak: 0,
            last_active_at: null,
          });
          setLoading(false);
          return;
        }
        
        if (!session?.user?.id) {
          // No hay sesión activa, mostrar datos por defecto
          setData({
            current_streak: 0,
            longest_streak: 0,
            last_active_at: null,
          });
          setLoading(false);
          return;
        }
        
        if (!isMounted) return;
        await fetchStreak(session.user.id);
      } catch (error: any) {
        if (!isMounted) return;
        console.warn('Session error (non-critical):', error);
        // No mostrar error al usuario, usar datos por defecto
        setData({
          current_streak: 0,
          longest_streak: 0,
          last_active_at: null,
        });
        setLoading(false);
      }
    };

    // Intentar obtener datos con un pequeño delay
    timeoutId = setTimeout(() => {
      if (isMounted) {
        getSession();
      }
    }, 200);

    // También escuchar cambios de sesión
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return;
      
      try {
        if (!session?.user?.id) {
          setData({
            current_streak: 0,
            longest_streak: 0,
            last_active_at: null,
          });
          setLoading(false);
          return;
        }
        
        await fetchStreak(session.user.id);
      } catch (error: any) {
        if (!isMounted) return;
        console.warn('Auth change error (non-critical):', error);
        setData({
          current_streak: 0,
          longest_streak: 0,
          last_active_at: null,
        });
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      subscription?.unsubscribe();
    };
  }, []); // Removemos supabase de las dependencias para evitar re-renders infinitos

  const current = data?.current_streak ?? 0;
  const longest = data?.longest_streak ?? 0;
  const lastActive = data?.last_active_at ? new Date(data.last_active_at) : null;

  if (loading || err) {
    return <StreakSkeleton />;
  }

  const isActive = (() => {
    if (!lastActive) return false;
    const now = new Date();
    const diffDays = (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays < 2; // últimas 48 hs
  })();

  // === Opción A: progreso para batir tu récord ===
  const target = (longest || 0) + 1;
  const pct = longest > 0
    ? Math.min(100, Math.round((current / target) * 100))
    : Math.min(100, Math.round((current / 1) * 100)); // sin récord aún

  const progressLabel =
    longest > 0
      ? `Progreso para batir tu récord (objetivo: ${target} días)`
      : "Progreso hacia tu primera racha";

  const remaining = current >= target ? 0 : Math.max(0, target - current);

  return (
    <div
      className="
        w-full h-full flex flex-col rounded-2xl p-4
        bg-[var(--surface)]
        shadow-[0_2px_10px_rgba(0,0,0,0.08)]
        border border-[#ffffff1a]
        backdrop-blur-sm overflow-hidden transition-colors
      "
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-[#f16f24]" />
          <h3 className="text-lg font-semibold text-[#f16f24]">Tu racha</h3>
        </div>
        {!loading && !err && data && isActive && (
          <span className="text-xs font-semibold text-orange-500 bg-orange-500/10 border border-orange-500/20 rounded-full px-3 py-1">
            🔥 Activa
          </span>
        )}
      </div>

      {err ? (
        <div className="text-sm text-red-600 dark:text-red-400">{err}</div>
      ) : (
        <>
         <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl p-2 bg-orange-500/10 border border-orange-500/20 flex flex-col justify-center">
            <div className="text-xs opacity-70">Racha actual</div>
            <div className="text-xl font-bold mt-1 leading-tight">{current} días</div>
          </div>

          <div className="rounded-xl p-2 bg-amber-500/10 border border-amber-500/20 flex flex-col justify-center">
            <div className="text-xs opacity-70 flex items-center gap-1">
              <Trophy className="h-3.5 w-3.5" /> Máxima racha
            </div>
            <div className="text-xl font-bold mt-1 leading-tight">{longest} días</div>
          </div>
        </div>


          {/* --- Progreso hacia batir récord --- */}
          <div className="mt-auto pt-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span>{progressLabel}</span>
              <span className="tabular-nums">{`${pct}%`}</span>
            </div>

            <div className="h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-orange-500 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>

            <div className="mt-2 text-xs text-gray-500">
              {current > longest ? (
                <span>¡Nuevo récord! 🎉</span>
              ) : longest === 0 ? (
                <span>Sumá días para establecer tu primer récord.</span>
              ) : remaining === 0 ? (
                <span>¡Estás a la par de tu récord, un día más y lo superás! 🔥</span>
              ) : (
                <span>
                  Te faltan <b>{remaining}</b> {remaining === 1 ? "día" : "días"} para batir tu récord.
                </span>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
