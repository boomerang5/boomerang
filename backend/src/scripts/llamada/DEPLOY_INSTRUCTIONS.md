# 🚀 Instrucciones de Deployment - Fix Error Duplicate Key

## ❌ Problema

Error: `duplicate key value violates unique constraint "ux_usuarioxllamada"`

## 🔍 Causa Raíz

1. La función `end_call` no existía en la base de datos
2. Los registros de `UsuarioXLlamada` nunca se limpiaban al terminar una llamada
3. Al intentar hacer otra llamada con los mismos usuarios, se generaba un conflicto de clave única

## ✅ Solución Implementada

### Cambios en el Frontend (`page.tsx`):

1. ✅ Agregado `setCallRowId(null)` en `endLocalCall()` y `resetCall()`
2. ✅ Agregado guard en `makeCall()` para prevenir llamadas duplicadas
3. ✅ Ya está deployado en el código

### Cambios en la Base de Datos (Stored Procedures):

1. ✅ Agregado `ON CONFLICT DO NOTHING` en `create_call_with_modal_data`
2. ✅ Creado el SP `end_call` que faltaba

## 📋 Pasos para Desplegar

### Opción 1: Deployment Completo (Recomendado)

Ejecuta este archivo completo en el SQL Editor de Supabase:

```
backend/src/scripts/llamada/deploy_both_sps.sql
```

### Opción 2: Deployment Mínimo

Ejecuta este archivo en el SQL Editor de Supabase:

```
final_clean_sp.sql
```

## 🧪 Verificar el Deployment

Después de ejecutar el script, verifica que las funciones existan:

```sql
-- Verificar que existen las funciones
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name IN ('create_call_with_modal_data', 'end_call')
  AND routine_schema = 'public';
```

Deberías ver:

- `create_call_with_modal_data` | FUNCTION
- `end_call` | FUNCTION

## 🎯 Probar la Solución

1. **Limpiar llamadas huérfanas** (opcional, si quieres empezar limpio):

```sql
-- Ver llamadas sin fecha_fin
SELECT id, titulo, fecha_inicio, fecha_fin
FROM public."Llamada"
WHERE fecha_fin IS NULL;

-- Cerrarlas manualmente (ajusta el ID según corresponda)
SELECT end_call(ID_AQUI);
```

2. **Reinicia el servidor Next.js** en tu terminal local

3. **Prueba el flujo completo**:
   - Cliente A llama a Cliente B
   - Cuelgan la llamada
   - Cliente A vuelve a llamar a Cliente B
   - ✅ No debería haber error de duplicate key

## 📝 Notas Adicionales

- El `ON CONFLICT DO NOTHING` en el SP previene errores si por alguna razón se intenta insertar un participante duplicado
- El `end_call` ahora actualiza correctamente `fecha_fin` y `duracion_calculada`
- El frontend ahora limpia correctamente el estado de `callRowId`
- El guard en `makeCall` previene que se cree una llamada si ya hay una en progreso

## ⚠️ Importante

Asegúrate de ejecutar el SQL **COMPLETO** del archivo seleccionado. Si solo ejecutas una parte, las funciones pueden quedar en un estado inconsistente.
