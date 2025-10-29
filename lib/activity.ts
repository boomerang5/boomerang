// helpers/activity.ts
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export async function pingDailyActivity(supabase: any, idUsuario: number) {
  // Evita registrar más de una vez por día en este dispositivo
  const key = `boomerang-activity-${idUsuario}-${new Date().toDateString()}`;
  if (typeof window !== "undefined" && localStorage.getItem(key)) return;

  await supabase.rpc("log_user_activity", {
    p_user_id: idUsuario,
    p_tipo: "login", // o "app_open"
  });

  if (typeof window !== "undefined") localStorage.setItem(key, "1");
}
