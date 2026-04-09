-- ============================================================
-- SEITRACK — Migración 0013-A
-- Agregar columnas SEI-006 + agregar valor ENUM
-- ============================================================

ALTER TABLE ordenes_trabajo
  ADD COLUMN IF NOT EXISTS informe_tecnico         text,
  ADD COLUMN IF NOT EXISTS numero_sei_006          text,
  ADD COLUMN IF NOT EXISTS actividades_realizadas  text,
  ADD COLUMN IF NOT EXISTS partes_instaladas       text,
  ADD COLUMN IF NOT EXISTS firma_inspector_odma    text,
  ADD COLUMN IF NOT EXISTS motivo_diferido         text,
  ADD COLUMN IF NOT EXISTS verificacion_recibo     text,
  ADD COLUMN IF NOT EXISTS firma_bombero_recibo    text,
  ADD COLUMN IF NOT EXISTS resultado_recibo        text;

-- ============================================================
-- Agregar valor al ENUM estado_vehiculo
-- (requiere commit antes de poder usarse)
-- ============================================================

ALTER TYPE estado_vehiculo
  ADD VALUE IF NOT EXISTS 'pendiente_verificacion';