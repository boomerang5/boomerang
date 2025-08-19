import supabase from "../../lib/supabase";

export async function addUserToGroupService(idUsuario: number, idGrupo: number) {
  const { data, error } = await supabase.rpc("add_user_to_group", {
    p_id_usuario: idUsuario, 
    p_id_grupo: idGrupo,
  });

  if (error) {
    console.error("❌ Supabase error:", error);
    throw new Error(error.message); 
  }

  console.log("✅ Usuario agregado correctamente. Resultado:", data);
  return data;
}
