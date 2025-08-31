// src/scripts/create_group_with_chat.ts
import supabase from "../../lib/supabase";

interface CreateGroupWithChatParams {
  idUsuarioCreador: number;
  nombre: string;
  descripcion?: string | null;
  participantes?: number[] | null; // IDs de usuarios a agregar como miembros
}

type CreateGroupWithChatResult = { idGrupo: number; idChat: number } | null;

async function createGroupWithChat({
  idUsuarioCreador,
  nombre,
  descripcion = null,
  participantes = null,
}: CreateGroupWithChatParams): Promise<CreateGroupWithChatResult> {
  const { data, error } = await supabase.rpc("create_group_with_chat", {
    p_id_usuario_creador: idUsuarioCreador,
    p_nombre: nombre,
    p_descripcion: descripcion,
    p_participantes:
      participantes && participantes.length ? participantes : null,
  });

  if (error) {
    console.error("❌ Error al ejecutar la función:", error);
    process.exit(1);
  }

  if (!data) {
    console.log("ℹ️ La función no devolvió datos.");
    return null;
  }

  // Puede venir como objeto (OUT params) o como array con una fila.
  const row: any = Array.isArray(data) ? data[0] : data;

  const rawIdGrupo = row?.id_grupo ?? row?.idGrupo ?? row?.idgrupo;
  const rawIdChat = row?.id_chat ?? row?.idChat ?? row?.idchat;

  const idGrupo =
    typeof rawIdGrupo === "string" ? parseInt(rawIdGrupo, 10) : rawIdGrupo;
  const idChat =
    typeof rawIdChat === "string" ? parseInt(rawIdChat, 10) : rawIdChat;

  if (typeof idGrupo !== "number" || typeof idChat !== "number") {
    console.warn("⚠️ Respuesta inesperada:", data);
    return null;
  }

  console.log("✅ Grupo y chat creados:", { idGrupo, idChat });
  return { idGrupo, idChat };
}

// ===== Ejemplo de uso =====
// - Crea un grupo llamado "Equipo Tesis" con participantes [2,3] y un creador 1.
// - Si querés sin participantes, omití `participantes` o pasá [].
createGroupWithChat({
  idUsuarioCreador: 1,
  nombre: "Grupo de Swagger",
  descripcion: "estamos probando swagger",
  participantes: [2, 3],
});
