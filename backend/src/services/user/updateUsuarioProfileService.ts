import { supabaseAdmin } from "../../lib/supabase";

export async function updateUsuarioProfileService(
  idUsuario: number,
  nombre: string,
  apellido: string,
  apodo: string,
  pais: string,
  genero: number,
  fecha_nacimiento: string, 
  idioma: number
) {
  try {
    console.log("RPC update_usuario_profile ->", {
      idUsuario, nombre, apellido, apodo, pais, genero, fecha_nacimiento, idioma,
    });

    const { data, error } = await supabaseAdmin.rpc("update_usuario_profile", {
      p_id: idUsuario,
      p_nombre: nombre,
      p_apellido: apellido,
      p_apodo: apodo,
      p_pais: pais,
      p_id_genero: genero,
      p_fecha_nacimiento: fecha_nacimiento,
      p_idioma: idioma,
    });

    if (error) {
      console.error("Supabase RPC error:", error);
      throw new Error(`Error de Supabase: ${error.message}`);
    }

    if (!data) {
      throw new Error(`Usuario con ID ${idUsuario} no encontrado`);
    }

    return data; 
  } catch (error) {
    throw error;
  }
}
