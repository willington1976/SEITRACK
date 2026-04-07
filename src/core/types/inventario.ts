export interface RepuestoInventario {
  id:              string
  numero_parte:    string
  descripcion:     string
  tipo:            string
  cantidad_stock:  number
  stock_minimo:    number
  unidad:          string
  proveedor:       string | null
  estado_stock:    'agotado' | 'bajo' | 'ok' | string
  consumo_30d:     number
}

export type TipoMovimiento = 'entrada' | 'salida' | 'ajuste'

export interface MovimientoInventario {
  id:               string
  repuesto_id:      string
  usuario_id:       string
  tipo:             TipoMovimiento
  cantidad:         number
  cantidad_antes:   number
  cantidad_despues: number
  motivo:           string
  created_at:       string
}
