import supabase from '../../lib/supabase';
import { NotificationService } from "../notifications/notificationService";

export const updateEventParticipantsService = async (
  idEvento: number,
  idEditor: number,
  participantes: number[]
): Promise<void> => {
  console.log('🔄 Actualizando participantes del evento:', {
    idEvento,
    idEditor,
    participantes,
    cantidadParticipantes: participantes?.length || 0
  });

  try {
    // Llamar a la función PostgreSQL update_event_participants
    const { error } = await supabase.rpc('update_event_participants', {
      p_id_evento: idEvento,
      p_editor: idEditor,
      p_participantes: participantes
    });

    if (error) {
      
      // Verificar si es el error específico de permisos
      if (error.message.includes('Solo el creador puede actualizar')) {
        throw new Error(`Solo el creador del evento puede actualizar los participantes. Evento: ${idEvento}, Editor: ${idEditor}`);
      }
      
      throw error;
    }

  } catch (error: any) {
    console.error('❌ Error en updateEventParticipantsService:', error);
    throw new Error(error.message || 'Error al actualizar participantes del evento');
  }
};