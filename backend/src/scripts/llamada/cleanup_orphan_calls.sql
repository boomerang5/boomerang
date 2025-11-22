-- Script de limpieza para eliminar registros huérfanos
-- Ejecutar SOLO SI el error persiste después de desplegar los SPs

-- ============================================================================
-- 1. Ver el estado actual
-- ============================================================================

-- Ver llamadas activas (sin fecha_fin)
SELECT 
    l.id,
    l.titulo,
    l.fecha_inicio,
    l.fecha_fin,
    COUNT(uxl."idUsuario") as num_participantes
FROM public."Llamada" l
LEFT JOIN public."UsuarioXLlamada" uxl ON l.id = uxl."idLlamada"
WHERE l.fecha_fin IS NULL
GROUP BY l.id, l.titulo, l.fecha_inicio, l.fecha_fin
ORDER BY l.id DESC;

-- ============================================================================
-- 2. Cerrar todas las llamadas sin fecha_fin (EJECUTAR CON CUIDADO)
-- ============================================================================

-- Descomentar y ejecutar SOLO si quieres cerrar todas las llamadas pendientes
/*
UPDATE public."Llamada"
SET 
    fecha_fin = LOCALTIMESTAMP,
    duracion_calculada = LOCALTIMESTAMP - fecha_inicio
WHERE fecha_fin IS NULL;
*/

-- ============================================================================
-- 3. Verificar duplicados en UsuarioXLlamada
-- ============================================================================

-- Ver si hay duplicados (no debería haber ninguno)
SELECT 
    "idUsuario",
    "idLlamada",
    COUNT(*) as cantidad
FROM public."UsuarioXLlamada"
GROUP BY "idUsuario", "idLlamada"
HAVING COUNT(*) > 1;

-- ============================================================================
-- 4. Ver constraint actual
-- ============================================================================

-- Ver el constraint de unique
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    tc.constraint_type
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'UsuarioXLlamada'
    AND tc.constraint_type = 'UNIQUE';

-- ============================================================================
-- 5. SOLO SI ES NECESARIO: Eliminar duplicados manualmente
-- ============================================================================

-- Descomentar y ejecutar SOLO si hay duplicados y necesitas eliminarlos
/*
-- Eliminar duplicados manualmente (mantiene solo el más reciente)
DELETE FROM public."UsuarioXLlamada" uxl1
WHERE uxl1.id NOT IN (
    SELECT MAX(id)
    FROM public."UsuarioXLlamada" uxl2
    GROUP BY uxl2."idUsuario", uxl2."idLlamada"
);
*/
