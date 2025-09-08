// src/services/llamada/getUserCallHistoryService.ts
import supabase from "../../lib/supabase";

export async function getUserCallHistoryService(idUsuario: number) {
  const { data, error } = await supabase.rpc("get_user_call_history", {
    p_id_usuario: idUsuario,
  });

  if (error) {
    console.error("❌ Error al ejecutar get_user_call_history:", error);
    throw new Error(error.message);
  }

  return data; // puede ser []
}
