-- ============================================================================
-- FIX: Eliminar funciones duplicadas de end_call y crear la versión correcta
-- ============================================================================
-- FECHA: 2025-11-23
-- PROBLEMA: Hay dos funciones end_call en Supabase, causando que no se guarde
--           fecha_fin correctamente en algunas llamadas
-- SOLUCIÓN: Eliminar todas las versiones y crear solo la versión completa
-- ============================================================================

-- 1. Eliminar TODAS las versiones de end_call que puedan existir
DROP FUNCTION IF EXISTS end_call(INTEGER);
DROP FUNCTION IF EXISTS public.end_call(INTEGER);

-- 2. Crear la versión correcta y completa
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

-- 3. Dar permisos
GRANT EXECUTE ON FUNCTION end_call(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION end_call(INTEGER) TO anon;

-- 4. Comentario
COMMENT ON FUNCTION end_call(INTEGER) IS 
'Finaliza una llamada estableciendo la fecha_fin, calculando la duración y limpiando UsuarioXLlamada';

-- ============================================================================
-- VERIFICACIÓN: Ejecuta esto para confirmar que solo hay una función
-- ============================================================================
-- SELECT routine_name, routine_schema
-- FROM information_schema.routines
-- WHERE routine_name = 'end_call';
-- 
-- Debería retornar solo 1 fila
-- ============================================================================
