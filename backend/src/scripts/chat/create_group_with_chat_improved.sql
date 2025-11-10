-- FUNCIÓN MEJORADA PARA CREAR GRUPOS CON CHAT
-- Asegura que todos los participantes vean el chat grupal

DROP FUNCTION IF EXISTS create_group_with_chat_improved(integer, text, text, integer[]);

CREATE OR REPLACE FUNCTION create_group_with_chat_improved(
  p_id_usuario_creador INTEGER,
  p_nombre TEXT,
  p_descripcion TEXT DEFAULT NULL,
  p_participantes INTEGER[] DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_id_grupo INTEGER;
  v_id_chat INTEGER;
  v_participante INTEGER;
  v_result JSON;
BEGIN
  -- Validar parámetros
  IF p_id_usuario_creador IS NULL THEN
    RAISE EXCEPTION 'El id_usuario_creador es obligatorio';
  END IF;
  
  IF p_nombre IS NULL OR trim(p_nombre) = '' THEN
    RAISE EXCEPTION 'El nombre del grupo es obligatorio';
  END IF;
  
  -- Crear el grupo
  INSERT INTO "Grupo" (nombre, descripcion, fecha_creacion)
  VALUES (trim(p_nombre), p_descripcion, NOW())
  RETURNING id INTO v_id_grupo;
  
  -- Crear el chat asociado
  INSERT INTO "Chat" (id_tipo_chat, id_grupo, nombre, fecha_creacion)
  VALUES (2, v_id_grupo, trim(p_nombre), NOW())
  RETURNING id INTO v_id_chat;
  
  -- Crear mensaje inicial del creador
  INSERT INTO "Mensaje" (id_chat, id_emisor, texto, fecha, eliminado)
  VALUES (v_id_chat, p_id_usuario_creador, '👥 Grupo creado', NOW(), FALSE);
  
  -- Agregar mensajes para todos los participantes
  -- Esto asegura que todos vean el grupo en su lista de chats
  IF p_participantes IS NOT NULL AND array_length(p_participantes, 1) > 0 THEN
    FOREACH v_participante IN ARRAY p_participantes
    LOOP
      -- Verificar que el participante no sea el creador
      IF v_participante != p_id_usuario_creador THEN
        -- Insertar mensaje "fantasma" para que aparezca en la lista del participante
        INSERT INTO "Mensaje" (id_chat, id_emisor, texto, fecha, eliminado)
        VALUES (v_id_chat, v_participante, '', NOW(), TRUE);
      END IF;
    END LOOP;
  END IF;
  
  -- Retornar resultado en formato JSON
  v_result := json_build_object(
    'id_grupo', v_id_grupo,
    'id_chat', v_id_chat,
    'nombre', p_nombre,
    'participantes_agregados', COALESCE(array_length(p_participantes, 1), 0)
  );
  
  RETURN v_result;
END;
$$;

-- Dar permisos
GRANT EXECUTE ON FUNCTION create_group_with_chat_improved(INTEGER, TEXT, TEXT, INTEGER[]) TO authenticated, anon;