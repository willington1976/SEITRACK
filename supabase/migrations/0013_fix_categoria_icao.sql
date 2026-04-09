-- ============================================================
-- SEITRACK — Migración 0012: Corregir categoria_icao
-- Sincronizar con categoria_rac (dato oficial RAC colombiano)
-- ============================================================

-- El campo categoria_icao tenía datos en formato romano incorrecto
-- Se reemplaza por el valor numérico RAC oficial

UPDATE estaciones SET categoria_icao = 'CAT ' || categoria_rac::text
WHERE categoria_rac IS NOT NULL;

-- Verificar resultado
SELECT codigo_iata, nombre, categoria_oaci, categoria_rac, categoria_icao, designador_oaci
FROM estaciones
ORDER BY nombre;
