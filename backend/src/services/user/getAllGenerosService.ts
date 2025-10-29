import supabase from "../../lib/supabase";

export const getAllGenerosService = async () => {
  try {
    const { data, error } = await supabase.rpc("get_all_generos");

    if (error) {
      console.error("❌ Error del SP get_all_generos:", error);
      throw new Error(error.message);
    }

    return data;
  } catch (err: any) {
    console.error("❌ Error inesperado en getAllGenerosService:", err);
    throw new Error(err.message || "Error interno del servidor");
  }
};