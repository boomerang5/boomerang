import supabase from "../../lib/supabase";

export async function deleteChatService(idEmisor: number, idChat: number) {
  const { data, error } = await supabase.rpc("delete_chat", {
    p_id_emisor: idEmisor,
    p_id_chat: idChat,
  });

  if (error) {
    console.error("❌ Error al ejecutar la función:", error);
    process.exit(1);
  }

  console.log("✅ Chat eliminado correctamente. Resultado:", data);
}