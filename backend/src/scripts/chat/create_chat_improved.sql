-- FUNCIÓN MEJORADA PARA CREAR CHATS
-- Asegura que ambos participantes vean el chat

DROP FUNCTION IF EXISTS create_chat_improved(integer, integer, text, integer);

CREATE OR REPLACE FUNCTION create_chat_improved(
  p_id_emisor INTEGER,
  p_id_contacto INTEGER DEFAULT NULL,
  p_nombre TEXT DEFAULT NULL,
  p_id_grupo INTEGER DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_id_chat INTEGER;
  v_id_tipo_chat INTEGER;
  v_existing_chat INTEGER;
BEGIN
  -- Validar parámetros
  IF p_id_emisor IS NULL THEN
    RAISE EXCEPTION 'El id_emisor es obligatorio';
  END IF;
  
  -- Determinar tipo de chat
  IF p_id_contacto IS NOT NULL AND p_nombre IS NULL AND p_id_grupo IS NULL THEN
    -- Chat privado
    v_id_tipo_chat := 1;
    
    -- Verificar si ya existe un chat privado entre estos usuarios
    SELECT c.id INTO v_existing_chat
    FROM "Chat" c
    WHERE c.id_tipo_chat = 1
    AND EXISTS (
      SELECT 1 FROM "Mensaje" m1 
      WHERE m1.id_chat = c.id AND m1.id_emisor = p_id_emisor
    )
    AND EXISTS (
      SELECT 1 FROM "Mensaje" m2 
      WHERE m2.id_chat = c.id AND m2.id_emisor = p_id_contacto
    )
    LIMIT 1;
    
    -- Si ya existe, devolver el ID existente
    IF v_existing_chat IS NOT NULL THEN
      RETURN v_existing_chat;
    END IF;
    
  ELSIF p_id_contacto IS NULL AND p_nombre IS NOT NULL AND p_id_grupo IS NOT NULL THEN
    -- Chat grupal
    v_id_tipo_chat := 2;
  ELSE
    RAISE EXCEPTION 'Parámetros inválidos. Debe ser chat privado (id_emisor + id_contacto) o grupal (id_emisor + nombre + id_grupo)';
  END IF;
  
  -- Crear el chat
  INSERT INTO "Chat" (id_tipo_chat, id_grupo, nombre, fecha_creacion)
  VALUES (v_id_tipo_chat, p_id_grupo, p_nombre, NOW())
  RETURNING id INTO v_id_chat;
  
  -- Para chats privados, crear mensajes iniciales para ambos usuarios
  -- Esto asegura que ambos vean el chat en su lista
  IF v_id_tipo_chat = 1 THEN
    -- Mensaje inicial del emisor (mensaje del sistema)
    INSERT INTO "Mensaje" (id_chat, id_emisor, texto, fecha, eliminado)
    VALUES (v_id_chat, p_id_emisor, '👋 Chat iniciado', NOW(), FALSE);
    
    -- También insertar un registro que indique que el contacto participa
    -- (Sin mensaje visible, solo para que aparezca en su lista)
    INSERT INTO "Mensaje" (id_chat, id_emisor, texto, fecha, eliminado)
    VALUES (v_id_chat, p_id_contacto, '', NOW(), TRUE);
  END IF;
  
  RETURN v_id_chat;
END;
$$;

-- Dar permisos
GRANT EXECUTE ON FUNCTION create_chat_improved(INTEGER, INTEGER, TEXT, INTEGER) TO authenticated, anon;