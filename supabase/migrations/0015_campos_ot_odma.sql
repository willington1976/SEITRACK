-- ============================================================
-- SEITRACK — Migración 0013: Campos SEI-006 en ordenes_trabajo
-- ============================================================

ALTER TABLE ordenes_trabajo
  ADD COLUMN IF NOT EXISTS informe_tecnico         text,
  ADD COLUMN IF NOT EXISTS numero_sei_006          text,
  ADD COLUMN IF NOT EXISTS actividades_realizadas  text,  -- JSON array
  ADD COLUMN IF NOT EXISTS partes_instaladas       text,  -- JSON array
  ADD COLUMN IF NOT EXISTS firma_inspector_odma    text,
  ADD COLUMN IF NOT EXISTS motivo_diferido         text,
  ADD COLUMN IF NOT EXISTS verificacion_recibo     text,
  ADD COLUMN IF NOT EXISTS firma_bombero_recibo    text,
  ADD COLUMN IF NOT EXISTS resultado_recibo        text;  -- 'aprobado' | 'rechazado'

-- Estado pendiente_verificacion en vehiculos
ALTER TABLE vehiculos
  DROP CONSTRAINT IF EXISTS vehiculos_estado_check;

ALTER TABLE vehiculos
  ADD CONSTRAINT vehiculos_estado_check
  CHECK (estado IN (
    'operativo',
    'en_mantenimiento',
    'fuera_de_servicio',
    'en_inspeccion',
    'pendiente_verificacion'
  ));

-- Verificar
SELECT column_name FROM information_schema.columns
WHERE table_name = 'ordenes_trabajo'
  AND column_name IN ('informe_tecnico','numero_sei_006','firma_inspector_odma')
ORDER BY column_name;
