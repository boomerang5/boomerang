import express from 'express';

const router = express.Router();

import { get_all_contacts, create_usuario_profile, update_usuario_profile, get_usuario_uuid, get_user_by_id_usuario, change_state_user, get_state_user, update_user_profile_photo, get_user_language, get_all_idiomas, get_all_generos} from '../controllers/userController';

// GET GET_ALL_CONTACTS
/**
 * @swagger
 * /api/users/contacts:
 *   get:
 *     summary: Buscar cualquier contactos (usuarios visibles con estado de agenda)
 *     tags: [Usuarios]
 *     parameters:
 *       - in: query
 *         name: id_usuario
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del usuario que hace la búsqueda
 *       - in: query
 *         name: busqueda
 *         required: false
 *         schema:
 *           type: string
 *         description: Término de búsqueda (nombre, apellido o apodo)
 *     responses:
 *       200:
 *         description: Lista de usuarios con campo `en_agenda`
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
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
 *                     example: FFFRan
 *                   en_agenda:
 *                     type: boolean
 *                     example: true
 */
router.get('/contacts', get_all_contacts);

//-----------------------------------------------------------------------------------------------------------------
//POST CREATE_USUARIO_PROFILE
/**
 * @swagger
 * /api/users/profile:
 *   post:
 *     summary: Crear perfil de usuario en tabla Usuario
 *     tags: [Usuarios]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nombre
 *               - apellido
 *               - idioma
 *               - apodo
 *               - user_id
 *             properties:
 *               nombre:
 *                 type: string
 *                 example: Paula
 *               apellido:
 *                 type: string
 *                 example: Arrascaeta
 *               idioma:
 *                 type: integer
 *                 example: 1
 *               apodo:
 *                 type: string
 *                 example: Peu
 *               user_id:
 *                 type: string
 *                 example: fd4680cc-e879-4a70-8c19-21c1d0ab3ee6
 *               genero:
 *                 type: integer
 *                 example: 2
 *               fecha_nacimiento:
 *                 type: string
 *                 format: date
 *                 example: 2001-06-20
 *     responses:
 *       200:
 *         description: ID del usuario creado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   example: 17
 */
router.post('/profile', create_usuario_profile);

//-----------------------------------------------------------------------------------------------------------------
// POST UPDATE_USUARIO_PROFILE
/**
 * @swagger
 * /api/users/update:
 *   put:
 *     summary: Actualizar perfil de usuario
 *     tags: [Usuarios]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *               - nombre
 *               - apellido
 *               - apodo
 *               - pais
 *               - genero
 *               - fecha_nacimiento
 *               - idioma
 *             properties:
 *               id:
 *                 type: integer
 *                 example: 2
 *               nombre:
 *                 type: string
 *                 example: Pedro
 *               apellido:
 *                 type: string
 *                 example: Argañaraz
 *               apodo:
 *                 type: string
 *                 example: Pedrito
 *               pais:
 *                 type: string
 *                 example: Argentina
 *               genero:
 *                 type: integer
 *                 example: 1
 *               fecha_nacimiento:
 *                 type: string
 *                 format: date
 *                 example: 2001-10-04
 *               idioma:
 *                 type: integer
 *                 example: 2
 *     responses:
 *       200:
 *         description: Perfil actualizado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Perfil actualizado correctamente
 *                 usuario:
 *                   type: object
 */
router.put('/update', update_usuario_profile);



//-----------------------------------------------------------------------------------------------------------------
//POST CHANGE_STATE_USER
/**
 * @swagger
 * /api/users/state/change:
 *   post:
 *     summary: Cambiar el estado del usuario, por ejemplo disponible u ocupado
 *     tags: [Usuarios]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id_usuario
 *               - id_estado
 *             properties:
 *               id_usuario:
 *                 type: integer
 *                 example: 2
 *               id_estado:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       200:
 *         description: Estado del usuario actualizado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Estado actualizado correctamente
 */
router.post('/state/change', change_state_user);


//-----------------------------------------------------------------------------------------------------------------
//POST UPDATE_USER_PROFILE_PHOTO
/**
 * @swagger
 * /api/users/photo/update:
 *   post:
 *     summary: Actualizar foto de perfil del usuario asignando un archivo existente
 *     tags: [Usuarios]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id_usuario
 *               - id_archivo
 *             properties:
 *               id_usuario:
 *                 type: integer
 *                 example: 2
 *               id_archivo:
 *                 type: integer
 *                 example: 7
 *     responses:
 *       200:
 *         description: Foto de perfil actualizada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Foto de perfil actualizada correctamente
 */
router.post('/photo/update', update_user_profile_photo);

//-----------------------------------------------------------------------------------------------------------------
//GET GET_STATE_USER
/**
 * @swagger
 * /api/users/state:
 *   get:
 *     summary: Obtener el estado actual del usuario
 *     tags: [Usuarios]
 *     parameters:
 *       - in: query
 *         name: id_usuario
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del usuario
 *     responses:
 *       200:
 *         description: Estado actual del usuario
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id_estado:
 *                   type: integer
 *                   example: 1
 *                 nombre_estado:
 *                   type: string
 *                   example: Disponible
 *       404:
 *         description: Usuario no encontrado
 */
router.get('/state', get_state_user);


//-----------------------------------------------------------------------------------------------------------------
// GET GET_USER_LANGUAGE
/**
 * @swagger
 * /api/users/language:
 *   get:
 *     summary: Obtener el idioma del usuario
 *     tags: [Usuarios]
 *     parameters:
 *       - in: query
 *         name: id_usuario
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del usuario
 *     responses:
 *       200:
 *         description: Idioma del usuario
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id_idioma:
 *                   type: integer
 *                   example: 2
 *                 nombre_idioma:
 *                   type: string
 *                   example: Ingles
 *                 codigo_iso:
 *                   type: string
 *                   example: en-US
 *       400:
 *         description: ID de usuario inválido
 *       404:
 *         description: Usuario o idioma no encontrado
 */
router.get("/language", get_user_language);


//-----------------------------------------------------------------------------------------------------------------
// GET GET_USUARIO_UUID
/**
 * @swagger
 * /api/users/uuid/{uuid}:
 *   get:
 *     summary: Obtener ID del usuario a partir del UUID
 *     tags: [Usuarios]
 *     parameters:
 *       - in: path
 *         name: uuid
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID del usuario (auth.users)
 *     responses:
 *       200:
 *         description: ID del usuario encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   example: 3
 */

router.get("/uuid/:uuid", get_usuario_uuid);

//-----------------------------------------------------------------------------------------------------------------
// GET GET_USER_BY_ID_USUARIO
/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Obtener usuario por ID
 *     tags: [Usuarios]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del usuario
 *     responses:
 *       200:
 *         description: Usuario encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id_usuario:
 *                   type: integer
 *                   example: 21
 *                 nombre:
 *                   type: string
 *                   example: Pedro
 *                 apellido:
 *                   type: string
 *                   example: Argañaraz
 *                 mail:
 *                   type: string
 *                   example: pedroarganaraz12@gmail.com
 *                 fecha_registro:
 *                   type: string
 *                   format: date-time
 *                   example: 2025-07-11T02:06:57.584557
 *                 apodo:
 *                   type: string
 *                   example: Drope
 *                 id_idioma:
 *                   type: integer
 *                   example: 1
 *                 nombre_idioma:
 *                   type: string
 *                   example: Español
 *                 fecha_nacimiento:
 *                   type: string
 *                   format: date
 *                   example: 2001-10-04
 *                 id_genero:
 *                   type: integer
 *                   example: 1
 *                 nombre_genero:
 *                   type: string
 *                   example: Femenino
 */

router.get('/:id', get_user_by_id_usuario);

export default router;
