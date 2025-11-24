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
RETURNS TABLE(affected_users INT, call_updated BOOL)
LANGUAGE plpgsql
AS $$
DECLARE
  v_now timestamptz := now();
  v_updated_call INT := 0;
  v_affected INT := 0;
BEGIN
  -- cerrar la llamada solo si no estaba cerrada
  UPDATE public."Llamada"
     SET fecha_fin = v_now,
         duracion_calculada = GREATEST(
           1,
           EXTRACT(EPOCH FROM (v_now - fecha_inicio))::INT
         )
   WHERE id = p_id_llamada
     AND fecha_fin IS NULL
  RETURNING 1 INTO v_updated_call;

  -- marcar salida de quien siga "dentro"
  UPDATE public."UsuarioXLlamada"
     SET salida = v_now
   WHERE "idLlamada" = p_id_llamada
     AND salida IS NULL;

  GET DIAGNOSTICS v_affected = ROW_COUNT;

  RETURN QUERY SELECT v_affected, (v_updated_call = 1);
END;
$$;

-- Dar permisos
GRANT EXECUTE ON FUNCTION end_call(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION end_call(INTEGER) TO anon;