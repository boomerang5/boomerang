import { Request, Response } from 'express';
import { createUsuarioProfileService } from "../services/user/createUsuarioProfileService";
import { getAllContactsService } from "../services/user/getAllContactsService";
import { updateUsuarioProfileService } from "../services/user/updateUsuarioProfileService";
import { getUsuarioUuid } from "../services/user/getUsuarioUuidService";
import { getUserByIdUsuario } from "../services/user/getUserByIdUsuarioService";
import { changeStateUser } from '../services/user/changeStateUserService';
import { getStateUser } from '../services/user/getStateUserService';
import { updateUserProfilePhoto } from '../services/user/updateUserProfilePhotoService';
import { getUserLanguageService } from '../services/user/getUserLanguageService';


// GET_ALL_CONTACTS
export const get_all_contacts = async (req: Request, res: Response) => {
  const idUsuario = parseInt(req.query.id_usuario as string);
  const busqueda = req.query.busqueda as string | undefined;

  if (isNaN(idUsuario)) {
    return res.status(400).json({ error: 'ID de usuario inválido' });
  }

  try {
    const data = await getAllContactsService(idUsuario, busqueda);
    return res.status(200).json(data);
  } catch (error: any) {
    console.error("❌ Error en get_all_contacts:", error);
    return res.status(500).json({ error: error.message });
  }
};


//CREATE_USUARIO_PROFILE
export const create_usuario_profile = async (req: Request, res: Response) => {
  const {
    nombre,
    apellido,
    idioma,
    apodo,
    user_id,
    genero,
    fecha_nacimiento,
  } = req.body;

  if (!nombre || !apellido || !idioma || !apodo || !user_id) {
    return res.status(400).json({ error: "Faltan campos requeridos." });
  }

  try {
    const id = await createUsuarioProfileService({
      nombre,
      apellido,
      idioma,
      apodo,
      user_id,
      genero,
      fecha_nacimiento,
    });

    return res.status(200).json({ id });
  } catch (err: any) {
    console.error("❌ Error inesperado:", err);
    return res
      .status(500)
      .json({ error: err.message || "Error interno del servidor." });
  }
};


//UPDATE_USUARIO_PROFILE
export const update_usuario_profile = async (req: Request, res: Response) => {
  const { id, nombre, apellido, idioma, apodo } = req.body;

  if (!id || !nombre || !apellido || !idioma || !apodo) {
    return res.status(400).json({ error: 'Faltan campos requeridos.' });
  }

  try {
    await updateUsuarioProfileService(id, nombre, apellido, idioma, apodo);
    return res.status(200).json({ message: "Perfil actualizado correctamente" });
  } catch (err) {
    console.error('❌ Error en updateUsuarioProfile:', err);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
};

// GET_USUARIO_UUID
export const get_usuario_uuid = async (req: Request, res: Response) => {
  const { uuid } = req.params;

  if (!uuid) {
    return res.status(400).json({ error: "Faltan campos requeridos." });
  }

  try {
    const data = await getUsuarioUuid(uuid);

    if (!data || data.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado." });
    }

    return res.status(200).json(data[0]); // Devuelve { id: ... }
  } catch (err) {
    console.error("❌ Error en getUsuarioUuid:", err);
    return res.status(500).json({ error: "Error interno del servidor." });
  }
};


// GET_USER_BY_ID_USUARIO
export const get_user_by_id_usuario = async (req: Request, res: Response) => {
  const { id } = req.params;

  const parsedId = parseInt(id);
  if (isNaN(parsedId)) {
    return res.status(400).json({ error: "ID inválido" });
  }

  try {
    const data = await getUserByIdUsuario(parsedId);

    if (!data || data.length === 0) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    return res.status(200).json(data[0]);
  } catch (error: any) {
    console.error("❌ Error en get_user_by_id_usuario:", error);
    return res.status(500).json({ error: error.message });
  }
};

// CHANGE_STATE_USER
export const change_state_user = async (req: Request, res: Response) => {
  const { id_usuario, id_estado } = req.body;

  if (!id_usuario || !id_estado) {
    return res.status(400).json({ error: 'Faltan campos requeridos.' });
  }

  try {
    await changeStateUser(Number(id_usuario), Number(id_estado));
    return res.status(200).json({ message: "Estado del usuario actualizado correctamente" });
  } catch (err) {
    console.error('❌ Error en changeStateUser:', err);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
};

// GET_STATE_USER
export const get_state_user = async (req: Request, res: Response) => {
  const idUsuario = parseInt(req.query.id_usuario as string);

  if (isNaN(idUsuario)) {
    return res.status(400).json({ error: 'ID de usuario inválido' });
  }

  try {
    const data = await getStateUser(idUsuario);
    return res.status(200).json(data);
  } catch (error: any) {
    console.error("❌ Error en get_state_user:", error);
    return res.status(500).json({ error: error.message });
  }
};

// UPDATE_USER_PROFILE_PHOTO
export const update_user_profile_photo = async (req: Request, res: Response) => {
  const { id_usuario, id_archivo } = req.body;

  if (!id_usuario || !id_archivo) {
    return res.status(400).json({ error: 'Faltan campos requeridos.' });
  }

  try {
    await updateUserProfilePhoto(Number(id_usuario), Number(id_archivo));
    return res.status(200).json({ message: "Foto de perfil actualizada correctamente" });
  } catch (err) {
    console.error('❌ Error en updateUsuarioProfilePhoto:', err);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
}

// GET_USER_LANGUAGE
export const get_user_language = async (req: Request, res: Response) => {
  const idUsuario = parseInt(req.query.id_usuario as string);

  if (isNaN(idUsuario)) {
    return res.status(400).json({ error: 'ID de usuario inválido' });
  }

  try {
    const data = await getUserLanguageService(idUsuario);
    return res.status(200).json(data);
  } catch (error: any) {
    console.error("❌ Error en get_user_language:", error);
    return res.status(500).json({ error: error.message });
  }
}


