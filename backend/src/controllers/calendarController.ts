import { Request, Response } from 'express';
import { createEventService } from '../services/calendar/createEventService';
import { deleteEventService } from '../services/calendar/deleteEventService';
import { getEventDetailsService } from '../services/calendar/getEventDetailsService';
import { getUserEventsService } from '../services/calendar/getUserEventsService';
import { respondEventInviteService } from '../services/calendar/respondEventInviteService';
import { updateEventService } from '../services/calendar/updateEventService';
import { updateEventParticipantsService } from '../services/calendar/updateEventParticipantsService';
import { NotificationService } from '../services/notifications/notificationService';
import supabase from '../lib/supabase';

//---------------------------------------------------------------------------------------------
// CREATE_EVENT
export const create_event = async (req: Request, res: Response) => {
  const { id_creador, titulo, fecha, descripcion, color, invitados } = req.body;

  if (!id_creador || !titulo || !fecha) {
    return res.status(400).json({ error: "Faltan campos requeridos." });
  }

  try {

    const id = await createEventService(Number(id_creador), titulo, new Date(fecha), descripcion ?? null, color ?? null, invitados ?? null);

    // Si hay invitados, crear notificaciones
    if (invitados && Array.isArray(invitados) && invitados.length > 0) {
      try {
        
        // Obtener información del creador
        const { data: creatorData } = await supabase
          .from('Usuario')
          .select('nombre, apellido, apodo')
          .eq('id', Number(id_creador))
          .single();

        const organizadorNombre = creatorData 
          ? `${creatorData.nombre || ''} ${creatorData.apellido || ''}`.trim() || creatorData.apodo || `Usuario ${id_creador}`
          : `Usuario ${id_creador}`;

        // Crear notificaciones para todos los invitados
        await NotificationService.createMultipleEventInviteNotifications(
          invitados,
          titulo,
          organizadorNombre,
          Number(id),
          fecha, // Pasar fecha del evento
          descripcion // 🆕 NUEVO: Pasar descripción del evento
        );

      } catch (notificationError) {
        console.error('⚠️ Error al crear notificaciones para nuevo evento (evento creado exitosamente):', notificationError);
      }
    } else {
      console.log('ℹ️ Evento creado sin invitados, no se envían notificaciones');
    }

    return res.status(200).json({ id });
  } catch (err: any) {
    console.error("❌ Error inesperado:", err);
    return res
      .status(500).json({ error: err.message || "Error interno del servidor." });
  }
};

//---------------------------------------------------------------------------------------------
// DELETE_EVENT
export const delete_event = async (req: Request, res: Response) => {
  const { id_evento, id_editor } = req.body;
  if (!id_evento || !id_editor) {
    return res.status(400).json({ error: "Faltan campos requeridos." });
  }
  try {

    // 🆕 OBTENER DETALLES DEL EVENTO ANTES DE BORRARLO PARA NOTIFICACIONES
    let eventDetails: any = null;
    let invitados: number[] = [];
    
    try {
      const eventDetailsArray = await getEventDetailsService(Number(id_evento), Number(id_editor));
      
      if (eventDetailsArray && Array.isArray(eventDetailsArray) && eventDetailsArray.length > 0) {
        // El primer elemento contiene la información básica del evento
        eventDetails = eventDetailsArray[0];
        
        // Obtener todos los IDs únicos de invitados (excluyendo al organizador)
        const idsInvitados = eventDetailsArray
          .filter((row: any) => {
            return row.id_invitado !== null && row.id_invitado !== Number(id_editor);
          })
          .map((row: any) => row.id_invitado)
          .filter((id: number, index: number, array: number[]) => array.indexOf(id) === index); // eliminar duplicados
        
        invitados = idsInvitados;
      }
    } catch (detailsError) {
      console.warn('⚠️ No se pudieron obtener detalles del evento para notificaciones:', detailsError);
    }

    // Eliminar el evento
    const result = await deleteEventService(Number(id_evento), Number(id_editor));

    // 🆕 ENVIAR NOTIFICACIONES DE CANCELACIÓN
    if (eventDetails && invitados.length > 0) {
      try {
        // Obtener información del organizador
        const { data: organizadorData } = await supabase
          .from('Usuario')
          .select('nombre, apellido, apodo')
          .eq('id', Number(id_editor))
          .single();

        const organizadorNombre = organizadorData 
          ? `${organizadorData.nombre || ''} ${organizadorData.apellido || ''}`.trim() || organizadorData.apodo || `Usuario ${id_editor}`
          : `Usuario ${id_editor}`;

        const tituloEvento = eventDetails.titulo || 'Evento sin título';
        const fechaEvento = eventDetails.fecha;

        const resultadoNotificaciones = await NotificationService.createMultipleEventCancelledNotifications(
          invitados,
          tituloEvento,
          organizadorNombre,
          Number(id_evento),
          fechaEvento
        );

      } catch (notificationError) {
        console.error('⚠️ Error al enviar notificaciones de cancelación (evento eliminado exitosamente):', notificationError);
        if (notificationError instanceof Error) {
          console.error('⚠️ Stack trace:', notificationError.stack);
        }
      }
    } 

    return res.status(200).json({ message: "Evento eliminado correctamente", result });
  } catch (err: any) {
    console.error("❌ Error inesperado:", err);
    return res.status(500).json({ error: err.message || "Error interno del servidor." });
  }
};

//---------------------------------------------------------------------------------------------
export const get_event_details = async (req: Request, res: Response) => {
  const id_evento = Number(req.query.id_evento);
  const id_usuario = Number(req.query.id_usuario);

  if (!Number.isInteger(id_evento) || !Number.isInteger(id_usuario)) {
    return res
      .status(400)
      .json({ error: "Parámetros inválidos: id_evento e id_usuario deben ser enteros." });
  }

  try {
    const eventDetails = await getEventDetailsService(id_evento, id_usuario);
    return res.status(200).json(eventDetails);
  } catch (err: any) {
    console.error("❌ Error inesperado:", err);
    return res.status(500).json({ error: err.message || "Error interno del servidor." });
  }
};

//---------------------------------------------------------------------------------------------
// GET_USER_EVENTS
export const get_user_events = async (req: Request, res: Response) => {
  const id_usuario = Number(req.query.id_usuario);

  // fechas opcionales: si vienen vacías, las ignoramos
  const fecha_desde_q = (req.query.fecha_desde ?? "").toString().trim();
  const fecha_hasta_q = (req.query.fecha_hasta ?? "").toString().trim();

  const fecha_desde = fecha_desde_q ? new Date(fecha_desde_q) : undefined;
  const fecha_hasta = fecha_hasta_q ? new Date(fecha_hasta_q) : undefined;

  if (!Number.isInteger(id_usuario)) {
    return res.status(400).json({ error: "Parámetro inválido: id_usuario debe ser un entero." });
  }

  try {
    const events = await getUserEventsService(id_usuario, fecha_desde, fecha_hasta);
    return res.status(200).json(events);
  } catch (err: any) {
    console.error("❌ Error inesperado:", err);
    return res.status(500).json({ error: err.message || "Error interno del servidor." });
  }
};

//---------------------------------------------------------------------------------------------
// RESPOND_EVENT_INVITE
export const respond_event_invite = async (req: Request, res: Response) => {
  const { id_evento, id_usuario, confirmado } = req.body;
  if (!id_evento || !id_usuario || typeof confirmado !== 'boolean') {
    return res.status(400).json({ error: "Faltan campos requeridos o parámetros inválidos." });
  }
  try {
    
    // Responder a la invitación del evento
    await respondEventInviteService(Number(id_evento), Number(id_usuario), confirmado);
    
    // Buscar y marcar la notificación correspondiente como respondida
    try {
      
      // Obtener las notificaciones del usuario para buscar la correspondiente a este evento
      const userNotifications = await NotificationService.getUserNotifications(Number(id_usuario));
      
      // Buscar la notificación de este evento específico (meeting_invite o reinvite)
      const eventNotification = userNotifications.find((notification: any) => 
        (notification.tipo === 'meeting_invite' || notification.tipo === 'reinvite') && 
        notification.meta?.id_evento === Number(id_evento) &&
        !notification.meta?.respondida // Solo si no ha sido marcada como respondida
      );
      
      if (eventNotification) {
        const response = confirmado ? 'accept' : 'decline';
        await NotificationService.markAsResponded(eventNotification.id, response);
      } else {
        console.log('⚠️ No se encontró notificación de invitación para este evento o ya fue respondida');
      }
    } catch (notificationError) {
      // Si falla la actualización de notificación, no queremos que falle toda la operación
      console.error('⚠️ Error al actualizar notificación (respuesta del evento registrada exitosamente):', notificationError);
    }
    
    return res.status(200).json({ message: "Respuesta registrada correctamente" });
  } catch (err: any) {
    console.error("❌ Error inesperado:", err);
    return res.status(500).json({ error: err.message || "Error interno del servidor." });
  }
};

//---------------------------------------------------------------------------------------------
// GET_EVENT_CONFIRMATION - Obtener estado de confirmación del usuario para un evento
export const get_event_confirmation = async (req: Request, res: Response) => {
  const evento_id = Number(req.query.evento_id);
  const usuario_id = Number(req.query.usuario_id);

  if (!Number.isInteger(evento_id) || !Number.isInteger(usuario_id)) {
    return res.status(400).json({ 
      error: "Parámetros inválidos: evento_id y usuario_id deben ser enteros." 
    });
  }

  try {
    // Obtener confirmación desde la base de datos usando el campo original
    const { data, error } = await supabase
      .from('EventoInvitado')
      .select('confirmado')
      .eq('id_evento', evento_id)
      .eq('id_usuario', usuario_id)
      .single();

    if (error) {
      console.error('Error al obtener confirmación:', error);
      return res.status(404).json({ error: "No se encontró la invitación" });
    }

    // Mapear el valor booleano a string para el frontend (sistema original)
    let confirmacion = 'pendiente';
    if (data.confirmado === true) {
      confirmacion = 'confirmado';
    } else if (data.confirmado === false) {
      confirmacion = 'rechazado';
    }

    return res.status(200).json({ confirmacion });
  } catch (err: any) {
    console.error("❌ Error inesperado:", err);
    return res.status(500).json({ error: err.message || "Error interno del servidor." });
  }
};

//---------------------------------------------------------------------------------------------
// UPDATE_EVENT_CONFIRMATION - Actualizar confirmación del usuario para un evento
export const update_event_confirmation = async (req: Request, res: Response) => {
  const { evento_id, usuario_id, confirmacion } = req.body;

  if (!evento_id || !usuario_id || !confirmacion) {
    return res.status(400).json({ 
      error: "evento_id, usuario_id y confirmacion son requeridos." 
    });
  }

  if (!['pendiente', 'confirmado', 'rechazado'].includes(confirmacion)) {
    return res.status(400).json({ 
      error: "confirmacion debe ser: pendiente, confirmado o rechazado" 
    });
  }

  try {
    // Mapear string a booleano/null para la base de datos (sistema original)
    let confirmado = null;
    if (confirmacion === 'confirmado') {
      confirmado = true;
    } else if (confirmacion === 'rechazado') {
      confirmado = false;
    }

    // Actualizar en la base de datos usando el campo original
    const { error } = await supabase
      .from('EventoInvitado')
      .update({ confirmado })
      .eq('id_evento', Number(evento_id))
      .eq('id_usuario', Number(usuario_id));

    if (error) {
      console.error('Error al actualizar confirmación:', error);
      return res.status(500).json({ error: "Error al actualizar confirmación" });
    }

    // Actualizar notificaciones relacionadas cuando confirma/rechaza desde calendario
    if (confirmacion !== 'pendiente') {
      try {
        // Buscar notificaciones de meeting_invite o reinvite para este evento y usuario
        const { data: notificaciones, error: notifError } = await supabase
          .from('Notificacion')
          .select('id, meta')
          .eq('id_usuario', Number(usuario_id))
          .in('tipo', ['meeting_invite', 'reinvite'])
          .eq('leida', false);

        if (!notifError && notificaciones) {
          // Filtrar notificaciones de este evento específico
          const notificacionesDelEvento = notificaciones.filter(notif => {
            const meta = typeof notif.meta === 'string' ? JSON.parse(notif.meta) : notif.meta;
            return meta?.id_evento === Number(evento_id) && !meta?.respondida;
          });

          const response = confirmacion === 'confirmado' ? 'accept' : 'decline';
          
          // Actualizar el meta de cada notificación
          for (const notif of notificacionesDelEvento) {
            const metaActual = typeof notif.meta === 'string' ? JSON.parse(notif.meta) : notif.meta;
            const metaActualizado = {
              ...metaActual,
              respondida: true,
              respuesta: response
            };

            await supabase
              .from('Notificacion')
              .update({ 
                meta: metaActualizado,
                leida: true 
              })
              .eq('id', notif.id);
          }
        }
      } catch (e) {
        console.error('Error actualizando notificaciones:', e);
      }
    }

    return res.status(200).json({ 
      message: "Confirmación actualizada correctamente",
      confirmacion 
    });
  } catch (err: any) {
    console.error("❌ Error inesperado:", err);
    return res.status(500).json({ error: err.message || "Error interno del servidor." });
  }
};

//---------------------------------------------------------------------------------------------
// UPDATE_EVENT
export const update_event = async (req: Request, res: Response) => {
  // Usar process.stdout.write para asegurar que se muestre inmediatamente
  process.stdout.write('🎯 [CONTROLLER] update_event INICIADO - ¡FUNCIÓN EJECUTADA!\n');
  process.stdout.write(`🔄 update_event - Datos: ${JSON.stringify(req.body)}\n`);
  
  const { id_evento, id_editor, titulo, fecha, descripcion, color } = req.body;
  if (!id_evento || !id_editor) {
    return res.status(400).json({ error: "Faltan campos requeridos." });
  }
  
  try {
    
    await updateEventService(Number(id_evento), Number(id_editor), titulo ?? undefined, fecha ? new Date(fecha) : undefined, descripcion ?? undefined, color ?? undefined);

    process.stdout.write('✅ update_event completado exitosamente\n');
    return res.status(200).json({ message: "Evento actualizado correctamente" });
  } catch (err: any) {
    console.error("❌ Error inesperado en update_event:", err);
    return res.status(500).json({ error: err.message || "Error interno del servidor." });
  }
};

//---------------------------------------------------------------------------------------------
// UPDATE_EVENT_PARTICIPANTS
export const update_event_participants = async (req: Request, res: Response) => {
  const { id_evento, id_editor, participantes } = req.body;
  
  if (!id_evento || !id_editor) {
    return res.status(400).json({ error: "id_evento e id_editor son requeridos." });
  }

  try {
    // Primero, obtener los participantes actuales del evento para comparar
    let participantesAnteriores: number[] = [];
    try {
      const eventDetailsRaw = await getEventDetailsService(Number(id_evento), Number(id_editor));
      process.stdout.write('📊 Respuesta raw de getEventDetailsService:\n');
      process.stdout.write(JSON.stringify(eventDetailsRaw, null, 2) + '\n');

      // Manejar si es un array (múltiples filas) o un objeto único
      let eventDetails = eventDetailsRaw;
      if (Array.isArray(eventDetailsRaw)) {
        process.stdout.write('📄 Los detalles del evento son un array, usando el primer elemento\n');
        eventDetails = eventDetailsRaw[0];
      }
      
      if (eventDetails && eventDetails.invitados) {
        participantesAnteriores = Array.isArray(eventDetails.invitados) 
          ? eventDetails.invitados.map((inv: any) => inv.id).filter((id: any) => id !== Number(id_editor))
          : [];
      } else if (Array.isArray(eventDetailsRaw)) {
        // Si es un array de participantes individuales, extraer IDs únicos
        const idsParticipantes = eventDetailsRaw
          .filter((row: any) => row.id_invitado && row.id_invitado !== Number(id_editor))
          .map((row: any) => row.id_invitado);
        participantesAnteriores = [...new Set(idsParticipantes)]; // Eliminar duplicados
      }
    } catch (error) {
      process.stdout.write('⚠️ No se pudieron obtener participantes anteriores:\n');
      process.stdout.write(JSON.stringify(error, null, 2) + '\n');
    }

    // Actualizar los participantes
    await updateEventParticipantsService(
      Number(id_evento), // idEvento
      Number(id_editor),  // idEditor  
      participantes || [] // participantes
    );

    process.stdout.write('✅ update_event_participants - Participantes actualizados correctamente\n');

    // Gestionar notificaciones de forma inteligente
    try {
      process.stdout.write('🔍 Obteniendo detalles del evento para gestionar notificaciones...\n');
      const eventDetailsRaw = await getEventDetailsService(Number(id_evento), Number(id_editor));
      process.stdout.write('📄 Detalles del evento obtenidos:\n');
      process.stdout.write(JSON.stringify(eventDetailsRaw, null, 2) + '\n');

      // Manejar si es un array (múltiples filas) o un objeto único
      let eventDetails = eventDetailsRaw;
      if (Array.isArray(eventDetailsRaw) && eventDetailsRaw.length > 0) {
        process.stdout.write('📄 Los detalles del evento son un array, usando el primer elemento para datos básicos\n');
        eventDetails = eventDetailsRaw[0];
      }
      
      if (eventDetails) {
        // Obtener el nombre del organizador y título del evento del primer registro
        const organizadorNombre = eventDetails.creador_nombre || eventDetails.creator_name || eventDetails.nombre_creador || eventDetails.nombre || `Usuario ${id_editor}`;
        const tituloEvento = eventDetails.titulo || eventDetails.title || eventDetails.nombre || 'Evento sin título';
        const fechaEvento = eventDetails.fecha || eventDetails.date || eventDetails.fechaHora;
        
        // Participantes nuevos (sin incluir al organizador)
        const participantesNuevos = (participantes || []).filter((p: number) => p !== Number(id_editor));
        process.stdout.write('👤 Participantes nuevos (sin organizador):\n');
        process.stdout.write(JSON.stringify(participantesNuevos, null, 2) + '\n');

        // Determinar qué usuarios fueron removidos y cuáles agregados
        const participantesRemovidosIds = participantesAnteriores.filter((id: number) => !participantesNuevos.includes(id));
        const participantesAgregadosIds = participantesNuevos.filter((id: number) => !participantesAnteriores.includes(id));

        process.stdout.write('🗑️ Participantes removidos:\n');
        process.stdout.write(JSON.stringify(participantesRemovidosIds, null, 2) + '\n');
        
        // 1. Eliminar notificaciones de invitación para usuarios removidos
        if (participantesRemovidosIds.length > 0) {
          const deleteResult = await NotificationService.deleteEventInviteNotificationsForUsers(
            Number(id_evento),
            participantesRemovidosIds
          );
          process.stdout.write(`✅ Eliminadas ${deleteResult.count} notificaciones de invitación\n`);
        }
        
        // 2. Crear notificaciones para usuarios agregados
        if (participantesAgregadosIds.length > 0) {
          process.stdout.write('📧 Creando notificaciones para participantes agregados...\n');
          const createResult = await NotificationService.createMultipleEventInviteNotifications(
            participantesAgregadosIds,
            tituloEvento,
            organizadorNombre,
            Number(id_evento),
            fechaEvento
          );
          process.stdout.write(`✅ Creadas ${participantesAgregadosIds.length} notificaciones de invitación\n`);
        }
        
        if (participantesRemovidosIds.length === 0 && participantesAgregadosIds.length === 0) {
          process.stdout.write('ℹ️ No hay cambios en participantes, no se modifican notificaciones\n');
        }
      } else {
        process.stdout.write('⚠️ No se obtuvieron detalles del evento para gestionar notificaciones\n');
      }
    } catch (notificationError) {
      // Si falla la creación de notificaciones, no queremos que falle toda la operación
      console.error('⚠️ Error al crear notificaciones (operación principal exitosa):', notificationError);
    }
    
    return res.status(200).json({ message: "Participantes actualizados correctamente" });
  } catch (err: any) {
    console.error("❌ Error inesperado en update_event_participants:", err);
    return res.status(500).json({ error: err.message || "Error interno del servidor." });
  }
};