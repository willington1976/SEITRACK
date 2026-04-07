// ─── Generador de PDFs para DSNA — SEITrack ──────────────────────────────────
// Usa solo APIs nativas del browser: Canvas + window.print()
// Sin dependencias externas — funciona 100% offline

import { formatDate, formatDateTime } from './utils'
import type { AVCRow } from '@/services/reportes.service'

const COLORES = {
  sei:     '#0F6E56',
  seiLight:'#1D9E75',
  rojo:    '#dc2626',
  ambar:   '#d97706',
  gris:    '#6b7280',
  grisClaro: '#f3f4f6',
  borde:   '#e5e7eb',
}

// ─── Encabezado institucional ────────────────────────────────────────────────

function htmlEncabezado(titulo: string, subtitulo: string): string {
  return `
    <div style="display:flex;align-items:center;justify-content:space-between;
                border-bottom:2.5px solid ${COLORES.sei};padding-bottom:14px;margin-bottom:20px">
      <div>
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
          <div style="width:36px;height:36px;background:${COLORES.sei};border-radius:8px;
                      display:flex;align-items:center;justify-content:center">
            <span style="color:white;font-size:16px;font-weight:700">S</span>
          </div>
          <div>
            <div style="font-size:18px;font-weight:700;color:${COLORES.sei}">SEITrack</div>
            <div style="font-size:10px;color:${COLORES.gris}">UAEAC · Grupo SEI</div>
          </div>
        </div>
      </div>
      <div style="text-align:right">
        <div style="font-size:14px;font-weight:600;color:#111">${titulo}</div>
        <div style="font-size:10px;color:${COLORES.gris};margin-top:2px">${subtitulo}</div>
        <div style="font-size:9px;color:${COLORES.gris};margin-top:2px">
          Generado: ${formatDateTime(new Date())}
        </div>
      </div>
    </div>`
}

// ─── Tarjeta de KPI ──────────────────────────────────────────────────────────

function kpiCard(label: string, value: string | number, color = '#111'): string {
  return `
    <div style="flex:1;background:${COLORES.grisClaro};border-radius:8px;padding:12px 16px;min-width:100px">
      <div style="font-size:22px;font-weight:700;color:${color}">${value}</div>
      <div style="font-size:10px;color:${COLORES.gris};margin-top:2px">${label}</div>
    </div>`
}

// ─── Tabla genérica ──────────────────────────────────────────────────────────

function tabla(
  headers: string[],
  rows: string[][],
  colWidths?: string[]
): string {
  const widths = colWidths ?? headers.map(() => `${Math.floor(100 / headers.length)}%`)
  return `
    <table style="width:100%;border-collapse:collapse;font-size:10px;margin-top:12px">
      <thead>
        <tr style="background:${COLORES.sei}">
          ${headers.map((h, i) => `
            <th style="text-align:left;padding:7px 8px;color:white;font-weight:600;
                       width:${widths[i]};white-space:nowrap">${h}</th>
          `).join('')}
        </tr>
      </thead>
      <tbody>
        ${rows.map((row, ri) => `
          <tr style="background:${ri % 2 === 0 ? 'white' : COLORES.grisClaro}">
            ${row.map(cell => `
              <td style="padding:6px 8px;border-bottom:1px solid ${COLORES.borde};
                         color:#374151;vertical-align:top">${cell}</td>
            `).join('')}
          </tr>
        `).join('')}
      </tbody>
    </table>`
}

// ─── PDF: Reporte AVC ────────────────────────────────────────────────────────

export function generarPDFAVC(
  datos: AVCRow[],
  params: { desde: string; hasta: string; generadoPor: string }
): void {
  const totales = datos.reduce((acc, r) => ({
    inspecciones: acc.inspecciones + Number(r.total_inspecciones),
    aprobadas:    acc.aprobadas    + Number(r.insp_aprobadas),
    rechazadas:   acc.rechazadas   + Number(r.insp_rechazadas),
    fallas:       acc.fallas       + Number(r.total_fallas),
    fCriticas:    acc.fCriticas    + Number(r.fallas_criticas),
    ots:          acc.ots          + Number(r.ots_generadas),
  }), { inspecciones: 0, aprobadas: 0, rechazadas: 0, fallas: 0, fCriticas: 0, ots: 0 })

  const dispProm = datos.length > 0
    ? Math.round(datos.reduce((a, r) => a + Number(r.tasa_disponibilidad), 0) / datos.length)
    : 0

  const filas = datos.map(r => [
    r.regional_nombre.replace('Regional ', ''),
    r.estacion_nombre,
    `<strong>${r.vehiculo_matricula}</strong>`,
    r.vehiculo_modelo,
    String(r.total_inspecciones),
    `<span style="color:${COLORES.seiLight}">${r.insp_aprobadas}</span>`,
    r.insp_rechazadas > 0
      ? `<span style="color:${COLORES.rojo};font-weight:600">${r.insp_rechazadas}</span>`
      : '0',
    r.total_fallas > 0
      ? `<span style="color:${COLORES.ambar}">${r.total_fallas}</span>`
      : '0',
    r.fallas_criticas > 0
      ? `<span style="color:${COLORES.rojo};font-weight:700">${r.fallas_criticas}</span>`
      : '0',
    `<strong style="color:${Number(r.tasa_disponibilidad) >= 80 ? COLORES.seiLight : COLORES.rojo}">
      ${r.tasa_disponibilidad}%
    </strong>`,
  ])

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Reporte AVC — SEITrack</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11px;
               color: #111; padding: 28px 32px; }
        @media print {
          body { padding: 16px 20px; }
          @page { margin: 1cm; size: A4 landscape; }
        }
      </style>
    </head>
    <body>
      ${htmlEncabezado(
        'Reporte AVC — Análisis y Vigilancia Continua',
        `Período: ${formatDate(params.desde)} al ${formatDate(params.hasta)} · ${datos.length} vehículos`
      )}

      <!-- KPIs -->
      <div style="display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap">
        ${kpiCard('Total inspecciones', totales.inspecciones)}
        ${kpiCard('Aprobadas',   totales.aprobadas,   COLORES.seiLight)}
        ${kpiCard('Rechazadas',  totales.rechazadas,  totales.rechazadas > 0 ? COLORES.rojo : '#111')}
        ${kpiCard('Fallas',      totales.fallas,      totales.fallas > 0 ? COLORES.ambar : '#111')}
        ${kpiCard('F. críticas', totales.fCriticas,   totales.fCriticas > 0 ? COLORES.rojo : '#111')}
        ${kpiCard('OTs generadas', totales.ots)}
        ${kpiCard('Disponibilidad promedio', `${dispProm}%`,
          dispProm >= 80 ? COLORES.seiLight : COLORES.rojo)}
      </div>

      <!-- Tabla principal -->
      <div style="font-size:11px;font-weight:600;color:${COLORES.sei};margin-bottom:6px">
        Detalle por vehículo
      </div>
      ${tabla(
        ['Regional','Estación','Matrícula','Modelo','Insp.','Aprob.','Rechaz.','Fallas','F. crít.','Disponib.'],
        filas,
        ['8%','10%','8%','12%','5%','5%','6%','5%','6%','8%']
      )}

      <!-- Pie de página -->
      <div style="margin-top:24px;padding-top:12px;border-top:1px solid ${COLORES.borde};
                  display:flex;justify-content:space-between;color:${COLORES.gris};font-size:9px">
        <span>SEITrack · UAEAC · Manual GSAN-4.1-05-01</span>
        <span>Generado por: ${params.generadoPor}</span>
        <span>Confidencial — Solo distribución autorizada DSNA</span>
      </div>
    </body>
    </html>`

  abrirVentanaImpresion(html, 'ReporteAVC')
}

// ─── PDF: Historial de vehículo ───────────────────────────────────────────────

export interface HistorialVehiculo {
  matricula: string; modelo: string; anio: number; programa_mto: string
  estacion: string; estado: string; kilometraje: number; horas: number
  inspecciones: Array<{
    fecha: string; fase: string; turno: string
    resultado: string; inspector: string; liberado: boolean
  }>
  ordenes: Array<{
    numero_ot: string; tipo: string; estado: string
    descripcion: string; fecha_cierre?: string
  }>
}

export function generarPDFHistorialVehiculo(data: HistorialVehiculo, generadoPor: string): void {
  const resultadoColor = (r: string) =>
    r === 'aprobado' ? COLORES.seiLight : r === 'rechazado' ? COLORES.rojo : COLORES.ambar

  const filasInsp = data.inspecciones.map(i => [
    formatDate(i.fecha),
    i.fase.toUpperCase(),
    i.turno,
    `<span style="color:${resultadoColor(i.resultado)};font-weight:600">${i.resultado}</span>`,
    i.liberado ? '✓' : '✗',
    i.inspector,
  ])

  const filasOT = data.ordenes.map(ot => [
    `<strong>${ot.numero_ot || '—'}</strong>`,
    ot.tipo,
    ot.estado,
    ot.descripcion.slice(0, 60) + (ot.descripcion.length > 60 ? '…' : ''),
    ot.fecha_cierre ? formatDate(ot.fecha_cierre) : '—',
  ])

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Historial — ${data.matricula}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11px;
               color: #111; padding: 28px 32px; }
        @media print { body { padding: 16px; } @page { margin: 1cm; size: A4; } }
      </style>
    </head>
    <body>
      ${htmlEncabezado(
        `Historial de vehículo — ${data.matricula}`,
        `${data.modelo} · ${data.anio} · ${data.estacion}`
      )}

      <!-- Ficha técnica -->
      <div style="background:${COLORES.grisClaro};border-radius:8px;padding:14px 16px;margin-bottom:20px">
        <div style="font-size:11px;font-weight:600;color:${COLORES.sei};margin-bottom:10px">Ficha técnica</div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px">
          ${[
            ['Matrícula',    data.matricula],
            ['Modelo',       data.modelo],
            ['Año',          String(data.anio)],
            ['Programa MTO', data.programa_mto],
            ['Estación',     data.estacion],
            ['Estado actual',data.estado],
            ['Kilometraje',  `${data.kilometraje.toLocaleString('es-CO')} km`],
            ['Horas motor',  `${data.horas.toLocaleString('es-CO')} h`],
          ].map(([l, v]) => `
            <div>
              <div style="font-size:9px;color:${COLORES.gris}">${l}</div>
              <div style="font-weight:600;margin-top:2px">${v}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Inspecciones -->
      <div style="font-size:11px;font-weight:600;color:${COLORES.sei};margin-bottom:6px">
        Inspecciones (${data.inspecciones.length})
      </div>
      ${data.inspecciones.length
        ? tabla(
            ['Fecha','Fase','Turno','Resultado','Liberado','Inspector'],
            filasInsp,
            ['14%','8%','8%','13%','8%','25%']
          )
        : '<p style="color:#9ca3af;font-size:10px;margin-top:8px">Sin inspecciones registradas</p>'
      }

      <!-- Órdenes de trabajo -->
      <div style="font-size:11px;font-weight:600;color:${COLORES.sei};margin:20px 0 6px">
        Órdenes de trabajo (${data.ordenes.length})
      </div>
      ${data.ordenes.length
        ? tabla(
            ['N° OT','Tipo','Estado','Descripción','Cierre'],
            filasOT,
            ['13%','10%','10%','47%','12%']
          )
        : '<p style="color:#9ca3af;font-size:10px;margin-top:8px">Sin órdenes de trabajo</p>'
      }

      <div style="margin-top:24px;padding-top:12px;border-top:1px solid ${COLORES.borde};
                  display:flex;justify-content:space-between;color:${COLORES.gris};font-size:9px">
        <span>SEITrack · UAEAC</span>
        <span>Generado por: ${generadoPor}</span>
        <span>${formatDateTime(new Date())}</span>
      </div>
    </body>
    </html>`

  abrirVentanaImpresion(html, `Historial_${data.matricula}`)
}

// ─── PDF: Certificaciones personal ───────────────────────────────────────────

export interface CertPersonal {
  nombre_completo: string; email: string; rol: string
  estacion: string; regional: string
  certificaciones: Array<{
    categoria: string; numero: string; programa: string
    emision: string; vencimiento: string; diasRestantes: number
  }>
}

export function generarPDFCertificaciones(
  datos: CertPersonal[],
  generadoPor: string
): void {
  const filas = datos.flatMap(p =>
    p.certificaciones.map(c => [
      p.nombre_completo,
      p.estacion,
      p.regional.replace('Regional ', ''),
      `<strong>Cat. ${c.categoria}</strong>`,
      c.numero,
      c.programa,
      formatDate(c.emision),
      formatDate(c.vencimiento),
      c.diasRestantes <= 0
        ? `<span style="color:${COLORES.rojo};font-weight:700">VENCIDO</span>`
        : c.diasRestantes <= 30
        ? `<span style="color:${COLORES.rojo}">${c.diasRestantes}d</span>`
        : c.diasRestantes <= 60
        ? `<span style="color:${COLORES.ambar}">${c.diasRestantes}d</span>`
        : `<span style="color:${COLORES.seiLight}">${c.diasRestantes}d</span>`,
    ])
  )

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Certificaciones TME — SEITrack</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11px;
               color: #111; padding: 28px 32px; }
        @media print { body { padding: 16px; } @page { margin: 1cm; size: A4 landscape; } }
      </style>
    </head>
    <body>
      ${htmlEncabezado(
        'Certificaciones TME — Personal SEI',
        `Cap. VII Manual GSAN-4.1-05-01 · ${datos.length} personas · ${filas.length} certificaciones`
      )}

      <!-- KPIs -->
      <div style="display:flex;gap:10px;margin-bottom:20px">
        ${kpiCard('Personal',  datos.length)}
        ${kpiCard('Certificaciones', filas.length)}
        ${kpiCard('Vencidas',
          datos.flatMap(p => p.certificaciones).filter(c => c.diasRestantes <= 0).length,
          COLORES.rojo)}
        ${kpiCard('Por vencer (30d)',
          datos.flatMap(p => p.certificaciones).filter(c => c.diasRestantes > 0 && c.diasRestantes <= 30).length,
          COLORES.ambar)}
        ${kpiCard('Por vencer (60d)',
          datos.flatMap(p => p.certificaciones).filter(c => c.diasRestantes > 0 && c.diasRestantes <= 60).length,
          COLORES.ambar)}
      </div>

      ${tabla(
        ['Nombre','Estación','Regional','Cat.','N° Certificado','Programa','Emisión','Vencimiento','Días'],
        filas,
        ['16%','10%','8%','4%','12%','10%','9%','9%','6%']
      )}

      <div style="margin-top:24px;padding-top:12px;border-top:1px solid ${COLORES.borde};
                  display:flex;justify-content:space-between;color:${COLORES.gris};font-size:9px">
        <span>SEITrack · Cap. VII GSAN-4.1-05-01</span>
        <span>Generado por: ${generadoPor}</span>
        <span>${formatDateTime(new Date())}</span>
      </div>
    </body>
    </html>`

  abrirVentanaImpresion(html, 'Certificaciones_TME')
}

// ─── Helper: abrir ventana de impresión ──────────────────────────────────────

function abrirVentanaImpresion(html: string, nombre: string): void {
  const win = window.open('', `_${nombre}`, 'width=1100,height=750')
  if (!win) {
    alert('El navegador bloqueó la ventana emergente. Permite pop-ups para este sitio.')
    return
  }
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 600)
}
