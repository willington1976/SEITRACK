export interface Regional {
  id: string
  nombre: string
  codigo: string
  created_at: string
}

export interface Estacion {
  id: string
  regional_id: string
  nombre: string
  codigo_iata: string
  aeropuerto: string
  ciudad: string
  departamento: string
  categoria_icao: string   // CAT I, II, III, IV, V, VI, VII, VIII, IX, X
  activa: boolean
  created_at: string
  regional?: Regional
}

import type { Rol } from '../enums/roles'

export interface Usuario {
  id: string
  estacion_id: string
  nombre_completo: string
  email: string
  telefono?: string
  rol: Rol
  numero_certificado?: string
  certificado_vigencia?: string
  activo: boolean
  created_at: string
  estacion?: Estacion
}

export interface CrearUsuarioInput {
  nombre_completo:       string
  email:                 string
  rol:                   string
  estacion_id:           string
  telefono?:             string
  numero_certificado?:   string
  certificado_vigencia?: string
  enviar_email:          boolean
}

export interface CrearUsuarioResult {
  ok:      boolean
  usuario?: {
    id:             string
    email:          string
    nombre_completo:string
    rol:            string
  }
  password_temporal?: string
  nota?:             string
  error?:            string
  detalle?:          string
}
