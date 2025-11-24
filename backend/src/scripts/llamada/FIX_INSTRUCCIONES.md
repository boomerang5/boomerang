# FIX: Problema con fecha_fin NULL en llamadas

## Problema Identificado

Hay **dos funciones `end_call`** en Supabase con diferentes implementaciones:

1. **end_call (versión simple)** - Solo actualiza `Llamada.fecha_fin`
2. **end_call (versión completa)** - Actualiza `Llamada.fecha_fin` + limpia `UsuarioXLlamada`

Esto causa que en algunos casos se llame a la versión incorrecta y no se guarde `fecha_fin`.

## Solución

### Paso 1: Ejecutar el script de migración en Supabase

1. Ve a Supabase → SQL Editor
2. Abre y ejecuta el archivo: `backend/src/scripts/llamada/FIX_end_call_duplicada.sql`
3. Este script:
   - Elimina TODAS las versiones de `end_call`
   - Crea solo UNA versión correcta que:
     - Actualiza `fecha_fin` y `duracion_calculada` en `Llamada`
     - Marca `salida` en `UsuarioXLlamada`
     - Usa `timestamptz` (timezone-aware)
     - Previene duraciones de 0 segundos con `GREATEST(1, ...)`

### Paso 2: Verificar que solo hay una función

Ejecuta en Supabase SQL Editor:

```sql
SELECT routine_name, routine_schema, routine_definition
FROM information_schema.routines
WHERE routine_name = 'end_call';
```

**Resultado esperado:** Solo 1 fila

### Paso 3: Probar

1. Realiza una nueva llamada
2. Finalízala (ya sea colgando, rechazando o cancelando)
3. Verifica en Supabase que:
   - `Llamada.fecha_fin` NO sea NULL
   - `Llamada.duracion_calculada` tenga un valor
   - `UsuarioXLlamada.salida` esté marcada

## Diferencias entre las versiones

### ❌ Versión INCORRECTA (la que causaba el problema)

```sql
CREATE FUNCTION end_call(p_id_llamada INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE "Llamada"
  SET fecha_fin = LOCALTIMESTAMP,
      duracion_calculada = EXTRACT(EPOCH FROM (LOCALTIMESTAMP - fecha_inicio))::INTEGER
  WHERE id = p_id_llamada AND fecha_fin IS NULL;
END;
$$;
```

### ✅ Versión CORRECTA (la nueva)

```sql
CREATE FUNCTION end_call(p_id_llamada INTEGER)
RETURNS TABLE(affected_users INT, call_updated BOOL) AS $$
DECLARE
  v_now timestamptz := now();
  v_updated_call INT := 0;
  v_affected INT := 0;
BEGIN
  -- Actualiza Llamada
  UPDATE "Llamada"
  SET fecha_fin = v_now,
      duracion_calculada = GREATEST(1, EXTRACT(EPOCH FROM (v_now - fecha_inicio))::INT)
  WHERE id = p_id_llamada AND fecha_fin IS NULL
  RETURNING 1 INTO v_updated_call;

  -- Limpia UsuarioXLlamada (IMPORTANTE!)
  UPDATE "UsuarioXLlamada"
  SET salida = v_now
  WHERE "idLlamada" = p_id_llamada AND salida IS NULL;

  GET DIAGNOSTICS v_affected = ROW_COUNT;
  RETURN QUERY SELECT v_affected, (v_updated_call = 1);
END;
$$;
```

## Mejoras de la versión correcta

1. **Limpia `UsuarioXLlamada`** - Marca la salida de todos los participantes
2. **Previene duración 0** - Usa `GREATEST(1, ...)`
3. **Timezone-aware** - Usa `timestamptz` en lugar de `LOCALTIMESTAMP`
4. **Retorna información** - Indica cuántos usuarios y si la llamada se actualizó
5. **Más eficiente** - Usa una sola variable `v_now` para ambos updates

## Archivos actualizados

- ✅ `backend/src/scripts/llamada/end_call.sql`
- ✅ `backend/src/scripts/llamada/deploy_both_sps.sql`
- ✅ `final_clean_sp.sql`
- ✅ `app/protected/videollamada/page.tsx` (ya actualizado antes)

## Notas adicionales

El código frontend (`page.tsx`) ya fue actualizado anteriormente para llamar a `dbEndCall()` en TODOS los casos de finalización:

- ✅ Hangup normal
- ✅ Reject (rechazar llamada)
- ✅ Cancel (cancelar llamada)
- ✅ Remote hangup/reject/cancel

Ahora con la función SQL correcta, debería funcionar perfectamente.
