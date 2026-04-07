import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import { useAuthStore } from '@/stores/auth.store'
import { Card, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { formatDate } from '@/lib/utils'
import { generarPDFCertificaciones } from '@/lib/pdf'
import type { CertPersonal } from '@/lib/pdf'
import { Rol } from '@/core/enums'

interface CertRow {
  id: string; nombre_completo: string; email: string
  estacion_nombre: string; codigo_iata: string; regional_nombre: string
  categoria: string; numero_certificado: string; programa_mto: string
  fecha_emision: string; fecha_vencimiento: string; dias_restantes: number
  activo: boolean
}

function useCertificaciones() {
  const usuario    = useAuthStore(s => s.usuario)
  const esNacional = usuario?.rol === Rol.JefeNacional || usuario?.rol === Rol.DSNA
  return useQuery({
    queryKey: ['certificaciones', usuario?.estacion_id],
    queryFn: async () => {
      let q = supabase
        .from('certificaciones_por_vencer')
        .select('*')
      if (!esNacional) {
        q = q.eq('estacion_nombre',
          (usuario?.estacion as { nombre?: string } | undefined)?.nombre ?? '')
      }
      const { data, error } = await q.order('dias_restantes')
      if (error) throw error
      return (data ?? []) as CertRow[]
    },
  })
}

function useCertTodas() {
  return useQuery({
    queryKey: ['certificaciones', 'todas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('certificaciones')
        .select(`
          *,
          usuario:usuarios(nombre_completo, email,
            estacion:estaciones(nombre, codigo_iata,
              regional:regionales(nombre)))
        `)
        .order('fecha_vencimiento')
      if (error) throw error
      return data
    },
  })
}

function diasColor(dias: number) {
  if (dias <= 0)  return 'text-red-600 font-bold'
  if (dias <= 30) return 'text-red-500 font-semibold'
  if (dias <= 60) return 'text-amber-600'
  return 'text-green-600'
}

function diasBadge(dias: number): 'danger'|'warning'|'success' {
  if (dias <= 30) return 'danger'
  if (dias <= 60) return 'warning'
  return 'success'
}

export default function CertificacionesList() {
  const usuario    = useAuthStore(s => s.usuario)
  const esNacional = usuario?.rol === Rol.JefeNacional || usuario?.rol === Rol.DSNA
  const { data: porVencer, isLoading }  = useCertificaciones()
  const { data: todas }                 = useCertTodas()
  const qc = useQueryClient()

  const [mostrarForm, setMostrarForm] = useState(false)
  const [form, setForm] = useState({
    usuario_id: '', categoria: 'A', numero_certificado: '',
    programa_mto: 'PM_SERIE_T', fecha_emision: '', fecha_vencimiento: '',
    observaciones: '',
  })

  const { mutate: crearCert, isPending: creando } = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('certificaciones').insert({
        ...form, emitido_por: 'UAEAC', activo: true,
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['certificaciones'] })
      setMostrarForm(false)
      setForm({ usuario_id: '', categoria: 'A', numero_certificado: '',
        programa_mto: 'PM_SERIE_T', fecha_emision: '', fecha_vencimiento: '', observaciones: '' })
    },
  })

  function handlePDF() {
    if (!todas || !usuario) return
    // Agrupar por persona para el PDF
    const porPersona = new Map<string, CertPersonal>()
    for (const c of todas) {
      const u = c.usuario as any
      if (!u) continue
      const key = c.usuario_id
      if (!porPersona.has(key)) {
        porPersona.set(key, {
          nombre_completo: u.nombre_completo,
          email:           u.email,
          rol:             '',
          estacion:        u.estacion?.nombre ?? '',
          regional:        u.estacion?.regional?.nombre ?? '',
          certificaciones: [],
        })
      }
      porPersona.get(key)!.certificaciones.push({
        categoria:        c.categoria,
        numero:           c.numero_certificado,
        programa:         c.programa_mto,
        emision:          c.fecha_emision,
        vencimiento:      c.fecha_vencimiento,
        diasRestantes:    Math.floor((new Date(c.fecha_vencimiento).getTime() - Date.now()) / 86400000),
      })
    }
    generarPDFCertificaciones([...porPersona.values()], usuario.nombre_completo)
  }

  const vencidas  = porVencer?.filter(c => c.dias_restantes <= 0).length ?? 0
  const criticas  = porVencer?.filter(c => c.dias_restantes > 0 && c.dias_restantes <= 30).length ?? 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-sm font-semibold text-gray-900">Certificaciones TME</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Cap. VII · Manual GSAN-4.1-05-01
            {vencidas > 0 && <span className="text-red-600 ml-1">· {vencidas} vencidas</span>}
            {criticas > 0 && <span className="text-amber-600 ml-1">· {criticas} por vencer</span>}
          </p>
        </div>
        <div className="flex gap-2">
          {esNacional && (
            <button onClick={handlePDF}
              className="px-4 py-2 text-xs font-semibold bg-sei-600 text-white rounded-xl hover:bg-sei-700 transition-colors">
              Exportar PDF
            </button>
          )}
          {esNacional && (
            <button onClick={() => setMostrarForm(v => !v)}
              className="px-4 py-2 text-xs font-semibold border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50">
              + Nueva certificación
            </button>
          )}
        </div>
      </div>

      {/* Resumen alertas */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { l: 'Vencidas',       v: vencidas, c: 'text-red-600',   bg: 'bg-red-50' },
          { l: 'Por vencer 30d', v: criticas, c: 'text-amber-600', bg: 'bg-amber-50' },
          { l: 'Alertas 60d',    v: porVencer?.length ?? 0, c: 'text-gray-700', bg: 'bg-gray-50' },
        ].map(m => (
          <div key={m.l} className={`${m.bg} rounded-xl p-4`}>
            <p className={`text-2xl font-semibold ${m.c}`}>{isLoading ? '—' : m.v}</p>
            <p className="text-xs text-gray-500 mt-0.5">{m.l}</p>
          </div>
        ))}
      </div>

      {/* Formulario nueva certificación */}
      {mostrarForm && (
        <Card>
          <CardHeader title="Nueva certificación TME"/>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              { k: 'numero_certificado', l: 'N° Certificado *', type: 'text', placeholder: 'TME-2024-001' },
              { k: 'fecha_emision',      l: 'Fecha de emisión *', type: 'date', placeholder: '' },
              { k: 'fecha_vencimiento',  l: 'Fecha de vencimiento *', type: 'date', placeholder: '' },
              { k: 'observaciones',      l: 'Observaciones', type: 'text', placeholder: 'Opcional...' },
            ].map(f => (
              <div key={f.k}>
                <label className="block text-xs text-gray-500 mb-1">{f.l}</label>
                <input type={f.type} placeholder={f.placeholder}
                  value={(form as any)[f.k]}
                  onChange={e => setForm(p => ({ ...p, [f.k]: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-sei-400"/>
              </div>
            ))}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Categoría TME</label>
              <select value={form.categoria}
                onChange={e => setForm(p => ({ ...p, categoria: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-sei-400">
                {['A','B','C','D'].map(c => <option key={c} value={c}>Categoría {c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Programa MTO</label>
              <select value={form.programa_mto}
                onChange={e => setForm(p => ({ ...p, programa_mto: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-sei-400">
                <option value="PM_SERIE_T">Oshkosh Serie T</option>
                <option value="PM_S1500">Oshkosh Striker 1500</option>
                <option value="PM_P4X4">Rosenbauer Panther 4×4</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={() => setMostrarForm(false)}
              className="flex-1 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
              Cancelar
            </button>
            <button onClick={() => crearCert()} disabled={creando}
              className="flex-1 py-2 bg-sei-600 text-white rounded-xl text-sm font-semibold hover:bg-sei-700 disabled:opacity-50">
              {creando ? 'Guardando...' : 'Crear certificación'}
            </button>
          </div>
        </Card>
      )}

      {/* Lista certificaciones por vencer */}
      <Card padding={false}>
        <div className="px-5 pt-4 pb-3 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-900">
            Certificaciones próximas a vencer o vencidas
          </p>
          <p className="text-xs text-gray-400">{porVencer?.length ?? 0} alertas</p>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : !porVencer?.length ? (
          <p className="text-sm text-gray-400 text-center py-8">
            Sin certificaciones próximas a vencer
          </p>
        ) : (
          <div className="divide-y divide-gray-50">
            {porVencer.map(c => (
              <div key={c.id}
                className={`flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/60 ${
                  c.dias_restantes <= 0 ? 'bg-red-50/30' : ''
                }`}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{c.nombre_completo}</p>
                  <p className="text-xs text-gray-400">
                    {c.codigo_iata} · {c.estacion_nombre} ·{' '}
                    <span className="font-mono">{c.numero_certificado}</span>
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-gray-500">Cat. {c.categoria} · {c.programa_mto}</p>
                  <p className="text-xs text-gray-400">Vence: {formatDate(c.fecha_vencimiento)}</p>
                </div>
                <div className="shrink-0 text-center">
                  <Badge variant={diasBadge(c.dias_restantes)}>
                    {c.dias_restantes <= 0 ? 'VENCIDO' : `${c.dias_restantes}d`}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
