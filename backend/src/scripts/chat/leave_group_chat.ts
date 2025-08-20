import supabase from "../../lib/supabase";

async function leaveGroupChat(idChat: number, idUsuario: number) {
  const { data, error } = await supabase.rpc("leave_group_chat", {
    p_id_chat: idChat,
    p_id_emisor: idUsuario
  });

  if (error) {
    console.error("❌ Error al ejecutar la función:", error);
    process.exit(1);
  }

  console.log("✅ Usuario salió del chat grupal correctamente. Resultado:", data);
}

//Prueba
const idChat = 2;
const idUsuario = 2;

leaveGroupChat(idChat, idUsuario);