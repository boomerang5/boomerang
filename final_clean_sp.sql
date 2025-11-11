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
  );

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
  );

  RETURN v_id_llamada;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error creando llamada: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Dar permisos
GRANT EXECUTE ON FUNCTION create_call_with_modal_data(TEXT, TEXT, INTEGER, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION create_call_with_modal_data(TEXT, TEXT, INTEGER, INTEGER, INTEGER) TO anon;