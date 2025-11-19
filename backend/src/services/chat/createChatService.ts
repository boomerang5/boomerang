import supabase from "../../lib/supabase";

interface CreateChatParams {
  idUsuario: number;
  idContacto?: number | null;
  nombreGrupo?: string | null;
  idGrupo?: number | null;
}

export async function createChatService({
  idUsuario,
  idContacto,
  nombreGrupo,
  idGrupo,
}: CreateChatParams): Promise<number | null> {
  // Intentar usar la función mejorada primero, fallback a la original
  let { data, error } = await supabase.rpc("create_chat_improved", {
    p_id_usuario_creador: idUsuario,
    p_id_usuario_destinatario: idContacto,
    p_nombre: nombreGrupo,
    p_descripcion: null,
  });

  // Si la función mejorada no existe, usar la original
  if (error && error.message && error.message.includes("does not exist")) {
    const fallback = await supabase.rpc("create_chat", {
      p_id_emisor: idUsuario,
      p_id_contacto: idContacto,
      p_nombre: nombreGrupo,
      p_id_grupo: idGrupo,
    });
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    // No terminar el proceso desde un servicio: propagar el error para que el caller lo maneje.
    // Normalizar por si `error` no es una instancia de Error.
    const err =
      error instanceof Error
        ? error
        : new Error((error as any)?.message ?? String(error));
    throw err;
  }

  if (!data) {
    return null;
  }

  return data as number;
}
