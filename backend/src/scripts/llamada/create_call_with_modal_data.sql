-- Stored Procedure para crear llamada con datos del modal y participantes
-- Reemplaza start_call + add_call_participant de forma atómica

CREATE OR REPLACE FUNCTION create_call_with_modal_data(
  p_titulo TEXT,
  p_descripcion TEXT,
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
  -- 1. Crear la llamada
  INSERT INTO public."Llamada" (
    titulo,
    descripcion,
    fecha_inicio,
    id_grupo
  )
  VALUES (
    p_titulo,
    p_descripcion,
    NOW(),
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
  );

  -- 4. Retornar el ID de la llamada creada
  RETURN v_id_llamada;

EXCEPTION
  WHEN OTHERS THEN
    -- En caso de error, hacer rollback automático
    RAISE EXCEPTION 'Error creando llamada: %', SQLERRM;
END;
$$;

-- Comentario sobre la función
COMMENT ON FUNCTION create_call_with_modal_data(TEXT, TEXT, INTEGER, INTEGER, INTEGER) IS 
'Crea una llamada con título y descripción del modal, agregando automáticamente los dos participantes (caller como host, callee como participante)';