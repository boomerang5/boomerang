-- Stored Procedure para finalizar una llamada
-- Actualiza fecha_fin y calcula la duración

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
    fecha_fin = NOW(),
    duracion_calculada = EXTRACT(EPOCH FROM (NOW() - fecha_inicio))::INTEGER
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
