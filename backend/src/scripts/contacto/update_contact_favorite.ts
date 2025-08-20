import supabase from "../../lib/supabase";

async function updateContactFavorite({
  idUsuario,
  idUsuarioContacto, // <-- OJO al nombre: es el id del usuario-contacto, no el id de la fila
  favorito,
}: {
  idUsuario: number;
  idUsuarioContacto: number;
  favorito: boolean;
}) {
  try {
    const { data, error } = await supabase.rpc("update_contact_favorite", {
      p_id_usuario: idUsuario,
      p_id_usuario_contacto: idUsuarioContacto,
      p_favorito: favorito,
    });

    if (error) {
      console.error("❌ Error al ejecutar la función:", error);
      return;
    }

    console.log("✅ Contacto actualizado correctamente. Resultado:", data);
  } catch (err) {
    console.error("❌ Error inesperado:", err);
  }
}

// ejemplo de uso
const idUsuario = 1;
const idUsuarioContacto = 2; // <-- este es el "otro" usuario (columna id_usuario_contacto)
const favorito = false;

updateContactFavorite({ idUsuario, idUsuarioContacto, favorito });
