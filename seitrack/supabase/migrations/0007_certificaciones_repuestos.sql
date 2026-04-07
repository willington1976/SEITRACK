-- ============================================================
-- SEITRACK — Migración 0007: Certificaciones TME + repuestos
-- Cap. VII — Entrenamiento y Certificación de Personal
-- ============================================================

-- ─── CERTIFICACIONES TME ─────────────────────────────────────────────────────

CREATE TYPE categoria_tme AS ENUM ('A', 'B', 'C', 'D');

CREATE TABLE certificaciones (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id       uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  categoria        categoria_tme NOT NULL,
  numero_certificado text NOT NULL UNIQUE,
  programa_mto     programa_mto NOT NULL,   -- para qué tipo de máquina aplica
  fecha_emision    date NOT NULL,
  fecha_vencimiento date NOT NULL,
  emitido_por      text NOT NULL DEFAULT 'UAEAC',
  activo           boolean NOT NULL DEFAULT true,
  observaciones    text,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_cert_usuario    ON certificaciones(usuario_id);
CREATE INDEX idx_cert_vencimiento ON certificaciones(fecha_vencimiento);

-- Vista: certificaciones próximas a vencer (30 días)
CREATE VIEW certificaciones_por_vencer AS
SELECT
  c.*,
  u.nombre_completo,
  u.email,
  e.nombre AS estacion_nombre,
  e.codigo_iata,
  (c.fecha_vencimiento - CURRENT_DATE) AS dias_restantes
FROM certificaciones c
JOIN usuarios u ON u.id = c.usuario_id
JOIN estaciones e ON e.id = u.estacion_id
WHERE c.activo = true
  AND c.fecha_vencimiento <= CURRENT_DATE + INTERVAL '60 days'
ORDER BY c.fecha_vencimiento;

-- RLS certificaciones
ALTER TABLE certificaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cert_read_scope" ON certificaciones FOR SELECT
  USING (
    auth_rol() IN ('jefe_nacional', 'dsna')
    OR usuario_id = auth.uid()
    OR (
      auth_rol() IN ('jefe_regional', 'jefe_estacion')
      AND usuario_id IN (
        SELECT u.id FROM usuarios u WHERE u.estacion_id = auth_estacion_id()
      )
    )
  );

CREATE POLICY "cert_write_nacional" ON certificaciones FOR ALL
  USING (auth_rol() = 'jefe_nacional');

-- ─── TRIGGER: notificar vencimiento de certificación ─────────────────────────

CREATE OR REPLACE FUNCTION check_cert_vencimiento()
RETURNS void LANGUAGE plpgsql AS $$
DECLARE rec RECORD;
BEGIN
  FOR rec IN
    SELECT c.id, c.usuario_id, c.numero_certificado, c.fecha_vencimiento,
           u.nombre_completo
    FROM certificaciones c
    JOIN usuarios u ON u.id = c.usuario_id
    WHERE c.activo = true
      AND c.fecha_vencimiento = CURRENT_DATE + 30
  LOOP
    INSERT INTO notificaciones_log (usuario_id, tipo, titulo, cuerpo, datos)
    VALUES (
      rec.usuario_id,
      'cert_por_vencer',
      'Certificación TME por vencer',
      'Tu certificado ' || rec.numero_certificado || ' vence en 30 días.',
      jsonb_build_object('certificacion_id', rec.id)
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$;

-- ─── MEJORAS A REPUESTOS: movimientos de inventario ─────────────────────────

CREATE TABLE movimientos_inventario (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  repuesto_id     uuid NOT NULL REFERENCES repuestos(id),
  usuario_id      uuid NOT NULL REFERENCES usuarios(id),
  tipo            text NOT NULL CHECK (tipo IN ('entrada','salida','ajuste')),
  cantidad        int  NOT NULL,
  cantidad_antes  int  NOT NULL,
  cantidad_despues int NOT NULL,
  motivo          text,
  referencia_ot   uuid REFERENCES ordenes_trabajo(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_mov_repuesto ON movimientos_inventario(repuesto_id);
CREATE INDEX idx_mov_fecha    ON movimientos_inventario(created_at DESC);

ALTER TABLE movimientos_inventario ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mov_read_estacion" ON movimientos_inventario FOR SELECT
  USING (
    repuesto_id IN (
      SELECT id FROM repuestos WHERE estacion_id = auth_estacion_id()
    )
    OR auth_rol() IN ('jefe_nacional', 'jefe_regional', 'dsna')
  );
CREATE POLICY "mov_write_estacion" ON movimientos_inventario FOR INSERT
  WITH CHECK (
    repuesto_id IN (
      SELECT id FROM repuestos WHERE estacion_id = auth_estacion_id()
    )
  );

-- Trigger mejorado: registrar movimiento al consumir repuesto
CREATE OR REPLACE FUNCTION registrar_movimiento_consumo()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE stock_antes int;
BEGIN
  SELECT cantidad_stock INTO stock_antes FROM repuestos WHERE id = NEW.repuesto_id;
  INSERT INTO movimientos_inventario
    (repuesto_id, usuario_id, tipo, cantidad, cantidad_antes, cantidad_despues, motivo, referencia_ot)
  VALUES
    (NEW.repuesto_id, NEW.usuario_id, 'salida', NEW.cantidad,
     stock_antes, stock_antes - NEW.cantidad, NEW.motivo, NEW.orden_trabajo_id);
  RETURN NEW;
END;
$$;

-- Reemplazar trigger anterior
DROP TRIGGER IF EXISTS trg_descontar_stock ON consumos_repuestos;
CREATE TRIGGER trg_consumo_repuesto
AFTER INSERT ON consumos_repuestos
FOR EACH ROW EXECUTE FUNCTION registrar_movimiento_consumo();

-- ─── FUNCIÓN: resumen inventario por estación ────────────────────────────────

CREATE OR REPLACE FUNCTION inventario_estacion(p_estacion_id uuid)
RETURNS TABLE (
  id            uuid,
  numero_parte  text,
  descripcion   text,
  tipo          text,
  cantidad_stock int,
  stock_minimo  int,
  unidad        text,
  proveedor     text,
  estado_stock  text,
  consumo_30d   bigint
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    r.id,
    r.numero_parte,
    r.descripcion,
    r.tipo,
    r.cantidad_stock,
    r.stock_minimo,
    r.unidad,
    r.proveedor,
    CASE
      WHEN r.cantidad_stock = 0              THEN 'agotado'
      WHEN r.cantidad_stock <= r.stock_minimo THEN 'bajo'
      ELSE 'ok'
    END AS estado_stock,
    COALESCE(SUM(m.cantidad) FILTER (
      WHERE m.tipo = 'salida' AND m.created_at >= NOW() - INTERVAL '30 days'
    ), 0) AS consumo_30d
  FROM repuestos r
  LEFT JOIN movimientos_inventario m ON m.repuesto_id = r.id
  WHERE r.estacion_id = p_estacion_id
  GROUP BY r.id, r.numero_parte, r.descripcion, r.tipo,
           r.cantidad_stock, r.stock_minimo, r.unidad, r.proveedor
  ORDER BY
    CASE WHEN r.cantidad_stock = 0 THEN 0
         WHEN r.cantidad_stock <= r.stock_minimo THEN 1
         ELSE 2 END,
    r.descripcion;
$$;

GRANT EXECUTE ON FUNCTION inventario_estacion(uuid) TO authenticated;
GRANT SELECT ON certificaciones_por_vencer TO authenticated;
