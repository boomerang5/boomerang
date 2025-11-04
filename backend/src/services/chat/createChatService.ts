import supabase from "../../lib/supabase";

interface CreateChatParams {
  idUsuario: number;
  idContacto?: number | null;
  nombreGrupo?: string | null;
  idGrupo?: number | null;
}

export async function createChatService({ idUsuario, idContacto, nombreGrupo, idGrupo}: CreateChatParams): Promise<number | null> {
  const { data, error } = await supabase.rpc("create_chat", { 
    p_id_emisor: idUsuario,
    p_id_contacto: idContacto,
    p_nombre: nombreGrupo,
    p_id_grupo: idGrupo,
  });

  if (error) {
    // No terminar el proceso desde un servicio: propagar el error para que el caller lo maneje.
    // Normalizar por si `error` no es una instancia de Error.
    const err = error instanceof Error ? error : new Error((error as any)?.message ?? String(error));
    throw err;
  }

  if (!data) {
    return null;
  }

  return data as number;
}