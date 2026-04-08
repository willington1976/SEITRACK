export const SISTEMAS_MRE = [
  'Motor principal',
  'Transmisión',
  'Sistema hidráulico',
  'Sistema de extinción',
  'Bomba contra incendios',
  'Tanque agua / agente extintor',
  'Sistema eléctrico',
  'Frenos',
  'Dirección',
  'Chasis y carrocería',
  'Habitáculo y controles',
  'Neumáticos y aros',
  'Sistema de luces y señales',
  'Comunicaciones',
  'Equipo de protección personal',
  'Herramientas a bordo',
]

export const CHECKLIST_F0: Record<string, string[]> = {
  'Motor principal': [
    'Nivel de aceite motor',
    'Nivel de refrigerante',
    'Fugas visibles de aceite o refrigerante',
    'Correas y mangueras en buen estado',
  ],
  'Sistema de extinción': [
    'Nivel de agente extintor (espuma/polvo)',
    'Presión del sistema',
    'Boquillas y lanzas libres de obstrucciones',
    'Mangueras sin deterioro',
  ],
  'Sistema eléctrico': [
    'Nivel de electrolito batería',
    'Terminales limpios y ajustados',
    'Luces de emergencia operativas',
    'Sirena operativa',
  ],
  'Frenos': [
    'Nivel de líquido de frenos',
    'Freno de mano operativo',
    'Sin vibraciones al frenar',
  ],
  'Neumáticos y aros': [
    'Presión correcta en todos los neumáticos',
    'Sin cortes ni deformaciones visibles',
    'Tuercas de rueda ajustadas',
  ],
}

export const TURNOS = ['dia', 'tarde', 'noche'] as const
export const TURNO_LABELS: Record<string, string> = {
  dia: 'Mañana (06:00–14:00)',
  tarde: 'Tarde (14:00–22:00)',
  noche: 'Noche (22:00–06:00)',
}

export const QUERY_KEYS = {
  vehiculos:     (estacionId: string) => ['vehiculos', estacionId],
  vehiculo:      (id: string) => ['vehiculo', id],
  inspecciones:  (vehiculoId: string) => ['inspecciones', vehiculoId],
  ordenes:       (vehiculoId: string) => ['ordenes', vehiculoId],
  libro:         (vehiculoId: string) => ['libro', vehiculoId],
  estaciones:    (regionalId?: string) => ['estaciones', regionalId],
  pendingSync:   () => ['sync', 'pending'],
} as const
