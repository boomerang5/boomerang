"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Flame, Trophy } from "lucide-react";

type StreakRow = {
  current_streak: number;
  longest_streak: number;
  last_active_at: string | null;
};

export default function StreakCard() {
  const supabase = createClientComponentClient();
  const [data, setData] = useState<StreakRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const { data: auth } = await supabase.auth.getUser();

        // Usa el id de user_metadata si lo tenés. Fallback temporal para demo:
        const userIdMeta = (auth.user?.user_metadata as any)?.id_usuario;
        const userId = Number.isFinite(Number(userIdMeta)) ? Number(userIdMeta) : undefined;
        const idParaRPC = userId ?? 2;

        const { data: rpcData, error } = await supabase.rpc("get_user_streak", {
          p_user_id: idParaRPC,
        });
        if (error) throw error;

        if (!cancelled) setData((rpcData?.[0] ?? null) as StreakRow | null);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? "Error cargando racha");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const current = data?.current_streak ?? 0;
  const longest = data?.longest_streak ?? 0;

  // Progreso hacia la mejor racha (cap 100)
  const pct = Math.min(100, Math.round((current / Math.max(1, longest || 7)) * 100));

  return (
    <div
      className="
        h-full
        flex flex-col justify-between
        rounded-2xl p-6
        bg-[var(--surface)]
        shadow-[0_2px_10px_rgba(0,0,0,0.08)]
        border border-[#ffffff1a]
        backdrop-blur-sm
        min-h-[180px]
        transition-colors
      "
    >
     <div className="flex items-center gap-2 mb-4">
        <Flame className="h-5 w-5 text-[#f16f24]" /> 
        <h3 className="text-lg font-semibold text-[#f16f24]">
          Tu racha
        </h3>
    </div>


      {err ? (
        <div className="text-sm text-red-600 dark:text-red-400">{err}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl p-4 bg-orange-500/10 border border-orange-500/20">
              <div className="text-sm opacity-70">Racha actual</div>
              <div className="text-3xl font-bold mt-1">
                {loading ? "—" : current} días
              </div>
            </div>

            <div className="rounded-xl p-4 bg-amber-500/10 border border-amber-500/20">
              <div className="text-sm opacity-70 flex items-center gap-1">
                <Trophy className="h-4 w-4" /> Máxima racha
              </div>
              <div className="text-3xl font-bold mt-1">
                {loading ? "—" : longest} días
              </div>
            </div>
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between text-sm mb-2">
              <span>Progreso hacia tu mejor racha</span>
              <span className="tabular-nums">{loading ? "—" : `${pct}%`}</span>
            </div>
            <div className="h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-orange-500 transition-all"
                style={{ width: loading ? "0%" : `${pct}%` }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
