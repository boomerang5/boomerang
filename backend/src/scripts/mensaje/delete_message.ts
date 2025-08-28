import supabase from "../../lib/supabase";
import { deleteFile } from "./delete_file";

async function deleteMessage(idEmisor: number, idMensaje: number): Promise<void> {
  try {
    // 1️⃣ Obtener el mensaje antes de borrarlo para saber si tiene archivo
    const { data: mensaje, error: fetchError } = await supabase
      .from("Mensaje")
      .select("id_archivo")
      .eq("id", idMensaje)
      .eq("id_emisor", idEmisor)
      .single();

    if (fetchError) {
      console.error("❌ Error al obtener mensaje:", fetchError);
      process.exit(1);
    }

    // 2️⃣ Llamar RPC para marcar como eliminado
    const { error } = await supabase.rpc("delete_message", {
      p_id_emisor: idEmisor,
      p_id_mensaje: idMensaje,
    });

    if (error) {
      console.error("❌ Error al eliminar el mensaje:", error);
      process.exit(1);
    }

    console.log("✅ Mensaje eliminado correctamente.");

    // 3️⃣ Si tiene archivo asociado → eliminar archivo
    if (mensaje?.id_archivo) {
      // 🔹 Primero, desasociar archivo del mensaje
      const { error: unlinkError } = await supabase
        .from("Mensaje")
        .update({ id_archivo: null })
        .eq("id", idMensaje);

      if (unlinkError) {
        console.error("❌ Error al desasociar archivo del mensaje:", unlinkError);
      } else {
        // 🔹 Luego, eliminar archivo
        await deleteFile(mensaje.id_archivo);
        console.log("🗑️ Archivo asociado eliminado correctamente.");
      }
    }
  } catch (err) {
    console.error("❌ Error inesperado:", err);
    process.exit(1);
  }
}

// Ejemplo de uso
const idEmisor = 1;
const idMensaje = 26;

deleteMessage(idEmisor, idMensaje);


