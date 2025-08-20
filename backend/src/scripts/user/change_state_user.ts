import supabase from "../../lib/supabase";

async function changeStateUser(idUsuario: number, idEstado: number) {
  const { data, error } = await supabase.rpc("change_state_user", {
    p_id_usuario: idUsuario,
    p_id_estado: idEstado,
  });

  if (error) {
    console.error("❌ Error al ejecutar la función:", error);
    process.exit(1);
  }

  console.log("✅ Estado actualizado correctamente. Resultado:", data);
}

//Prueba
const idUsuario = 3;
const idEstado = 3;

changeStateUser(idUsuario, idEstado);
