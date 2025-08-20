import supabase from "../../lib/supabase";

export async function leaveGroupChatService(idUsuario: number, idChat: number) {
  const { data, error } = await supabase.rpc("leave_group_chat", {
    p_id_emisor: idUsuario,
    p_id_chat: idChat,
  });

  if (error) {
    console.error("❌ Error al ejecutar la función:", error);
    process.exit(1);
  }

  console.log("✅ Usuario salió del chat grupal correctamente. Resultado:", data);
}