// src/services/getChatMessageService.ts
import supabase from "../../lib/supabase";

export interface ChatMessage {
  id: number;
  texto: string;
  fecha: string; // ISO date-time
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

export async function getChatMessageService(
  idChat: number,
  idUsuario: number
): Promise<ChatMessage[]> {
  const { data, error } = await supabase.rpc("get_chat_messages", {
    p_id_chat: idChat,
    p_id_usuario: idUsuario,
  });

  if (error) {
    throw new Error(error.message); // no mates el server
  }

  // La RPC puede devolver null/undefined; normalizamos a []
  return (data ?? []) as ChatMessage[];
}