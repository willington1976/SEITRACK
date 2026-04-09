-- ============================================================
-- SEITRACK — Migración 0016: Certificaciones TME (ODMA)
-- ============================================================

CREATE TABLE IF NOT EXISTS certificaciones_tme (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Técnico (personal ODMA)
  nombre_tecnico    text NOT NULL,
  categoria         text NOT NULL CHECK (categoria IN ('TME_I', 'TME_III')),
  numero_cert       text NOT NULL,
  fecha_emision     date NOT NULL,
  fecha_vencimiento date NOT NULL,

  -- Usuario del sistema que registra
  registrado_por    uuid REFERENCES usuarios(id),

  -- Auditoría
  activo            boolean DEFAULT true,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

-- Índices seguros
CREATE INDEX IF NOT EXISTS idx_cert_vencimiento 
  ON certificaciones_tme(fecha_vencimiento);

CREATE INDEX IF NOT EXISTS idx_cert_registrado
  ON certificaciones_tme(registrado_por);

-- Seguridad
ALTER TABLE certificaciones_tme ENABLE ROW LEVEL SECURITY;

-- Política: ODMA y roles superiores pueden ver/editar
CREATE POLICY cert_odma ON certificaciones_tme
  FOR ALL
  USING (
    registrado_por = auth.uid()
    OR EXISTS (
      SELECT 1 FROM usuarios u 
      WHERE u.id = auth.uid()
      AND u.rol IN ('jefe_nacional', 'jefe_regional', 'dsna')
    )
  );