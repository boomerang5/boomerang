import express from 'express';
import { add_user_to_group, create_group, remove_user_from_group, update_group_info } from '../controllers/grupoController';

const router = express.Router();

// POST CREATE_GROUP
/**
 * @swagger
 * /api/groups/create:
 *   post:
 *     summary: Crear nuevo grupo
 *     tags: [Grupos]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nombre_grupo
 *               - id_usuario
 *             properties:
 *               nombre_grupo:
 *                 type: string
 *                 example: "Grupo 1"
 *               descripcion:
 *                 type: string
 *                 example: "Esta es la descripción"
 *               id_usuario:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       200:
 *         description: Grupo creado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   example: 1
 */
router.post('/create', create_group);

//-----------------------------------------------------------------------------------------------------------------
// POST ADD_USERS_TO_GROUP
/**
 * @swagger
 * /api/groups/add:
 *   post:
 *     summary: Agregar usuarios a un grupo
 *     tags: [Grupos]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id_usuario
 *               - id_grupo
 *             properties:
 *               id_usuario:
 *                 type: integer
 *                 example: 19
 *               id_grupo:
 *                 type: integer
 *                 example: 2
 *     responses:
 *       200:
 *         description: Usuario agregado correctamente
 */
router.post('/add', add_user_to_group);

//-----------------------------------------------------------------------------------------------------------------
// POST REMOVE_USER_FROM_GROUP
/**
 * @swagger
 * /api/groups/remove:
 *   post:
 *     summary: Eliminar un usuario de un grupo
 *     tags: [Grupos]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id_grupo
 *               - id_usuario
 *             properties:
 *               id_grupo:
 *                 type: integer
 *                 example: 1
 *               id_usuario:
 *                 type: integer
 *                 example: 2
 *     responses:
 *       200:
 *         description: Eliminar usuario de grupo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               example:
 *                 message: Usuario eliminado del grupo correctamente
 *       400:
 *         description: Faltan parámetros
 *       500:
 *         description: Error interno del servidor
 */
router.post('/remove', remove_user_from_group);

//-----------------------------------------------------------------------------------------------------------------
// PATCH UPDATE_GROUP_INFO
/**
 * @swagger
 * /api/groups/update:
 *   patch:
 *     summary: Actualizar info de un grupo
 *     tags: [Grupos]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id_grupo:
 *                 type: integer
 *                 example: 1
 *               nuevo_nombre:
 *                 type: string
 *                 nullable: true
 *                 example: "Grupo Frontend"
 *               nueva_descripcion:
 *                 type: string
 *                 nullable: true
 *                 example: "Descripción Grupo Frontend"
 *             required:
 *               - id_grupo
 * 
 *     responses:
 *       200:
 *         description: Info de Grupo actualizada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               example:
 *                 message: Info de Grupo actualizada correctamente
 *       400:
 *         description: Faltan parámetros
 *       500:
 *         description: Error interno del servidor
 */
router.patch('/update', update_group_info);

export default router;
