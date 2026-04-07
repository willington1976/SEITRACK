export enum Rol {
  JefeNacional   = 'jefe_nacional',
  JefeRegional   = 'jefe_regional',
  JefeEstacion   = 'jefe_estacion',
  Bombero        = 'bombero',
  ODMA           = 'odma',
  DSNA           = 'dsna',
}

export enum FaseInspeccion {
  CambioDeTurno  = 'cambio_turno',
  F0             = 'f0',
  F1             = 'f1',
  F2             = 'f2',
  F3             = 'f3',
}

export enum EstadoVehiculo {
  Operativo      = 'operativo',
  EnMantenimiento= 'en_mantenimiento',
  FueraDeServicio= 'fuera_de_servicio',
  Inspeccion     = 'en_inspeccion',
}

export enum EstadoOT {
  Abierta        = 'abierta',
  EnProceso      = 'en_proceso',
  Cerrada        = 'cerrada',
  Cancelada      = 'cancelada',
}

export enum TipoFalla {
  Cronica        = 'cronica',
  Esporadica     = 'esporadica',
  Degradante     = 'degradante',
  Incipiente     = 'incipiente',
  Desconocida    = 'desconocida',
}

export enum Criticidad {
  Alta           = 'alta',
  Media          = 'media',
  Baja           = 'baja',
}

export enum MarcaVehiculo {
  OshkoshSerieT  = 'oshkosh_serie_t',
  OshkoshStriker = 'oshkosh_striker_1500',
  Rosenbauer     = 'rosenbauer_panther_4x4',
}

export enum ProgramaMTO {
  SerieT         = 'PM_SERIE_T',
  Striker1500    = 'PM_S1500',
  Panther4x4     = 'PM_P4X4',
}

export enum ResultadoItem {
  OK             = 'ok',
  Observacion    = 'observacion',
  NoAplica       = 'no_aplica',
  Falla          = 'falla',
}
