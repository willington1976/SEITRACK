-- ============================================================
-- SEITRACK — Migración 0008: Funciones de administración
-- Panel admin: gestión usuarios, vehiculos, estaciones
-- ============================================================

-- ─── FUNCIÓN: listar usuarios con info completa ──────────────────────────────

CREATE OR REPLACE FUNCTION admin_usuarios(p_estacion_id uuid DEFAULT NULL)
RETURNS TABLE (
  id                   uuid,
  nombre_completo      text,
  email                text,
  rol                  text,
  estacion_nombre      text,
  estacion_iata        text,
  regional_nombre      text,
  activo               boolean,
  certificado_vigencia date,
  cert_dias_restantes  int,
  created_at           timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    u.id,
    u.nombre_completo,
    u.email,
    u.rol::text,
    e.nombre       AS estacion_nombre,
    e.codigo_iata  AS estacion_iata,
    r.nombre       AS regional_nombre,
    u.activo,
    u.certificado_vigencia,
    (u.certificado_vigencia - CURRENT_DATE)::int AS cert_dias_restantes,
    u.created_at
  FROM usuarios u
  LEFT JOIN estaciones e ON e.id = u.estacion_id
  LEFT JOIN regionales r ON r.id = e.regional_id
  WHERE (p_estacion_id IS NULL OR u.estacion_id = p_estacion_id)
  ORDER BY r.nombre, e.nombre, u.nombre_completo;
$$;

-- ─── FUNCIÓN: estadísticas para panel admin ──────────────────────────────────
-- Usa subqueries independientes — sin CROSS JOIN ni aliases problemáticos

CREATE OR REPLACE FUNCTION admin_stats()
RETURNS TABLE (
  total_usuarios    bigint,
  usuarios_activos  bigint,
  total_vehiculos   bigint,
  vehiculos_op      bigint,
  total_estaciones  bigint,
  certs_por_vencer  bigint,
  ots_abiertas      bigint,
  inspecciones_mes  bigint
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    (SELECT COUNT(*)  FROM usuarios)                                               AS total_usuarios,
    (SELECT COUNT(*)  FROM usuarios         WHERE activo = true)                   AS usuarios_activos,
    (SELECT COUNT(*)  FROM vehiculos)                                              AS total_vehiculos,
    (SELECT COUNT(*)  FROM vehiculos        WHERE estado = 'operativo')            AS vehiculos_op,
    (SELECT COUNT(*)  FROM estaciones       WHERE activa = true)                   AS total_estaciones,
    (SELECT COUNT(*)  FROM certificaciones
                          WHERE activo = true
                            AND fecha_vencimiento <= CURRENT_DATE + 60)            AS certs_por_vencer,
    (SELECT COUNT(*)  FROM ordenes_trabajo
                          WHERE estado IN ('abierta','en_proceso'))                AS ots_abiertas,
    (SELECT COUNT(*)  FROM inspecciones
                          WHERE fecha >= date_trunc('month', CURRENT_DATE)::date)  AS inspecciones_mes;
$$;

GRANT EXECUTE ON FUNCTION admin_usuarios(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_stats()        TO authenticated;