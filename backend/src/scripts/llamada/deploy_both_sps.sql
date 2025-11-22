-- Script para desplegar ambos stored procedures en Supabase
-- Ejecutar todo este contenido en el editor SQL de Supabase

-- 1. SP para crear llamadas con datos del modal
CREATE OR REPLACE FUNCTION create_call_with_modal_data(
  p_titulo TEXT,
  p_descripcion TEXT DEFAULT NULL,
  p_caller_id INTEGER,
  p_callee_id INTEGER,
  p_id_grupo INTEGER DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_id_llamada INTEGER;
BEGIN
  -- Validar que los parámetros requeridos no sean nulos
  IF p_titulo IS NULL OR trim(p_titulo) = '' THEN
    RAISE EXCEPTION 'El título de la llamada es obligatorio';
  END IF;
  
  IF p_caller_id IS NULL THEN
    RAISE EXCEPTION 'El caller_id es obligatorio';
  END IF;
  
  IF p_callee_id IS NULL THEN
    RAISE EXCEPTION 'El callee_id es obligatorio';
  END IF;

  -- 1. Crear la llamada
  INSERT INTO public."Llamada" (
    titulo,
    descripcion,
    fecha_inicio,
    id_grupo
  )
  VALUES (
    trim(p_titulo),
    CASE 
      WHEN p_descripcion IS NOT NULL AND trim(p_descripcion) != '' 
      THEN trim(p_descripcion)
      ELSE NULL 
    END,
    LOCALTIMESTAMP,
    p_id_grupo
  )
  RETURNING id INTO v_id_llamada;

  -- 2. Agregar el caller como host
  INSERT INTO public."UsuarioXLlamada" (
    "idUsuario",
    "idLlamada",
    host
  )
  VALUES (
    p_caller_id,
    v_id_llamada,
    true
  )
  ON CONFLICT ("idUsuario", "idLlamada") DO NOTHING;

  -- 3. Agregar el callee como participante (no host)
  INSERT INTO public."UsuarioXLlamada" (
    "idUsuario",
    "idLlamada",
    host
  )
  VALUES (
    p_callee_id,
    v_id_llamada,
    false
  )
  ON CONFLICT ("idUsuario", "idLlamada") DO NOTHING;

  -- 4. Retornar el ID de la llamada creada
  RAISE NOTICE 'Llamada creada exitosamente: ID=%, titulo=%, descripcion=%', v_id_llamada, p_titulo, p_descripcion;
  RETURN v_id_llamada;

EXCEPTION
  WHEN OTHERS THEN
    -- En caso de error, hacer rollback automático
    RAISE NOTICE 'Error en create_call_with_modal_data: titulo=%, descripcion=%, caller=%, callee=%, error=%', p_titulo, p_descripcion, p_caller_id, p_callee_id, SQLERRM;
    RAISE EXCEPTION 'Error creando llamada: %', SQLERRM;
END;
$$;

-- 2. SP para obtener historial de llamadas
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

-- 3. Dar permisos a las funciones
GRANT EXECUTE ON FUNCTION create_call_with_modal_data(TEXT, TEXT, INTEGER, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION create_call_with_modal_data(TEXT, TEXT, INTEGER, INTEGER, INTEGER) TO anon;

GRANT EXECUTE ON FUNCTION get_user_call_history(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_call_history(INTEGER) TO anon;

-- 4. Comentarios para documentación
COMMENT ON FUNCTION create_call_with_modal_data(TEXT, TEXT, INTEGER, INTEGER, INTEGER) IS 
'Crea una llamada con título y descripción del modal, agregando automáticamente los dos participantes (caller como host, callee como participante)';

COMMENT ON FUNCTION get_user_call_history(INTEGER) IS 
'Obtiene el historial completo de llamadas de un usuario, incluyendo participantes, rol (host/participante) y nombre del otro usuario en llamadas 1-a-1';

-- ============================================================================
-- 3. SP para finalizar llamada
-- ============================================================================
CREATE OR REPLACE FUNCTION end_call(
  p_id_llamada INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  -- Actualizar la llamada con fecha_fin y calcular duración en SEGUNDOS
  UPDATE public."Llamada"
  SET 
    fecha_fin = LOCALTIMESTAMP,
    duracion_calculada = EXTRACT(EPOCH FROM (LOCALTIMESTAMP - fecha_inicio))::INTEGER
  WHERE id = p_id_llamada
    AND fecha_fin IS NULL; -- Solo actualizar si no se ha finalizado antes
END;
$$;

-- Dar permisos
GRANT EXECUTE ON FUNCTION end_call(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION end_call(INTEGER) TO anon;

-- Comentario
COMMENT ON FUNCTION end_call(INTEGER) IS 
'Finaliza una llamada estableciendo la fecha_fin y calculando la duración';