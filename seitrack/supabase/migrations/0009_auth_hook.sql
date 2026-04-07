-- ============================================================
-- SEITRACK — Migración 0009: Auth Hook
-- Sincroniza auth.users con tabla usuarios automáticamente
-- ============================================================

-- Tabla temporal para guardar datos del perfil mientras el usuario
-- no ha confirmado su email (pendientes de activación)
CREATE TABLE IF NOT EXISTS usuarios_pendientes (
  auth_user_id         uuid PRIMARY KEY,
  nombre_completo      text NOT NULL,
  email                text NOT NULL,
  rol                  text NOT NULL,
  estacion_id          uuid NOT NULL REFERENCES estaciones(id),
  telefono             text,
  numero_certificado   text,
  certificado_vigencia date,
  created_at           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE usuarios_pendientes ENABLE ROW LEVEL SECURITY;

-- Solo service role puede leer/escribir esta tabla
CREATE POLICY "pendientes_service_only" ON usuarios_pendientes
  FOR ALL USING (false);  -- bloquea todo acceso desde el cliente

-- ─── FUNCIÓN: mover de pendientes a usuarios cuando confirma email ────────────

CREATE OR REPLACE FUNCTION handle_user_confirmed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  pendiente usuarios_pendientes%ROWTYPE;
BEGIN
  -- Solo actuar cuando email_confirmed_at pasa de NULL a un valor
  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN

    -- Buscar datos del perfil pendiente
    SELECT * INTO pendiente
    FROM usuarios_pendientes
    WHERE auth_user_id = NEW.id;

    -- Si existe el pendiente, crear el perfil
    IF FOUND THEN
      INSERT INTO usuarios (
        id, estacion_id, nombre_completo, email, telefono,
        rol, numero_certificado, certificado_vigencia, activo
      ) VALUES (
        NEW.id,
        pendiente.estacion_id,
        pendiente.nombre_completo,
        pendiente.email,
        pendiente.telefono,
        pendiente.rol,
        pendiente.numero_certificado,
        pendiente.certificado_vigencia,
        true
      )
      ON CONFLICT (id) DO UPDATE SET
        nombre_completo      = EXCLUDED.nombre_completo,
        estacion_id          = EXCLUDED.estacion_id,
        rol                  = EXCLUDED.rol,
        activo               = true;

      -- Limpiar el pendiente
      DELETE FROM usuarios_pendientes WHERE auth_user_id = NEW.id;

      RAISE LOG '[seitrack] Usuario activado: % (%)', NEW.email, NEW.id;
    END IF;

  END IF;

  RETURN NEW;
END;
$$;

-- Trigger en auth.users (requiere permisos de superuser en Supabase)
-- En Supabase Cloud esto se configura via Auth Hooks en el dashboard
-- Este SQL es de referencia para la lógica del hook

-- ─── FUNCIÓN RPC: crear perfil pendiente (llamada desde la Edge Function) ────
-- Usa SECURITY DEFINER para bypassar RLS

CREATE OR REPLACE FUNCTION crear_perfil_pendiente(
  p_auth_user_id       uuid,
  p_nombre_completo    text,
  p_email              text,
  p_rol                text,
  p_estacion_id        uuid,
  p_telefono           text DEFAULT NULL,
  p_numero_certificado text DEFAULT NULL,
  p_certificado_vigencia date DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO usuarios_pendientes (
    auth_user_id, nombre_completo, email, rol, estacion_id,
    telefono, numero_certificado, certificado_vigencia
  ) VALUES (
    p_auth_user_id, p_nombre_completo, p_email, p_rol, p_estacion_id,
    p_telefono, p_numero_certificado, p_certificado_vigencia
  )
  ON CONFLICT (auth_user_id) DO UPDATE SET
    nombre_completo      = EXCLUDED.nombre_completo,
    rol                  = EXCLUDED.rol,
    estacion_id          = EXCLUDED.estacion_id;
END;
$$;

GRANT EXECUTE ON FUNCTION crear_perfil_pendiente(uuid,text,text,text,uuid,text,text,date)
  TO authenticated, service_role;

-- ─── FUNCIÓN: insertar directo cuando email ya está confirmado ────────────────
-- Para el caso de contraseña temporal (email_confirm: true)

CREATE OR REPLACE FUNCTION insertar_usuario_confirmado(
  p_auth_user_id       uuid,
  p_nombre_completo    text,
  p_email              text,
  p_rol                text,
  p_estacion_id        uuid,
  p_telefono           text DEFAULT NULL,
  p_numero_certificado text DEFAULT NULL,
  p_certificado_vigencia date DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO usuarios (
    id, estacion_id, nombre_completo, email, telefono,
    rol, numero_certificado, certificado_vigencia, activo
  ) VALUES (
    p_auth_user_id, p_estacion_id, p_nombre_completo, p_email, p_telefono,
    p_rol, p_numero_certificado, p_certificado_vigencia, true
  )
  ON CONFLICT (id) DO UPDATE SET
    nombre_completo      = EXCLUDED.nombre_completo,
    estacion_id          = EXCLUDED.estacion_id,
    rol                  = EXCLUDED.rol,
    activo               = true;
END;
$$;

GRANT EXECUTE ON FUNCTION insertar_usuario_confirmado(uuid,text,text,text,uuid,text,text,date)
  TO service_role;
