-- Verificar qué datos están realmente en la BD
SELECT 'Verificando llamadas recientes...' as info;

-- Ver las últimas 5 llamadas con todos los detalles
SELECT 
    l.id,
    l.titulo,
    l.descripcion,
    l.fecha_inicio,
    l.fecha_fin,
    l.duracion_calculada,
    l.id_grupo
FROM public."Llamada" l
ORDER BY l.id DESC
LIMIT 5;

-- Ver participantes de las últimas llamadas
SELECT 
    l.id as llamada_id,
    l.titulo,
    uxl."idUsuario",
    uxl.host,
    u.nombre,
    u.apellido
FROM public."Llamada" l
LEFT JOIN public."UsuarioXLlamada" uxl ON l.id = uxl."idLlamada"  
LEFT JOIN public."Usuario" u ON uxl."idUsuario" = u.id
WHERE l.id IN (SELECT id FROM public."Llamada" ORDER BY id DESC LIMIT 3)
ORDER BY l.id DESC, uxl."idUsuario";

-- Verificar si hay algún trigger o función que pueda estar cambiando los datos
SELECT 
    t.trigger_name,
    t.event_manipulation,
    t.event_object_table,
    t.action_statement
FROM information_schema.triggers t
WHERE t.event_object_table = 'Llamada';