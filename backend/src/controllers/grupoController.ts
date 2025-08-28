import { Request, Response } from 'express';
import { createGroupService } from '../services/grupo/createGroupService';
import { removeUserFromGroupService } from '../services/grupo/removeUserFromGroupService';
import { updateGroupInfoService } from '../services/grupo/updateGroupInfoService';
import { addUserToGroupService } from '../services/grupo/addUsersToGroupService';

//---------------------------------------------------------------------------------------------
// CREATE_GROUP
export const create_group = async (req: Request, res: Response) => {
  const { nombre_grupo, descripcion, id_usuario } = req.body;

  if (!nombre_grupo || !id_usuario) {
    return res.status(400).json({ error: "Faltan campos requeridos." });
  }

  try {
    const id = await createGroupService(nombre_grupo, descripcion?? null, Number(id_usuario));

    return res.status(200).json({ id });
  } catch (err: any) {
    console.error("❌ Error inesperado:", err);
    return res
      .status(500).json({ error: err.message || "Error interno del servidor." });
  }
};

//---------------------------------------------------------------------------------------------
// ADD_USERS_TO GROUP
export const add_user_to_group = async (req: Request, res: Response) => {
  const { id_usuario, id_grupo } = req.body;

  if (!id_grupo || !id_usuario) {
    return res.status(400).json({ error: "Faltan parámetros obligatorios." });
  }

  try {
    const result = await addUserToGroupService(id_usuario, id_grupo);
    return res.status(200).json({ message: "Usuario agregado correctamente"});
  } catch (error: any) {
    console.error("❌ Error en addUserToGroup:", error);
    return res.status(500).json({ error: error.message });
  }
};

//---------------------------------------------------------------------------------------------
// REMOVE_USER_FROM_GROUP
export const remove_user_from_group = async (req: Request, res: Response) => {
  const { id_grupo, id_usuario } = req.body;

  if (!id_grupo || !id_usuario) {
    return res.status(400).json({ error: 'Faltan parámetros obligatorios.' });
  }

  try {
    await removeUserFromGroupService(id_grupo, id_usuario);
    return res.status(200).json({ message: "Usuario eliminado de grupo correctamente" });
  } catch (error: any) {
    console.error("❌ Error en removeUserFromGroup:", error);
    return res.status(500).json({ error: error.message });
  }
}; 

//---------------------------------------------------------------------------------------------
// UPDATE_GROUP_INFO
export const update_group_info = async (req: Request, res: Response) => {
  let { id_grupo, nuevo_nombre, nueva_descripcion } = req.body;

  if (!id_grupo) {
    return res.status(400).json({ error: 'Falta id_grupo.' });
  }

  // normalizo: undefined/empty string -> null
  const nombre = (typeof nuevo_nombre === 'string' && nuevo_nombre.trim() !== '') ? nuevo_nombre.trim() : null;
  const descripcion = (typeof nueva_descripcion === 'string' && nueva_descripcion.trim() !== '') ? nueva_descripcion.trim() : null;

  // exigir que haya al menos un campo a actualizar
  if (nombre === null && descripcion === null) {
    return res.status(400).json({ error: 'Enviá nuevo_nombre o nueva_descripcion.' });
  }

  try {
    const data = await updateGroupInfoService(id_grupo, nombre, descripcion);
    // si tu RPC devuelve algo para saber si existió el grupo:
    if (!data) return res.status(404).json({ error: 'Grupo no encontrado' });
    return res.status(200).json({ message: 'Grupo actualizado correctamente' });
  } catch (error: any) {
    console.error('❌ Error en updateGroupInfo:', error);
    return res.status(500).json({ error: error.message ?? 'Error interno' });
  }
};

