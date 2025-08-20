import supabase from "../../lib/supabase";

export async function getFileService(idArchivo: number) {
  const { data, error } = await supabase.rpc("get_file", {
    p_id_archivo: idArchivo,
  });

  if (error) {
    console.error("❌ Error al ejecutar la función:", error);
    throw new Error(error.message);
  }
  return Array.isArray(data) ? data[0] : data
}