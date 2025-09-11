// src/routes/llamadaRoutes.ts
import { Router } from "express";
import { get_call_info, get_user_call_history } from "../controllers/llamadaController";

const router = Router();

//-----------------------------------------------------------------------------------------------------------------
// GET GET_CALL_INFO
/**
 * @swagger
 * /api/llamadas/info/{idUsuario}/{idLlamada}:
 *   get:
 *     summary: Obtiene la información de una llamada específica para un usuario
 *     tags: [Llamadas]
 *     parameters:
 *       - in: path
 *         name: idUsuario
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del usuario
 *       - in: path
 *         name: idLlamada
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la llamada
 *     responses:
 *       200:
 *         description: Información de la llamada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id_llamada:        { type: integer, example: 56 }
 *                       fecha_inicio:      { type: string, format: date-time, example: "2025-08-28T16:35:16.571106+00:00" }
 *                       fecha_fin:         { type: string, format: date-time, nullable: true, example: "2025-08-28T16:50:28.734103+00:00" }
 *                       duracion_segundos: { type: integer, example: 912 }
 *                       titulo:            { type: string, nullable: true, example: "9229d770-0d5f-4391-88f9-5e87de6ce6a3" }
 *                       descripcion:       { type: string, nullable: true, example: "{\"from\":\"2\",\"to\":\"19\"}" }
 *                       id_grupo:          { type: integer, nullable: true, example: null }
 *                       id_usuario:        { type: integer, example: 2 }
 *                       nombre:            { type: string, example: "Pedro" }
 *                       apellido:          { type: string, example: "Argañaraz" }
 *                       es_host:           { type: boolean, example: true }
 *                       ingreso:           { type: string, format: date-time, example: "2025-08-28T16:35:17.294857+00:00" }
 *                       salida:            { type: string, format: date-time, example: "2025-08-28T16:50:28.734103+00:00" }
 *       400:
 *         description: Parámetros inválidos
 *       404:
 *         description: No se encontraron datos para la llamada
 *       500:
 *         description: Error interno al obtener información de la llamada
 */
router.get("/info/:idUsuario/:idLlamada", get_call_info);

/**
 * @swagger
 * /api/llamadas/history:
 *   get:
 *     summary: Obtiene el historial de llamadas de un usuario
 *     tags: [Llamadas]
 *     parameters:
 *       - in: query
 *         name: id_usuario
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del usuario
 *     responses:
 *       200:
 *         description: Historial de llamadas del usuario
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id_llamada:        { type: integer, example: 56 }
 *                       fecha_inicio:      { type: string, format: date-time, example: "2025-08-28T16:35:16.571106+00:00" }
 *                       fecha_fin:         { type: string, format: date-time, nullable: true, example: "2025-08-28T16:50:28.734103+00:00" }
 *                       duracion_segundos: { type: integer, example: 912 }
 *                       titulo:            { type: string, nullable: true, example: "Sprint planning" }
 *                       descripcion:       { type: string, nullable: true, example: "Llamada semanal del equipo" }
 *                       id_grupo:          { type: integer, nullable: true, example: 12 }
 *                       es_host:           { type: boolean, example: true }
 *       400:
 *         description: Parámetro inválido
 *       404:
 *         description: No se encontraron llamadas para el usuario
 *       500:
 *         description: Error interno al obtener historial de llamadas
 */
router.get("/history", get_user_call_history);


export default router;
