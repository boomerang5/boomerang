import supabase from "../../lib/supabase";

async function getStateUser(idUsuario: number) {
  const { data, error } = await supabase
    .rpc("get_state_user", { p_id_usuario: Number(idUsuario) })

  if (error) {
    console.error("❌ Error al ejecutar la función:", error);
    process.exit(1);
  }

  if (!data) {
    console.log("ℹ️ No se encontró estado para ese usuario.");
  } else {
    console.log("✅ Estado obtenido correctamente. Resultado:", data);
  }
}

// Prueba
const idUsuario = 3;
getStateUser(idUsuario);

