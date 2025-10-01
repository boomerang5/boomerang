-- Funciones SQL corregidas con esquema public y relaciones correctas
-- ESTRUCTURA CORRECTA: UsuarioXLlamada tiene "host" (boolean) e "idUsuario"/"idLlamada"
-- TABLAS: "Usuario", "Llamada", "UsuarioXLlamada", "EventoCalendario", "EventoInvitado", "ContactoUsuario"
-- EJECUTAR EN SUPABASE SQL EDITOR

-- =====================================================
-- FUNCIONES PARA DASHBOARD PRINCIPAL (LLAMADAS)
-- =====================================================

-- 1. Función para métricas dashboard principal
CREATE OR REPLACE FUNCTION public."get_dashboard_metricas"(
    usuario_id_param INTEGER
)
RETURNS TABLE (
    llamadas_hoy NUMERIC,
    llamadas_semana NUMERIC,
    tiempo_total_hoy NUMERIC,
    tiempo_promedio_llamada NUMERIC,
    llamadas_conectadas NUMERIC,
    llamadas_no_conectadas NUMERIC
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        -- Llamadas hoy
        COUNT(DISTINCT CASE 
            WHEN DATE(l."fecha_inicio") = CURRENT_DATE 
            THEN l."id" 
        END)::NUMERIC as llamadas_hoy,
        
        -- Llamadas esta semana
        COUNT(DISTINCT CASE 
            WHEN l."fecha_inicio" >= date_trunc('week', CURRENT_DATE) 
            THEN l."id" 
        END)::NUMERIC as llamadas_semana,
        
        -- Tiempo total hoy (minutos)
        COALESCE(SUM(CASE 
            WHEN DATE(l."fecha_inicio") = CURRENT_DATE AND l."fecha_fin" IS NOT NULL
            THEN EXTRACT(EPOCH FROM (l."fecha_fin" - l."fecha_inicio")) / 60
            ELSE 0
        END), 0)::NUMERIC as tiempo_total_hoy,
        
        -- Tiempo promedio por llamada (minutos)
        CASE 
            WHEN COUNT(DISTINCT CASE WHEN l."fecha_fin" IS NOT NULL THEN l."id" END) > 0
            THEN COALESCE(AVG(EXTRACT(EPOCH FROM (l."fecha_fin" - l."fecha_inicio")) / 60), 0)::NUMERIC
            ELSE 0::NUMERIC
        END as tiempo_promedio_llamada,
        
        -- Llamadas conectadas (con fecha_fin)
        COUNT(DISTINCT CASE WHEN l."fecha_fin" IS NOT NULL THEN l."id" END)::NUMERIC as llamadas_conectadas,
        
        -- Llamadas no conectadas (sin fecha_fin)
        COUNT(DISTINCT CASE WHEN l."fecha_fin" IS NULL THEN l."id" END)::NUMERIC as llamadas_no_conectadas
        
    FROM public."Llamada" l
    INNER JOIN public."UsuarioXLlamada" uxl ON l."id" = uxl."idLlamada"
    WHERE 
        uxl."idUsuario" = usuario_id_param
        AND l."fecha_inicio" >= CURRENT_DATE - INTERVAL '7 days';
END;
$$;

-- 2. Función para top contactos del dashboard
CREATE OR REPLACE FUNCTION public."get_dashboard_top_contactos"(
    usuario_id_param INTEGER,
    limite INTEGER DEFAULT 5
)
RETURNS TABLE (
    usuario_id INTEGER,
    nombre TEXT,
    apellido TEXT,
    tiempo_total_minutos NUMERIC,
    total_llamadas NUMERIC
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u."id" as usuario_id,
        u."nombre"::TEXT as nombre,
        u."apellido"::TEXT as apellido,
        COALESCE(SUM(EXTRACT(EPOCH FROM (l."fecha_fin" - l."fecha_inicio")) / 60), 0)::NUMERIC as tiempo_total_minutos,
        COUNT(DISTINCT l."id")::NUMERIC as total_llamadas
    FROM public."Usuario" u
    INNER JOIN public."UsuarioXLlamada" uxl ON uxl."idUsuario" = u."id"
    INNER JOIN public."Llamada" l ON l."id" = uxl."idLlamada"
    WHERE 
        -- Buscar llamadas donde el usuario participó
        EXISTS (
            SELECT 1 FROM public."UsuarioXLlamada" uxl_user
            WHERE uxl_user."idLlamada" = l."id" 
            AND uxl_user."idUsuario" = usuario_id_param
        )
        AND u."id" != usuario_id_param -- Excluir al propio usuario
        AND l."fecha_fin" IS NOT NULL -- Solo llamadas completadas
        AND l."fecha_inicio" >= CURRENT_DATE - INTERVAL '30 days' -- Últimos 30 días
    GROUP BY u."id", u."nombre", u."apellido"
    ORDER BY tiempo_total_minutos DESC
    LIMIT limite;
END;
$$;

-- =====================================================
-- FUNCIONES ORIGINALES CORREGIDAS
-- =====================================================

-- 3. Función de actividad temporal corregida
CREATE OR REPLACE FUNCTION public."get_actividad_temporal"(
    usuario_id_param INTEGER,
    fecha_inicio_param DATE,
    fecha_fin_param DATE
)
RETURNS TABLE (
    periodo TEXT,
    total_llamadas NUMERIC,
    duracion_total NUMERIC,
    duracion_promedio NUMERIC,
    participantes_unicos NUMERIC
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH user_calls_by_day AS (
        SELECT 
            DATE(l."fecha_inicio") as call_date,
            l.*
        FROM public."Llamada" l
        INNER JOIN public."UsuarioXLlamada" uxl ON l."id" = uxl."idLlamada"
        WHERE 
            uxl."idUsuario" = usuario_id_param
            AND DATE(l."fecha_inicio") BETWEEN fecha_inicio_param AND fecha_fin_param
    )
    SELECT 
        ucbd.call_date::TEXT as periodo,
        COUNT(DISTINCT ucbd.id)::NUMERIC as total_llamadas,
        
        -- Solo duración de llamadas completadas
        COALESCE(SUM(CASE 
            WHEN ucbd."fecha_fin" IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (ucbd."fecha_fin" - ucbd."fecha_inicio")) / 60
            ELSE 0
        END), 0)::NUMERIC as duracion_total,
        
        -- Promedio solo de llamadas completadas
        CASE 
            WHEN COUNT(DISTINCT CASE WHEN ucbd."fecha_fin" IS NOT NULL THEN ucbd.id END) > 0 
            THEN COALESCE(AVG(CASE 
                WHEN ucbd."fecha_fin" IS NOT NULL 
                THEN EXTRACT(EPOCH FROM (ucbd."fecha_fin" - ucbd."fecha_inicio")) / 60
                ELSE NULL
            END), 0)::NUMERIC
            ELSE 0::NUMERIC
        END as duracion_promedio,
        
        -- Participantes únicos por día
        (SELECT COUNT(DISTINCT uxl_day."idUsuario")::NUMERIC
         FROM user_calls_by_day ucbd2
         INNER JOIN public."UsuarioXLlamada" uxl_day ON ucbd2."id" = uxl_day."idLlamada"
         WHERE ucbd2.call_date = ucbd.call_date
        ) as participantes_unicos
        
    FROM user_calls_by_day ucbd
    GROUP BY ucbd.call_date
    ORDER BY ucbd.call_date DESC;
END;
$$;

-- 4. Función de productividad corregida
CREATE OR REPLACE FUNCTION public."get_productividad"(
    usuario_id_param INTEGER,
    fecha_inicio_param DATE,
    fecha_fin_param DATE
)
RETURNS TABLE (
    periodo TEXT,
    reuniones_programadas NUMERIC,
    reuniones_completadas NUMERIC,
    tasa_completitud NUMERIC,
    tiempo_efectivo NUMERIC,
    tiempo_promedio_por_reunion NUMERIC
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        DATE(l."fecha_inicio")::TEXT as periodo,
        COUNT(DISTINCT l."id")::NUMERIC as reuniones_programadas,
        COUNT(DISTINCT CASE WHEN l."fecha_fin" IS NOT NULL THEN l."id" END)::NUMERIC as reuniones_completadas,
        CASE 
            WHEN COUNT(DISTINCT l."id") > 0 
            THEN (COUNT(DISTINCT CASE WHEN l."fecha_fin" IS NOT NULL THEN l."id" END)::NUMERIC / COUNT(DISTINCT l."id")::NUMERIC * 100)
            ELSE 0::NUMERIC
        END as tasa_completitud,
        -- Solo tiempo de llamadas completadas
        COALESCE(SUM(CASE 
            WHEN l."fecha_fin" IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (l."fecha_fin" - l."fecha_inicio")) / 60
            ELSE 0
        END), 0)::NUMERIC as tiempo_efectivo,
        CASE 
            WHEN COUNT(DISTINCT CASE WHEN l."fecha_fin" IS NOT NULL THEN l."id" END) > 0 
            THEN COALESCE(AVG(CASE 
                WHEN l."fecha_fin" IS NOT NULL 
                THEN EXTRACT(EPOCH FROM (l."fecha_fin" - l."fecha_inicio")) / 60
                ELSE NULL
            END), 0)::NUMERIC
            ELSE 0::NUMERIC
        END as tiempo_promedio_por_reunion
    FROM public."Llamada" l
    INNER JOIN public."UsuarioXLlamada" uxl ON l."id" = uxl."idLlamada"
    WHERE 
        uxl."idUsuario" = usuario_id_param
        AND uxl."host" = true
        AND DATE(l."fecha_inicio") BETWEEN fecha_inicio_param AND fecha_fin_param
    GROUP BY DATE(l."fecha_inicio")
    ORDER BY DATE(l."fecha_inicio") DESC;
END;
$$;

-- 4. Función de estadísticas generales corregida
CREATE OR REPLACE FUNCTION public."get_estadisticas_generales"(
    usuario_id_param INTEGER,
    fecha_inicio_param DATE,
    fecha_fin_param DATE
)
RETURNS TABLE (
    total_llamadas NUMERIC,
    total_minutos NUMERIC,
    participantes_unicos NUMERIC,
    promedio_participantes_por_llamada NUMERIC,
    llamadas_completadas NUMERIC,
    tasa_exito NUMERIC
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH user_calls AS (
        SELECT DISTINCT l.*
        FROM public."Llamada" l
        INNER JOIN public."UsuarioXLlamada" uxl ON l."id" = uxl."idLlamada"
        WHERE 
            uxl."idUsuario" = usuario_id_param
            AND DATE(l."fecha_inicio") BETWEEN fecha_inicio_param AND fecha_fin_param
    ),
    call_participants AS (
        SELECT 
            uc.id,
            COUNT(DISTINCT uxl_all."idUsuario") as participants_count
        FROM user_calls uc
        LEFT JOIN public."UsuarioXLlamada" uxl_all ON uc."id" = uxl_all."idLlamada"
        GROUP BY uc.id
    )
    SELECT 
        COUNT(DISTINCT uc.id)::NUMERIC as total_llamadas,
        
        -- Solo tiempo de llamadas completadas
        COALESCE(SUM(CASE 
            WHEN uc."fecha_fin" IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (uc."fecha_fin" - uc."fecha_inicio")) / 60
            ELSE 0
        END), 0)::NUMERIC as total_minutos,
        
        -- Participantes únicos en todas las llamadas del usuario
        (SELECT COUNT(DISTINCT uxl_all."idUsuario")::NUMERIC 
         FROM user_calls uc2
         INNER JOIN public."UsuarioXLlamada" uxl_all ON uc2."id" = uxl_all."idLlamada"
        ) as participantes_unicos,
        
        -- Promedio de participantes por llamada
        CASE 
            WHEN COUNT(DISTINCT uc.id) > 0 
            THEN COALESCE(AVG(cp.participants_count), 0)::NUMERIC
            ELSE 0::NUMERIC
        END as promedio_participantes_por_llamada,
        
        -- Llamadas completadas (con fecha_fin)
        COUNT(DISTINCT CASE WHEN uc."fecha_fin" IS NOT NULL THEN uc.id END)::NUMERIC as llamadas_completadas,
        
        -- Tasa de éxito
        CASE 
            WHEN COUNT(DISTINCT uc.id) > 0 
            THEN (COUNT(DISTINCT CASE WHEN uc."fecha_fin" IS NOT NULL THEN uc.id END)::NUMERIC / COUNT(DISTINCT uc.id)::NUMERIC * 100)
            ELSE 0::NUMERIC
        END as tasa_exito
        
    FROM user_calls uc
    LEFT JOIN call_participants cp ON uc.id = cp.id;
END;
$$;

-- =====================================================
-- FUNCIONES PARA REPORTES/EVENTOS 
-- =====================================================

-- 6. Función para eventos por período
CREATE OR REPLACE FUNCTION public."get_eventos_temporal"(
    usuario_id_param INTEGER,
    fecha_inicio_param DATE,
    fecha_fin_param DATE
)
RETURNS TABLE (
    periodo TEXT,
    eventos_organizados NUMERIC,
    eventos_invitado NUMERIC,
    eventos_confirmados NUMERIC,
    eventos_rechazados NUMERIC,
    eventos_pendientes NUMERIC
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        DATE(e."fecha")::TEXT as periodo,
        
        -- Eventos que organizó (creado_por)
        COUNT(DISTINCT CASE WHEN e."creado_por" = usuario_id_param THEN e."id" END)::NUMERIC as eventos_organizados,
        
        -- Eventos donde fue invitado
        COUNT(DISTINCT CASE WHEN ei."id_usuario" = usuario_id_param THEN e."id" END)::NUMERIC as eventos_invitado,
        
        -- Eventos confirmados por el usuario
        COUNT(DISTINCT CASE 
            WHEN ei."id_usuario" = usuario_id_param AND ei."confirmado" = true 
            THEN e."id" 
        END)::NUMERIC as eventos_confirmados,
        
        -- Eventos rechazados por el usuario
        COUNT(DISTINCT CASE 
            WHEN ei."id_usuario" = usuario_id_param AND ei."confirmado" = false 
            THEN e."id" 
        END)::NUMERIC as eventos_rechazados,
        
        -- Eventos pendientes (confirmado is null)
        COUNT(DISTINCT CASE 
            WHEN ei."id_usuario" = usuario_id_param AND ei."confirmado" IS NULL 
            THEN e."id" 
        END)::NUMERIC as eventos_pendientes
        
    FROM public."EventoCalendario" e
    LEFT JOIN public."EventoInvitado" ei ON e."id" = ei."id_evento"
    WHERE 
        DATE(e."fecha") BETWEEN fecha_inicio_param AND fecha_fin_param
        AND (
            e."creado_por" = usuario_id_param 
            OR ei."id_usuario" = usuario_id_param
        )
    GROUP BY DATE(e."fecha")
    ORDER BY DATE(e."fecha") DESC;
END;
$$;

-- 7. Función para estadísticas de eventos
CREATE OR REPLACE FUNCTION public."get_eventos_estadisticas"(
    usuario_id_param INTEGER,
    fecha_inicio_param DATE,
    fecha_fin_param DATE
)
RETURNS TABLE (
    total_organizados NUMERIC,
    total_invitaciones_recibidas NUMERIC,
    total_confirmados NUMERIC,
    total_rechazados NUMERIC,
    total_pendientes NUMERIC,
    tasa_confirmacion NUMERIC
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        -- Total eventos organizados
        COUNT(DISTINCT CASE WHEN e."creado_por" = usuario_id_param THEN e."id" END)::NUMERIC as total_organizados,
        
        -- Total invitaciones recibidas
        COUNT(DISTINCT CASE WHEN ei."id_usuario" = usuario_id_param THEN e."id" END)::NUMERIC as total_invitaciones_recibidas,
        
        -- Total confirmados
        COUNT(DISTINCT CASE 
            WHEN ei."id_usuario" = usuario_id_param AND ei."confirmado" = true 
            THEN e."id" 
        END)::NUMERIC as total_confirmados,
        
        -- Total rechazados
        COUNT(DISTINCT CASE 
            WHEN ei."id_usuario" = usuario_id_param AND ei."confirmado" = false 
            THEN e."id" 
        END)::NUMERIC as total_rechazados,
        
        -- Total pendientes
        COUNT(DISTINCT CASE 
            WHEN ei."id_usuario" = usuario_id_param AND ei."confirmado" IS NULL 
            THEN e."id" 
        END)::NUMERIC as total_pendientes,
        
        -- Tasa de confirmación
        CASE 
            WHEN COUNT(DISTINCT CASE WHEN ei."id_usuario" = usuario_id_param AND ei."confirmado" IS NOT NULL THEN e."id" END) > 0
            THEN (COUNT(DISTINCT CASE WHEN ei."id_usuario" = usuario_id_param AND ei."confirmado" = true THEN e."id" END)::NUMERIC / 
                  COUNT(DISTINCT CASE WHEN ei."id_usuario" = usuario_id_param AND ei."confirmado" IS NOT NULL THEN e."id" END)::NUMERIC * 100)
            ELSE 0::NUMERIC
        END as tasa_confirmacion
        
    FROM public."EventoCalendario" e
    LEFT JOIN public."EventoInvitado" ei ON e."id" = ei."id_evento"
    WHERE 
        DATE(e."fecha") BETWEEN fecha_inicio_param AND fecha_fin_param
        AND (
            e."creado_por" = usuario_id_param 
            OR ei."id_usuario" = usuario_id_param
        );
END;
$$;

-- =====================================================
-- FUNCIONES PARA REPORTES/CONTACTOS
-- =====================================================

-- 8. Función para contactos nuevos por período
CREATE OR REPLACE FUNCTION public."get_contactos_temporal"(
    usuario_id_param INTEGER,
    fecha_inicio_param DATE,
    fecha_fin_param DATE
)
RETURNS TABLE (
    periodo TEXT,
    contactos_agregados NUMERIC,
    solicitudes_enviadas NUMERIC,
    solicitudes_recibidas NUMERIC,
    solicitudes_aceptadas NUMERIC,
    solicitudes_rechazadas NUMERIC
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        DATE(fecha_ref)::TEXT as periodo,
        
        -- Contactos agregados (fecha cuando se aceptó la solicitud)
        COUNT(DISTINCT CASE 
            WHEN sc."estado" = 'aceptada' AND sc."fecha_respuesta" IS NOT NULL
            THEN sc."id"
        END)::NUMERIC as contactos_agregados,
        
        -- Solicitudes enviadas por el usuario
        COUNT(DISTINCT CASE 
            WHEN sc."id_solicitante" = usuario_id_param 
            THEN sc."id"
        END)::NUMERIC as solicitudes_enviadas,
        
        -- Solicitudes recibidas por el usuario
        COUNT(DISTINCT CASE 
            WHEN sc."id_receptor" = usuario_id_param 
            THEN sc."id"
        END)::NUMERIC as solicitudes_recibidas,
        
        -- Solicitudes aceptadas (donde el usuario participó)
        COUNT(DISTINCT CASE 
            WHEN sc."estado" = 'aceptada' AND (sc."id_solicitante" = usuario_id_param OR sc."id_receptor" = usuario_id_param)
            THEN sc."id"
        END)::NUMERIC as solicitudes_aceptadas,
        
        -- Solicitudes rechazadas (donde el usuario participó)
        COUNT(DISTINCT CASE 
            WHEN sc."estado" = 'rechazada' AND (sc."id_solicitante" = usuario_id_param OR sc."id_receptor" = usuario_id_param)
            THEN sc."id"
        END)::NUMERIC as solicitudes_rechazadas
        
    FROM (
        -- Usar fecha_solicitud para solicitudes y fecha_respuesta para respuestas
        SELECT 
            sc.*,
            COALESCE(DATE(sc."fecha_respuesta"), DATE(sc."fecha_solicitud")) as fecha_ref
        FROM public."SolicitudContacto" sc
        WHERE 
            (sc."id_solicitante" = usuario_id_param OR sc."id_receptor" = usuario_id_param)
            AND COALESCE(DATE(sc."fecha_respuesta"), DATE(sc."fecha_solicitud")) BETWEEN fecha_inicio_param AND fecha_fin_param
    ) sc
    GROUP BY DATE(fecha_ref)
    ORDER BY DATE(fecha_ref) DESC;
END;
$$;

-- 9. Función de colaboración corregida (como ejemplo que funcionó)
CREATE OR REPLACE FUNCTION public."get_colaboracion"(
    usuario_id_param INTEGER,
    fecha_inicio_param DATE,
    fecha_fin_param DATE
)
RETURNS TABLE (
    usuario_id INTEGER,
    nombre_usuario TEXT,
    apellido_usuario TEXT,
    llamadas_como_host NUMERIC,
    llamadas_como_participante NUMERIC,
    tiempo_total_minutos NUMERIC,
    colaboraciones_unicas NUMERIC
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH user_stats AS (
        SELECT 
            u."id" AS usuario_id,
            u."nombre"::text AS nombre_usuario,
            u."apellido"::text AS apellido_usuario,
            COUNT(DISTINCT CASE WHEN uxl."host" = TRUE  THEN l."id" END)::NUMERIC AS llamadas_como_host,
            COUNT(DISTINCT CASE WHEN uxl."host" = FALSE THEN l."id" END)::NUMERIC AS llamadas_como_participante,
            COALESCE(SUM(EXTRACT(EPOCH FROM (l."fecha_fin" - l."fecha_inicio")) / 60), 0)::NUMERIC AS tiempo_total_minutos,
            COUNT(DISTINCT CASE 
                WHEN uxl."idUsuario" = u."id" THEN uxl2."idUsuario"
            END)::NUMERIC AS colaboraciones_unicas
        FROM public."Usuario" u
        INNER JOIN public."UsuarioXLlamada" uxl 
            ON uxl."idUsuario" = u."id"
        INNER JOIN public."Llamada" l 
            ON l."id" = uxl."idLlamada"
        LEFT JOIN public."UsuarioXLlamada" uxl2 
            ON l."id" = uxl2."idLlamada" 
           AND uxl2."idUsuario" <> u."id"
        WHERE 
            DATE(l."fecha_inicio") BETWEEN fecha_inicio_param AND fecha_fin_param
            AND (
                u."id" = usuario_id_param 
                OR EXISTS (
                    SELECT 1 
                    FROM public."UsuarioXLlamada" uxl_check
                    JOIN public."Llamada" l_check 
                      ON l_check."id" = uxl_check."idLlamada"
                    WHERE uxl_check."idUsuario" = usuario_id_param
                      AND l_check."id" = l."id"
                      AND DATE(l_check."fecha_inicio") BETWEEN fecha_inicio_param AND fecha_fin_param
                )
            )
        GROUP BY u."id", u."nombre", u."apellido"
    )
    SELECT us.*
    FROM user_stats AS us
    WHERE us.llamadas_como_host > 0 OR us.llamadas_como_participante > 0
    ORDER BY us.tiempo_total_minutos DESC;
END;
$$;

-- 10. Función para análisis de contactos favoritos
CREATE OR REPLACE FUNCTION public."get_contactos_favoritos"(
    usuario_id_param INTEGER
)
RETURNS TABLE (
    usuario_id INTEGER,
    nombre TEXT,
    apellido TEXT,
    es_favorito BOOLEAN,
    fecha_agregado TIMESTAMP WITHOUT TIME ZONE,
    tiempo_total_llamadas NUMERIC,
    llamadas_recientes NUMERIC
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u."id" as usuario_id,
        u."nombre"::TEXT as nombre,
        u."apellido"::TEXT as apellido,
        cu."favorito" as es_favorito,
        cu."fh_alta"::TIMESTAMP WITHOUT TIME ZONE as fecha_agregado,
        
        -- Tiempo total en llamadas con este contacto
        COALESCE(SUM(
        CASE 
            WHEN uxl_contacto."idUsuario" = u."id" THEN 
                EXTRACT(EPOCH FROM (l."fecha_fin" - l."fecha_inicio")) / 60
        END
    ), 0)::NUMERIC as tiempo_total_llamadas,
        
        -- Llamadas en los últimos 30 días
        COUNT(DISTINCT CASE 
        WHEN uxl_contacto."idUsuario" = u."id"
             AND l."fecha_inicio" >= CURRENT_DATE - INTERVAL '30 days'
             AND l."fecha_fin" IS NOT NULL
        THEN l."id"
    END)::NUMERIC as llamadas_recientes
        
    FROM public."ContactoUsuario" cu
    INNER JOIN public."Usuario" u ON u."id" = cu."id_usuario_contacto"
    LEFT JOIN public."UsuarioXLlamada" uxl_user ON uxl_user."idUsuario" = usuario_id_param
    LEFT JOIN public."Llamada" l ON l."id" = uxl_user."idLlamada"
    LEFT JOIN public."UsuarioXLlamada" uxl_contacto ON uxl_contacto."idLlamada" = l."id" AND uxl_contacto."idUsuario" = u."id"
    WHERE 
        cu."id_usuario" = usuario_id_param
    GROUP BY u."id", u."nombre", u."apellido", cu."favorito", cu."fh_alta"
    ORDER BY tiempo_total_llamadas DESC;
END;
$$;