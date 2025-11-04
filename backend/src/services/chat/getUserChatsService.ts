import supabase from "../../lib/supabase";

export async function getUserChatsService(idUsuario: number) {
  const { data, error } = await supabase.rpc("get_user_chats", {
    p_id_usuario: idUsuario,
  });

  if (error) {
    throw error instanceof Error ? error : new Error((error as any)?.message ?? String(error));
  }

  if (Array.isArray(data)) return data;        
  if (data == null) return [];                
  return [data]; 
}