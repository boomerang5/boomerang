import supabase from "../../lib/supabase";

export async function createUsuarioProfileService({
  nombre,
  apellido,
  idioma,
  apodo,
  user_id,
  genero,
  fecha_nacimiento
}: {
  nombre: string;
  apellido: string;
  idioma: number;
  apodo: string;
  user_id: string;
  genero?: number | null;
  fecha_nacimiento?: string | null;
}) {
  const { data, error } = await supabase.rpc("create_usuario_profile", {
    p_nombre: nombre,
    p_apellido: apellido,
    p_idioma: idioma,
    p_apodo: apodo,
    p_user_id: user_id,
    p_genero: genero ?? null,
    p_fec_nacimiento: fecha_nacimiento ?? null,
  });

  if (error) {
    console.error("❌ Supabase error:", error);
    throw new Error(error.message);
  }

  return data;
}
