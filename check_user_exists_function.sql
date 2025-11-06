-- Función RPC para verificar si un usuario existe por email
-- Esta función debe ser ejecutada en Supabase SQL Editor

CREATE OR REPLACE FUNCTION check_user_exists(email_param TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_count INTEGER;
BEGIN
  -- Verificar en auth.users si existe un usuario con ese email
  SELECT COUNT(*)
  INTO user_count
  FROM auth.users
  WHERE email = email_param;
  
  -- Retornar true si existe, false si no
  RETURN user_count > 0;
END;
$$;

-- Dar permisos de ejecución a usuarios autenticados
GRANT EXECUTE ON FUNCTION check_user_exists(TEXT) TO authenticated, anon;
