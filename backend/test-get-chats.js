// Script de prueba para verificar get_user_chats
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testGetUserChats() {
  console.log('🔍 Probando get_user_chats con id_usuario = 24...\n');
  
  try {
    const { data, error } = await supabase.rpc('get_user_chats', {
      p_id_usuario: 24
    });

    if (error) {
      console.error('❌ Error:', error);
      console.error('Details:', JSON.stringify(error, null, 2));
      return;
    }

    console.log('✅ Éxito! Datos recibidos:');
    console.log(JSON.stringify(data, null, 2));
    console.log(`\nTotal de chats: ${Array.isArray(data) ? data.length : 'N/A'}`);
  } catch (err) {
    console.error('❌ Error al ejecutar:', err);
  }
}

testGetUserChats();
