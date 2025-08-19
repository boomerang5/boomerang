import { Router } from 'express';
import multer from 'multer';
import { create_message, delete_message, edit_message, get_chat_messages, get_file } from '../controllers/mensajeController';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
});

// -------------------------------------
// POST /api/mensajes/create-text (JSON)
// -------------------------------------
/**
 * @swagger
 * /api/mensajes/create-text:
 *   post:
 *     summary: Crea un mensaje de texto
 *     tags:
 *       - Mensajes
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id_chat:
 *                 type: integer
 *                 example: 4
 *               id_emisor:
 *                 type: integer
 *                 example: 1
 *               texto:
 *                 type: string
 *                 example: "Hola tanto tiempo"
 *             required:
 *               - id_chat
 *               - id_emisor
 *               - texto
 *     responses:
 *       201:
 *         description: Mensaje creado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id_mensaje:
 *                   type: integer
 *                   example: 123
 *       400:
 *         description: Parámetros inválidos
 *       500:
 *         description: Error interno del servidor
 */
router.post('/create-text', create_message);

// ----------------------------------------
// POST /api/mensajes/create-file (multipart)
// ----------------------------------------
/**
 * @swagger
 * /api/mensajes/create-file:
 *   post:
 *     summary: Crea un mensaje con archivo
 *     tags:
 *       - Mensajes
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               id_chat:
 *                 type: integer
 *                 example: 4
 *               id_emisor:
 *                 type: integer
 *                 example: 1
 *               texto:
 *                 type: string
 *                 nullable: true
 *                 example: "Adjunto un PDF"
 *               id_tipo:
 *                 type: integer
 *                 description: Tipo de archivo (2 archivo, 3 imagen, 4 audio, 5 video)
 *                 example: 2
 *               archivo:
 *                 type: string
 *                 format: binary
 *                 description: Archivo a adjuntar
 *             required:
 *               - id_chat
 *               - id_emisor
 *               - id_tipo
 *               - archivo
 *           encoding:
 *             archivo:
 *               contentType: application/octet-stream
 *     responses:
 *       201:
 *         description: Mensaje creado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id_mensaje:
 *                   type: integer
 *                   example: 456
 *       400:
 *         description: Parámetros inválidos
 *       500:
 *         description: Error interno del servidor
 */
router.post('/create-file', upload.single('archivo'), create_message);

// ------------------------------------------------------------------------------------------------------
// DELETE_MESSAGE
/**
 * @swagger
 * /api/mensajes/delete:
 *   post:
 *     summary: Marca un mensaje como eliminado (soft delete) y elimina el archivo asociado si existe
 *     tags:
 *       - Mensajes
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id_mensaje:
 *                 type: integer
 *                 example: 42
 *               id_emisor:
 *                 type: integer
 *                 example: 1
 *             required:
 *               - id_mensaje
 *               - id_emisor
 *     responses:
 *       200:
 *         description: Mensaje marcado como eliminado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 deleted_message:
 *                   type: boolean
 *                   example: true
 *                 deleted_file:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Parámetros inválidos
 *       404:
 *         description: Mensaje no encontrado o no pertenece al emisor
 *       500:
 *         description: Error interno del servidor
 */
router.post('/delete', delete_message);

//-----------------------------------------------------------------------------------------------------------------
//PATCH EDIT_MESSAGE
/**
 * @swagger
 * /api/mensajes/edit:
 *   patch:
 *     summary: Edita el texto de un mensaje
 *     tags:
 *       - Mensajes
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id_emisor:
 *                 type: integer
 *                 example: 1
 *               id_mensaje:
 *                 type: integer
 *                 example: 42
 *               nuevo_texto:
 *                 type: string
 *                 description: Nuevo contenido del mensaje
 *                 example: "Mensaje editado"
 *             required:
 *               - id_emisor
 *               - id_mensaje
 *               - nuevo_texto
 *     responses:
 *       200:
 *         description: Mensaje actualizado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Mensaje actualizado correctamente"
 *       400:
 *         description: Parámetros inválidos
 *       404:
 *         description: Mensaje no encontrado o no pertenece al emisor
 *       500:
 *         description: Error interno del servidor
 */
router.patch('/edit', edit_message);

//-----------------------------------------------------------------------------------------------------------------
// GET GET_FILE
/**
 * @swagger
 * /api/mensajes/getfile:
 *   get:
 *     summary: Obtiene la información de un archivo.
 *     tags:
 *       - Mensajes
 *     parameters:
 *       - in: query
 *         name: id_archivo
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del archivo.
 *     responses:
 *       200:
 *         description: Info del archivo encontrada.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   example: 8
 *                 path_archivo:
 *                   type: string
 *                   example: "4/1754422478876_calendario.pdf"
 *                 fecha_carga:
 *                   type: string
 *                   format: date-time
 *                   example: "2025-08-05T19:34:40.621444Z"
 *                 id_tipo_archivo:
 *                   type: integer
 *                   example: 2
 *                 nombre_tipo:
 *                   type: string
 *                   example: "archivo"
 *                 descripcion_tipo:
 *                   type: string
 *                   example: "Archivo adjunto"
 *                 id_usuario:
 *                   type: integer
 *                   example: 1
 *                 es_mensaje:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: ID inválido.
 */
router.get('/getfile', get_file);

//-----------------------------------------------------------------------------------------------------------------
// GET GET_CHAT_MESSAGES
/**
 * @swagger
 * /api/mensajes/chat-messages:
 *   get:
 *     summary: Obtiene los mensajes de un chat con datos de un emisor y archivo (si existe)
 *     tags:
 *       - Mensajes
 *     parameters:
 *       - in: query
 *         name: id_chat
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del chat.
 *       - in: query
 *         name: id_usuario
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del usuario solicitante.
 *     responses:
 *       200:
 *         description: Lista de mensajes del chat.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     example: 123
 *                   texto:
 *                     type: string
 *                     example: "Hola, ¿cómo va?"
 *                   fecha:
 *                     type: string
 *                     format: date-time
 *                     example: "2025-08-05T19:34:40.621444Z"
 *                   id_emisor:
 *                     type: integer
 *                     example: 1
 *                   nombre:
 *                     type: string
 *                     example: "Juan"
 *                   apellido:
 *                     type: string
 *                     example: "Pérez"
 *                   apodo:
 *                     type: string
 *                     example: "juampi"
 *                   id_archivo:
 *                     type: integer
 *                     nullable: true
 *                     example: null
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
 *                   descripcion_tipo:
 *                     type: string
 *                     nullable: true
 *                     example: "Archivo adjunto"
 *       400:
 *         description: Parámetros inválidos.
 *       500:
 *         description: Error interno del servidor.
 */
router.get("/chat-messages", get_chat_messages);



export default router;
