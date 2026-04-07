-- ============================================================
-- SEITRACK — Migración 0002: Row Level Security
-- Cada rol solo ve y modifica lo que le corresponde
-- ============================================================

alter table regionales         enable row level security;
alter table estaciones         enable row level security;
alter table usuarios           enable row level security;
alter table vehiculos          enable row level security;
alter table componentes        enable row level security;
alter table inspecciones       enable row level security;
alter table items_inspeccion   enable row level security;
alter table discrepancias      enable row level security;
alter table ordenes_trabajo    enable row level security;
alter table libro_operacion    enable row level security;
alter table repuestos          enable row level security;
alter table consumos_repuestos enable row level security;

-- Función helper: obtener rol del usuario actual
create or replace function auth_rol()
returns rol_usuario language sql stable as $$
  select rol from usuarios where id = auth.uid()
$$;

-- Función helper: obtener estacion_id del usuario actual
create or replace function auth_estacion_id()
returns uuid language sql stable as $$
  select estacion_id from usuarios where id = auth.uid()
$$;

-- Función helper: obtener regional del usuario actual (vía estacion)
create or replace function auth_regional_id()
returns uuid language sql stable as $$
  select e.regional_id from usuarios u
  join estaciones e on e.id = u.estacion_id
  where u.id = auth.uid()
$$;

-- ─── REGIONALES (todos pueden leer) ─────────────────────────────────────────
create policy "regionales_read_all"
  on regionales for select using (true);

create policy "regionales_write_nacional"
  on regionales for all
  using (auth_rol() = 'jefe_nacional');

-- ─── ESTACIONES ──────────────────────────────────────────────────────────────
create policy "estaciones_read_all"
  on estaciones for select using (true);

create policy "estaciones_write_nacional"
  on estaciones for all
  using (auth_rol() in ('jefe_nacional', 'jefe_regional'));

-- ─── USUARIOS ────────────────────────────────────────────────────────────────
create policy "usuarios_read_own"
  on usuarios for select
  using (
    id = auth.uid()
    or auth_rol() in ('jefe_nacional', 'jefe_regional', 'jefe_estacion', 'dsna')
  );

create policy "usuarios_write_nacional"
  on usuarios for all
  using (auth_rol() = 'jefe_nacional');

-- ─── VEHICULOS ───────────────────────────────────────────────────────────────
create policy "vehiculos_read_by_scope"
  on vehiculos for select using (
    auth_rol() in ('jefe_nacional', 'dsna')
    or (auth_rol() = 'jefe_regional' and
        estacion_id in (select id from estaciones where regional_id = auth_regional_id()))
    or estacion_id = auth_estacion_id()
  );

create policy "vehiculos_write_estacion"
  on vehiculos for insert update
  using (
    auth_rol() in ('jefe_nacional', 'jefe_regional')
    or estacion_id = auth_estacion_id()
  );

-- ─── INSPECCIONES ────────────────────────────────────────────────────────────
create policy "inspecciones_read_by_scope"
  on inspecciones for select using (
    auth_rol() in ('jefe_nacional', 'dsna')
    or inspector_id = auth.uid()
    or vehiculo_id in (
      select id from vehiculos where estacion_id = auth_estacion_id()
    )
  );

create policy "inspecciones_insert_bombero"
  on inspecciones for insert
  with check (
    auth_rol() in ('bombero', 'jefe_estacion', 'odma')
    and inspector_id = auth.uid()
  );

-- ─── ORDENES DE TRABAJO ──────────────────────────────────────────────────────
create policy "ot_read_by_scope"
  on ordenes_trabajo for select using (
    auth_rol() in ('jefe_nacional', 'dsna', 'odma')
    or creado_por = auth.uid()
    or asignado_a = auth.uid()
    or vehiculo_id in (
      select id from vehiculos where estacion_id = auth_estacion_id()
    )
  );

create policy "ot_write"
  on ordenes_trabajo for insert update
  using (auth_rol() in ('jefe_nacional','jefe_regional','jefe_estacion','odma'));

-- ─── LIBRO DE OPERACIÓN ──────────────────────────────────────────────────────
create policy "libro_read_by_scope"
  on libro_operacion for select using (
    auth_rol() in ('jefe_nacional', 'dsna')
    or usuario_id = auth.uid()
    or vehiculo_id in (
      select id from vehiculos where estacion_id = auth_estacion_id()
    )
  );

create policy "libro_insert_bombero"
  on libro_operacion for insert
  with check (
    auth_rol() in ('bombero', 'jefe_estacion')
    and usuario_id = auth.uid()
  );
