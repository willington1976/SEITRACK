-- ============================================================
-- SEITRACK — Migración 0004: 36 estaciones reales UAEAC
-- Fuente: RAC Colombia — Aeropuertos con SEI activo
-- ============================================================

INSERT INTO estaciones (regional_id, nombre, codigo_iata, aeropuerto, ciudad, departamento, categoria_icao, activa)
VALUES

-- ─── REGIONAL NORTE ──────────────────────────────────────────────────────────
('a1000000-0000-0000-0000-000000000001', 'Barranquilla',     'BAQ', 'Ernesto Cortissoz',                  'Soledad',          'Atlántico',        'CAT VIII', true),
('a1000000-0000-0000-0000-000000000001', 'Santa Marta',      'SMR', 'Simón Bolívar',                      'Santa Marta',      'Magdalena',        'CAT VII',  true),
('a1000000-0000-0000-0000-000000000001', 'Valledupar',       'VUP', 'Alfonso López Pumarejo',             'Valledupar',       'Cesar',            'CAT VI',   true),
('a1000000-0000-0000-0000-000000000001', 'Riohacha',         'RCH', 'Almirante Padilla',                  'Riohacha',         'La Guajira',       'CAT V',    true),
('a1000000-0000-0000-0000-000000000001', 'Montería',         'MTR', 'Los Garzones',                       'Montería',         'Córdoba',          'CAT VI',   true),
('a1000000-0000-0000-0000-000000000001', 'Corozal',          'CZU', 'Las Brujas',                         'Corozal',          'Sucre',            'CAT IV',   true),

-- ─── REGIONAL NOROCCIDENTE ───────────────────────────────────────────────────
('a1000000-0000-0000-0000-000000000002', 'Medellín',         'MDE', 'José María Córdova',                 'Rionegro',         'Antioquia',        'CAT IX',   true),
('a1000000-0000-0000-0000-000000000002', 'Medellín OlayaH',  'EOH', 'Olaya Herrera',                      'Medellín',         'Antioquia',        'CAT VII',  true),
('a1000000-0000-0000-0000-000000000002', 'Apartadó',         'APO', 'Antonio Roldán Betancur',            'Carepa',           'Antioquia',        'CAT V',    true),
('a1000000-0000-0000-0000-000000000002', 'Quibdó',           'UIB', 'El Caraño',                          'Quibdó',           'Chocó',            'CAT V',    true),
('a1000000-0000-0000-0000-000000000002', 'Bahía Solano',     'BSC', 'José Celestino Mutis',               'Bahía Solano',     'Chocó',            'CAT III',  true),
('a1000000-0000-0000-0000-000000000002', 'Turbo',            'TRB', 'Gonzalo Mejía',                      'Turbo',            'Antioquia',        'CAT III',  true),

-- ─── REGIONAL CENTRO SUR ─────────────────────────────────────────────────────
('a1000000-0000-0000-0000-000000000003', 'Bogotá',           'BOG', 'El Dorado',                          'Bogotá',           'Cundinamarca',     'CAT X',    true),
('a1000000-0000-0000-0000-000000000003', 'Cali',             'CLO', 'Alfonso Bonilla Aragón',             'Palmira',          'Valle del Cauca',  'CAT IX',   true),
('a1000000-0000-0000-0000-000000000003', 'Ibagué',           'IBE', 'Perales',                            'Ibagué',           'Tolima',           'CAT VI',   true),
('a1000000-0000-0000-0000-000000000003', 'Neiva',            'NVA', 'Benito Salas',                       'Neiva',            'Huila',            'CAT VI',   true),
('a1000000-0000-0000-0000-000000000003', 'Florencia',        'FLA', 'Gustavo Artunduaga Paredes',         'Florencia',        'Caquetá',          'CAT V',    true),
('a1000000-0000-0000-0000-000000000003', 'Popayán',          'PPN', 'Guillermo León Valencia',            'Popayán',          'Cauca',            'CAT VI',   true),

-- ─── REGIONAL ORIENTE ────────────────────────────────────────────────────────
('a1000000-0000-0000-0000-000000000004', 'Villavicencio',    'VVC', 'La Vanguardia',                      'Villavicencio',    'Meta',             'CAT VI',   true),
('a1000000-0000-0000-0000-000000000004', 'Yopal',            'EYP', 'El Alcaraván',                       'Yopal',            'Casanare',         'CAT VI',   true),
('a1000000-0000-0000-0000-000000000004', 'Arauca',           'AUC', 'Santiago Pérez Quiroz',              'Arauca',           'Arauca',           'CAT V',    true),
('a1000000-0000-0000-0000-000000000004', 'Puerto Carreño',   'PCR', 'Germán Olano',                       'Puerto Carreño',   'Vichada',          'CAT IV',   true),
('a1000000-0000-0000-0000-000000000004', 'San José Guaviare','SJE', 'Jorge E. González Santos',           'San José',         'Guaviare',         'CAT V',    true),
('a1000000-0000-0000-0000-000000000004', 'Mitú',             'MVP', 'Fabio A. León Bentley',              'Mitú',             'Vaupés',           'CAT III',  true),

-- ─── REGIONAL NORORIENTE ─────────────────────────────────────────────────────
('a1000000-0000-0000-0000-000000000005', 'Cúcuta',           'CUC', 'Camilo Daza',                        'Cúcuta',           'N. de Santander',  'CAT VII',  true),
('a1000000-0000-0000-0000-000000000005', 'Bucaramanga',      'BGA', 'Palonegro',                          'Lebrija',          'Santander',        'CAT VIII', true),
('a1000000-0000-0000-0000-000000000005', 'Barrancabermeja',  'EJA', 'Yariguíes',                          'Barrancabermeja',  'Santander',        'CAT VI',   true),
('a1000000-0000-0000-0000-000000000005', 'Ocaña',            'OCV', 'Aguas Claras',                       'Ocaña',            'N. de Santander',  'CAT IV',   true),
('a1000000-0000-0000-0000-000000000005', 'Saravena',         'RVE', 'Los Colonizadores',                  'Saravena',         'Arauca',           'CAT III',  true),

-- ─── REGIONAL OCCIDENTE ──────────────────────────────────────────────────────
('a1000000-0000-0000-0000-000000000006', 'Pereira',          'PEI', 'Matecaña',                           'Pereira',          'Risaralda',        'CAT VII',  true),
('a1000000-0000-0000-0000-000000000006', 'Manizales',        'MZL', 'La Nubia',                           'Manizales',        'Caldas',           'CAT VI',   true),
('a1000000-0000-0000-0000-000000000006', 'Armenia',          'AXM', 'El Edén',                            'Armenia',          'Quindío',          'CAT VII',  true),
('a1000000-0000-0000-0000-000000000006', 'Pasto',            'PSO', 'Antonio Nariño',                     'Chachagüí',        'Nariño',           'CAT VI',   true),
('a1000000-0000-0000-0000-000000000006', 'Tumaco',           'TCO', 'La Florida',                         'Tumaco',           'Nariño',           'CAT V',    true),
('a1000000-0000-0000-0000-000000000006', 'Buenaventura',     'BUN', 'Gerardo Tovar López',                'Buenaventura',     'Valle del Cauca',  'CAT V',    true)

ON CONFLICT (codigo_iata) DO UPDATE SET
  nombre       = EXCLUDED.nombre,
  aeropuerto   = EXCLUDED.aeropuerto,
  ciudad       = EXCLUDED.ciudad,
  departamento = EXCLUDED.departamento,
  categoria_icao = EXCLUDED.categoria_icao;

-- Verificar
DO $$
DECLARE total INT;
BEGIN
  SELECT COUNT(*) INTO total FROM estaciones;
  RAISE NOTICE '% estaciones cargadas', total;
END $$;
