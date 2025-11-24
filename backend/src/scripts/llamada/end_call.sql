-- Stored Procedure para finalizar una llamada
-- Actualiza fecha_fin, calcula la duración y limpia UsuarioXLlamada

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

-- Comentario
COMMENT ON FUNCTION end_call(INTEGER) IS 
'Finaliza una llamada estableciendo la fecha_fin, calculando la duración y limpiando UsuarioXLlamada';

