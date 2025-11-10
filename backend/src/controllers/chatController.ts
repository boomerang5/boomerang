import { Request, Response } from 'express';
import { createChatService} from '../services/chat/createChatService';
import { deleteChatService } from '../services/chat/deleteChatService';
import { getChatInfoService } from '../services/chat/getChatInfoService';
import { getUserChatsService } from '../services/chat/getUserChatsService';
import { leaveGroupChatService } from '../services/chat/leaveGroupChatService';
import { createGroupWithChatService } from '../services/chat/createGroupWithChatService';

//---------------------------------------------------------------------------------------------
// CREATE_CHAT

export const create_chat = async (req: Request, res: Response) => {
  const { id_usuario, id_contacto, nombre_grupo, id_grupo } = req.body ?? {};

  // Validar que venga id_usuario siempre
  if (id_usuario == null) {
    return res.status(400).json({ error: 'Falta id_usuario.' });
  }

  // Detectar tipo de creación
  const isPrivate = id_contacto != null && nombre_grupo == null && id_grupo == null;
  const isGroup = id_contacto == null && nombre_grupo != null && id_grupo != null;

  // Validar combinaciones
  if (!isPrivate && !isGroup) {
    return res.status(400).json({
      error: 'Parámetros inválidos. Para chat privado: id_usuario + id_contacto. Para chat grupal: id_usuario + nombre_grupo + id_grupo.',
    });
  }

  // Normalizar valores
  const nombreGrupoNorm =
    typeof nombre_grupo === 'string' && nombre_grupo.trim() !== ''
      ? nombre_grupo.trim()
      : null;

  try {
    const idChat = await createChatService({
      idUsuario: Number(id_usuario),
      idContacto: isPrivate ? Number(id_contacto) : null,
      nombreGrupo: isGroup ? nombreGrupoNorm : null,
      idGrupo: isGroup ? Number(id_grupo) : null,
    });

    if (typeof idChat === 'number') {
      return res.status(200).json({ id_chat: idChat });
    }

    return res
      .status(500)
      .json({ error: 'No se pudo crear el chat (sin ID retornado).' });
  } catch (err: any) {
    console.error('❌ Error en create_chat:', err);
    return res.status(500).json({ error: err?.message ?? 'Error interno' });
  }
};

//--------------------------------------------------------------------------------------------
// CREATE_GROUP_WITH_CHAT
export const create_group_with_chat = async (req: Request, res: Response) => {
  const { id_usuario_creador, nombre, descripcion, participantes } = req.body ?? {};

  // Validaciones mínimas
  if (id_usuario_creador == null) {
    return res.status(400).json({ error: "Falta id_usuario_creador." });
  }
  if (typeof nombre !== "string" || nombre.trim() === "") {
    return res.status(400).json({ error: "Falta nombre." });
  }

  // Normalizaciones
  const nombreNorm = nombre.trim();
  const descripcionNorm =
    typeof descripcion === "string" ? (descripcion.trim() || null) : (descripcion ?? null);

  // participantes puede venir como array de números o como CSV string ("2,3,5")
  let participantesArr: number[] | null = null;
  if (participantes != null) {
    if (Array.isArray(participantes)) {
      participantesArr = participantes
        .map((n) => Number(n))
        .filter((n) => Number.isFinite(n));
    } else if (typeof participantes === "string") {
      participantesArr = participantes
        .split(",")
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isFinite(n));
    } else {
      return res.status(400).json({
        error: "participantes debe ser un array de números o un string CSV de números.",
      });
    }

    // quitar el creador si aparece y deduplicar
    const creador = Number(id_usuario_creador);
    participantesArr = [...new Set(participantesArr.filter((n) => n !== creador))];

    if (participantesArr.length === 0) participantesArr = null;
  }

  try {
    const result = await createGroupWithChatService({
      idUsuarioCreador: Number(id_usuario_creador),
      nombre: nombreNorm,
      descripcion: descripcionNorm,
      participantes: participantesArr,
    });

    if (result && typeof result.idGrupo === "number" && typeof result.idChat === "number") {
      return res.status(200).json({ id_grupo: result.idGrupo, id_chat: result.idChat });
    }

    return res
      .status(500)
      .json({ error: "No se pudo crear el grupo y el chat (sin IDs retornados)." });
  } catch (err: any) {
    console.error("❌ Error en create_group_with_chat:", err);
    return res.status(500).json({ error: err?.message ?? "Error interno" });
  }
};

//--------------------------------------------------------------------------------------------
// DELETE_CHAT
export const delete_chat = async (req: Request, res: Response) => {
  const { id_emisor, id_chat } = req.body;

  if (!id_emisor || !id_chat) {
    return res.status(400).json({ error: 'Faltan parámetros obligatorios.' });
  }

  try {
    await deleteChatService(id_emisor, id_chat);
    return res.status(200).json({ message: "Chat eliminado correctamente" });
  } catch (error: any) {
    console.error("❌ Error en deleteChatService:", error);
    return res.status(500).json({ error: error.message });
  }
}; 

//--------------------------------------------------------------------------------------------
// GET_CHAT_INFO
export const get_chat_info = async (req: Request, res: Response) => {
  const idChat = parseInt(req.query.id_chat as string);
  const idUsuario = parseInt(req.query.id_usuario as string);

  if (isNaN(idChat)) {
    return res.status(400).json({ error: 'ID de Chat inválido' });
  }

  try {
    const data = await getChatInfoService(idChat, idUsuario);
    return res.status(200).json(data);
  } catch (error: any) {
    console.error("❌ Error en getChatInfoService:", error);
    return res.status(500).json({ error: error.message });
  }
};

//--------------------------------------------------------------------------------------------
// GET_USER_CHATS
export const get_user_chats = async (req: Request, res: Response) => {
  const idUsuario = parseInt(req.query.id_usuario as string);

  if (isNaN(idUsuario)) {
    return res.status(400).json({ error: 'ID de Usuario inválido' });
  }

  try {
    const data = await getUserChatsService(idUsuario);
    return res.status(200).json(data);
  } catch (error: any) {
    console.error("❌ Error en getUserChatsService:", error);
    return res.status(500).json({ error: error.message });
  }
};

//--------------------------------------------------------------------------------------------
// LEAVE_GROUP_CHAT
export const leave_group_chat = async (req: Request, res: Response) => {
  const { id_emisor, id_chat } = req.body;

  if (!id_emisor || !id_chat) {
    return res.status(400).json({ error: 'Faltan parámetros obligatorios.' });
  }

  try {
    await leaveGroupChatService(id_emisor, id_chat);
    return res.status(200).json({ message: "Usuario salió del grupo correctamente" });
  } catch (error: any) {
    console.error("❌ Error en leaveGroupChatService:", error);
    return res.status(500).json({ error: error.message });
  }
}; 