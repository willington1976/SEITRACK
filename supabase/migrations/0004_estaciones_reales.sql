-- ============================================================
-- SEITRACK — Migración 0011: Actualizar designador OACI y categorías
-- Basado en tabla oficial estaciones_sei
-- Agrega columnas designador_oaci, categoria_oaci, categoria_rac
-- ============================================================

-- 1. Agregar columnas si no existen
ALTER TABLE estaciones
  ADD COLUMN IF NOT EXISTS designador_oaci  text,
  ADD COLUMN IF NOT EXISTS categoria_oaci   int,
  ADD COLUMN IF NOT EXISTS categoria_rac    int;

-- 2. Actualizar con datos oficiales del CSV
UPDATE estaciones SET designador_oaci = 'SKTL', categoria_oaci = 4, categoria_rac = 3 WHERE nombre ILIKE '%Golfo de Morrosquillo%' OR nombre ILIKE '%Tolu%';
UPDATE estaciones SET designador_oaci = 'SKBQ', categoria_oaci = 8, categoria_rac = 9 WHERE nombre ILIKE '%Cortissoz%' OR nombre ILIKE '%Barranquilla%';
UPDATE estaciones SET designador_oaci = 'SKPC', categoria_oaci = 5, categoria_rac = 3 WHERE nombre ILIKE '%Germán Olano%' OR nombre ILIKE '%Puerto Carre%';
UPDATE estaciones SET designador_oaci = 'SKVP', categoria_oaci = 7, categoria_rac = 6 WHERE nombre ILIKE '%Alfonso López%' OR nombre ILIKE '%Valledupar%';
UPDATE estaciones SET designador_oaci = 'SKPP', categoria_oaci = 6, categoria_rac = 5 WHERE nombre ILIKE '%Guillermo León%' OR nombre ILIKE '%Popayn%' OR nombre ILIKE '%Popayán%';
UPDATE estaciones SET designador_oaci = 'SKIB', categoria_oaci = 6, categoria_rac = 6 WHERE nombre ILIKE '%Perales%' OR nombre ILIKE '%Ibagu%';
UPDATE estaciones SET designador_oaci = 'SKRG', categoria_oaci = 8, categoria_rac = 9 WHERE nombre ILIKE '%Córdova%' OR nombre ILIKE '%Cordova%' OR nombre ILIKE '%Rionegro%';
UPDATE estaciones SET designador_oaci = 'SKPV', categoria_oaci = 4, categoria_rac = 3 WHERE nombre ILIKE '%Embrujo%' OR nombre ILIKE '%Providencia%';
UPDATE estaciones SET designador_oaci = 'SKTJ', categoria_oaci = 7, categoria_rac = 7 WHERE nombre ILIKE '%Garzones%' OR nombre ILIKE '%Monter%';
UPDATE estaciones SET designador_oaci = 'SKNQ', categoria_oaci = 3, categoria_rac = 3 WHERE nombre ILIKE '%Reyes Murillo%' OR nombre ILIKE '%Nuqu%';
UPDATE estaciones SET designador_oaci = 'SKSJ', categoria_oaci = 5, categoria_rac = 3 WHERE nombre ILIKE '%González Torres%' OR nombre ILIKE '%San Jos%Guaviare%';
UPDATE estaciones SET designador_oaci = 'SKPE', categoria_oaci = 7, categoria_rac = 8 WHERE nombre ILIKE '%Matecaña%' OR nombre ILIKE '%Pereira%';
UPDATE estaciones SET designador_oaci = 'SKMD', categoria_oaci = 6, categoria_rac = 8 WHERE nombre ILIKE '%Olaya Herrera%' OR (nombre ILIKE '%Medell%' AND nombre NOT ILIKE '%Córdova%');
UPDATE estaciones SET designador_oaci = 'SKLT', categoria_oaci = 7, categoria_rac = 6 WHERE nombre ILIKE '%Vásquez Cobo%' OR nombre ILIKE '%Leticia%';
UPDATE estaciones SET designador_oaci = 'SKFL', categoria_oaci = 6, categoria_rac = 4 WHERE nombre ILIKE '%Artunduaga%' OR nombre ILIKE '%Florencia%';
UPDATE estaciones SET designador_oaci = 'SKVV', categoria_oaci = 6, categoria_rac = 5 WHERE nombre ILIKE '%Vanguardia%' OR nombre ILIKE '%Villavicencio%';
UPDATE estaciones SET designador_oaci = 'SKGI', categoria_oaci = 5, categoria_rac = 3 WHERE nombre ILIKE '%Gaviria Trujillo%' OR nombre ILIKE '%Inírida%' OR nombre ILIKE '%Inirida%';
UPDATE estaciones SET designador_oaci = 'SKCC', categoria_oaci = 7, categoria_rac = 7 WHERE nombre ILIKE '%Camilo Daza%' OR nombre ILIKE '%Cúcuta%' OR nombre ILIKE '%Cucuta%';
UPDATE estaciones SET designador_oaci = 'SKTM', categoria_oaci = 4, categoria_rac = 4 WHERE nombre ILIKE '%Vargas Santos%' OR nombre ILIKE '%Tame%';
UPDATE estaciones SET designador_oaci = 'SKUI', categoria_oaci = 5, categoria_rac = 4 WHERE nombre ILIKE '%Juan H. White%' OR nombre ILIKE '%Quibd%';
UPDATE estaciones SET designador_oaci = 'SKRH', categoria_oaci = 6, categoria_rac = 4 WHERE nombre ILIKE '%Almirante Padilla%' OR nombre ILIKE '%Riohacha%';
UPDATE estaciones SET designador_oaci = 'SKSP', categoria_oaci = 7, categoria_rac = 7 WHERE nombre ILIKE '%Gustavo Rojas Pinilla%' OR nombre ILIKE '%San Andrés%' OR nombre ILIKE '%San Andres%';
UPDATE estaciones SET designador_oaci = 'SKMU', categoria_oaci = 5, categoria_rac = 3 WHERE nombre ILIKE '%León Bentley%' OR nombre ILIKE '%Mitú%' OR nombre ILIKE '%Mitu%';
UPDATE estaciones SET designador_oaci = 'SKUC', categoria_oaci = 5, categoria_rac = 5 WHERE nombre ILIKE '%Santiago Pérez%' OR nombre ILIKE '%Arauca%';
UPDATE estaciones SET designador_oaci = 'SKYP', categoria_oaci = 6, categoria_rac = 6 WHERE nombre ILIKE '%Alcaraván%' OR nombre ILIKE '%Alcaravan%' OR nombre ILIKE '%Yopal%';
UPDATE estaciones SET designador_oaci = 'SKBG', categoria_oaci = 7, categoria_rac = 8 WHERE nombre ILIKE '%Palonegro%' OR nombre ILIKE '%Bucaramanga%';
UPDATE estaciones SET designador_oaci = 'SKAR', categoria_oaci = 7, categoria_rac = 7 WHERE nombre ILIKE '%El Edén%' OR nombre ILIKE '%Eden%' OR nombre ILIKE '%Armenia%';
UPDATE estaciones SET designador_oaci = 'SKCG', categoria_oaci = 7, categoria_rac = 8 WHERE nombre ILIKE '%Rafael Núñez%' OR nombre ILIKE '%Cartagena%';
UPDATE estaciones SET designador_oaci = 'SKNV', categoria_oaci = 6, categoria_rac = 6 WHERE nombre ILIKE '%Benito Salas%' OR nombre ILIKE '%Neiva%';
UPDATE estaciones SET designador_oaci = 'SKPS', categoria_oaci = 5, categoria_rac = 4 WHERE nombre ILIKE '%Tres de Mayo%' OR nombre ILIKE '%Puerto Asís%' OR nombre ILIKE '%Puerto Asis%';
UPDATE estaciones SET designador_oaci = 'SKBO', categoria_oaci = 9, categoria_rac = 10 WHERE nombre ILIKE '%El Dorado%' OR nombre ILIKE '%Bogotá%' OR nombre ILIKE '%Bogota%';
UPDATE estaciones SET designador_oaci = 'SKBS', categoria_oaci = 4, categoria_rac = 3 WHERE nombre ILIKE '%Bahía Solano%' OR nombre ILIKE '%Bahia Solano%';
UPDATE estaciones SET designador_oaci = 'SKCL', categoria_oaci = 9, categoria_rac = 9 WHERE nombre ILIKE '%Bonilla Aragón%' OR nombre ILIKE '%Palmira%' OR nombre ILIKE '%Cali%';
UPDATE estaciones SET designador_oaci = 'SKCZ', categoria_oaci = 5, categoria_rac = 4 WHERE nombre ILIKE '%Las Brujas%' OR nombre ILIKE '%Corozal%';
UPDATE estaciones SET designador_oaci = 'SKMZ', categoria_oaci = 6, categoria_rac = 5 WHERE nombre ILIKE '%La Nubia%' OR nombre ILIKE '%Manizales%';
UPDATE estaciones SET designador_oaci = 'SKAGO', categoria_oaci = 6, categoria_rac = 5 WHERE nombre ILIKE '%Antonio Nariño%' OR nombre ILIKE '%Pasto%';

-- 3. Verificar resultado
SELECT
  codigo_iata,
  designador_oaci,
  nombre,
  categoria_oaci,
  categoria_rac,
  categoria_icao
FROM estaciones
ORDER BY nombre;
