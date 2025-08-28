// mensajeController.ts
import { Request, Response } from 'express';
import { createMessageService } from '../services/mensaje/createMessageService';
import { deleteMessageService } from '../services/mensaje/deleteMessageService';
import { editMessageService } from '../services/mensaje/editMessageService';
import { getFileService } from '../services/mensaje/getFileService';
import { getChatMessageService } from '../services/mensaje/getChatMessagesService.ts';

//--------------------------------------------------------------------------------------
// POST CREATE_MESSAGE TANTO PARA TEXTO COMO PARA ARCHIVO
export const create_message = async (req: Request, res: Response) => {
  const { id_chat, id_emisor, texto, id_tipo } = req.body ?? {};
  const file = req.file;

  const idChat = Number(id_chat);
  const idEmisor = Number(id_emisor);
  const idTipo = id_tipo !== undefined && id_tipo !== '' ? Number(id_tipo) : null;
  const textoNorm = typeof texto === 'string' && texto.trim() !== '' ? texto.trim() : null;

  if (Number.isNaN(idChat) || Number.isNaN(idEmisor)) {
    return res.status(400).json({ error: 'id_chat o id_emisor inválido.' });
  }
  if (!textoNorm && !file) {
    return res.status(400).json({ error: 'Debe enviar texto o archivo.' });
  }
  if (file && (idTipo === null || Number.isNaN(idTipo))) {
    return res.status(400).json({ error: 'id_tipo es requerido cuando se envía archivo.' });
  }

  try {
    const idMensaje = await createMessageService({
      idChat,
      idEmisor,
      texto: textoNorm,
      idTipo,
      file, // buffer + mimetype + originalname
    });
    return res.status(201).json({ id_mensaje: idMensaje });
  } catch (err: any) {
    console.error('❌ Error en create_message:', err);
    return res.status(500).json({ error: err?.message ?? 'Error interno' });
  }
};

//--------------------------------------------------------------------------------------
// POST DELETE_MESSAGE, EN CONJUNTO CON DELETE_FILE DE SER NECESARIO
export const delete_message = async (req: Request, res: Response) => {
  const { id_mensaje, id_emisor } = req.body ?? {};
  const idMensaje = Number(id_mensaje);
  const idEmisor  = Number(id_emisor);

  if (Number.isNaN(idMensaje) || Number.isNaN(idEmisor)) {
    return res.status(400).json({ error: 'Parámetros inválidos.' });
  }

  try {
    const result = await deleteMessageService({ idMensaje, idEmisor });

    if (!result?.deleted_message) {
      return res.status(404).json({ error: 'Mensaje no encontrado o no autorizado.' });
    }

    return res.status(200).json({
      deleted_message: true,
      deleted_file: !!result.deleted_file,
    });
  } catch (err: any) {
    console.error('❌ Error en delete_message:', err);
    return res.status(500).json({ error: err?.message ?? 'Error interno' });
  }
};

//--------------------------------------------------------------------------------------
// PATCH EDIT_MESSAGE
export const edit_message = async (req: Request, res: Response) => {
  const { id_emisor, id_mensaje, nuevo_texto } = req.body;

  if (!id_emisor || !id_mensaje) {
    return res.status(400).json({ error: 'Faltan campos requeridos.' });
  }

  const textoNorm = typeof nuevo_texto === 'string' ? nuevo_texto.trim() : '';
  if (textoNorm.length === 0) {
    return res.status(400).json({ error: 'nuevo_texto no puede ser vacío.' });
  }

  try {
    await editMessageService(Number(id_emisor), Number(id_mensaje), nuevo_texto);
    return res.status(200).json({ message: "Mensaje actualizado correctamente" });
  } catch (err) {
    console.error('❌ Error en editMessageService:', err);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
}

//--------------------------------------------------------------------------------------
// GET GET_FILE
export const get_file = async (req: Request, res: Response) => {
  const id_archivo = parseInt(req.query.id_archivo as string);

  if (isNaN(id_archivo)) {
    return res.status(400).json({ error: 'ID inválido' });
  }

  try {
    const data = await getFileService(id_archivo);
    return res.status(200).json(data);
  } catch (error: any) {
    console.error("❌ Error en getFileService:", error);
    return res.status(500).json({ error: error.message });
  }
};

//--------------------------------------------------------------------------------------
// GET GET_CHAT_MESSAGES
export const get_chat_messages = async (req: Request, res: Response) => {
  const id_chat = parseInt(req.query.id_chat as string, 10);
  const id_usuario = parseInt(req.query.id_usuario as string, 10);

  if (isNaN(id_chat) || isNaN(id_usuario)) {
    return res.status(400).json({ error: "Parámetros inválidos (id_chat, id_usuario)" });
  }

  try {
    const mensajes = await getChatMessageService(id_chat, id_usuario);
    // Puedes devolver 200 con [] siempre; es lo más simple para el front
    return res.status(200).json(mensajes);
  } catch (err: any) {
    console.error("❌ Error en get_chat_messages:", err);
    return res.status(500).json({ error: err.message || "Error interno" });
  }
};