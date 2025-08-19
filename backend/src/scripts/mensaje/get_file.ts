import supabase from "../../lib/supabase";

async function getFile(idArchivo: number) {
  const { data, error } = await supabase.rpc("get_file", {
    p_id_archivo: idArchivo,
  });

  if (error) {
    console.error("❌ Error al ejecutar la función:", error);
    process.exit(1);
  }

  console.log("✅ Archivo encontrado:", data[0]);
  return data[0];
}

//Prueba
const idArchivo = 8;

getFile(idArchivo);