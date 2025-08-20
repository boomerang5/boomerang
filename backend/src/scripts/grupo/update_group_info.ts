import supabase from "../../lib/supabase";

async function updateGroupInfo(idGrupo: number, nombreGrupo?: string | null, descripcion?: string | null) {
  const { data, error } = await supabase.rpc("update_group_info", {
    p_id_grupo: idGrupo,
    p_nuevo_nombre: nombreGrupo,
    p_nueva_descripcion: descripcion,
  });

  if (error) {
    console.error("❌ Error al ejecutar la función:", error);
    process.exit(1);
  }

  console.log("✅ Grupo actualizado correctamente. Resultado:", data);
}

// ejemplo de uso
const idGrupo = 2;
const nombreGrupo = "Grupaso";
const descripcion = "Dale bocaaaaaa";
updateGroupInfo(idGrupo, nombreGrupo, descripcion);
