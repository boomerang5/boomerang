import supabase from "../../lib/supabase";
import { uploadFile } from "./upload_file";
import path from "path";

async function createMessage(
  idChat: number,
  idEmisor: number,
  texto: string,
  id_tipo?: number,
  filePath?: string
): Promise<number | null> {
  let finalText = texto;
  let archivoId: number | null = null;

  // ✅ Subida del archivo solo si se proporciona
  if (filePath) {
    const storagePath = await uploadFile("mensajes", idChat, filePath);

    // 🔑 Crear registro en la tabla Archivo
    const { data: archivoData, error: archivoError } = await supabase.rpc("create_file", {
      p_path_archivo: storagePath,
      p_id_usuario: idEmisor,
      p_id_tipo_archivo: id_tipo,
      p_es_mensaje: true,
    });

    if (archivoError) {
      console.error("❌ Error al crear registro de archivo:", archivoError);
      process.exit(1);
    }

    archivoId = archivoData;
    finalText = texto; // Podés guardar texto junto al archivo
  }

  // ✅ Crear el mensaje
  const { data, error } = await supabase.rpc("create_message", {
    p_id_chat: idChat,
    p_id_emisor: idEmisor,
    p_texto: finalText,
    p_id_archivo: archivoId, // solo lo pasa si hay archivo
  });

  if (error) {
    console.error("❌ Error al ejecutar la función:", error);
    process.exit(1);
  }

  if (!data) {
    console.log("ℹ️ No se pudo crear el mensaje.");
    return null;
  }

  console.log("✅ Mensaje creado correctamente. ID:", data);
  return data as number;
}

// Ejemplo uso solo texto
//createMessage(4, 1, "Hola tanto tiempo", 1);

// Ejemplo uso con archivo
const filePath = path.join(__dirname, "archivos", "calendario.pdf");
createMessage(4, 1, "te mando un archivo", 2, filePath );
