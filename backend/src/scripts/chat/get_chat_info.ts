import supabase from "../../lib/supabase";

async function getChatInfo(idChat: number) {
  const { data, error } = await supabase.rpc("get_chat_info", {
    p_id_chat: idChat,
  });

  if (error) {
    console.error("❌ Error al ejecutar la función:", error);
    process.exit(1);
  }

  console.log("✅ Info de Chat encontrado correctamente. Resultado:", data);
}

//Prueba
const idChat = 4;

getChatInfo(idChat);