-- ===================================================================
-- FUNCIÓN SQL PARA OBTENER MENSAJES DE CHAT - CON SOFT DELETE
-- IMPORTANTE: Solo muestra mensajes posteriores a la eliminación del chat
-- ===================================================================

-- Eliminar función existente si existe
DROP FUNCTION IF EXISTS get_chat_messages(INTEGER, INTEGER);

-- Crear función mejorada que respeta ChatEliminado
CREATE OR REPLACE FUNCTION get_chat_messages(
  p_id_chat INTEGER,
  p_id_usuario INTEGER
) RETURNS TABLE (
  id BIGINT,
  texto TEXT,
  fecha TIMESTAMP WITHOUT TIME ZONE,
  id_emisor INTEGER,
  nombre CHARACTER VARYING,
  apellido CHARACTER VARYING,
  apodo CHARACTER VARYING,
  id_archivo INTEGER,
  path_archivo CHARACTER VARYING,
  id_tipo_archivo INTEGER,
  nombre_tipo CHARACTER VARYING,
  descripcion_tipo TEXT
) AS $$
DECLARE
  fecha_eliminacion_chat TIMESTAMP WITHOUT TIME ZONE;
BEGIN
  -- Obtener fecha de eliminación del chat para este usuario (si existe)
  -- Usar MAX para obtener la eliminación más reciente
  SELECT MAX(ce.fecha_eliminado) INTO fecha_eliminacion_chat
  FROM "ChatEliminado" ce
  WHERE ce.id_chat = p_id_chat 
  AND ce.id_usuario = p_id_usuario;
  
  -- Si no hay fecha de eliminación, mostrar todos los mensajes
  -- Si hay fecha de eliminación, solo mostrar mensajes posteriores
  RETURN QUERY
  SELECT 
    m.id,
    m.texto,
    m.fecha,
    m.id_emisor,
    u.nombre,
    u.apellido,
    u.apodo,
    m.id_archivo,
    COALESCE(a.nombre, a.path) AS path_archivo,
    a.id_tipo_archivo,
    ta.nombre AS nombre_tipo,
    ta.descripcion AS descripcion_tipo
  FROM "Mensaje" m
  INNER JOIN "Usuario" u ON m.id_emisor = u.id
  LEFT JOIN "Archivo" a ON m.id_archivo = a.id
  LEFT JOIN "TipoArchivo" ta ON a.id_tipo_archivo = ta.id
  WHERE m.id_chat = p_id_chat 
  AND m.eliminado = false
  AND (
    fecha_eliminacion_chat IS NULL OR 
    m.fecha > fecha_eliminacion_chat
  )
  ORDER BY m.fecha ASC;
END;
$$ LANGUAGE plpgsql;

-- Mensaje de confirmación
SELECT 'Función get_chat_messages con soft delete creada correctamente' as mensaje;