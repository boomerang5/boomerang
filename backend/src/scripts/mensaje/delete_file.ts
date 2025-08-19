import { supabaseAdmin } from "../../lib/supabase";

export async function deleteFile(idArchivo: number): Promise<void> {
  try {
    const { data: archivo, error: fetchError } = await supabaseAdmin
      .from("Archivo")
      .select("path_archivo")
      .eq("id", idArchivo)
      .single();

    if (fetchError || !archivo) {
      console.error("❌ Error al obtener archivo:", fetchError);
      return;
    }

    const filePath = archivo.path_archivo;

    const { error: storageError } = await supabaseAdmin.storage
      .from("mensajes")
      .remove([filePath]);

    if (storageError) {
      console.error("❌ Error al eliminar del storage:", storageError);
    } else {
      console.log(`🗑️ Archivo eliminado del storage: ${filePath}`);
    }

    const { error: deleteError } = await supabaseAdmin.rpc("delete_file", {
      p_id_archivo: idArchivo,
    });

    if (deleteError) {
      console.error("❌ Error al eliminar registro del archivo:", deleteError);
    }
  } catch (err) {
    console.error("❌ Error inesperado al eliminar archivo:", err);
  }
}
