import supabase from "../../lib/supabase";

export async function getUsuarioUuid(uuidUsuario: string) {
  // Primero intentar con RPC (para usuarios reales)
  const { data: rpcData, error: rpcError } = await supabase.rpc("get_usuario_uuid", {
    p_user_id: uuidUsuario
  });

  if (!rpcError && rpcData && rpcData.length > 0) {
    // Si encontramos el usuario via RPC, obtener información completa
    const userId = rpcData[0]?.id;
    if (userId) {
      const { data: userData, error: userError } = await supabase
        .from('Usuario')
        .select('id, nombre, apellido, apodo, mail, User_id')
        .eq('id', userId)
        .single();
      
      if (!userError && userData) {
        return [userData]; // Mantener formato de array para compatibilidad
      }
    }
  }

  // Si no se encontró via RPC, buscar directamente por User_id (para UUIDs existentes)
  const { data: directData, error: directError } = await supabase
    .from('Usuario')
    .select('id, nombre, apellido, apodo, mail, User_id')
    .eq('User_id', uuidUsuario)
    .single();

  if (!directError && directData) {
    return [directData];
  }

  // Si no se encuentra, devolver array vacío
  return [];
}