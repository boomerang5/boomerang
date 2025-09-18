import supabase from "../../lib/supabase";

type EventGuestRow = {
  id: number;                 // id del evento
  titulo: string | null;
  descripcion: string | null;
  color: string | null;
  fecha: string;              // timestamptz en ISO
  creado_por: number;
  id_invitado: number | null; // puede ser null si no hay invitados
  nombre: string | null;
  apellido: string | null;
  apodo: string | null;
  confirmado: any | null;         
};

async function getEventDetails(idEvento: number, idUsuario: number) {
  const { data, error } = await supabase.rpc("get_event_details", {
    p_id_evento: idEvento,
    p_id_usuario: idUsuario,
  });

  if (error) {
    console.error("❌ Error al ejecutar la función:", error);
    process.exit(1);
  }

  console.log("🧩 Detalles del evento:", data);
  return data as EventGuestRow[];
}

// Ejemplo de uso
const idEvento = 7;
const idUsuario = 2;

getEventDetails(idEvento, idUsuario);
