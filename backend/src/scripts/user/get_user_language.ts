// backend/src/scripts/usuario/get_user_lagnuage.ts
import supabase from "../../lib/supabase";

async function getUserLanguage(idUsuario: number) {
  const { data, error } = await supabase.rpc("get_user_language", {
    p_id_usuario: idUsuario,
  });

  if (error) {
    console.error("❌ Error al ejecutar la función:", error);
    process.exit(1);
  }

  console.log("✅ Idioma del usuario:", data);
}

// Prueba local (cambiá el ID si querés)
getUserLanguage(2);
