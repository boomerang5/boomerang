// Script de prueba para verificar create_chat
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCreateChat() {
  console.log('🔍 Probando si existe función create_chat...\n');
  
  try {
    // Intentar crear un chat de prueba con datos dummy
    const { data, error } = await supabase.rpc('create_chat', {
      p_id_emisor: 1,
      p_id_contacto: 2,
      p_nombre: null,
      p_id_grupo: null
    });

    if (error) {
      console.error('❌ Error al probar create_chat:', error);
      console.error('Details:', JSON.stringify(error, null, 2));
      
      if (error.message && error.message.includes('does not exist')) {
        console.log('\n🚨 La función create_chat NO EXISTE en Supabase');
        console.log('📝 Necesitas ejecutar el SQL para crearla.');
        return false;
      }
      return false;
    }

    console.log('✅ La función create_chat existe y devolvió:', data);
    return true;
  } catch (err) {
    console.error('❌ Error al ejecutar:', err);
    return false;
  }
}

async function listExistingFunctions() {
  console.log('\n🔍 Verificando qué funciones RPC existen...\n');
  
  // Intentar listar funciones conocidas
  const functions = ['get_user_chats', 'create_chat', 'get_usuario_uuid'];
  
  for (const func of functions) {
    try {
      // Solo intentar sin parámetros para ver si existe
      const { error } = await supabase.rpc(func);
      
      if (error && error.message && !error.message.includes('does not exist')) {
        console.log(`✅ Función "${func}" existe (error de parámetros, no de existencia)`);
      } else if (error && error.message && error.message.includes('does not exist')) {
        console.log(`❌ Función "${func}" NO existe`);
      } else {
        console.log(`✅ Función "${func}" existe y se ejecutó`);
      }
    } catch (err) {
      console.log(`❓ Función "${func}" - Error desconocido:`, err.message);
    }
  }
}

async function main() {
  const exists = await testCreateChat();
  await listExistingFunctions();
  
  if (!exists) {
    console.log('\n📋 SOLUCIÓN:');
    console.log('1. Ve a Supabase SQL Editor');
    console.log('2. Busca o crea la función create_chat');
    console.log('3. También verifica create_group_with_chat');
  }
}

main();