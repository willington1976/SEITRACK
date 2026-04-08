-- ============================================================
-- SEITRACK — Migración 0010: Checklists editables en BD
-- Permite agregar/editar ítems sin tocar código
-- Cap. XI Manual GSAN-4.1-05-01
-- ============================================================

-- ─── TABLA: plantillas de checklist ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS checklist_items (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  fase            fase_inspeccion NOT NULL,
  programa_mto    programa_mto,        -- NULL = aplica a todos los programas
  sistema         text NOT NULL,
  descripcion     text NOT NULL,
  critico         boolean NOT NULL DEFAULT false,
  orden           int  NOT NULL DEFAULT 0,
  activo          boolean NOT NULL DEFAULT true,
  creado_por      uuid REFERENCES usuarios(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_checklist_fase    ON checklist_items(fase, activo);
CREATE INDEX IF NOT EXISTS idx_checklist_programa ON checklist_items(programa_mto);

ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;

-- Todos pueden leer (para cargar checklists)
DROP POLICY IF EXISTS "checklist_read_all" ON checklist_items;
CREATE POLICY "checklist_read_all" ON checklist_items
  FOR SELECT USING (activo = true);

-- Solo jefe nacional puede crear/editar/eliminar
DROP POLICY IF EXISTS "checklist_write_nacional" ON checklist_items;
CREATE POLICY "checklist_write_nacional" ON checklist_items
  FOR ALL USING (auth_rol() = 'jefe_nacional');

-- ─── SEED: F1 — Inspección periódica (todos los programas) ──────────────────

INSERT INTO checklist_items (fase, programa_mto, sistema, descripcion, critico, orden) VALUES

-- Motor principal
('f1', NULL, 'Motor principal', 'Cambio de aceite motor según intervalo del fabricante', false, 1),
('f1', NULL, 'Motor principal', 'Cambio de filtro de aceite', false, 2),
('f1', NULL, 'Motor principal', 'Cambio de filtro de combustible', false, 3),
('f1', NULL, 'Motor principal', 'Inspección y limpieza de filtro de aire', false, 4),
('f1', NULL, 'Motor principal', 'Revisión tensión y estado de correas — cambiar si es necesario', false, 5),
('f1', NULL, 'Motor principal', 'Inspección de mangueras de radiador y sistema de enfriamiento', false, 6),
('f1', NULL, 'Motor principal', 'Cambio de refrigerante si supera intervalo de servicio', false, 7),
('f1', NULL, 'Motor principal', 'Verificación nivel y calidad de aceite de transmisión', false, 8),
('f1', NULL, 'Motor principal', 'Inspección de fugas en sellos y juntas del motor', true, 9),
('f1', NULL, 'Motor principal', 'Prueba de compresión en cilindros (si supera 500 horas)', false, 10),

-- Sistema de extinción
('f1', NULL, 'Sistema de extinción', 'Inspección completa de mangueras y conexiones del sistema', true, 11),
('f1', NULL, 'Sistema de extinción', 'Calibración de medidores de presión del sistema', true, 12),
('f1', NULL, 'Sistema de extinción', 'Prueba de descarga de agente extintor al 100%', true, 13),
('f1', NULL, 'Sistema de extinción', 'Inspección de boquillas — limpiar y verificar patrón de descarga', true, 14),
('f1', NULL, 'Sistema de extinción', 'Revisión de válvulas de control del sistema', true, 15),
('f1', NULL, 'Sistema de extinción', 'Verificación de concentración de espuma AFFF (muestra de laboratorio)', false, 16),

-- Frenos
('f1', NULL, 'Frenos', 'Medición del espesor de pastillas y zapatas de freno', true, 17),
('f1', NULL, 'Frenos', 'Inspección de discos y tambores — verificar desgaste y fisuras', true, 18),
('f1', NULL, 'Frenos', 'Sangrado del sistema hidráulico de frenos', false, 19),
('f1', NULL, 'Frenos', 'Cambio de líquido de frenos según intervalo', false, 20),
('f1', NULL, 'Frenos', 'Ajuste del freno de parqueo', true, 21),
('f1', NULL, 'Frenos', 'Inspección de mangueras flexibles del sistema de frenos', true, 22),

-- Sistema eléctrico
('f1', NULL, 'Sistema eléctrico', 'Inspección del cableado — buscar desgaste, quemaduras o roedores', false, 23),
('f1', NULL, 'Sistema eléctrico', 'Verificación del alternador — prueba de carga', false, 24),
('f1', NULL, 'Sistema eléctrico', 'Inspección y limpieza de batería — revisar capacidad con voltímetro', false, 25),
('f1', NULL, 'Sistema eléctrico', 'Prueba funcional de todas las luces de emergencia y señalización', true, 26),
('f1', NULL, 'Sistema eléctrico', 'Verificación de fusibles y relés del panel de control', false, 27),

-- Transmisión e hidráulica
('f1', NULL, 'Transmisión e hidráulica', 'Cambio de aceite de la caja de transferencia', false, 28),
('f1', NULL, 'Transmisión e hidráulica', 'Inspección de fugas en el sistema hidráulico', true, 29),
('f1', NULL, 'Transmisión e hidráulica', 'Verificación del nivel y calidad del aceite hidráulico', false, 30),
('f1', NULL, 'Transmisión e hidráulica', 'Inspección de cilindros hidráulicos — sellos y vástagos', false, 31),
('f1', NULL, 'Transmisión e hidráulica', 'Revisión de juntas homocinéticas y cardanes', false, 32),

-- Neumáticos
('f1', NULL, 'Neumáticos y aros', 'Rotación de neumáticos según programa del fabricante', false, 33),
('f1', NULL, 'Neumáticos y aros', 'Medición de profundidad del labrado — mínimo 3mm', true, 34),
('f1', NULL, 'Neumáticos y aros', 'Inspección de aros — fisuras, golpes y oxido', false, 35),
('f1', NULL, 'Neumáticos y aros', 'Verificación y ajuste del par de apriete de tuercas de rueda', true, 36),

-- Chasis
('f1', NULL, 'Chasis y carrocería', 'Inspección visual del chasis — fisuras, deformaciones, corrosión', true, 37),
('f1', NULL, 'Chasis y carrocería', 'Lubricación de puntos de engrase según plano del fabricante', false, 38),
('f1', NULL, 'Chasis y carrocería', 'Inspección de suspensión — resortes, amortiguadores y silentblocks', false, 39),
('f1', NULL, 'Chasis y carrocería', 'Verificación del estado de la carrocería y compartimentos', false, 40),

-- Específicos Oshkosh Serie T
('f1', 'PM_SERIE_T', 'Sistema Oshkosh TAK-4', 'Inspección de la suspensión independiente TAK-4 — verificar holguras', false, 41),
('f1', 'PM_SERIE_T', 'Sistema Oshkosh TAK-4', 'Cambio de aceite en diferenciales delantero, trasero e intermedio', false, 42),
('f1', 'PM_SERIE_T', 'Sistema Oshkosh TAK-4', 'Verificación de la toma de fuerza (PTO) — engranajes y sellos', true, 43),

-- Específicos Striker 1500
('f1', 'PM_S1500', 'Sistema Striker', 'Inspección y mantenimiento de la bomba centrífuga principal', true, 41),
('f1', 'PM_S1500', 'Sistema Striker', 'Lubricación del monitor roof turret — mecanismo de rotación', false, 42),
('f1', 'PM_S1500', 'Sistema Striker', 'Cambio de aceite caja de toma de fuerza (PTO) del Striker', false, 43),
('f1', 'PM_S1500', 'Sistema Striker', 'Calibración del sistema de dosificación de espuma', true, 44),

-- Específicos Rosenbauer Panther
('f1', 'PM_P4X4', 'Sistema Rosenbauer', 'Mantenimiento del sistema CAFS — compresor y mezclador', true, 41),
('f1', 'PM_P4X4', 'Sistema Rosenbauer', 'Inspección del monitor delantero — hidráulica y articulaciones', true, 42),
('f1', 'PM_P4X4', 'Sistema Rosenbauer', 'Cambio de aceite motor Scania/MAN según intervalo', false, 43),
('f1', 'PM_P4X4', 'Sistema Rosenbauer', 'Verificación del sistema de extinción de motor (Fire Suppression)', true, 44);

-- ─── SEED: F2 — Inspección mayor ────────────────────────────────────────────
-- F2 incluye todo lo de F1 más revisiones más profundas

INSERT INTO checklist_items (fase, programa_mto, sistema, descripcion, critico, orden) VALUES

('f2', NULL, 'Motor principal', 'Todo lo de F1 más: revisión de inyectores y sistema de combustible', true, 1),
('f2', NULL, 'Motor principal', 'Inspección del turbocompresor — juego axial y radial', true, 2),
('f2', NULL, 'Motor principal', 'Medición de consumo de aceite en las últimas 100 horas', false, 3),
('f2', NULL, 'Motor principal', 'Inspección interna del motor — válvulas y culata (si supera 1000h)', true, 4),
('f2', NULL, 'Motor principal', 'Análisis de aceite usado (muestra para laboratorio)', false, 5),

('f2', NULL, 'Sistema de extinción', 'Desmontaje y revisión interna de la bomba de extinción', true, 6),
('f2', NULL, 'Sistema de extinción', 'Reemplazo de sellos y empaques del sistema de extinción', true, 7),
('f2', NULL, 'Sistema de extinción', 'Prueba hidrostática de mangueras de alta presión', true, 8),
('f2', NULL, 'Sistema de extinción', 'Calibración del sistema de dosificación de espuma', true, 9),
('f2', NULL, 'Sistema de extinción', 'Inspección y limpieza del tanque de agua y espuma', false, 10),

('f2', NULL, 'Transmisión e hidráulica', 'Revisión completa de la caja de cambios — sellos y sincronizadores', true, 11),
('f2', NULL, 'Transmisión e hidráulica', 'Cambio de filtros del sistema hidráulico', false, 12),
('f2', NULL, 'Transmisión e hidráulica', 'Inspección de la bomba hidráulica — presión y caudal', true, 13),

('f2', NULL, 'Chasis y carrocería', 'Verificación del alineamiento y balanceo de ruedas', false, 14),
('f2', NULL, 'Chasis y carrocería', 'Inspección de soldaduras del chasis con partículas magnéticas', true, 15),
('f2', NULL, 'Chasis y carrocería', 'Tratamiento anticorrosivo en puntos críticos del chasis', false, 16),
('f2', NULL, 'Chasis y carrocería', 'Inspección de todos los soportes y apoyos de la carrocería', false, 17),

('f2', NULL, 'Sistema eléctrico', 'Revisión completa del sistema eléctrico — medición de resistencias', false, 18),
('f2', NULL, 'Sistema eléctrico', 'Inspección del panel de control principal — actualización firmware si aplica', false, 19),
('f2', NULL, 'Sistema eléctrico', 'Prueba de aislamiento del cableado (megger)', false, 20),

('f2', NULL, 'Frenos', 'Reemplazo preventivo de pastillas si están al 40% de vida útil', true, 21),
('f2', NULL, 'Frenos', 'Rectificación o reemplazo de discos según medición', true, 22),
('f2', NULL, 'Frenos', 'Revisión del servofreno y cilindro maestro', true, 23),

-- Específicos por programa en F2
('f2', 'PM_SERIE_T', 'Sistema Oshkosh TAK-4', 'Revisión completa de los brazos de suspensión TAK-4 — manguetas y rótulas', true, 24),
('f2', 'PM_SERIE_T', 'Sistema Oshkosh TAK-4', 'Inspección del sistema central de inflado de llantas (CTIS) si aplica', false, 25),

('f2', 'PM_S1500', 'Sistema Striker', 'Revisión interna de la bomba Hale/Waterous — rodamientos y sellos', true, 24),
('f2', 'PM_S1500', 'Sistema Striker', 'Prueba de rendimiento de la bomba — caudal y presión certificados', true, 25),

('f2', 'PM_P4X4', 'Sistema Rosenbauer', 'Revisión del compresor CAFS — válvulas y pistones', true, 24),
('f2', 'PM_P4X4', 'Sistema Rosenbauer', 'Calibración del sistema electrónico de control (Rosenbauer Commander)', false, 25);

-- ─── SEED: F3 — Revisión general / Overhaul ─────────────────────────────────

INSERT INTO checklist_items (fase, programa_mto, sistema, descripcion, critico, orden) VALUES

('f3', NULL, 'Motor principal', 'Overhaul completo del motor según manual del fabricante', true, 1),
('f3', NULL, 'Motor principal', 'Reemplazo de pistones, anillos y cojinetes según desgaste medido', true, 2),
('f3', NULL, 'Motor principal', 'Rectificación o reemplazo del cigüeñal', true, 3),
('f3', NULL, 'Motor principal', 'Reemplazo completo del sistema de inyección', true, 4),
('f3', NULL, 'Motor principal', 'Revisión y rectificación de la culata — válvulas y guías', true, 5),

('f3', NULL, 'Sistema de extinción', 'Overhaul completo de la bomba de extinción', true, 6),
('f3', NULL, 'Sistema de extinción', 'Reemplazo de todas las mangueras del sistema por antigüedad', true, 7),
('f3', NULL, 'Sistema de extinción', 'Recertificación del sistema de extinción por entidad autorizada', true, 8),
('f3', NULL, 'Sistema de extinción', 'Reemplazo del tanque de espuma si presenta corrosión', true, 9),

('f3', NULL, 'Transmisión e hidráulica', 'Overhaul de la caja de cambios automática/manual', true, 10),
('f3', NULL, 'Transmisión e hidráulica', 'Reemplazo del convertidor de par si aplica', true, 11),
('f3', NULL, 'Transmisión e hidráulica', 'Overhaul del sistema hidráulico — bomba, válvulas y cilindros', true, 12),

('f3', NULL, 'Chasis y carrocería', 'Inspección estructural completa del chasis por ingeniero certificado', true, 13),
('f3', NULL, 'Chasis y carrocería', 'Reemplazo de toda la suspensión — resortes, amortiguadores, rótulas', true, 14),
('f3', NULL, 'Chasis y carrocería', 'Repintura completa de la unidad según estándar UAEAC', false, 15),
('f3', NULL, 'Chasis y carrocería', 'Recertificación de la unidad ante la DSNA — GSAN-4.1-05-01', true, 16),

('f3', NULL, 'Sistema eléctrico', 'Reemplazo de todo el cableado eléctrico principal', true, 17),
('f3', NULL, 'Sistema eléctrico', 'Reemplazo de baterías', false, 18),
('f3', NULL, 'Sistema eléctrico', 'Actualización del sistema electrónico de control si hay versión disponible', false, 19),

('f3', NULL, 'Frenos', 'Reemplazo completo del sistema de frenos — discos, pastillas, cilindros', true, 20),
('f3', NULL, 'Frenos', 'Reemplazo de todas las mangueras flexibles del sistema de frenos', true, 21),

('f3', NULL, 'Neumáticos y aros', 'Reemplazo de todos los neumáticos por antigüedad (máx 6 años)', true, 22),
('f3', NULL, 'Neumáticos y aros', 'Inspección y reemplazo de aros si presentan daños', true, 23),

-- Específicos F3 por programa
('f3', 'PM_SERIE_T', 'Sistema Oshkosh TAK-4', 'Overhaul completo de la suspensión independiente TAK-4', true, 24),
('f3', 'PM_SERIE_T', 'Sistema Oshkosh TAK-4', 'Reemplazo de la caja de transferencia si supera vida útil', true, 25),

('f3', 'PM_S1500', 'Sistema Striker', 'Overhaul certificado de la bomba de extinción principal', true, 24),
('f3', 'PM_S1500', 'Sistema Striker', 'Recertificación del monitor turret ante fabricante', true, 25),

('f3', 'PM_P4X4', 'Sistema Rosenbauer', 'Overhaul del sistema CAFS — compresor, separador y mezclador', true, 24),
('f3', 'PM_P4X4', 'Sistema Rosenbauer', 'Actualización del sistema Rosenbauer Commander a última versión', false, 25);

-- ─── FUNCIÓN: obtener checklist para una inspección ──────────────────────────

CREATE OR REPLACE FUNCTION get_checklist(
  p_fase        fase_inspeccion,
  p_programa    programa_mto
)
RETURNS TABLE (
  id          uuid,
  sistema     text,
  descripcion text,
  critico     boolean,
  orden       int
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT id, sistema, descripcion, critico, orden
  FROM checklist_items
  WHERE fase = p_fase
    AND activo = true
    AND (programa_mto IS NULL OR programa_mto = p_programa)
  ORDER BY sistema, orden;
$$;

GRANT EXECUTE ON FUNCTION get_checklist(fase_inspeccion, programa_mto) TO authenticated, anon;

SELECT 'Migración 0010 ejecutada — '
  || COUNT(*) || ' ítems de checklist cargados' AS resultado
FROM checklist_items;