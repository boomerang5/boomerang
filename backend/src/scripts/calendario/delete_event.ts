import supabase from "../../lib/supabase";

async function deleteEvent(idEvento: number, idEditor: number) {
  const { data, error } = await supabase.rpc("delete_event", {
    p_id_evento: idEvento,
    p_editor: idEditor,
  });

  if (error) {
    console.error("❌ Error al ejecutar la función:", error);
    process.exit(1);
  }

  console.log("✅ Evento eliminado correctamente. Resultado:", data);
}

//Prueba
const idEvento = 4;
const idEditor = 2;

deleteEvent(idEvento, idEditor);


