import supabase from "../../lib/supabase";

async function deleteChat(idEmisor: number, idChat: number) {
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

//Prueba
const idEmisor = 1;
const idChat = 2;

deleteChat(idEmisor, idChat);
