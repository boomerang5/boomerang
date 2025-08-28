import supabase from "../../lib/supabase";

// objeto simulado desde el front
const usuario = {
  nombre: "Paula",
  apellido: "Arrascaeta",
  idioma: 1,
  apodo: "Peu",
  user_id: "fd4680cc-e879-4a70-8c19-21c1d0ab3ee6"
};

async function createUsuarioProfile() {
  try {
    const { data, error } = await supabase.rpc("create_usuario_profile", {
      p_nombre: usuario.nombre,
      p_apellido: usuario.apellido,
      p_idioma: usuario.idioma,
      p_apodo: usuario.apodo,
      p_user_id: usuario.user_id
    });

    if (error) {
      console.error("❌ Error al ejecutar la función:", error);
      process.exit(1);
    }

    console.log("✅ Usuario creado correctamente, id:", data);
  } catch (err) {
    console.error("❌ Error inesperado:", err);
    process.exit(1);
  }
}

createUsuarioProfile();
