import { Request, Response } from "express";
import { getCallInfoService } from "../services/llamada/getCallInfoService";
import { getUserCallHistoryService } from "../services/llamada/getUserCallHistoryService";


export async function get_call_info(req: Request, res: Response) {
  const idUsuario = Number.parseInt(req.params.idUsuario, 10);
  const idLlamada = Number.parseInt(req.params.idLlamada, 10);

  if (Number.isNaN(idUsuario) || Number.isNaN(idLlamada)) {
    return res.status(400).json({ error: "Parámetros inválidos: idUsuario e idLlamada deben ser enteros." });
  }

  try {
    const data = await getCallInfoService(idUsuario, idLlamada);

    return res.status(200).json({ success: true, data });
  } catch (err: any) {
    console.error("❌ Error en get_call_info:", err);
    return res.status(500).json({ success: false, message: "Error retrieving call info" });
  }
}

export async function get_user_call_history(req: Request, res: Response) {
  const idUsuario = Number.parseInt(req.query.id_usuario as string, 10);

  if (Number.isNaN(idUsuario)) {
    return res.status(400).json({ error: "Parámetro inválido: id_usuario debe ser un número." });
  }

  try {
    const data = await getUserCallHistoryService(idUsuario);

    if (!data || data.length === 0) {
      return res.status(404).json({ success: false, message: "No se encontraron llamadas para este usuario." });
    }

    return res.status(200).json({ success: true, data });
  } catch (err: any) {
    console.error("❌ Error en get_user_call_history:", err);
    return res.status(500).json({ success: false, message: "Error retrieving user call history" });
  }
}
