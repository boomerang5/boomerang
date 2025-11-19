import supabase from "../../lib/supabase";

export interface CreateGroupWithChatParams {
  idUsuarioCreador: number;
  nombre: string;
  descripcion?: string | null;
  participantes?: number[] | null; // IDs de usuarios a agregar como miembros
}

export type CreateGroupWithChatResult = {
  idGrupo: number;
  idChat: number;
} | null;

export async function createGroupWithChatService({
  idUsuarioCreador,
  nombre,
  descripcion = null,
  participantes = null,
}: CreateGroupWithChatParams): Promise<CreateGroupWithChatResult> {
  // Intentar usar la función mejorada primero, fallback a la original
  let { data, error } = await supabase.rpc("create_group_with_chat_improved", {
    p_id_usuario_creador: idUsuarioCreador,
    p_nombre: nombre,
    p_descripcion: descripcion ?? null,
    p_participantes:
      participantes && participantes.length ? participantes : null,
  });

  // Si la función mejorada no existe, usar la original
  if (error && error.message && error.message.includes("does not exist")) {
    const fallback = await supabase.rpc("create_group_with_chat", {
      p_id_usuario_creador: idUsuarioCreador,
      p_nombre: nombre,
      p_descripcion: descripcion ?? null,
      p_participantes:
        participantes && participantes.length ? participantes : null,
    });
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    throw error instanceof Error
      ? error
      : new Error((error as any)?.message ?? String(error));
  }

  if (!data) {
    return null;
  }

  // PostgREST puede devolver un objeto o un array con una sola fila
  const row: any = Array.isArray(data) ? data[0] : data;

  const idGrupoRaw = row?.id_grupo ?? row?.idGrupo ?? row?.idgrupo;
  const idChatRaw = row?.id_chat ?? row?.idChat ?? row?.idchat;

  const idGrupo =
    typeof idGrupoRaw === "string" ? parseInt(idGrupoRaw, 10) : idGrupoRaw;
  const idChat =
    typeof idChatRaw === "string" ? parseInt(idChatRaw, 10) : idChatRaw;

  if (
    typeof idGrupo !== "number" ||
    Number.isNaN(idGrupo) ||
    typeof idChat !== "number" ||
    Number.isNaN(idChat)
  ) {
    console.warn("⚠️ Respuesta inesperada:", data);
    return null;
  }

  return { idGrupo, idChat };
}
