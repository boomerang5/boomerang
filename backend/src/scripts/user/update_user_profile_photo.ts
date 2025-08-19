import supabase from "../../lib/supabase";

async function updateUsuarioProfile(idUsuario: number,idArchivo: number) {
  const { data, error } = await supabase.rpc("update_user_profile_photo", {
    p_id_usuario: idUsuario,
    p_id_archivo: idArchivo
  });

  if (error) {
    console.error("❌ Error al ejecutar la función:", error);
    process.exit(1);
  }

  console.log("✅ Foto de perfil actualizada correctamente. Resultado:", data);
}

// ejemplo de uso
const idUsuario = 1;
const idArchivo = 7;
updateUsuarioProfile(idUsuario, idArchivo);
