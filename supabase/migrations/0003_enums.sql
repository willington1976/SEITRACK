-- ============================================================
-- SEITRACK — Migración 0003: Enums del Sistema
-- UAEAC · Grupo SEI · Máquinas para Respuesta a Emergencias
-- ============================================================

-- ─── ENUMS ───────────────────────────────────────────────────────────────────

create type rol_usuario as enum (
  'jefe_nacional', 'jefe_regional', 'jefe_estacion',
  'bombero', 'odma', 'dsna'
);

create type fase_inspeccion as enum (
  'cambio_turno', 'f0', 'f1', 'f2', 'f3'
);

create type estado_vehiculo as enum (
  'operativo', 'en_mantenimiento', 'fuera_de_servicio', 'en_inspeccion'
);

create type marca_vehiculo as enum (
  'oshkosh_serie_t', 'oshkosh_striker_1500', 'rosenbauer_panther_4x4'
);

create type programa_mto as enum (
  'PM_SERIE_T', 'PM_S1500', 'PM_P4X4'
);

create type tipo_falla as enum (
  'cronica', 'esporadica', 'degradante', 'incipiente', 'desconocida'
);

create type criticidad as enum ('alta', 'media', 'baja');

create type estado_ot as enum (
  'abierta', 'en_proceso', 'cerrada', 'cancelada'
);

create type resultado_inspeccion as enum (
  'aprobado', 'con_observaciones', 'rechazado'
);

create type resultado_item as enum (
  'ok', 'observacion', 'no_aplica', 'falla'
);
