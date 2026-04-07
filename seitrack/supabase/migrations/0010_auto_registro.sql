-- ============================================================
-- SEITRACK — Migración 0009: Auto-registro bomberos
-- Solo permite @aerocivil.gov.co
-- Rol bombero asignado automáticamente
-- ============================================================

-- Habilitar signup SOLO para dominio institucional
-- Se valida también en el trigger de base de datos

-- ─── TRIGGER: al confirmar email → crear perfil bombero ──────────────────────

CREATE OR REPLACE FUNCTION handle_new_user_confirmed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_estacion_id  uuid;
  v_rol          text;
BEGIN
  -- Solo actuar cuando email_confirmed_at pasa de NULL a valor
  IF OLD.email_confirmed_at IS NOT NULL OR NEW.email_confirmed_at IS NULL THEN
    RETURN NEW;
  END IF;

  -- Validar dominio institucional
  IF NEW.email NOT LIKE '%@aerocivil.gov.co' THEN
    RAISE LOG '[seitrack] Email no institucional ignorado: %', NEW.email;
    RETURN NEW;
  END IF;

  -- Leer estacion_id y rol desde user_metadata (lo envía la pantalla de registro)
  v_estacion_id := (NEW.raw_user_meta_data->>'estacion_id')::uuid;
  v_rol         := COALESCE(NEW.raw_user_meta_data->>'rol', 'bombero');

  -- Solo bomberos se auto-registran; otros roles los crea el admin
  IF v_rol NOT IN ('bombero') THEN
    v_rol := 'bombero';
  END IF;

  -- Verificar que la estación existe
  IF v_estacion_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM estaciones WHERE id = v_estacion_id AND activa = true
  ) THEN
    RAISE LOG '[seitrack] estacion_id inválido para %: %', NEW.email, v_estacion_id;
    RETURN NEW;
  END IF;

  -- Crear perfil
  INSERT INTO usuarios (
    id,
    estacion_id,
    nombre_completo,
    email,
    rol,
    activo
  ) VALUES (
    NEW.id,
    v_estacion_id,
    COALESCE(NEW.raw_user_meta_data->>'nombre_completo', split_part(NEW.email, '@', 1)),
    NEW.email,
    v_rol,
    true
  )
  ON CONFLICT (id) DO NOTHING;  -- si ya existe (creado por admin), no sobreescribir

  RAISE LOG '[seitrack] Perfil creado automáticamente: % | estacion: %', NEW.email, v_estacion_id;
  RETURN NEW;
END;
$$;

-- Crear trigger en auth.users
-- Nota: en Supabase Cloud se configura via Auth Hooks en el dashboard
-- Este trigger aplica si tienes acceso directo a auth.users

DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_confirmed();

-- ─── FUNCIÓN RPC: validar si email es institucional (para el frontend) ─────────

CREATE OR REPLACE FUNCTION es_email_institucional(p_email text)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT p_email ILIKE '%@aerocivil.gov.co';
$$;

GRANT EXECUTE ON FUNCTION es_email_institucional(text) TO anon, authenticated;
