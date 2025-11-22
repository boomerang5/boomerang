-- SP final limpio sin debug
DROP FUNCTION IF EXISTS create_call_with_modal_data(TEXT, TEXT, INTEGER, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION create_call_with_modal_data(
  p_titulo TEXT,
  p_descripcion TEXT, 
  p_caller_id INTEGER,
  p_callee_id INTEGER,
  p_id_grupo INTEGER DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_id_llamada INTEGER;
BEGIN
  -- 1. Crear la llamada con LOCALTIMESTAMP
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

  -- 3. Agregar el callee como participante
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

  RETURN v_id_llamada;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error creando llamada: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Dar permisos
GRANT EXECUTE ON FUNCTION create_call_with_modal_data(TEXT, TEXT, INTEGER, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION create_call_with_modal_data(TEXT, TEXT, INTEGER, INTEGER, INTEGER) TO anon;

-- ============================================================================
-- SP para finalizar llamada
-- ============================================================================
DROP FUNCTION IF EXISTS end_call(INTEGER);

CREATE OR REPLACE FUNCTION end_call(
  p_id_llamada INTEGER
)
RETURNS VOID AS $$
BEGIN
  -- Actualizar la llamada con fecha_fin y calcular duración en SEGUNDOS
  UPDATE public."Llamada"
  SET 
    fecha_fin = LOCALTIMESTAMP,
    duracion_calculada = EXTRACT(EPOCH FROM (LOCALTIMESTAMP - fecha_inicio))::INTEGER
  WHERE id = p_id_llamada
    AND fecha_fin IS NULL; -- Solo actualizar si no se ha finalizado antes
END;
$$ LANGUAGE plpgsql;

-- Dar permisos
GRANT EXECUTE ON FUNCTION end_call(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION end_call(INTEGER) TO anon;