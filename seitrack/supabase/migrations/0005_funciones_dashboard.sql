-- ============================================================
-- SEITRACK — Migración 0005: Funciones SQL para dashboards
-- ============================================================

-- ─── DASHBOARD NACIONAL ──────────────────────────────────────────────────────
-- Retorna estadísticas agregadas por regional

CREATE OR REPLACE FUNCTION dashboard_nacional()
RETURNS TABLE (
  id                uuid,
  nombre            text,
  codigo            text,
  total_estaciones  bigint,
  total_vehiculos   bigint,
  operativos        bigint,
  en_manto          bigint,
  fuera_servicio    bigint,
  inspecciones_hoy  bigint,
  ots_abiertas      bigint
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    r.id,
    r.nombre,
    r.codigo,
    COUNT(DISTINCT e.id)                                          AS total_estaciones,
    COUNT(DISTINCT v.id)                                          AS total_vehiculos,
    COUNT(DISTINCT v.id) FILTER (WHERE v.estado = 'operativo')    AS operativos,
    COUNT(DISTINCT v.id) FILTER (WHERE v.estado = 'en_mantenimiento') AS en_manto,
    COUNT(DISTINCT v.id) FILTER (WHERE v.estado = 'fuera_de_servicio') AS fuera_servicio,
    COUNT(DISTINCT i.id) FILTER (WHERE i.fecha = CURRENT_DATE)   AS inspecciones_hoy,
    COUNT(DISTINCT ot.id) FILTER (WHERE ot.estado IN ('abierta','en_proceso')) AS ots_abiertas
  FROM regionales r
  LEFT JOIN estaciones e  ON e.regional_id = r.id AND e.activa = true
  LEFT JOIN vehiculos  v  ON v.estacion_id = e.id
  LEFT JOIN inspecciones i ON i.vehiculo_id = v.id
  LEFT JOIN ordenes_trabajo ot ON ot.vehiculo_id = v.id
  GROUP BY r.id, r.nombre, r.codigo
  ORDER BY r.nombre;
$$;

-- ─── DASHBOARD REGIONAL ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION dashboard_regional(p_regional_id uuid)
RETURNS TABLE (
  id              uuid,
  nombre          text,
  codigo_iata     text,
  aeropuerto      text,
  ciudad          text,
  categoria_icao  text,
  total_vehiculos bigint,
  operativos      bigint,
  en_manto        bigint,
  fuera_servicio  bigint,
  ultima_inspeccion date,
  ots_abiertas    bigint
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    e.id,
    e.nombre,
    e.codigo_iata,
    e.aeropuerto,
    e.ciudad,
    e.categoria_icao,
    COUNT(DISTINCT v.id)                                              AS total_vehiculos,
    COUNT(DISTINCT v.id) FILTER (WHERE v.estado = 'operativo')       AS operativos,
    COUNT(DISTINCT v.id) FILTER (WHERE v.estado = 'en_mantenimiento') AS en_manto,
    COUNT(DISTINCT v.id) FILTER (WHERE v.estado = 'fuera_de_servicio') AS fuera_servicio,
    MAX(i.fecha)                                                       AS ultima_inspeccion,
    COUNT(DISTINCT ot.id) FILTER (WHERE ot.estado IN ('abierta','en_proceso')) AS ots_abiertas
  FROM estaciones e
  LEFT JOIN vehiculos v       ON v.estacion_id = e.id
  LEFT JOIN inspecciones i    ON i.vehiculo_id = v.id
  LEFT JOIN ordenes_trabajo ot ON ot.vehiculo_id = v.id
  WHERE e.regional_id = p_regional_id AND e.activa = true
  GROUP BY e.id, e.nombre, e.codigo_iata, e.aeropuerto, e.ciudad, e.categoria_icao
  ORDER BY e.nombre;
$$;

-- ─── REPORTE AVC (Análisis y Vigilancia Continua) ────────────────────────────
-- Capítulo X del manual GSAN-4.1-05-01

CREATE OR REPLACE FUNCTION reporte_avc(
  p_desde      date DEFAULT (CURRENT_DATE - INTERVAL '30 days'),
  p_hasta      date DEFAULT CURRENT_DATE,
  p_regional_id uuid DEFAULT NULL
)
RETURNS TABLE (
  estacion_nombre    text,
  regional_nombre    text,
  vehiculo_matricula text,
  vehiculo_modelo    text,
  programa_mto       text,
  total_inspecciones bigint,
  insp_aprobadas     bigint,
  insp_observaciones bigint,
  insp_rechazadas    bigint,
  total_fallas       bigint,
  fallas_criticas    bigint,
  ots_generadas      bigint,
  ots_cerradas       bigint,
  tasa_disponibilidad numeric
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    e.nombre                                                      AS estacion_nombre,
    r.nombre                                                      AS regional_nombre,
    v.matricula                                                   AS vehiculo_matricula,
    v.modelo                                                      AS vehiculo_modelo,
    v.programa_mto::text                                          AS programa_mto,
    COUNT(DISTINCT i.id)                                          AS total_inspecciones,
    COUNT(DISTINCT i.id) FILTER (WHERE i.resultado = 'aprobado') AS insp_aprobadas,
    COUNT(DISTINCT i.id) FILTER (WHERE i.resultado = 'con_observaciones') AS insp_observaciones,
    COUNT(DISTINCT i.id) FILTER (WHERE i.resultado = 'rechazado') AS insp_rechazadas,
    COUNT(DISTINCT ii.id) FILTER (WHERE ii.resultado = 'falla')  AS total_fallas,
    COUNT(DISTINCT ii.id) FILTER (WHERE ii.resultado = 'falla' AND ii.requiere_accion = true) AS fallas_criticas,
    COUNT(DISTINCT ot.id)                                         AS ots_generadas,
    COUNT(DISTINCT ot.id) FILTER (WHERE ot.estado = 'cerrada')   AS ots_cerradas,
    CASE WHEN COUNT(DISTINCT i.id) = 0 THEN 100
         ELSE ROUND(
           100.0 * COUNT(DISTINCT i.id) FILTER (WHERE i.resultado != 'rechazado')
           / NULLIF(COUNT(DISTINCT i.id), 0), 1
         )
    END                                                           AS tasa_disponibilidad
  FROM vehiculos v
  JOIN estaciones e    ON e.id = v.estacion_id
  JOIN regionales r    ON r.id = e.regional_id
  LEFT JOIN inspecciones i     ON i.vehiculo_id = v.id
    AND i.fecha BETWEEN p_desde AND p_hasta
  LEFT JOIN items_inspeccion ii ON ii.inspeccion_id = i.id
  LEFT JOIN ordenes_trabajo ot  ON ot.vehiculo_id = v.id
    AND ot.created_at::date BETWEEN p_desde AND p_hasta
  WHERE (p_regional_id IS NULL OR r.id = p_regional_id)
  GROUP BY e.nombre, r.nombre, v.matricula, v.modelo, v.programa_mto
  ORDER BY r.nombre, e.nombre, v.matricula;
$$;

-- ─── RESUMEN FALLAS POR SISTEMA ──────────────────────────────────────────────
-- Para el gráfico de barras del dashboard AVC

CREATE OR REPLACE FUNCTION fallas_por_sistema(
  p_desde date DEFAULT (CURRENT_DATE - INTERVAL '30 days'),
  p_hasta date DEFAULT CURRENT_DATE,
  p_estacion_id uuid DEFAULT NULL
)
RETURNS TABLE (
  sistema text,
  total_fallas bigint,
  fallas_criticas bigint
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    ii.sistema,
    COUNT(*) FILTER (WHERE ii.resultado = 'falla')                AS total_fallas,
    COUNT(*) FILTER (WHERE ii.resultado = 'falla' AND ii.requiere_accion = true) AS fallas_criticas
  FROM items_inspeccion ii
  JOIN inspecciones i  ON i.id = ii.inspeccion_id
  JOIN vehiculos v     ON v.id = i.vehiculo_id
  WHERE i.fecha BETWEEN p_desde AND p_hasta
    AND (p_estacion_id IS NULL OR v.estacion_id = p_estacion_id)
  GROUP BY ii.sistema
  ORDER BY total_fallas DESC
  LIMIT 10;
$$;

-- ─── KPIs ESTACIÓN (para el dashboard de jefe de estación) ───────────────────

CREATE OR REPLACE FUNCTION kpis_estacion(p_estacion_id uuid)
RETURNS TABLE (
  vehiculos_operativos  bigint,
  vehiculos_total       bigint,
  inspecciones_hoy      bigint,
  inspecciones_semana   bigint,
  ots_abiertas          bigint,
  ots_alta_prioridad    bigint,
  stock_bajo            bigint,
  ultima_inspeccion     timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    COUNT(DISTINCT v.id) FILTER (WHERE v.estado = 'operativo')    AS vehiculos_operativos,
    COUNT(DISTINCT v.id)                                           AS vehiculos_total,
    COUNT(DISTINCT i.id) FILTER (WHERE i.fecha = CURRENT_DATE)    AS inspecciones_hoy,
    COUNT(DISTINCT i.id) FILTER (WHERE i.fecha >= CURRENT_DATE - 7) AS inspecciones_semana,
    COUNT(DISTINCT ot.id) FILTER (WHERE ot.estado IN ('abierta','en_proceso')) AS ots_abiertas,
    COUNT(DISTINCT ot.id) FILTER (WHERE ot.estado IN ('abierta','en_proceso') AND ot.prioridad = 'alta') AS ots_alta_prioridad,
    COUNT(DISTINCT rp.id) FILTER (WHERE rp.cantidad_stock <= rp.stock_minimo) AS stock_bajo,
    MAX(i.created_at)                                              AS ultima_inspeccion
  FROM estaciones e
  LEFT JOIN vehiculos v       ON v.estacion_id = e.id
  LEFT JOIN inspecciones i    ON i.vehiculo_id = v.id
  LEFT JOIN ordenes_trabajo ot ON ot.vehiculo_id = v.id
  LEFT JOIN repuestos rp      ON rp.estacion_id = e.id
  WHERE e.id = p_estacion_id;
$$;

-- Permisos de ejecución
GRANT EXECUTE ON FUNCTION dashboard_nacional()         TO authenticated;
GRANT EXECUTE ON FUNCTION dashboard_regional(uuid)     TO authenticated;
GRANT EXECUTE ON FUNCTION reporte_avc(date, date, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION fallas_por_sistema(date, date, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION kpis_estacion(uuid)          TO authenticated;
