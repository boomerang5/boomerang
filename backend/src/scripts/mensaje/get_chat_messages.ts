import supabase from "../../lib/supabase";

interface ChatMessage {
  id: number;
  texto: string;
  fecha: string;
  id_emisor: number;
  nombre: string;
  apellido: string;
  apodo: string;
  id_archivo?: number | null;
  path_archivo?: string | null;
  id_tipo_archivo?: number | null;
  nombre_tipo?: string | null;
  descripcion_tipo?: string | null;
}

async function getChatMessages(idChat: number, idUsuario: number): Promise<ChatMessage[] | null> {
  const { data, error } = await supabase.rpc("get_chat_messages", {
    p_id_chat: idChat,
    p_id_usuario: idUsuario,
  });

  if (error) {
    console.error("❌ Error al obtener mensajes del chat:", error);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.log("ℹ️ No se encontraron mensajes para este chat.");
    return null;
  }

  console.log("✅ Mensajes obtenidos correctamente:");
  console.table(
    data.map((msg: any) => ({
      id: msg.id,
      texto: msg.texto,
      fecha: msg.fecha,
      emisor: `${msg.nombre} ${msg.apellido}`,
      archivo: msg.path_archivo || "Sin archivo",
      tipo: msg.nombre_tipo || "Texto"
    }))
  );

  return data as ChatMessage[];
}

// Ejemplo de uso
const idChat = 4;
const idUsuario = 1;

getChatMessages(idChat, idUsuario);
