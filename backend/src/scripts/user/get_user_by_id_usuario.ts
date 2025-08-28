import supabase from "../../lib/supabase";

async function getUserByIdUsuario(p_id_usuario: number) {
  console.log("🧪 Ejecutando RPC `get_user_by_id_usuario` con parámetro:", p_id_usuario);

  const { data, error } = await supabase.rpc("get_user_by_id_usuario", {
    p_id_usuario,
  });

  if (error) {
    console.error("❌ Error al ejecutar la función:", error);
    process.exit(1);
  }
  console.log("✅ Consulta realizada con éxito. Resultado:", data)
}

// Prueba
const idUsuario = 21; 

getUserByIdUsuario(idUsuario);
