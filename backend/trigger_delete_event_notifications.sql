-- Trigger para eliminar notificaciones cuando se elimina un evento
-- Este trigger eliminará automáticamente las notificaciones de tipo 'meeting_invite' 
-- cuando se elimine un evento de la tabla Evento

CREATE OR REPLACE FUNCTION delete_event_notifications()
RETURNS TRIGGER AS $$
BEGIN
    -- Eliminar notificaciones de invitación relacionadas con el evento eliminado
    DELETE FROM "Notificacion" 
    WHERE tipo = 'meeting_invite' 
    AND (meta->>'id_evento')::integer = OLD.id;
    
    -- Log para debugging
    RAISE NOTICE 'Eliminadas notificaciones para evento ID: %', OLD.id;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Crear el trigger
DROP TRIGGER IF EXISTS tr_delete_event_notifications ON "Evento";
CREATE TRIGGER tr_delete_event_notifications
    BEFORE DELETE ON "Evento"
    FOR EACH ROW
    EXECUTE FUNCTION delete_event_notifications();

-- Comentario del trigger
COMMENT ON TRIGGER tr_delete_event_notifications ON "Evento" IS 
'Elimina automáticamente las notificaciones de invitación cuando se elimina un evento';