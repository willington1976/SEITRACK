-- ============================================================
-- SEITRACK — Migración 0001: Schema inicial
-- UAEAC · Grupo SEI · Máquinas para Respuesta a Emergencias
-- ============================================================

-- Extensiones
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

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

-- ─── TERRITORIO ──────────────────────────────────────────────────────────────

create table regionales (
  id          uuid primary key default uuid_generate_v4(),
  nombre      text not null,
  codigo      varchar(4) not null unique,
  created_at  timestamptz not null default now()
);

create table estaciones (
  id              uuid primary key default uuid_generate_v4(),
  regional_id     uuid not null references regionales(id),
  nombre          text not null,
  codigo_iata     varchar(4) not null unique,
  aeropuerto      text not null,
  ciudad          text not null,
  departamento    text not null,
  categoria_icao  text not null default 'CAT I',
  activa          boolean not null default true,
  created_at      timestamptz not null default now()
);
create index idx_estaciones_regional on estaciones(regional_id);

-- ─── USUARIOS ────────────────────────────────────────────────────────────────

create table usuarios (
  id                    uuid primary key references auth.users(id) on delete cascade,
  estacion_id           uuid references estaciones(id),
  nombre_completo       text not null,
  email                 text not null unique,
  telefono              text,
  rol                   rol_usuario not null,
  numero_certificado    text,
  certificado_vigencia  date,
  activo                boolean not null default true,
  created_at            timestamptz not null default now()
);
create index idx_usuarios_estacion on usuarios(estacion_id);
create index idx_usuarios_rol on usuarios(rol);

-- ─── FLOTA ───────────────────────────────────────────────────────────────────

create table vehiculos (
  id                  uuid primary key default uuid_generate_v4(),
  estacion_id         uuid not null references estaciones(id),
  matricula           text not null unique,
  numero_serie        text not null,
  marca               marca_vehiculo not null,
  modelo              text not null,
  anio                int not null,
  kilometraje_actual  int not null default 0,
  horas_motor         int not null default 0,
  estado              estado_vehiculo not null default 'operativo',
  fecha_adquisicion   date not null,
  programa_mto        programa_mto not null,
  created_at          timestamptz not null default now()
);
create index idx_vehiculos_estacion on vehiculos(estacion_id);
create index idx_vehiculos_estado   on vehiculos(estado);

create table componentes (
  id                uuid primary key default uuid_generate_v4(),
  vehiculo_id       uuid not null references vehiculos(id) on delete cascade,
  numero_parte      text not null,
  descripcion       text not null,
  numero_serie      text,
  estado            text not null default 'apto'
                    check (estado in ('apto','en_transito','reparacion','no_reparable')),
  fecha_instalacion date not null,
  vida_util_horas   int,
  horas_acumuladas  int not null default 0,
  updated_at        timestamptz not null default now()
);
create index idx_componentes_vehiculo on componentes(vehiculo_id);

-- ─── INSPECCIONES ────────────────────────────────────────────────────────────

create table inspecciones (
  id                uuid primary key default uuid_generate_v4(),
  vehiculo_id       uuid not null references vehiculos(id),
  inspector_id      uuid not null references usuarios(id),
  fase              fase_inspeccion not null,
  fecha             date not null default current_date,
  turno             text not null check (turno in ('dia','tarde','noche')),
  km_al_momento     int not null,
  horas_al_momento  int not null,
  resultado         resultado_inspeccion not null,
  observaciones     text,
  liberado_servicio boolean not null default false,
  firmado_en        timestamptz,
  created_at        timestamptz not null default now()
);
create index idx_inspecciones_vehiculo on inspecciones(vehiculo_id);
create index idx_inspecciones_fecha    on inspecciones(fecha desc);
create index idx_inspecciones_fase     on inspecciones(vehiculo_id, fase);

create table items_inspeccion (
  id              uuid primary key default uuid_generate_v4(),
  inspeccion_id   uuid not null references inspecciones(id) on delete cascade,
  sistema         text not null,
  descripcion_item text not null,
  resultado       resultado_item not null,
  observacion     text,
  requiere_accion boolean not null default false
);
create index idx_items_inspeccion on items_inspeccion(inspeccion_id);

-- ─── MANTENIMIENTO ───────────────────────────────────────────────────────────

create table discrepancias (
  id               uuid primary key default uuid_generate_v4(),
  vehiculo_id      uuid not null references vehiculos(id),
  reportado_por    uuid not null references usuarios(id),
  sistema_afectado text not null,
  tipo_falla       tipo_falla not null,
  descripcion      text not null,
  criticidad       criticidad not null,
  estado           text not null default 'abierta'
                   check (estado in ('abierta','en_proceso','cerrada')),
  created_at       timestamptz not null default now(),
  cerrado_en       timestamptz
);
create index idx_discrepancias_vehiculo on discrepancias(vehiculo_id);
create index idx_discrepancias_estado   on discrepancias(estado);

create table ordenes_trabajo (
  id               uuid primary key default uuid_generate_v4(),
  vehiculo_id      uuid not null references vehiculos(id),
  creado_por       uuid not null references usuarios(id),
  asignado_a       uuid references usuarios(id),
  discrepancia_id  uuid references discrepancias(id),
  numero_ot        text not null unique,
  tipo             text not null check (tipo in ('preventivo','correctivo','post_accidente','alteracion')),
  prioridad        criticidad not null,
  estado           estado_ot not null default 'abierta',
  descripcion      text not null,
  fecha_programada date,
  fecha_cierre     date,
  horas_labor      int,
  created_at       timestamptz not null default now()
);
create index idx_ot_vehiculo on ordenes_trabajo(vehiculo_id);
create index idx_ot_estado   on ordenes_trabajo(estado);

-- Secuencia para número de OT (OT-YYYY-NNNNNN)
create sequence seq_numero_ot start 1;

create or replace function gen_numero_ot()
returns trigger language plpgsql as $$
begin
  new.numero_ot := 'OT-' || to_char(now(), 'YYYY') || '-' ||
                   lpad(nextval('seq_numero_ot')::text, 6, '0');
  return new;
end;
$$;

create trigger trg_numero_ot
before insert on ordenes_trabajo
for each row when (new.numero_ot = '')
execute function gen_numero_ot();

-- ─── LIBRO DE OPERACIÓN ──────────────────────────────────────────────────────

create table libro_operacion (
  id                     uuid primary key default uuid_generate_v4(),
  vehiculo_id            uuid not null references vehiculos(id),
  usuario_id             uuid not null references usuarios(id),
  fecha                  date not null default current_date,
  turno                  text not null check (turno in ('dia','tarde','noche')),
  anotacion              text not null,
  tipo_entrada           text not null
                         check (tipo_entrada in ('novedad','mantenimiento','operacion','combustible','agente_extintor')),
  km_registro            int not null,
  horas_registro         int not null,
  nivel_combustible      text,
  nivel_agente_extintor  text,
  created_at             timestamptz not null default now()
);
create index idx_libro_vehiculo on libro_operacion(vehiculo_id);
create index idx_libro_fecha    on libro_operacion(vehiculo_id, fecha desc);

-- ─── ALMACÉN ─────────────────────────────────────────────────────────────────

create table repuestos (
  id              uuid primary key default uuid_generate_v4(),
  estacion_id     uuid not null references estaciones(id),
  numero_parte    text not null,
  descripcion     text not null,
  tipo            text not null
                  check (tipo in ('consumible','componente','lubricante','filtro','otro')),
  cantidad_stock  int not null default 0,
  stock_minimo    int not null default 1,
  unidad          text not null,
  proveedor       text,
  updated_at      timestamptz not null default now(),
  unique(estacion_id, numero_parte)
);

create table consumos_repuestos (
  id                uuid primary key default uuid_generate_v4(),
  repuesto_id       uuid not null references repuestos(id),
  orden_trabajo_id  uuid not null references ordenes_trabajo(id),
  usuario_id        uuid not null references usuarios(id),
  cantidad          int not null check (cantidad > 0),
  fecha             date not null default current_date,
  motivo            text,
  created_at        timestamptz not null default now()
);

-- Trigger: descontar stock automáticamente
create or replace function descontar_stock()
returns trigger language plpgsql as $$
begin
  update repuestos
  set cantidad_stock = cantidad_stock - new.cantidad,
      updated_at     = now()
  where id = new.repuesto_id;
  return new;
end;
$$;

create trigger trg_descontar_stock
after insert on consumos_repuestos
for each row execute function descontar_stock();

-- ─── AUDITORÍA ───────────────────────────────────────────────────────────────

create table audit_log (
  id          bigint generated always as identity primary key,
  tabla       text not null,
  operacion   text not null,
  registro_id uuid,
  usuario_id  uuid references usuarios(id),
  datos_antes jsonb,
  datos_despues jsonb,
  ip          text,
  created_at  timestamptz not null default now()
);
create index idx_audit_tabla on audit_log(tabla, created_at desc);
