import supabase from "../../lib/supabase";

async function removeUserFromGroup(idGrupo: number, idUsuario: number) {
  const { data, error } = await supabase.rpc("remove_user_from_group", {
    p_id_grupo: idGrupo,
    p_id_usuario: idUsuario
  });

  if (error) {
    console.error("❌ Error al ejecutar la función:", error);
    process.exit(1);
  }

  console.log("✅ Usuario eliminado correctamente. Resultado:", data);
}

//Prueba
const idGrupo = 1;
const idUsuario = 3;

removeUserFromGroup(idGrupo, idUsuario);
