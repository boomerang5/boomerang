import supabase from "../../lib/supabase";

export async function updateGroupInfoService(idGrupo: number, nombreGrupo?: string | null, descripcion?: string | null) {
  const { data, error } = await supabase.rpc("update_group_info", {
    p_id_grupo: idGrupo,
    p_nuevo_nombre: nombreGrupo,
    p_nueva_descripcion: descripcion,
  });

  if (error) {
    console.error("❌ Error al ejecutar la función:", error);
    throw error;
  }

  console.log("✅ Grupo actualizado correctamente. Resultado:", data);
  return { ok: true, data };
}
