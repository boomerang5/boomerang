import express from 'express';
import { supabase } from '../lib/supabase';

const router = express.Router();

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
router.get('/contacts', async (req, res) => {
  const idUsuario = parseInt(req.query.id_usuario as string);
  const busqueda = req.query.busqueda as string | undefined;

  if (isNaN(idUsuario)) {
    return res.status(400).json({ error: 'ID de usuario inválido' });
  }

  const { data, error } = await supabase.rpc('get_all_contacts', {
    p_id_usuario: idUsuario,
    p_busqueda: busqueda ?? null,
  });

  if (error) {
    console.error('❌ Error Supabase:', error);
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

//POST CREATE USUARIO PROFILE
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
router.post('/profile', async (req, res) => {
  const {
    nombre,
    apellido,
    idioma,
    apodo,
    user_id,
    genero,
    fecha_nacimiento
  } = req.body;

  if (!nombre || !apellido || !idioma || !apodo || !user_id) {
    return res.status(400).json({ error: 'Faltan campos requeridos.' });
  }

  try {
    const { data, error } = await supabase.rpc('create_usuario_profile', {
      p_nombre: nombre,
      p_apellido: apellido,
      p_idioma: idioma,
      p_apodo: apodo,
      p_user_id: user_id,
      p_genero: genero ?? null,
      p_fec_nacimiento: fecha_nacimiento ?? null,
    });

    if (error) {
      console.error('❌ Supabase error:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ id: data });
  } catch (err) {
    console.error('❌ Error inesperado:', err);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

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
 *               - idioma
 *               - apodo
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
 *               idioma:
 *                 type: integer
 *                 example: 2
 *               apodo:
 *                 type: string
 *                 example: Pedrito
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
 */
router.put('/update', async (req, res) => {
  const { id, nombre, apellido, idioma, apodo } = req.body;

  if (!id || !nombre || !apellido || !idioma || !apodo) {
    return res.status(400).json({ error: 'Faltan campos requeridos.' });
  }

  try {
    const { data, error } = await supabase.rpc('update_usuario_profile', {
      p_id: id,
      p_nombre: nombre,
      p_apellido: apellido,
      p_idioma: idioma,
      p_apodo: apodo,
    });

    if (error) {
      if (error.message.includes('No se encontró un usuario')) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      console.error('❌ Supabase error:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ message: 'Perfil actualizado correctamente' });
  } catch (err) {
    console.error('❌ Error inesperado:', err);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
});


// GET GET_USER_BY_UUID
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

router.get("/uuid/:uuid", async (req, res) => {
  const uuidUsuario = req.params.uuid;

  try {
    const { data, error } = await supabase.rpc("get_usuario_uuid", {
      p_user_id: uuidUsuario,
    });

    if (error) {
      console.error("❌ Supabase error:", error);
      return res.status(500).json({ error: "Error al obtener el usuario." });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    return res.status(200).json(data[0]); // Devuelve { id: ... }
  } catch (err) {
    console.error("❌ Error inesperado:", err);
    return res.status(500).json({ error: "Error interno del servidor." });
  }
});

// GET GET_USER_BY_ID
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
 *                 id:
 *                   type: integer
 *                   example: 15
 *                 nombre:
 *                   type: string
 *                   example: Paula
 *                 apellido:
 *                   type: string
 *                   example: Arrascaeta
 *                 mail:
 *                   type: string
 *                   example: anapaulaft02@gmail.com
 *                 fecha_registro:
 *                   type: string
 *                   format: date-time
 *                   example: 2025-07-11T02:06:57.584557
 *                 apodo:
 *                   type: string
 *                   example: Peu
 *                 id_idioma:
 *                   type: integer
 *                   example: 1
 *                 nombre_idioma:
 *                   type: string
 *                   example: Español
 *                 fecha_nacimiento:
 *                   type: string
 *                   format: date
 *                   example: 2001-06-20
 *                 id_genero:
 *                   type: integer
 *                   example: 2
 *                 nombre_genero:
 *                   type: string
 *                   example: Femenino
 */

router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'ID inválido' });
  }

  const { data, error } = await supabase.rpc('get_user_by_id_usuario', {
    p_id_usuario: id,
  });

  if (error) return res.status(500).json({ error: error.message });
  if (!data || data.length === 0) return res.status(404).json({ message: 'Usuario no encontrado' });

  res.json(data[0]);
});

export default router;
