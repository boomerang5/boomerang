// Script para listar todas las tablas en Supabase
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function listTables() {
  console.log('🔍 Listando tablas relacionadas con Chat...\n');
  
  // Intentar acceder a cada tabla posible
  const tables = [
    'Chat', 'UsuarioChat', 'Usuario_Chat', 'UsuarioXChat', 
    'chat', 'usuariochat', 'usuario_chat', 'usuarioxchat',
    'ChatUsuario', 'Chat_Usuario', 'ChatXUsuario',
    'Mensaje', 'mensaje', 'Grupo', 'grupo'
  ];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (!error) {
        console.log(`✅ Tabla "${table}" existe`);
        if (data && data.length > 0) {
          console.log(`   Columnas: ${Object.keys(data[0]).join(', ')}`);
        }
      }
    } catch (err) {
      // Silenciar errores
    }
  }
}

listTables();
