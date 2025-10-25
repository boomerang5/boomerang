import { supabaseAdmin } from "../../lib/supabase";

export async function updateUsuarioProfileService(
  idUsuario: number, 
  nombre: string, 
  apellido: string, 
  idioma: number, 
  apodo: string, 
  pais?: string | null, 
  genero?: number, 
  fecha_nacimiento?: string | null) {
  
  try {
    console.log("Iniciando actualización de usuario:", { idUsuario, nombre, apellido, idioma, apodo, pais, genero, fecha_nacimiento });

    // Construir objeto de actualización con campos requeridos
    const updateFields = {
      nombre: nombre,
      apellido: apellido,
      id_idioma: idioma,
      apodo: apodo,
      pais: pais,
      id_genero: genero,
      fecha_nacimiento: fecha_nacimiento
    };
    
    console.log('Campos a actualizar:', updateFields);
    
    const { data, error } = await supabaseAdmin
      .from('Usuario')
      .update(updateFields)
      .eq('id', idUsuario)
      .select(`
        id,
        nombre,
        apellido,
        mail,
        fecha_registro,
        apodo,
        id_idioma,
        nombre_idioma:id_idioma(nombre),
        fecha_nacimiento,
        id_genero,
        nombre_genero:id_genero(nombre_genero),
        pais,
        id_foto_perfil,
        path_foto_perfil
      `);

    if (error) {
      console.error("Supabase error:", error);
      throw new Error(`Error de Supabase: ${error.message}`);
    }

    if (!data || data.length === 0) {
      throw new Error(`Usuario con ID ${idUsuario} no encontrado`);
    }

    console.log("Usuario actualizado correctamente:", data[0]);
    return data[0]; 
  } catch (error) {
    console.error("Error en updateUsuarioProfileService:", error);
    throw error;
  }
}