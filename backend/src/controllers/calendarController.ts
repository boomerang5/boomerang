import { Request, Response } from 'express';
import { createEventService } from '../services/calendar/createEventService';
import { deleteEventService } from '../services/calendar/deleteEventService';
import { getEventDetailsService } from '../services/calendar/getEventDetailsService';
import { getUserEventsService } from '../services/calendar/getUserEventsService';
import { respondEventInviteService } from '../services/calendar/respondEventInviteService';
import { updateEventService } from '../services/calendar/updateEventService';

//---------------------------------------------------------------------------------------------
// CREATE_EVENT
export const create_event = async (req: Request, res: Response) => {
  const { id_creador, titulo, fecha, descripcion, color, invitados } = req.body;

  if (!id_creador || !titulo || !fecha) {
    return res.status(400).json({ error: "Faltan campos requeridos." });
  }

  try {
    const id = await createEventService(Number(id_creador), titulo, new Date(fecha), descripcion ?? null, color ?? null, invitados ?? null);

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
    const result = await deleteEventService(Number(id_evento), Number(id_editor));
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
    await respondEventInviteService(Number(id_evento), Number(id_usuario), confirmado);
    return res.status(200).json({ message: "Respuesta registrada correctamente" });
  } catch (err: any) {
    console.error("❌ Error inesperado:", err);
    return res.status(500).json({ error: err.message || "Error interno del servidor." });
  }
};

//---------------------------------------------------------------------------------------------
// UPDATE_EVENT
export const update_event = async (req: Request, res: Response) => {
  const { id_evento, id_editor, titulo, fecha, descripcion, color } = req.body;
  if (!id_evento || !id_editor) {
    return res.status(400).json({ error: "Faltan campos requeridos." });
  }
  try {
    await updateEventService(Number(id_evento), Number(id_editor), titulo ?? undefined, fecha ? new Date(fecha) : undefined, descripcion ?? undefined, color ?? undefined);
    return res.status(200).json({ message: "Evento actualizado correctamente" });
  } catch (err: any) {
    console.error("❌ Error inesperado:", err);
    return res.status(500).json({ error: err.message || "Error interno del servidor." });
  }
};