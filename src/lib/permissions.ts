import { Rol } from '@/core/enums'

// Mapa completo de permisos por recurso y acción
const PERMISOS: Record<string, Rol[]> = {
  // Vehículos
  'vehiculos:read':        [Rol.JefeNacional, Rol.JefeRegional, Rol.JefeEstacion, Rol.Bombero, Rol.DSNA],
  'vehiculos:write':       [Rol.JefeNacional, Rol.JefeRegional, Rol.JefeEstacion],
  'vehiculos:delete':      [Rol.JefeNacional],

  // Inspecciones
  'inspecciones:read':     [Rol.JefeNacional, Rol.JefeRegional, Rol.JefeEstacion, Rol.Bombero, Rol.DSNA],
  'inspecciones:create':   [Rol.Bombero, Rol.JefeEstacion],      // quien opera la MRE
  'inspecciones:firmar':   [Rol.JefeEstacion, Rol.JefeRegional],
  'inspecciones:f1f2f3':   [Rol.ODMA],                           // ODMA ejecuta F1/F2/F3

  // OTs
  'ot:read':               [Rol.JefeNacional, Rol.JefeRegional, Rol.JefeEstacion, Rol.Bombero, Rol.DSNA, Rol.ODMA],
  'ot:create':             [Rol.JefeEstacion, Rol.JefeRegional, Rol.JefeNacional, Rol.ODMA],
  'ot:close':              [Rol.JefeEstacion, Rol.JefeRegional, Rol.ODMA],

  // Libro de operación
  'libro:read':            [Rol.JefeNacional, Rol.JefeRegional, Rol.JefeEstacion, Rol.Bombero, Rol.DSNA],
  'libro:write':           [Rol.Bombero, Rol.JefeEstacion],

  // Reportes / AVC
  'reportes:read':         [Rol.JefeNacional, Rol.JefeRegional, Rol.DSNA],
  'reportes:export':       [Rol.JefeNacional, Rol.DSNA],

  // Administración
  'admin:usuarios':        [Rol.JefeNacional],
  'admin:estaciones':      [Rol.JefeNacional, Rol.JefeRegional],
  'admin:regionales':      [Rol.JefeNacional],
}

export function can(rol: Rol, permiso: string): boolean {
  return PERMISOS[permiso]?.includes(rol) ?? false
}

export function usePermission(rol: Rol | undefined) {
  return {
    can: (permiso: string) => rol ? can(rol, permiso) : false,
  }
}
