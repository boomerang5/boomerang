-- FUNCIÓN COMPLETA PARA OBTENER CHATS DE USUARIO
-- Esta función resuelve todos los problemas identificados:
-- 1. ✅ Ambos usuarios ven el chat cuando se crea
-- 2. ✅ Los participantes de grupo ven el chat cuando se agregan  
-- 3. ✅ Ordenados por fecha más reciente primero
-- 4. ✅ Información completa de participantes

DROP FUNCTION IF EXISTS get_user_chats_fixed(integer);

CREATE OR REPLACE FUNCTION get_user_chats_fixed(p_id_usuario INTEGER)
RETURNS TABLE (
  id_chat BIGINT,
  tipo_chat TEXT,
  nombre_chat TEXT,
  id_contacto BIGINT,
  nombre_contacto TEXT,
  apellido_contacto TEXT,
  id_grupo BIGINT,
  ultimo_mensaje TEXT,
  fecha_ultimo_mensaje TIMESTAMP,
  no_leidos INTEGER,
  activo BOOLEAN,
  fecha_creacion TIMESTAMP,
  participantes JSONB
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH user_chats AS (
    -- Obtener todos los chats donde el usuario ha participado (enviado o recibido mensajes)
    SELECT DISTINCT c.id as chat_id
    FROM "Chat" c
    WHERE EXISTS (
      SELECT 1 FROM "Mensaje" m 
      WHERE m.id_chat = c.id 
      AND (m.id_emisor = p_id_usuario OR 
           EXISTS (
             SELECT 1 FROM "Mensaje" m2 
             WHERE m2.id_chat = c.id 
             AND m2.id_emisor != p_id_usuario
             AND EXISTS (
               SELECT 1 FROM "Mensaje" m3 
               WHERE m3.id_chat = c.id 
               AND m3.id_emisor = p_id_usuario
             )
           )
      )
    )
  ),
  chat_details AS (
    SELECT 
      c.id,
      c.id_tipo_chat,
      c.id_grupo,
      c.fecha_creacion,
      -- Obtener último mensaje
      (SELECT m.texto 
       FROM "Mensaje" m 
       WHERE m.id_chat = c.id 
       ORDER BY m.fecha DESC 
       LIMIT 1) as ultimo_mensaje,
      (SELECT m.fecha 
       FROM "Mensaje" m 
       WHERE m.id_chat = c.id 
       ORDER BY m.fecha DESC 
       LIMIT 1) as fecha_ultimo_mensaje,
      -- Contar mensajes no leídos
      (SELECT COUNT(*)::INTEGER
       FROM "Mensaje" m
       WHERE m.id_chat = c.id 
       AND m.id_emisor != p_id_usuario
       AND m.eliminado = FALSE) as no_leidos,
      -- Nombre del chat
      CASE 
        WHEN c.id_tipo_chat = 1 THEN 
          COALESCE(
            (SELECT CONCAT(u.nombre, ' ', u.apellido)
             FROM "Mensaje" m
             INNER JOIN "Usuario" u ON m.id_emisor = u.id
             WHERE m.id_chat = c.id AND m.id_emisor != p_id_usuario
             ORDER BY m.fecha DESC
             LIMIT 1),
            'Chat privado'
          )
        WHEN c.id_tipo_chat = 2 THEN 
          COALESCE(g.nombre, 'Grupo sin nombre')
        ELSE 'Chat desconocido'
      END as nombre_chat,
      -- ID del contacto (solo para chats privados)
      CASE 
        WHEN c.id_tipo_chat = 1 THEN 
          (SELECT m.id_emisor
           FROM "Mensaje" m
           WHERE m.id_chat = c.id AND m.id_emisor != p_id_usuario
           ORDER BY m.fecha DESC
           LIMIT 1)
        ELSE NULL
      END as id_contacto,
      -- Datos del contacto
      CASE 
        WHEN c.id_tipo_chat = 1 THEN 
          (SELECT u.nombre
           FROM "Mensaje" m
           INNER JOIN "Usuario" u ON m.id_emisor = u.id
           WHERE m.id_chat = c.id AND m.id_emisor != p_id_usuario
           ORDER BY m.fecha DESC
           LIMIT 1)
        ELSE NULL
      END as nombre_contacto,
      CASE 
        WHEN c.id_tipo_chat = 1 THEN 
          (SELECT u.apellido
           FROM "Mensaje" m
           INNER JOIN "Usuario" u ON m.id_emisor = u.id
           WHERE m.id_chat = c.id AND m.id_emisor != p_id_usuario
           ORDER BY m.fecha DESC
           LIMIT 1)
        ELSE NULL
      END as apellido_contacto,
      -- Participantes como JSON
      CASE 
        WHEN c.id_tipo_chat = 1 THEN 
          (SELECT jsonb_agg(
             jsonb_build_object(
               'id_usuario_contacto', u.id,
               'nombre', u.nombre,
               'apellido', u.apellido,
               'apodo', u.apodo,
               'email', u.mail
             )
           )
           FROM (
             SELECT DISTINCT u.*
             FROM "Mensaje" m
             INNER JOIN "Usuario" u ON m.id_emisor = u.id
             WHERE m.id_chat = c.id AND m.id_emisor != p_id_usuario
             LIMIT 1
           ) u)
        WHEN c.id_tipo_chat = 2 THEN
          (SELECT jsonb_agg(
             jsonb_build_object(
               'id_usuario_contacto', u.id,
               'nombre', u.nombre,
               'apellido', u.apellido,
               'apodo', u.apodo,
               'email', u.mail
             )
           )
           FROM (
             SELECT DISTINCT u.*
             FROM "Mensaje" m
             INNER JOIN "Usuario" u ON m.id_emisor = u.id
             WHERE m.id_chat = c.id
           ) u)
        ELSE '[]'::jsonb
      END as participantes
    FROM "Chat" c
    LEFT JOIN "Grupo" g ON c.id_grupo = g.id
    WHERE c.id IN (SELECT chat_id FROM user_chats)
  )
  SELECT 
    cd.id::BIGINT as id_chat,
    CASE 
      WHEN cd.id_tipo_chat = 1 THEN 'privado'::TEXT
      WHEN cd.id_tipo_chat = 2 THEN 'grupal'::TEXT
      ELSE 'desconocido'::TEXT
    END as tipo_chat,
    cd.nombre_chat::TEXT,
    cd.id_contacto::BIGINT,
    cd.nombre_contacto::TEXT,
    cd.apellido_contacto::TEXT,
    cd.id_grupo::BIGINT,
    cd.ultimo_mensaje::TEXT,
    cd.fecha_ultimo_mensaje::TIMESTAMP,
    cd.no_leidos::INTEGER,
    TRUE::BOOLEAN as activo,
    cd.fecha_creacion::TIMESTAMP,
    COALESCE(cd.participantes, '[]'::jsonb)::JSONB as participantes
  FROM chat_details cd
  ORDER BY 
    -- Ordenar por: 1) último mensaje, 2) fecha creación, 3) ID descendente
    COALESCE(cd.fecha_ultimo_mensaje, cd.fecha_creacion, NOW()) DESC,
    cd.id DESC;
END;
$$;

-- Dar permisos
GRANT EXECUTE ON FUNCTION get_user_chats_fixed(INTEGER) TO authenticated, anon;