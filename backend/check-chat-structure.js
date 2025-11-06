// Script para ver si hay tabla intermedia o cómo se relacionan
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkChatStructure() {
  console.log('🔍 Verificando estructura de Chat...\n');
  
  // Ver un chat completo para entender la estructura
  const { data: chatData, error: chatError } = await supabase
    .from('Chat')
    .select('*')
    .limit(3);
  
  if (chatError) {
    console.error('❌ Error:', chatError);
  } else {
    console.log('✅ Ejemplos de Chat:');
    console.log(JSON.stringify(chatData, null, 2));
  }
  
  // Ver si hay mensajes y cómo se relacionan
  console.log('\n📨 Verificando Mensajes...\n');
  const { data: msgData, error: msgError } = await supabase
    .from('Mensaje')
    .select('*')
    .limit(3);
  
  if (!msgError) {
    console.log('✅ Ejemplos de Mensaje:');
    console.log(JSON.stringify(msgData, null, 2));
  }
}

checkChatStructure();
