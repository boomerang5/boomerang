import supabase from "../../lib/supabase";

export async function deleteChatService(idEmisor: number, idChat: number) {
  const { data, error } = await supabase.rpc("delete_chat", {
    p_id_emisor: idEmisor,
    p_id_chat: idChat,
  });

  if (error) {
    // No terminar el proceso desde un servicio: propagar el error para que el caller lo maneje.
    const err = error instanceof Error ? error : new Error((error as any)?.message ?? String(error));
    throw err;
  }
  return data;
}