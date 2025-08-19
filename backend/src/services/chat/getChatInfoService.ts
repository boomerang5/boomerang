import supabase from "../../lib/supabase";

export async function getChatInfoService(idChat: number) {
  const { data, error } = await supabase.rpc("get_chat_info", {
    p_id_chat: idChat,
  });

  if (error) {
    console.error("❌ Error al ejecutar la función:", error);
    throw error;
  }
  
  console.log("✅ Info de Chat encontrado correctamente. Resultado:", data);
  if (Array.isArray(data)) return data;        
  if (data == null) return [];                
  return [data]; 
}
