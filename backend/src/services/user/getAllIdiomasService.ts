import supabase from "../../lib/supabase";

export const getAllIdiomasService = async () => {
  try {
    const { data, error } = await supabase.rpc("get_all_idiomas");

    if (error) {
      console.error("❌ Error del SP get_all_idiomas:", error);
      throw new Error(error.message);
    }

    return data;
  } catch (err: any) {
    console.error("❌ Error inesperado en getAllIdiomasService:", err);
    throw new Error(err.message || "Error interno del servidor");
  }
};