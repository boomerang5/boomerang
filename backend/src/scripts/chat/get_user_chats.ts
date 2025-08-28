import supabase from "../../lib/supabase";

async function getUserChats(idUsuario: number) {
  const { data, error } = await supabase.rpc("get_user_chats", {
    p_id_usuario: idUsuario,
  });

  if (error) {
    console.error("❌ Error al ejecutar la función:", error);
    process.exit(1);
  }

  console.log("✅ Chats del usuario encontrado correctamente. Resultado:", data);
}

//Prueba
const idUsuario = 3;

getUserChats(idUsuario);