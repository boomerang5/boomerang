import supabase from "../../lib/supabase";

async function createGroup(nombreGrupo: string, descripcion: string, idUsuario: number, ) {
  const { data, error } = await supabase.rpc("create_group", {
    p_nombre: nombreGrupo,
    p_descripcion: descripcion,
    p_id_creador: idUsuario
  });

  if (error) {
    console.error("❌ Error al ejecutar la función:", error);
    process.exit(1);
  }

  console.log("✅ Grupo creado correctamente. Resultado:", data);
}

//Prueba
const nombreGrupo = "Grupo de Pedro";
const descripcion = "solo gente piola";
const idUsuario = 2;

createGroup(nombreGrupo, descripcion, idUsuario);