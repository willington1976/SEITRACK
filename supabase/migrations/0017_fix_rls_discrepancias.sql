-- ============================================================
-- SEITRACK — Migración 0017: Fix RLS discrepancias
-- El bombero necesita INSERT para reportar novedades
-- ============================================================

-- 1. Limpieza de políticas previas para evitar el error SQLSTATE 42710
DROP POLICY IF EXISTS "disc_insert_authenticated" ON discrepancias;
DROP POLICY IF EXISTS "disc_select_authenticated" ON discrepancias;
DROP POLICY IF EXISTS "disc_update_authenticated" ON discrepancias;

-- 2. Permitir INSERT a todos los roles autenticados
-- Permite que los bomberos reporten fallas en los vehículos (Oshkosh, Striker, etc.)
CREATE POLICY "disc_insert_authenticated"
  ON discrepancias FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- 3. Permitir SELECT a todos los roles autenticados
-- Necesario para visualizar el estado de las novedades en el dashboard
CREATE POLICY "disc_select_authenticated"
  ON discrepancias FOR SELECT
  TO authenticated
  USING (true);

-- 4. Permitir UPDATE a todos los roles autenticados
-- Permite que el personal de la ODMA o jefes cambien el estado a "Cerrado"
CREATE POLICY "disc_update_authenticated"
  ON discrepancias FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- 5. Verificación final de políticas activas en la tabla
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'discrepancias'
ORDER BY cmd;