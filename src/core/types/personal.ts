export interface PersonalCertificacion {
  id:                 string
  nombre_completo:    string
  email:              string
  estacion_nombre:    string
  codigo_iata:        string
  regional_nombre:    string
  categoria:          string
  numero_certificado: string
  programa_mto:       string
  fecha_emision:      string
  fecha_vencimiento:  string
  dias_restantes:     number
  activo:             boolean
}
