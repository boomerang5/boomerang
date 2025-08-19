import supabase from "../../lib/supabase";

export async function removeUserFromGroupService(idGrupo: number, idUsuario: number) {
  const { data, error } = await supabase.rpc("remove_user_from_group", {
    p_id_grupo: idGrupo,
    p_id_usuario: idUsuario, 
  });

  if (error) {
    console.error("❌ Supabase error:", error);
    throw new Error(error.message); 
  }

  console.log("✅ Usuario eliminado correctamente. Resultado:", data);
  return data;
}
