import supabase from "../../lib/supabase";

export async function createGroupService(nombreGrupo: string, descripcion: string | null, idUsuario: number, ) {
  const { data, error } = await supabase.rpc("create_group", {
    p_nombre: nombreGrupo,
    p_descripcion: descripcion,
    p_id_creador: idUsuario
  });

  if (error) {
    console.error("❌ Error al ejecutar la función:", error);
    throw new Error(error.message);
  }

  console.log("✅ Grupo creado correctamente. Resultado:", data);
  return data;
}