import supabase from "../../lib/supabase";

async function editMessage(idEmisor: number, idMensaje: number, nuevoTexto: string): Promise<void> {
  const { error } = await supabase.rpc("edit_message", {
    p_id_emisor: idEmisor,
    p_id_mensaje: idMensaje,
    p_nuevo_texto: nuevoTexto
  });

  if (error) {
    console.error("❌ Error al editar el mensaje:", error);
    process.exit(1);
  }

  console.log("✅ Mensaje editado correctamente.");
}

// Ejemplo de uso
const idEmisor = 3;
const idMensaje = 4;
const nuevoTexto = "Esto es un nuevo :)";

editMessage(idEmisor, idMensaje, nuevoTexto);