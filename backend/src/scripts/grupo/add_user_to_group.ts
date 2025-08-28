import supabase from "../../lib/supabase";

async function addUserToGroupService(idUsuario: number, idGrupo: number, ) {
  const { data, error } = await supabase.rpc("add_user_to_group", {
    p_id_grupo: idGrupo,
    p_id_usuario: idUsuario
  });

  if (error) {
    console.error("❌ Error al ejecutar la función:", error);
  }

  console.log("✅ Usuario agregado correctamente. Resultado:", data);
}

addUserToGroupService(19, 1)