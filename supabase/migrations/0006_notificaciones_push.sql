-- ============================================================
-- SEITRACK — Migración 0006: Web Push subscriptions
-- ============================================================

CREATE TABLE push_subscriptions (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id   uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  endpoint     text NOT NULL UNIQUE,
  p256dh       text NOT NULL,
  auth_key     text NOT NULL,
  user_agent   text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_push_usuario ON push_subscriptions(usuario_id);

-- Tabla de notificaciones enviadas (auditoría)
CREATE TABLE notificaciones_log (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_id   uuid REFERENCES usuarios(id),
  tipo         text NOT NULL,  -- 'mto_vencido' | 'ot_asignada' | 'stock_bajo' | 'inspeccion_rechazada'
  titulo       text NOT NULL,
  cuerpo       text NOT NULL,
  datos        jsonb,
  enviado      boolean DEFAULT false,
  error        text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- RLS push_subscriptions
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "push_own" ON push_subscriptions
  FOR ALL USING (usuario_id = auth.uid());

-- ─── TRIGGER: notificar OT asignada ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION notify_ot_asignada()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.asignado_a IS NOT NULL AND
     (OLD.asignado_a IS NULL OR OLD.asignado_a <> NEW.asignado_a) THEN
    INSERT INTO notificaciones_log (usuario_id, tipo, titulo, cuerpo, datos)
    VALUES (
      NEW.asignado_a,
      'ot_asignada',
      'Nueva OT asignada',
      'Se te asignó la orden ' || COALESCE(NEW.numero_ot, 'nueva') || ' — ' || LEFT(NEW.descripcion, 80),
      jsonb_build_object('ot_id', NEW.id, 'vehiculo_id', NEW.vehiculo_id)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_ot
AFTER INSERT OR UPDATE ON ordenes_trabajo
FOR EACH ROW EXECUTE FUNCTION notify_ot_asignada();

-- ─── TRIGGER: notificar inspección rechazada al jefe de estación ─────────────
CREATE OR REPLACE FUNCTION notify_inspeccion_rechazada()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE jefe_id uuid;
BEGIN
  IF NEW.resultado = 'rechazado' THEN
    -- Buscar jefe de estación del vehículo
    SELECT u.id INTO jefe_id
    FROM usuarios u
    JOIN vehiculos v ON v.estacion_id = u.estacion_id
    WHERE v.id = NEW.vehiculo_id
      AND u.rol = 'jefe_estacion'
      AND u.activo = true
    LIMIT 1;

    IF jefe_id IS NOT NULL THEN
      INSERT INTO notificaciones_log (usuario_id, tipo, titulo, cuerpo, datos)
      VALUES (
        jefe_id,
        'inspeccion_rechazada',
        'Inspección rechazada',
        'Vehículo con fallas críticas. Se requiere intervención inmediata.',
        jsonb_build_object('inspeccion_id', NEW.id, 'vehiculo_id', NEW.vehiculo_id)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_inspeccion
AFTER INSERT ON inspecciones
FOR EACH ROW EXECUTE FUNCTION notify_inspeccion_rechazada();

-- ─── TRIGGER: stock bajo ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION notify_stock_bajo()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE jefe_id uuid;
BEGIN
  IF NEW.cantidad_stock <= NEW.stock_minimo AND
     OLD.cantidad_stock > OLD.stock_minimo THEN
    SELECT u.id INTO jefe_id
    FROM usuarios u
    WHERE u.estacion_id = NEW.estacion_id
      AND u.rol = 'jefe_estacion'
      AND u.activo = true
    LIMIT 1;

    IF jefe_id IS NOT NULL THEN
      INSERT INTO notificaciones_log (usuario_id, tipo, titulo, cuerpo, datos)
      VALUES (
        jefe_id,
        'stock_bajo',
        'Stock bajo: ' || NEW.descripcion,
        'Quedan ' || NEW.cantidad_stock || ' ' || NEW.unidad || '. Mínimo: ' || NEW.stock_minimo,
        jsonb_build_object('repuesto_id', NEW.id, 'estacion_id', NEW.estacion_id)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_stock
AFTER UPDATE ON repuestos
FOR EACH ROW EXECUTE FUNCTION notify_stock_bajo();
