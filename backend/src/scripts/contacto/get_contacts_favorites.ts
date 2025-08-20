import supabase from "../../lib/supabase";

async function getContactsFavorites(idUsuario: number) {
  console.log(`🧪 Ejecutando RPC get_contacts_favorites con parámetros: { p_id_usuario: ${idUsuario}}`);

  const { data, error } = await supabase.rpc("get_contacts_favorites", {
    p_id_usuario: idUsuario
  });

  if (error) {
    console.error("❌ Error al ejecutar la función:", error.message);
    process.exit(1);
  }

  console.log("✅ Consulta realizada con éxito. Resultado:", data); //Si da null se ejecutpo correctamente
}

// ejemplo de uso:
const idUsuario = 1;

getContactsFavorites(idUsuario);
