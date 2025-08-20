import supabase from "../../lib/supabase";

async function updateContactFavorite({
  idContactoUsuario,
  favorito,
}: {
  idContactoUsuario: number;
  favorito: boolean;
}) {
  try {
    const { data, error } = await supabase.rpc("update_contact_favorite", {
      p_id_contacto_usuario: idContactoUsuario,
      p_favorito: favorito
    });

    if (error) {
      console.error("❌ Error al ejecutar la función:", error);
      process.exit(1);
    }

    console.log("✅ Contacto actualizado correctamente. Resultado:", data);
  } catch (err) {
    console.error("❌ Error inesperado:", err);
    process.exit(1);
  }
}

// ejemplo de uso
const idContactoUsuario = 12; // el id de ContactoUsuario
const favorito = false;       // true o false

updateContactFavorite({ idContactoUsuario, favorito });
