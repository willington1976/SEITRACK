-- ============================================================
-- SEITRACK — Migración 0003: Seed datos de referencia
-- 6 Regionales + estaciones conocidas
-- ============================================================

insert into regionales (id, nombre, codigo) values
  ('a1000000-0000-0000-0000-000000000001', 'Regional Norte',        'RN'),
  ('a1000000-0000-0000-0000-000000000002', 'Regional Noroccidente', 'RNO'),
  ('a1000000-0000-0000-0000-000000000003', 'Regional Centro Sur',   'RCS'),
  ('a1000000-0000-0000-0000-000000000004', 'Regional Oriente',      'ROR'),
  ('a1000000-0000-0000-0000-000000000005', 'Regional Nororiente',   'RNR'),
  ('a1000000-0000-0000-0000-000000000006', 'Regional Occidente',    'ROC')
on conflict (id) do nothing;

-- Estaciones de muestra (se completarán con las 36 reales)
insert into estaciones (regional_id, nombre, codigo_iata, aeropuerto, ciudad, departamento, categoria_icao) values
  ('a1000000-0000-0000-0000-000000000001', 'Barranquilla',   'BAQ', 'Aeropuerto Ernesto Cortissoz',        'Barranquilla',   'Atlántico',   'CAT VIII'),
  ('a1000000-0000-0000-0000-000000000001', 'Santa Marta',    'SMR', 'Aeropuerto Simón Bolívar',            'Santa Marta',    'Magdalena',   'CAT VII'),
  ('a1000000-0000-0000-0000-000000000002', 'Medellín',       'MDE', 'Aeropuerto José María Córdova',       'Rionegro',       'Antioquia',   'CAT IX'),
  ('a1000000-0000-0000-0000-000000000003', 'Bogotá',         'BOG', 'Aeropuerto El Dorado',                'Bogotá',         'Cundinamarca','CAT X'),
  ('a1000000-0000-0000-0000-000000000003', 'Cali',           'CLO', 'Aeropuerto Alfonso Bonilla Aragón',   'Palmira',        'Valle',       'CAT IX'),
  ('a1000000-0000-0000-0000-000000000004', 'Villavicencio',  'VVC', 'Aeropuerto La Vanguardia',            'Villavicencio',  'Meta',        'CAT VI'),
  ('a1000000-0000-0000-0000-000000000005', 'Cúcuta',         'CUC', 'Aeropuerto Camilo Daza',              'Cúcuta',         'N. Santander','CAT VII'),
  ('a1000000-0000-0000-0000-000000000006', 'Pereira',        'PEI', 'Aeropuerto Matecaña',                 'Pereira',        'Risaralda',   'CAT VII')
on conflict (codigo_iata) do nothing;
