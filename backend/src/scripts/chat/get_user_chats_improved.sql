-- Función mejorada para obtener todos los chats de un usuario
-- ORDENADOS POR FECHA (más reciente primero)

DROP FUNCTION IF EXISTS get_user_chats(integer);

CREATE OR REPLACE FUNCTION get_user_chats(p_id_usuario INTEGER)
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
  fecha_creacion TIMESTAMP
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (c.id)
    c.id AS id_chat,
    CASE 
      WHEN c.id_tipo_chat = 1 THEN 'privado'::TEXT
      WHEN c.id_tipo_chat = 2 THEN 'grupal'::TEXT
      ELSE 'desconocido'::TEXT
    END AS tipo_chat,
    CASE 
      WHEN c.id_tipo_chat = 1 THEN 
        (SELECT CONCAT(u.nombre, ' ', u.apellido)
         FROM "Mensaje" m2
         INNER JOIN "Usuario" u ON m2.id_emisor = u.id
         WHERE m2.id_chat = c.id AND m2.id_emisor != p_id_usuario
         LIMIT 1)
      WHEN c.id_tipo_chat = 2 THEN g.nombre
      ELSE 'Chat desconocido'
    END AS nombre_chat,
    CASE 
      WHEN c.id_tipo_chat = 1 THEN 
        (SELECT m2.id_emisor
         FROM "Mensaje" m2
         WHERE m2.id_chat = c.id AND m2.id_emisor != p_id_usuario
         LIMIT 1)
      ELSE NULL
    END AS id_contacto,
    CASE 
      WHEN c.id_tipo_chat = 1 THEN 
        (SELECT u.nombre
         FROM "Mensaje" m2
         INNER JOIN "Usuario" u ON m2.id_emisor = u.id
         WHERE m2.id_chat = c.id AND m2.id_emisor != p_id_usuario
         LIMIT 1)
      ELSE NULL
    END AS nombre_contacto,
    CASE 
      WHEN c.id_tipo_chat = 1 THEN 
        (SELECT u.apellido
         FROM "Mensaje" m2
         INNER JOIN "Usuario" u ON m2.id_emisor = u.id
         WHERE m2.id_chat = c.id AND m2.id_emisor != p_id_usuario
         LIMIT 1)
      ELSE NULL
    END AS apellido_contacto,
    c.id_grupo,
    m.texto AS ultimo_mensaje,
    m.fecha AS fecha_ultimo_mensaje,
    (
      SELECT COUNT(*)::INTEGER
      FROM "Mensaje" msg
      WHERE msg.id_chat = c.id 
        AND msg.id_emisor != p_id_usuario
        AND msg.eliminado = FALSE
    ) AS no_leidos,
    TRUE AS activo,
    c.fecha_creacion
  FROM "Chat" c
  INNER JOIN "Mensaje" m_user ON c.id = m_user.id_chat 
    AND (m_user.id_emisor = p_id_usuario OR 
         EXISTS (SELECT 1 FROM "Mensaje" m3 WHERE m3.id_chat = c.id AND m3.id_emisor = p_id_usuario))
  LEFT JOIN "Grupo" g ON c.id_grupo = g.id
  LEFT JOIN LATERAL (
    SELECT texto, fecha
    FROM "Mensaje"
    WHERE "Mensaje".id_chat = c.id
    ORDER BY fecha DESC
    LIMIT 1
  ) m ON TRUE
  -- 🆕 ORDENAMIENTO MEJORADO: Primero por último mensaje, luego por fecha de creación, luego por ID
  ORDER BY c.id, 
           COALESCE(m.fecha, c.fecha_creacion, NOW()) DESC,
           c.id DESC;
END;
$$;