import supabase from "../../lib/supabase";

export async function changeStateUser(idUsuario: number, idEstado: number) {
    const { data, error } = await supabase.rpc("change_state_user", {
        p_id_usuario: idUsuario,
        p_id_estado: idEstado,
    });

    if (error) {
        console.error("❌ Supabase error:", error);
        throw new Error(error.message);
    }

    return data; 
}