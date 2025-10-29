import supabase from "../../lib/supabase";

export async function leaveGroupChatService(idUsuario: number, idChat: number) {
  const { data, error } = await supabase.rpc("leave_group_chat", {
    p_id_emisor: idUsuario,
    p_id_chat: idChat,
  });

  if (error) {
    throw error instanceof Error ? error : new Error((error as any)?.message ?? String(error));
  }
  return data
}