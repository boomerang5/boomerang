-- Stored Procedure para crear llamada con participantes de forma atómica
-- Reemplaza a start_call + add_call_participant para evitar problemas de sincronización

CREATE OR REPLACE FUNCTION create_call_with_participants(
  p_titulo TEXT,
  p_descripcion TEXT DEFAULT NULL,
  p_id_grupo INTEGER DEFAULT NULL,
  p_caller_id INTEGER DEFAULT NULL,
  p_callee_ids INTEGER[] DEFAULT NULL,
  p_tipo TEXT DEFAULT 'video',
  p_estado TEXT DEFAULT 'activa'
)
RETURNS TABLE (
  id_llamada INTEGER,
  call_success BOOLEAN,
  participants_added INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_id_llamada INTEGER;
  v_participants_count INTEGER := 0;
  v_callee_id INTEGER;
BEGIN
  -- Validaciones básicas
  IF p_titulo IS NULL OR trim(p_titulo) = '' THEN
    RAISE EXCEPTION 'El título de la llamada es obligatorio';
  END IF;

  IF p_caller_id IS NULL THEN
    RAISE EXCEPTION 'El ID del caller es obligatorio';
  END IF;

  -- 1. Crear la llamada
  INSERT INTO llamadas (
    titulo,
    descripcion,
    id_grupo,
    tipo,
    estado,
    fecha_inicio,
    tiene_grabacion,
    tiene_transcripcion
  ) VALUES (
    trim(p_titulo),
    CASE 
      WHEN p_descripcion IS NOT NULL AND trim(p_descripcion) != '' 
      THEN trim(p_descripcion)
      ELSE NULL 
    END,
    p_id_grupo,
    p_tipo::llamada_tipo,
    p_estado::llamada_estado,
    CURRENT_TIMESTAMP,
    false,
    false
  )
  RETURNING id INTO v_id_llamada;

  -- 2. Agregar el caller como participante (host)
  INSERT INTO participantes_llamada (
    id_llamada,
    id_usuario,
    fecha_union,
    es_host
  ) VALUES (
    v_id_llamada,
    p_caller_id,
    CURRENT_TIMESTAMP,
    true
  );
  
  v_participants_count := v_participants_count + 1;

  -- 3. Agregar callees como participantes (no host)
  IF p_callee_ids IS NOT NULL AND array_length(p_callee_ids, 1) > 0 THEN
    FOREACH v_callee_id IN ARRAY p_callee_ids
    LOOP
      -- Evitar duplicados (si caller aparece en callees)
      IF v_callee_id != p_caller_id THEN
        INSERT INTO participantes_llamada (
          id_llamada,
          id_usuario,
          fecha_union,
          es_host
        ) VALUES (
          v_id_llamada,
          v_callee_id,
          CURRENT_TIMESTAMP,
          false
        );
        
        v_participants_count := v_participants_count + 1;
      END IF;
    END LOOP;
  END IF;

  -- 4. Retornar resultados
  RETURN QUERY
  SELECT 
    v_id_llamada,
    true,
    v_participants_count;

EXCEPTION
  WHEN OTHERS THEN
    -- Log del error para debugging
    RAISE NOTICE 'Error en create_call_with_participants: %', SQLERRM;
    
    -- Retornar error
    RETURN QUERY 
    SELECT 
      -1,
      false,
      0;
END;
$$;

-- Dar permisos necesarios
GRANT EXECUTE ON FUNCTION create_call_with_participants(TEXT, TEXT, INTEGER, INTEGER, INTEGER[], TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_call_with_participants(TEXT, TEXT, INTEGER, INTEGER, INTEGER[], TEXT, TEXT) TO anon;

-- Comentarios para documentación
COMMENT ON FUNCTION create_call_with_participants IS 'Crea una llamada y agrega participantes de forma atómica. Reemplaza start_call + add_call_participant.';