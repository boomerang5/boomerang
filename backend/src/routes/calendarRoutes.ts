import express from 'express';
import { create_event, delete_event, get_event_details, get_user_events, respond_event_invite, update_event, get_event_confirmation, update_event_confirmation, update_event_participants } from '../controllers/calendarController';

const router = express.Router();

// POST CREATE_EVENT
/**
 * @swagger
 * /api/calendar/create:
 *   post:
 *     summary: Crear nuevo evento
 *     tags: [Calendario]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id_creador
 *               - titulo
 *               - fecha
 *             properties:
 *               id_creador:
 *                 type: integer
 *                 example: 1
 *               titulo:
 *                 type: string
 *                 example: "Reunión de equipo"
 *               fecha:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-09-18T10:00:00Z"
 *               descripcion:
 *                 type: string
 *                 example: "Reunión para discutir el proyecto"
 *               color:
 *                 type: string
 *                 description: Color en HEX (ej. #FF5733)
 *                 example: "#FF5733"
 *               invitados:
 *                 type: array
 *                 description: IDs de usuarios invitados (opcional)
 *                 items:
 *                   type: integer
 *                 example: [2, 3]
 *     responses:
 *       201:
 *         description: Evento creado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   example: 42
 *       400:
 *         description: Faltan campos requeridos o datos inválidos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Faltan campos requeridos."
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Error interno del servidor."
 */
router.post('/create', create_event);

// -----------------------------------------------------------------------------------------------------------------
// POST DELETE_EVENT
/**
 * @swagger
 * /api/calendar/delete:
 *   post:
 *     summary: Eliminar un evento
 *     tags: [Calendario]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id_evento
 *               - id_editor
 *             properties:
 *               id_evento:
 *                 type: integer
 *                 example: 8
 *               id_editor:
 *                 type: integer
 *                 example: 2
 *     responses:
 *       200:
 *         description: Evento eliminado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               example:
 *                 message: "Evento eliminado correctamente"
 *       400:
 *         description: Faltan campos requeridos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Faltan campos requeridos."
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Error interno del servidor."
 */
router.post('/delete', delete_event);

// -----------------------------------------------------------------------------------------------------------------
// GET GET_EVENT_DETAILS
/**
 * @swagger
 * /api/calendar/details:
 *   get:
 *     summary: Obtener detalles de un evento
 *     tags: [Calendario]
 *     parameters:
 *       - in: query
 *         name: id_evento
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID del evento
 *       - in: query
 *         name: id_usuario
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID del usuario que consulta (para permisos/visibilidad)
 *     responses:
 *       200:
 *         description: Detalles del evento
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               example:
 *                 id: 8
 *                 titulo: "Reunión de equipo"
 *                 fecha: "2025-09-18T10:00:00Z"
 *                 descripcion: "Reunión para discutir el proyecto"
 *                 color: "#FF5733"
 *                 creador:
 *                   id: 1
 *                   nombre: "Juan Pérez"
 *                 invitados:
 *                   - id: 2
 *                     nombre: "Ana Gómez"
 *                   - id: 3
 *                     nombre: "Luis Martínez"
 *       400:
 *         description: Faltan campos requeridos o parámetros inválidos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Parámetros inválidos: id_evento e id_usuario deben ser enteros."
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Error interno del servidor."
 */
router.get('/details', get_event_details);

// --------------------------------------------------------------------------------------------------------------
// GET GET_USER_EVENTS
/**
 * @swagger
 * /api/calendar/user-events:
 *   get:
 *     summary: Obtener eventos de un usuario
 *     tags: [Calendario]
 *     parameters:
 *       - in: query
 *         name: id_usuario
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID del usuario
 *       - in: query
 *         name: fecha_desde
 *         schema:
 *           type: string
 *           format: date-time
 *         required: false
 *         description: Fecha desde (opcional) — timestamp ISO 8601
 *       - in: query
 *         name: fecha_hasta
 *         schema:
 *           type: string
 *           format: date-time
 *         required: false
 *         description: Fecha hasta (opcional) — timestamp ISO 8601
 *     responses:
 *       200:
 *         description: Lista de eventos del usuario
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *             example:
 *               - id: 8
 *                 titulo: "Reunión de equipo"
 *                 fecha: "2025-09-18T10:00:00Z"
 *                 descripcion: "Reunión para discutir el proyecto"
 *                 color: "#FF5733"
 *                 creador:
 *                   id: 1
 *                   nombre: "Juan Pérez"
 *                 invitados:
 *                   - id: 2
 *                     nombre: "Ana Gómez"
 *                   - id: 3
 *                     nombre: "Luis Martínez"
 *       400:
 *         description: Faltan campos requeridos o parámetros inválidos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *             example:
 *               error: "Parámetro inválido: id_usuario debe ser un entero."
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *             example:
 *               error: "Error interno del servidor."
 */
router.get('/user-events', get_user_events);

// --------------------------------------------------------------------------------------------------------------
// POST RESPOND_EVENT_INVITE
/**
 * @swagger
 * /api/calendar/respond-invite:
 *   post:
 *     summary: Responder a una invitación de evento
 *     tags: [Calendario]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id_evento
 *               - id_usuario
 *               - confirmado
 *             properties:
 *               id_evento:
 *                 type: integer
 *                 example: 8
 *               id_usuario:
 *                 type: integer
 *                 example: 2
 *               confirmado:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Respuesta registrada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               example:
 *                 message: "Respuesta registrada correctamente"
 *       400:
 *         description: Faltan campos requeridos o parámetros inválidos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Faltan campos requeridos o parámetros inválidos."
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Error interno del servidor."
 */
router.post('/respond-invite', respond_event_invite);

// GET CONFIRMACION - Obtener estado de confirmación
router.get('/confirmacion', get_event_confirmation);

// PUT CONFIRMACION - Actualizar estado de confirmación  
router.put('/confirmacion', update_event_confirmation);

//--------------------------------------------------------------------------------------------------------------
// PATCH UPDATE_EVENT
/**
 * @swagger
 * /api/calendar/update:
 *   patch:
 *     summary: Actualizar un evento
 *     tags: [Calendario]
 *     description: Actualiza parcialmente un evento. Debe incluir al menos un campo a modificar.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id_evento
 *               - id_editor
 *             properties:
 *               id_evento:
 *                 type: integer
 *                 example: 8
 *               id_editor:
 *                 type: integer
 *                 example: 2
 *               titulo:
 *                 type: string
 *                 example: "Reunión de equipo actualizada"
 *               fecha:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-09-18T11:00:00Z"
 *               descripcion:
 *                 type: string
 *                 example: "Reunión para discutir el proyecto - hora actualizada"
 *               color:
 *                 type: string
 *                 description: Color en HEX (ej. #33FF57)
 *                 example: "#33FF57"
 *     responses:
 *       200:
 *         description: Evento actualizado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               example:
 *                 message: "Evento actualizado correctamente"
 *       400:
 *         description: Faltan campos requeridos o parámetros inválidos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *               example:
 *                 error: "Faltan campos requeridos."
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *               example:
 *                 error: "Error interno del servidor."
 */
router.patch('/update', update_event);

/**
 * @swagger
 * /api/calendar/invitados:
 *   patch:
 *     summary: Actualizar participantes de un evento
 *     tags: [Calendario]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id_evento
 *               - id_editor
 *             properties:
 *               id_evento:
 *                 type: integer
 *                 example: 1
 *               id_editor:
 *                 type: integer
 *                 example: 2
 *               participantes:
 *                 type: array
 *                 description: IDs de usuarios participantes (opcional, array vacío elimina todos los invitados)
 *                 items:
 *                   type: integer
 *                 example: [2, 3, 4]
 *     responses:
 *       200:
 *         description: Participantes actualizados correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *               example:
 *                 message: "Participantes actualizados correctamente"
 *       400:
 *         description: Datos inválidos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *               example:
 *                 error: "id_evento es requerido."
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *               example:
 *                 error: "Usuario no autenticado."
 *       403:
 *         description: Sin permisos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *               example:
 *                 error: "Solo el creador puede actualizar los participantes del evento"
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *               example:
 *                 error: "Error interno del servidor."
 */
router.patch('/invitados', update_event_participants);


export default router;
