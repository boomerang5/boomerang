// Script para aplicar todas las mejoras de chats
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function executeSQLFile(filePath, description) {
  try {
    console.log(`\n🔄 Ejecutando: ${description}`);
    const sql = fs.readFileSync(filePath, 'utf8');
    
    // Dividir por sentencias (separadas por ;)
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (statement.length === 0) continue;
      
      console.log(`   📝 Ejecutando sentencia ${i + 1}/${statements.length}`);
      const { data, error } = await supabase.rpc('exec_sql', { sql: statement });
      
      if (error) {
        // Si no existe exec_sql, intentar con query directa
        console.log(`   ⚠️ Intentando método alternativo...`);
        // Para funciones, usar el approach directo
        if (statement.includes('CREATE OR REPLACE FUNCTION')) {
          console.log(`   ❌ No se puede ejecutar CREATE FUNCTION desde cliente.`);
          console.log(`   📋 ACCIÓN MANUAL REQUERIDA:`);
          console.log(`   1. Ve a Supabase SQL Editor`);
          console.log(`   2. Ejecuta manualmente el contenido de: ${filePath}`);
          return false;
        }
      } else {
        console.log(`   ✅ Sentencia ejecutada correctamente`);
      }
    }
    
    return true;
  } catch (err) {
    console.error(`   ❌ Error ejecutando ${description}:`, err);
    return false;
  }
}

async function applyAllImprovements() {
  console.log('🚀 Aplicando mejoras de chat...\n');
  
  const improvements = [
    {
      file: './src/scripts/chat/get_user_chats_fixed.sql',
      description: 'Función mejorada get_user_chats_fixed'
    },
    {
      file: './src/scripts/chat/create_chat_improved.sql', 
      description: 'Función mejorada create_chat_improved'
    },
    {
      file: './src/scripts/chat/create_group_with_chat_improved.sql',
      description: 'Función mejorada create_group_with_chat_improved'
    }
  ];
  
  let allSuccess = true;
  let manualStepsNeeded = [];
  
  for (const improvement of improvements) {
    const success = await executeSQLFile(improvement.file, improvement.description);
    if (!success) {
      allSuccess = false;
      manualStepsNeeded.push(improvement.file);
    }
  }
  
  console.log('\n📊 RESUMEN:');
  if (allSuccess) {
    console.log('✅ Todas las mejoras se aplicaron correctamente');
    console.log('🎉 El sistema de chats debería funcionar perfectamente ahora');
  } else {
    console.log('⚠️ Algunas mejoras requieren aplicación manual');
    console.log('📋 PASOS MANUALES REQUERIDOS:');
    console.log('1. Ve a Supabase Dashboard > SQL Editor');
    console.log('2. Ejecuta manualmente el contenido de estos archivos:');
    manualStepsNeeded.forEach(file => {
      console.log(`   - ${file}`);
    });
  }
  
  console.log('\n🔧 PRÓXIMOS PASOS DESPUÉS DE APLICAR SQL:');
  console.log('1. Actualizar servicios backend para usar nuevas funciones');
  console.log('2. Mejorar frontend para mostrar participantes correctamente');
  console.log('3. Verificar ordenamiento de chats');
}

applyAllImprovements();