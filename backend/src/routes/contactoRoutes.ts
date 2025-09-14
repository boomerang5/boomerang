import express from 'express';
const router = express.Router();

import {
  add_contact,
  delete_contact,
  update_contact_favorite,
  get_contacts_favorites,
  get_my_contacts,
} from '../controllers/contactoController';


/**
 * @swagger
 * tags:
 *   name: Contactos
 *   description: Endpoints de contactos y solicitudes
 */

/* =========================
 * CONTACTOS (existentes)
 * ========================= */

/**
 * @swagger
 * /api/contacts/add:
 *   post:
 *     summary: Agregar un contacto directo (legacy)
 *     tags: [Contactos]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [id_usuario, id_usuario_contacto]
 *             properties:
 *               id_usuario: { type: integer, example: 1 }
 *               id_usuario_contacto: { type: integer, example: 7 }
 *     responses:
 *       200: { description: Contacto agregado correctamente }
 */
router.post('/add', add_contact);

/**
 * @swagger
 * /api/contacts/delete:
 *   post:
 *     summary: Eliminar un contacto
 *     tags: [Contactos]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [id_usuario, id_usuario_contacto]
 *             properties:
 *               id_usuario: { type: integer, example: 1 }
 *               id_usuario_contacto: { type: integer, example: 7 }
 *     responses:
 *       200:
 *         description: Contacto eliminado correctamente
 */
router.post('/delete', delete_contact);

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
 *             required: [id_usuario, id_usuario_contacto, favorito]
 *             properties:
 *               id_usuario: { type: integer, example: 1 }
 *               id_usuario_contacto: { type: integer, example: 2 }
 *               favorito: { type: boolean, example: true }
 *     responses:
 *       200: { description: Contacto actualizado correctamente }
 */
router.patch('/favorite', update_contact_favorite);

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
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Lista de contactos favoritos
 */
router.get('/favorites', get_contacts_favorites);

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
 *         schema: { type: integer }
 *       - in: query
 *         name: busqueda
 *         required: false
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Lista de contactos agendados
 */
router.get('/misContactos', get_my_contacts);


export default router;
