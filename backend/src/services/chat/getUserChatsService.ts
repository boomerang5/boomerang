import supabase from "../../lib/supabase";

export async function getUserChatsService(idUsuario: number) {
  // Intentar usar la función mejorada primero, fallback a la original
  let { data, error } = await supabase.rpc("get_user_chats_fixed", {
    user_id_param: idUsuario,
  });

  // Si la función mejorada no existe, usar la original
  if (error && error.message && error.message.includes("does not exist")) {
    const fallback = await supabase.rpc("get_user_chats", {
      p_id_usuario: idUsuario,
    });
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    throw error instanceof Error
      ? error
      : new Error((error as any)?.message ?? String(error));
  }

  if (Array.isArray(data)) return data;
  if (data == null) return [];
  return [data];
}
