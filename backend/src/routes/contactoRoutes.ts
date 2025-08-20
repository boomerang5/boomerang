import express from 'express';

const router = express.Router();

import { add_contact, delete_contact, update_contact_favorite, get_contacts_favorites, get_my_contacts} from '../controllers/contactoController';

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
 */
router.post('/add', add_contact);

//-----------------------------------------------------------------------------------------------------------------
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
router.post('/delete', delete_contact);

//-----------------------------------------------------------------------------------------------------------------
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
 *               - id_usuario
 *               - id_usuario_contacto
 *               - favorito
 *             properties:
 *               id_usuario:
 *                 type: integer
 *                 example: 1
 *               id_usuario_contacto:
 *                 type: integer
 *                 example: 2
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
router.patch('/favorite', update_contact_favorite);

//-----------------------------------------------------------------------------------------------------------------
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
router.get('/favorites', get_contacts_favorites);

//-----------------------------------------------------------------------------------------------------------------
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
router.get('/misContactos', get_my_contacts);


export default router;
