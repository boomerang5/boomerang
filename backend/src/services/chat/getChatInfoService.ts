import supabase from "../../lib/supabase";

export async function getChatInfoService(idChat: number) {
  const { data, error } = await supabase.rpc("get_chat_info", {
    p_id_chat: idChat,
  });

  if (error) {
    throw error;
  }
  
  if (Array.isArray(data)) return data;        
  if (data == null) return [];                
  return [data]; 
}
