-- Función mejorada para obtener el historial de llamadas con nombres de usuarios
-- Esta función reemplaza el UUID del campo "titulo" con el nombre real del usuario

CREATE OR REPLACE FUNCTION get_user_call_history(p_id_usuario INTEGER)
RETURNS TABLE (
  id_llamada INTEGER,
  tipo TEXT,
  estado TEXT,
  fecha_inicio TIMESTAMP WITH TIME ZONE,
  fecha_fin TIMESTAMP WITH TIME ZONE,
  duracion_segundos INTEGER,
  titulo TEXT,
  descripcion TEXT,
  id_grupo INTEGER,
  tiene_grabacion BOOLEAN,
  id_archivo_grabacion INTEGER,
  tiene_transcripcion BOOLEAN,
  otro_usuario_nombre TEXT,
  participantes JSONB,
  id_chat INTEGER,
  resumen TEXT,
  es_host BOOLEAN
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id_llamada,
    l.tipo::TEXT,
    l.estado::TEXT,
    l.fecha_inicio,
    l.fecha_fin,
    l.duracion_segundos,
    l.titulo,
    l.descripcion,
    l.id_grupo,
    l.tiene_grabacion,
    l.id_archivo_grabacion,
    l.tiene_transcripcion,
    -- Obtener el nombre del otro usuario (el que no es p_id_usuario)
    CASE 
      WHEN l.id_grupo IS NULL THEN
        (
          SELECT CONCAT(u.nombre, ' ', u.apellido)
          FROM participantes_llamada pl
          JOIN usuario u ON pl.id_usuario = u.id_usuario
          WHERE pl.id_llamada = l.id_llamada 
            AND pl.id_usuario != p_id_usuario
          LIMIT 1
        )
      ELSE
        NULL -- Para llamadas grupales, no hay "otro usuario" específico
    END AS otro_usuario_nombre,
    -- Obtener todos los participantes como JSON
    (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id_usuario', u.id_usuario,
        'nombre', u.nombre,
        'apellido', u.apellido,
        'apodo', u.apodo,
        'es_iniciador', pl.es_host
      )), '[]'::jsonb)
      FROM participantes_llamada pl
      JOIN usuario u ON pl.id_usuario = u.id_usuario
      WHERE pl.id_llamada = l.id_llamada
    ) AS participantes,
    l.id_chat,
    l.resumen,
    (
      SELECT pl.es_host
      FROM participantes_llamada pl
      WHERE pl.id_llamada = l.id_llamada 
        AND pl.id_usuario = p_id_usuario
      LIMIT 1
    ) AS es_host
  FROM llamadas l
  WHERE EXISTS (
    SELECT 1 
    FROM participantes_llamada pl 
    WHERE pl.id_llamada = l.id_llamada 
      AND pl.id_usuario = p_id_usuario
  )
  ORDER BY l.fecha_inicio DESC;
END;
$$;

-- Dar permisos de ejecución
GRANT EXECUTE ON FUNCTION get_user_call_history(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_call_history(INTEGER) TO anon;
