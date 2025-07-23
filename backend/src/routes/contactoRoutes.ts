import express from 'express';
import { supabase } from '../lib/supabase';

const router = express.Router();

// POST ADD_CONTACT
/**
 * @swagger
 * /api/contacts/add:
 *   post:
 *     summary: Agregar un contacto para un usuario
 *     tags: [Contactos]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id_usuario
 *               - id_usuario_contacto
 *             properties:
 *               id_usuario:
 *                 type: integer
 *                 example: 1
 *               id_usuario_contacto:
 *                 type: integer
 *                 example: 7
 *     responses:
 *       200:
 *         description: Contacto agregado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               example:
 *                 message: Contacto agregado correctamente
 *       400:
 *         description: Faltan parámetros
 *       500:
 *         description: Error interno del servidor
 */
router.post('/add', async (req, res) => {
  const { id_usuario, id_usuario_contacto } = req.body;

  if (!id_usuario || !id_usuario_contacto) {
    return res.status(400).json({ error: 'Faltan parámetros obligatorios.' });
  }

  try {
    const { data, error } = await supabase.rpc('add_contact', {
      p_id_usuario: id_usuario,
      p_id_usuario_contacto: id_usuario_contacto,
    });

    if (error) {
      console.error('❌ Supabase error:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ message: 'Contacto agregado correctamente' });
  } catch (err) {
    console.error('❌ Error inesperado:', err);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// POST DELETE_CONTACT
/**
 * @swagger
 * /api/contacts/delete:
 *   post:
 *     summary: Eliminar un contacto para un usuario
 *     tags: [Contactos]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id_usuario
 *               - id_usuario_contacto
 *             properties:
 *               id_usuario:
 *                 type: integer
 *                 example: 1
 *               id_usuario_contacto:
 *                 type: integer
 *                 example: 7
 *     responses:
 *       200:
 *         description: Contacto eliminado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               example:
 *                 message: Contacto eliminado correctamente
 *       400:
 *         description: Faltan parámetros
 *       500:
 *         description: Error interno del servidor
 */
router.post('/delete', async (req, res) => {
  const { id_usuario, id_usuario_contacto } = req.body;

  if (!id_usuario || !id_usuario_contacto) {
    return res.status(400).json({ error: 'Faltan parámetros obligatorios.' });
  }

  try {
    const { data, error } = await supabase.rpc('delete_contact', {
      p_id_usuario: id_usuario,
      p_id_usuario_contacto: id_usuario_contacto,
    });

    if (error) {
      console.error('❌ Supabase error:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ message: 'Contacto eliminado correctamente' });
  } catch (err) {
    console.error('❌ Error inesperado:', err);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// PATCH UPDATE_CONTACT_FAVORITE
/**
 * @swagger
 * /api/contacts/favorite:
 *   patch:
 *     summary: Actualizar estado de favorito en un contacto
 *     tags: [Contactos]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id_contacto_usuario
 *               - favorito
 *             properties:
 *               id_contacto_usuario:
 *                 type: integer
 *                 example: 12
 *               favorito:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Contacto actualizado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               example:
 *                 message: Contacto actualizado correctamente
 *       400:
 *         description: Faltan parámetros
 *       500:
 *         description: Error interno del servidor
 */
router.patch('/favorite', async (req, res) => {
  const { id_contacto_usuario, favorito } = req.body;

  if (typeof id_contacto_usuario !== 'number' || typeof favorito !== 'boolean') {
    return res.status(400).json({ error: 'Parámetros inválidos o faltantes.' });
  }

  try {
    const { data, error } = await supabase.rpc('update_contact_favorite', {
      p_id_contacto_usuario: id_contacto_usuario,
      p_favorito: favorito,
    });

    if (error) {
      console.error('❌ Supabase error:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ message: 'Contacto actualizado correctamente' });
  } catch (err) {
    console.error('❌ Error inesperado:', err);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// GET GET_CONTACTS_FAVORITES
/**
 * @swagger
 * /api/contacts/favorites:
 *   get:
 *     summary: Obtener contactos favoritos de un usuario
 *     tags: [Contactos]
 *     parameters:
 *       - in: query
 *         name: id_usuario
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del usuario
 *     responses:
 *       200:
 *         description: Lista de contactos favoritos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     example: 12
 *                   id_usuario_contacto:
 *                     type: integer
 *                     example: 3
 *                   nombre:
 *                     type: string
 *                     example: Francisco
 *                   apellido:
 *                     type: string
 *                     example: UTN
 *                   apodo:
 *                     type: string
 *                     example: FFFRAN
 *                   favorito:
 *                     type: boolean
 *                     example: true
 *                   fh_alta:
 *                     type: string
 *                     format: date-time
 *                     example: 2025-07-09T03:40:57.12253
 *                   id_estado:
 *                     type: integer
 *                     example: 1
 *                   nombreEstado:
 *                     type: string
 *                     example: Disponible
 *       400:
 *         description: ID inválido
 */
router.get('/favorites', async (req, res) => {
  const id_usuario = parseInt(req.query.id_usuario as string);

  if (isNaN(id_usuario)) {
    return res.status(400).json({ error: 'ID inválido' });
  }

  try {
    const { data, error } = await supabase.rpc('get_contacts_favorites', {
      p_id_usuario: id_usuario,
    });

    if (error) {
      console.error('❌ Supabase error:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error('❌ Error inesperado:', err);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// GET GET_MY_CONTACTS
/**
 * @swagger
 * /api/contacts/misContactos:
 *   get:
 *     summary: Obtener mis contactos agendados (con búsqueda opcional)
 *     tags: [Contactos]
 *     parameters:
 *       - in: query
 *         name: id_usuario
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del usuario
 *       - in: query
 *         name: busqueda
 *         required: false
 *         schema:
 *           type: string
 *         description: Texto a buscar (nombre, apellido o apodo)
 *     responses:
 *       200:
 *         description: Lista de contactos agendados
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     example: 12
 *                   id_usuario_contacto:
 *                     type: integer
 *                     example: 2
 *                   nombre:
 *                     type: string
 *                     example: Pedro
 *                   apellido:
 *                     type: string
 *                     example: Argañaraz
 *                   apodo:
 *                     type: string
 *                     example: Pedrito
 *                   favorito:
 *                     type: boolean
 *                     example: true
 *                   fh_alta:
 *                     type: string
 *                     format: date-time
 *                     example: 2025-07-09T03:40:57.12253
 *                   id_estado:
 *                     type: integer
 *                     example: 1
 *                   nombreEstado:
 *                     type: string
 *                     example: Disponible
 *       400:
 *         description: ID inválido
 */
router.get('/misContactos', async (req, res) => {
  const id_usuario = parseInt(req.query.id_usuario as string);
  const busqueda = req.query.busqueda as string | undefined;

  if (isNaN(id_usuario)) {
    return res.status(400).json({ error: 'ID inválido' });
  }

  try {
    const { data, error } = await supabase.rpc('get_my_contacts', {
      p_id_usuario: id_usuario,
      p_busqueda: busqueda ?? null,
    });

    if (error) {
      console.error('❌ Supabase error:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error('❌ Error inesperado:', err);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
});


export default router;
