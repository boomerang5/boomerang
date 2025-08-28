import supabase from "../../lib/supabase";

export async function getUserChatsService(idUsuario: number) {
  const { data, error } = await supabase.rpc("get_user_chats", {
    p_id_usuario: idUsuario,
  });

  if (error) {
    console.error("❌ Error al ejecutar la función:", error);
    process.exit(1);
  }

  if (Array.isArray(data)) return data;        
  if (data == null) return [];                
  return [data]; 
}