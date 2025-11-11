-- Stored Procedure para obtener historial de llamadas de un usuario
-- Incluye información completa de participantes y el "otro usuario" en llamadas 1-a-1

CREATE OR REPLACE FUNCTION get_user_call_history(
  p_id_usuario INTEGER
)
RETURNS TABLE (
  id INTEGER,
  fecha_inicio TIMESTAMP WITHOUT TIME ZONE,
  fecha_fin TIMESTAMP WITHOUT TIME ZONE,
  duracion_calculada INTERVAL,
  titulo TEXT,
  descripcion TEXT,
  id_grupo INTEGER,
  otro_usuario_nombre TEXT,
  participantes JSONB,
  es_host BOOLEAN
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.fecha_inicio,
    l.fecha_fin,
    l.duracion_calculada,
    l.titulo,
    l.descripcion,
    l.id_grupo,
    -- Obtener el nombre del otro Usuario (el que no es p_id_usuario)
    CASE 
      WHEN l.id_grupo IS NULL THEN
        (
          SELECT CONCAT(u.nombre, ' ', u.apellido)
          FROM public."UsuarioXLlamada" pl
          JOIN public."Usuario" u ON pl."idUsuario" = u.id
          WHERE pl."idLlamada" = l.id 
            AND pl."idUsuario" != p_id_usuario
          LIMIT 1
        )
      ELSE
        NULL -- Para llamadas grupales, no hay "otro Usuario" específico
    END AS otro_usuario_nombre,
    -- Obtener todos los participantes como JSON
    (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'idUsuario', u."id",
        'nombre', u.nombre,
        'apellido', u.apellido,
        'apodo', u.apodo,
        'es_iniciador', pl.host
      )), '[]'::jsonb)
      FROM public."UsuarioXLlamada" pl
      JOIN public."Usuario" u ON pl."idUsuario" = u."id"
      WHERE pl."idLlamada" = l.id
    ) AS participantes,
    (
      SELECT pl.host
      FROM public."UsuarioXLlamada" pl
      WHERE pl."idLlamada" = l.id
        AND pl."idUsuario" = p_id_usuario
      LIMIT 1
    ) AS es_host
  FROM public."Llamada" l
  WHERE EXISTS (
    SELECT 1 
    FROM public."UsuarioXLlamada" pl 
    WHERE pl."idLlamada" = l.id 
      AND pl."idUsuario" = p_id_usuario
  )
  ORDER BY l.fecha_inicio DESC;
END;
$$;

-- Comentario sobre la función
COMMENT ON FUNCTION get_user_call_history(INTEGER) IS 
'Obtiene el historial completo de llamadas de un usuario, incluyendo participantes, rol (host/participante) y nombre del otro usuario en llamadas 1-a-1';