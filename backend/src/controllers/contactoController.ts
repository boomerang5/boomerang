import { Request, Response } from 'express';
import { addContactService } from "../services/contacto/addContactService";
import { deleteContactService } from "../services/contacto/deleteContactService";
import { updateContactFavoriteService } from "../services/contacto/updateContactFavoriteService";
import { getMyContactsService } from "../services/contacto/getMyContactsService";
import { getContactsFavoritesService } from "../services/contacto/getContactsFavorites";


//ADD_CONTACT
export const add_contact = async (req: Request, res: Response) => {
  const { id_usuario, id_usuario_contacto } = req.body;

  if (!id_usuario || !id_usuario_contacto) {
    return res.status(400).json({ error: "Faltan parámetros obligatorios." });
  }

  try {
    const result = await addContactService(id_usuario, id_usuario_contacto);
    return res.status(200).json({ message: "Contacto agregado correctamente", data: result });
  } catch (error: any) {
    console.error("❌ Error en addContact:", error);
    return res.status(500).json({ error: error.message });
  }
};

//DELETE_CONTACT
export const delete_contact = async (req: Request, res: Response) => {
  const { id_usuario, id_usuario_contacto } = req.body;

  if (!id_usuario || !id_usuario_contacto) {
    return res.status(400).json({ error: 'Faltan parámetros obligatorios.' });
  }

  try {
    await deleteContactService(id_usuario, id_usuario_contacto);
    return res.status(200).json({ message: "Contacto eliminado correctamente" });
  } catch (error: any) {
    console.error("❌ Error en deleteContact:", error);
    return res.status(500).json({ error: error.message });
  }
}; 

//UPDATE_CONTACT_FAVORITE
export const update_contact_favorite = async (req: Request, res: Response) => {
  const { id_usuario, id_usuario_contacto, favorito } = req.body;

  if (typeof id_usuario!== 'number' || typeof id_usuario_contacto !== 'number' || typeof favorito !== 'boolean') {
    return res.status(400).json({ error: 'Parámetros inválidos o faltantes.' });
  }

  try {
    await updateContactFavoriteService(id_usuario, id_usuario_contacto, favorito);
    return res.status(200).json({ message: "Contacto actualizado correctamente" });
  } catch (error: any) {
    console.error("❌ Error en updateContactFavorite:", error);
    return res.status(500).json({ error: error.message });
  }
};

//GET_CONTACTS_FAVORITES
export const get_contacts_favorites = async (req: Request, res: Response) => {
  const id_usuario = parseInt(req.query.id_usuario as string);

  if (isNaN(id_usuario)) {
    return res.status(400).json({ error: 'ID inválido' });
  }

  try {
    const data = await getContactsFavoritesService(id_usuario);
    return res.status(200).json(data);
  } catch (error: any) {
    console.error("❌ Error en get_contacts_favorites:", error);
    return res.status(500).json({ error: error.message });
  }
};

//GET_MY_CONTACTS
export const get_my_contacts = async (req: Request, res: Response) => {
  const id_usuario = parseInt(req.query.id_usuario as string);
  const busqueda = req.query.busqueda as string | undefined;

  if (isNaN(id_usuario)) {
    return res.status(400).json({ error: "ID inválido" });
  }

  try {
    const data = await getMyContactsService(id_usuario, busqueda);
    return res.status(200).json(data);
  } catch (error: any) {
    console.error("❌ Error en get_my_contacts:", error);
    return res.status(500).json({ error: error.message });
  }
};
