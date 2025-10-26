import supabase from "../../lib/supabase";

async function updateUsuarioProfile({
  id,
  nombre,
  apellido,
  apodo,
  pais,
  id_genero,
  fecha_nacimiento, // formato 'YYYY-MM-DD'
  idioma,
}: {
  id: number;
  nombre: string;
  apellido: string;
  apodo: string;
  pais: string;
  id_genero: number;
  fecha_nacimiento: string; // 'YYYY-MM-DD'
  idioma: number;
}) {
  const { data, error } = await supabase.rpc("update_usuario_profile", {
    p_id: id,
    p_nombre: nombre,
    p_apellido: apellido,
    p_apodo: apodo,
    p_pais: pais,
    p_id_genero: id_genero,
    p_fecha_nacimiento: fecha_nacimiento,
    p_idioma: idioma,
  });

  if (error) {
    console.error("❌ Error al ejecutar la función:", error);
    process.exit(1);
  }

  console.log("✅ Perfil actualizado correctamente. Resultado:", data);
}

// ejemplo de uso
updateUsuarioProfile({
  id: 2,
  nombre: "Pedro",
  apellido: "Argañaraz",
  apodo: "Pedrito",
  pais: "Argentina",
  id_genero: 1,              // ajusta según catálogo de géneros
  fecha_nacimiento: "2001-10-04", // 'DD/MM/AAAA' -> 'AAAA-MM-DD'
  idioma: 2,
});
