import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("❌ Faltan las variables SUPABASE_URL o SUPABASE_ANON_KEY en el .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface Contacto {
  id: number;
  nombre: string;
  apellido: string;
  apodo: string;
  en_agenda: boolean;
}

async function getAllContacts(p_id_usuario: number, p_busqueda?: string) {
  try {
    const { data, error } = await supabase.rpc("get_all_contacts", {
      p_id_usuario,
      p_busqueda: p_busqueda ?? null,
    });

    if (error) {
      console.error("❌ Error al ejecutar la función:", error);
      process.exit(1);
    }

    const contactos = data as Contacto[];

    if (!contactos || contactos.length === 0) {
      console.log("ℹ️ No se encontraron contactos.");
    } else {
      console.log("✅ Contactos encontrados:");
      console.table(contactos);
    }
  } catch (err) {
    console.error("❌ Error inesperado:", err);
    process.exit(1);
  }
}

// Prueba
const idUsuario = 1;           // Cambia por el id_usuario real
const busquedaOpcional = "";  // o algún término como "juan"

getAllContacts(idUsuario, busquedaOpcional);