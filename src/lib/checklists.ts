import { FaseInspeccion, ProgramaMTO } from '@/core/enums'

export interface ChecklistItem {
  id: string          // estable — se usa como clave en la BD
  sistema: string
  descripcion: string
  critico: boolean    // si falla → bloquea liberación al servicio
}

export interface ChecklistSistema {
  sistema: string
  items: ChecklistItem[]
}

// ─── CHECKLIST CAMBIO DE TURNO / F0 (común a todos los programas) ───────────
// Basado en capítulo XI del manual GSAN-4.1-05-01

const CHECKLIST_F0_COMUN: ChecklistSistema[] = [
  {
    sistema: 'Motor principal',
    items: [
      { id: 'mot-001', sistema: 'Motor principal', descripcion: 'Nivel de aceite motor — dentro del rango', critico: true },
      { id: 'mot-002', sistema: 'Motor principal', descripcion: 'Nivel de refrigerante del radiador', critico: true },
      { id: 'mot-003', sistema: 'Motor principal', descripcion: 'Sin fugas visibles de aceite o refrigerante', critico: true },
      { id: 'mot-004', sistema: 'Motor principal', descripcion: 'Correas de transmisión sin desgaste ni fisuras', critico: false },
      { id: 'mot-005', sistema: 'Motor principal', descripcion: 'Mangueras sin deterioro, sin fugas', critico: false },
      { id: 'mot-006', sistema: 'Motor principal', descripcion: 'Arranque correcto — sin humo anormal', critico: true },
    ],
  },
  {
    sistema: 'Sistema de extinción',
    items: [
      { id: 'ext-001', sistema: 'Sistema de extinción', descripcion: 'Nivel de agente extintor (espuma / AFFF)', critico: true },
      { id: 'ext-002', sistema: 'Sistema de extinción', descripcion: 'Nivel de agua en tanque principal', critico: true },
      { id: 'ext-003', sistema: 'Sistema de extinción', descripcion: 'Presión del sistema de espuma — dentro del rango', critico: true },
      { id: 'ext-004', sistema: 'Sistema de extinción', descripcion: 'Boquillas y lanzas sin obstrucciones', critico: true },
      { id: 'ext-005', sistema: 'Sistema de extinción', descripcion: 'Mangueras sin deterioro visible', critico: false },
      { id: 'ext-006', sistema: 'Sistema de extinción', descripcion: 'Válvulas de descarga operativas', critico: true },
    ],
  },
  {
    sistema: 'Sistema eléctrico',
    items: [
      { id: 'ele-001', sistema: 'Sistema eléctrico', descripcion: 'Batería — nivel de electrolito y terminales limpios', critico: false },
      { id: 'ele-002', sistema: 'Sistema eléctrico', descripcion: 'Luces de emergencia (estroboscópicas) operativas', critico: true },
      { id: 'ele-003', sistema: 'Sistema eléctrico', descripcion: 'Sirena y altavoz funcionales', critico: true },
      { id: 'ele-004', sistema: 'Sistema eléctrico', descripcion: 'Luces frontales, traseras y de trabajo operativas', critico: false },
      { id: 'ele-005', sistema: 'Sistema eléctrico', descripcion: 'Panel de control interior sin alarmas activas', critico: true },
    ],
  },
  {
    sistema: 'Frenos y dirección',
    items: [
      { id: 'fre-001', sistema: 'Frenos y dirección', descripcion: 'Nivel de líquido de frenos', critico: true },
      { id: 'fre-002', sistema: 'Frenos y dirección', descripcion: 'Freno de mano / estacionamiento operativo', critico: true },
      { id: 'fre-003', sistema: 'Frenos y dirección', descripcion: 'Sin vibraciones ni ruidos al frenar', critico: true },
      { id: 'fre-004', sistema: 'Frenos y dirección', descripcion: 'Dirección sin juego excesivo', critico: true },
      { id: 'fre-005', sistema: 'Frenos y dirección', descripcion: 'Nivel de fluido de dirección hidráulica', critico: false },
    ],
  },
  {
    sistema: 'Neumáticos y aros',
    items: [
      { id: 'neu-001', sistema: 'Neumáticos y aros', descripcion: 'Presión correcta en todos los neumáticos (incl. repuesto)', critico: true },
      { id: 'neu-002', sistema: 'Neumáticos y aros', descripcion: 'Sin cortes, burbujas ni deformaciones visibles', critico: true },
      { id: 'neu-003', sistema: 'Neumáticos y aros', descripcion: 'Tuercas de rueda ajustadas y completas', critico: true },
    ],
  },
  {
    sistema: 'Transmisión e hidráulica',
    items: [
      { id: 'tra-001', sistema: 'Transmisión e hidráulica', descripcion: 'Nivel de aceite de transmisión', critico: false },
      { id: 'tra-002', sistema: 'Transmisión e hidráulica', descripcion: 'Nivel de aceite hidráulico', critico: false },
      { id: 'tra-003', sistema: 'Transmisión e hidráulica', descripcion: 'Sin fugas en cilindros y mangueras hidráulicas', critico: true },
    ],
  },
  {
    sistema: 'Cabina y controles',
    items: [
      { id: 'cab-001', sistema: 'Cabina y controles', descripcion: 'Cinturones de seguridad en buen estado', critico: false },
      { id: 'cab-002', sistema: 'Cabina y controles', descripcion: 'Extinguidor de cabina con carga vigente', critico: true },
      { id: 'cab-003', sistema: 'Cabina y controles', descripcion: 'Documentación a bordo vigente (tarjeta, SOAT)', critico: false },
      { id: 'cab-004', sistema: 'Cabina y controles', descripcion: 'Combustible — nivel mínimo operacional', critico: true },
    ],
  },
  {
    sistema: 'Herramientas y equipos',
    items: [
      { id: 'her-001', sistema: 'Herramientas y equipos', descripcion: 'EPP completo y en buen estado a bordo', critico: false },
      { id: 'her-002', sistema: 'Herramientas y equipos', descripcion: 'Herramientas de excarcelación completas', critico: false },
      { id: 'her-003', sistema: 'Herramientas y equipos', descripcion: 'Botiquín primeros auxilios completo y vigente', critico: false },
    ],
  },
]

// ─── ITEMS ADICIONALES POR MARCA / PROGRAMA ─────────────────────────────────

const EXTRAS_SERIE_T: ChecklistSistema[] = [
  {
    sistema: 'Sistema Oshkosh TAK-4',
    items: [
      { id: 'tak-001', sistema: 'Sistema Oshkosh TAK-4', descripcion: 'Suspensión independiente — sin golpes ni holguras', critico: false },
      { id: 'tak-002', sistema: 'Sistema Oshkosh TAK-4', descripcion: 'Nivel aceite diferenciales delantero y trasero', critico: false },
    ],
  },
]

const EXTRAS_STRIKER: ChecklistSistema[] = [
  {
    sistema: 'Sistema Striker',
    items: [
      { id: 'str-001', sistema: 'Sistema Striker', descripcion: 'Bomba centrífuga principal — arranque sin cavitación', critico: true },
      { id: 'str-002', sistema: 'Sistema Striker', descripcion: 'Monitor roof turret — rotación completa sin traba', critico: true },
      { id: 'str-003', sistema: 'Sistema Striker', descripcion: 'Nivel aceite caja de toma de fuerza (PTO)', critico: false },
    ],
  },
]

const EXTRAS_PANTHER: ChecklistSistema[] = [
  {
    sistema: 'Sistema Rosenbauer',
    items: [
      { id: 'pan-001', sistema: 'Sistema Rosenbauer', descripcion: 'Sistema CAFS (espuma comprimida) — presión nominal', critico: true },
      { id: 'pan-002', sistema: 'Sistema Rosenbauer', descripcion: 'Monitor delantero — operación hidráulica completa', critico: true },
      { id: 'pan-003', sistema: 'Sistema Rosenbauer', descripcion: 'Nivel aceite motor Scania / MAN', critico: true },
    ],
  },
]

// ─── FASES F1/F2/F3 — esqueleto (se ampliarán desde el manual) ───────────────

const CHECKLIST_F1: ChecklistSistema[] = [
  {
    sistema: 'Inspección periódica F1',
    items: [
      { id: 'f1-001', sistema: 'Inspección periódica F1', descripcion: 'Inspección visual completa chasis y carrocería', critico: false },
      { id: 'f1-002', sistema: 'Inspección periódica F1', descripcion: 'Cambio de aceite motor según intervalos del fabricante', critico: false },
      { id: 'f1-003', sistema: 'Inspección periódica F1', descripcion: 'Revisión y ajuste de frenos (tambores/discos)', critico: true },
      { id: 'f1-004', sistema: 'Inspección periódica F1', descripcion: 'Calibración de neumáticos con manómetro certificado', critico: false },
      { id: 'f1-005', sistema: 'Inspección periódica F1', descripcion: 'Prueba funcional completa sistema extinción', critico: true },
    ],
  },
]

// ─── FUNCIÓN PÚBLICA ─────────────────────────────────────────────────────────

export function getChecklist(
  fase: FaseInspeccion,
  programa: ProgramaMTO
): ChecklistSistema[] {
  if (fase === FaseInspeccion.CambioDeTurno || fase === FaseInspeccion.F0) {
    const base = [...CHECKLIST_F0_COMUN]
    if (programa === ProgramaMTO.SerieT)    return [...base, ...EXTRAS_SERIE_T]
    if (programa === ProgramaMTO.Striker1500) return [...base, ...EXTRAS_STRIKER]
    if (programa === ProgramaMTO.Panther4x4) return [...base, ...EXTRAS_PANTHER]
    return base
  }
  if (fase === FaseInspeccion.F1) return CHECKLIST_F1
  // F2 y F3 se definen igual pero con más profundidad; misma estructura
  return CHECKLIST_F1
}

export function getTotalItems(sistemas: ChecklistSistema[]): number {
  return sistemas.reduce((acc, s) => acc + s.items.length, 0)
}

export function getCriticosConFalla(
  sistemas: ChecklistSistema[],
  resultados: Record<string, string>
): string[] {
  const criticos: string[] = []
  for (const s of sistemas) {
    for (const item of s.items) {
      if (item.critico && resultados[item.id] === 'falla') {
        criticos.push(item.descripcion)
      }
    }
  }
  return criticos
}
