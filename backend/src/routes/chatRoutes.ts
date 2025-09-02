import express from 'express';
import { create_chat, create_group_with_chat, delete_chat, get_chat_info, get_user_chats, leave_group_chat } from '../controllers/chatController'

const router = express.Router();

// POST CREATE_CHAT
/**
 * @swagger
 * /api/chats/create:
 *   post:
 *     summary: Crear un chat (privado o grupal)
 *     tags: [Chats]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               # Opción 1: Chat privado
 *               - type: object
 *                 properties:
 *                   id_usuario:
 *                     type: integer
 *                     example: 1
 *                   id_contacto:
 *                     type: integer
 *                     example: 2
 *                 required: [id_usuario, id_contacto]
 *
 *               # Opción 2: Chat grupal
 *               - type: object
 *                 properties:
 *                   id_usuario:
 *                     type: integer
 *                     example: 1
 *                   nombre_grupo:
 *                     type: string
 *                     nullable: true
 *                     example: "Grupo de Trabajo"
 *                   id_grupo:
 *                     type: integer
 *                     nullable: true
 *                     example: 6
 *                 required: [id_usuario]
 *                 allOf:
 *                   - anyOf:
 *                       - required: [nombre_grupo]
 *                       - required: [id_grupo]
 *                   - not:
 *                       required: [id_contacto, id_grupo,]  # XOR: no ambos a la vez
 *           examples:
 *             privado:
 *               summary: Chat privado
 *               value:
 *                 id_usuario: 1
 *                 id_contacto: 7
 *             grupal:
 *               summary: Chat grupal (admin, nombre, grupo existente)
 *               value:
 *                 id_usuario: 1
 *                 nombre_grupo: "Trabajo"
 *                 id_grupo: 6
 *     responses:
 *       200:
 *         description: Chat creado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id_chat:
 *                   type: integer
 *               example:
 *                 id_chat: 10
 *       400:
 *         description: Body inválido o combinación de parámetros no permitida
 *       500:
 *         description: Error interno del servidor
 */
router.post('/create', create_chat);

//----------------------------------------------------------------------------------------

// POST CREATE_GROUP_WITH_CHAT
/**
 * @swagger
 * /api/chats/create-group-with-chat:
 *   post:
 *     summary: Crear un grupo y su chat grupal
 *     tags: [Chats]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id_usuario_creador:
 *                 type: integer
 *                 example: 1
 *               nombre:
 *                 type: string
 *                 example: "Equipo Tesis"
 *               descripcion:
 *                 type: string
 *                 nullable: true
 *                 example: "Grupo de coordinación del proyecto"
 *               participantes:
 *                 oneOf:
 *                   - type: array
 *                     description: Lista de IDs de usuarios a agregar como miembros
 *                     items:
 *                       type: integer
 *                       example: 2
 *                   - type: string
 *                     description: CSV de IDs de usuarios (ej. "2,3,5")
 *                     example: "2,3,5"
 *             required: [id_usuario_creador, nombre]
 *           examples:
 *             con_array:
 *               summary: Con participantes (array)
 *               value:
 *                 id_usuario_creador: 1
 *                 nombre: "Equipo Tesis"
 *                 descripcion: "Grupo de prueba"
 *                 participantes: [2,3,5]
 *             con_csv:
 *               summary: Con participantes (CSV)
 *               value:
 *                 id_usuario_creador: 1
 *                 nombre: "Equipo Tesis"
 *                 participantes: "2,3,5"
 *             sin_participantes:
 *               summary: Sólo creador (sin participantes)
 *               value:
 *                 id_usuario_creador: 1
 *                 nombre: "Equipo Tesis"
 *     responses:
 *       200:
 *         description: Grupo y chat creados correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id_grupo:
 *                   type: integer
 *                   example: 12
 *                 id_chat:
 *                   type: integer
 *                   example: 34
 *       400:
 *         description: Body inválido o parámetros faltantes
 *       500:
 *         description: Error interno del servidor
 */
router.post("/create-group-with-chat", create_group_with_chat);

//----------------------------------------------------------------------------------------

// POST DELETE_CHAT
/**
 * @swagger
 * /api/chats/delete:
 *   post:
 *     summary: Baja lógica de un chat solo para el usuario actual (oculta el chat).
 *     tags: [Chats]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id_emisor
 *               - id_chat
 *             properties:
 *               id_emisor:
 *                 type: integer
 *                 example: 1
 *               id_chat:
 *                 type: integer
 *                 example: 5
 *     responses:
 *       200:
 *         description: Chat eliminado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               example:
 *                 message: Chat eliminado correctamente
 *       400:
 *         description: Faltan parámetros
 *       500:
 *         description: Error interno del servidor
 */
router.post('/delete', delete_chat);

//----------------------------------------------------------------------------------------
// GET GET_CHAT_INFO
/**
 * @swagger
 * /api/chats/info:
 *   get:
 *     summary: Retorna información básica del chat (tipo, nombre, fecha de creación).
 *     tags: [Chats]
 *     parameters:
 *       - in: query
 *         name: id_chat
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del Chat
 *     responses:
 *       200:
 *         description: Información del chat
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id_chat:
 *                   type: integer
 *                   example: 4
 *                 tipo:
 *                   type: string
 *                   example: Privado
 *                 nombre: 
 *                   type: string
 *                   example: "Trabajo"
 *                 fecha_creacion:
 *                   type: date-time
 *                   example: "2025-07-30T03:27:23.142743"
 *       404:
 *         description: Chat no encontrado
 */
router.get('/info', get_chat_info);

//----------------------------------------------------------------------------------------
// GET GET_USER_CHATS
/**
 * @swagger
 * /api/chats/user:
 *   get:
 *     summary: Obtiene todos los chats del usuario ordenados por fecha de último mensaje, incluyendo archivo si aplica.
 *     tags: [Chats]
 *     parameters:
 *       - in: query
 *         name: id_usuario
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *         description: ID del Usuario
 *     responses:
 *       200:
 *         description: Lista de chats del usuario
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id_chat:
 *                     type: integer
 *                     example: 3
 *                   nombre:
 *                     type: string
 *                     nullable: true
 *                     example: "Chat Facultad"
 *                   ultimo_mensaje:
 *                     type: string
 *                     nullable: true
 *                     example: "PDF"
 *                   fecha_ultimo_mensaje:
 *                     type: string
 *                     format: date-time
 *                     example: "2025-07-30T03:27:23.142743"
 *                   id_archivo:
 *                     type: integer
 *                     nullable: true
 *                     example: 8
 *                   path_archivo:
 *                     type: string
 *                     nullable: true
 *                     example: "4/1754422478876_calendario.pdf"
 *                   id_tipo_archivo:
 *                     type: integer
 *                     nullable: true
 *                     example: 2
 *                   nombre_tipo:
 *                     type: string
 *                     nullable: true
 *                     example: "archivo"
 *       400:
 *         description: Parámetros inválidos
 *       404:
 *         description: No se encontraron chats para el usuario
 */

router.get('/user', get_user_chats);

//-----------------------------------------------------------------------------------------------------------------
// POST REMOVE_USER_FROM_GROUP
/**
 * @swagger
 * /api/chats/leave:
 *   post:
 *     summary: Permite al usuario salir de un chat grupal.
 *     tags: [Chats]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id_emisor
 *               - id_chat
 *             properties:
 *               id_emisor:
 *                 type: integer
 *                 example: 1
 *               id_chat:
 *                 type: integer
 *                 example: 2
 *     responses:
 *       200:
 *         description: Usuario salió del chat grupal
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               example:
 *                 message: Usuario salió del chat grupal correctamente
 *       400:
 *         description: Faltan parámetros
 *       500:
 *         description: Error interno del servidor
 */
router.post('/leave', leave_group_chat);


export default router;
