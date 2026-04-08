import { useEffect, Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router'
import { useAuthStore } from '@/stores/auth.store'
import { useSyncStore } from '@/stores/sync.store'
import { authService } from '@/services/auth.service'
import { flushQueue, getPendingCount } from '@/db/sync-queue'
import { Rol } from '@/core/enums'
import AppLayout from '@/layouts/AppLayout'
import AuthLayout from '@/layouts/AuthLayout'
import { Spinner } from '@/components/ui/Spinner'

const Login               = lazy(() => import('@/pages/auth/Login'))
const Register            = lazy(() => import('@/pages/auth/Register'))
const DashboardNacional   = lazy(() => import('@/pages/dashboard/DashboardNacional'))
const DashboardRegional   = lazy(() => import('@/pages/dashboard/DashboardRegional'))
const DashboardEstacion   = lazy(() => import('@/pages/dashboard/DashboardEstacion'))
const VehiculosList       = lazy(() => import('@/pages/vehiculos/VehiculosList'))
const VehiculoDetail      = lazy(() => import('@/pages/vehiculos/VehiculoDetail'))
const VehiculoForm        = lazy(() => import('@/pages/vehiculos/VehiculoForm'))
const InspeccionList      = lazy(() => import('@/pages/inspecciones/InspeccionList'))
const InspeccionForm      = lazy(() => import('@/pages/inspecciones/InspeccionForm'))
const OrdenesTrabajoList  = lazy(() => import('@/pages/mantenimiento/OrdenesTrabajoList'))
const OrdenTrabajoForm    = lazy(() => import('@/pages/mantenimiento/OrdenTrabajoForm'))
const LibroOperacion      = lazy(() => import('@/pages/libro-operacion/LibroOperacion'))
const ReportesAVC         = lazy(() => import('@/pages/reportes/ReportesAVC'))
const DrilldownRegional   = lazy(() => import('@/pages/dashboard/DrilldownRegional'))
const DrilldownEstacion   = lazy(() => import('@/pages/dashboard/DrilldownEstacion'))
const AdminUsuarios       = lazy(() => import('@/pages/admin/AdminUsuarios'))
const AdminChecklists     = lazy(() => import('@/pages/admin/AdminChecklists'))
const RepuestosList       = lazy(() => import('@/pages/repuestos/RepuestosList'))
const CertificacionesList = lazy(() => import('@/pages/personal/CertificacionesList'))

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { usuario, isReady } = useAuthStore()
  if (!isReady) return <FullScreenSpinner />
  if (!usuario)  return <Navigate to="/login" replace />
  return <>{children}</>
}

function RequireGuest({ children }: { children: React.ReactNode }) {
  const { usuario, isReady } = useAuthStore()
  if (!isReady) return <FullScreenSpinner />
  if (usuario)   return <Navigate to="/" replace />
  return <>{children}</>
}

function RequireRol({ roles, children }: { roles: Rol[]; children: React.ReactNode }) {
  const { usuario } = useAuthStore()
  if (!usuario || !roles.includes(usuario.rol as Rol)) return <Navigate to="/" replace />
  return <>{children}</>
}

function DashboardRouter() {
  const { usuario } = useAuthStore()
  if (!usuario) return <Navigate to="/login" replace />
  switch (usuario.rol as Rol) {
    case Rol.JefeNacional: return <DashboardNacional />
    case Rol.JefeRegional: return <DashboardRegional />
    default:               return <DashboardEstacion />
  }
}

function FullScreenSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Spinner size="lg" />
    </div>
  )
}

export default function App() {
  const { setUsuario, setToken, setReady } = useAuthStore()
  const { setOnline, setPendingCount, setSyncing, setLastSync } = useSyncStore()

  useEffect(() => {
    authService.getSession().then(({ data }) => {
      if (data.session) {
        setToken(data.session.access_token)
        import('@/services/supabase').then(({ supabase }) => {
          supabase
            .from('usuarios')
            .select('*, estacion:estaciones(nombre, codigo_iata, aeropuerto, regional_id)')
            .eq('id', data.session!.user.id)
            .single()
            .then(({ data: u }) => {
              if (u) setUsuario(u)
              setReady(true)
            })
        })
      } else {
        setReady(true)
      }
    })
    const { data: { subscription } } = authService.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) { setUsuario(null); setToken(null) }
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const online  = () => { setOnline(true); triggerSync() }
    const offline = () => setOnline(false)
    window.addEventListener('online',  online)
    window.addEventListener('offline', offline)
    return () => { window.removeEventListener('online', online); window.removeEventListener('offline', offline) }
  }, [])

  useEffect(() => {
    const tick = async () => setPendingCount(await getPendingCount())
    tick()
    const id = setInterval(tick, 30_000)
    return () => clearInterval(id)
  }, [])

  async function triggerSync() {
    setSyncing(true)
    await flushQueue()
    setPendingCount(await getPendingCount())
    setLastSync(new Date())
    setSyncing(false)
  }

  return (
    <Suspense fallback={<FullScreenSpinner />}>
      <Routes>
        {/* Auth — accesibles sin sesión */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={
            <RequireGuest><Login /></RequireGuest>
          } />
          <Route path="/registro" element={
            <RequireGuest><Register /></RequireGuest>
          } />
        </Route>

        {/* App — requiere sesión */}
        <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
          <Route index element={<DashboardRouter />} />

          {/* Drill-down nacional → regional → estación */}
          <Route path="regional/:regionalId" element={<DrilldownRegional />} />
          <Route path="estacion/:estacionId" element={<DrilldownEstacion />} />


          <Route path="vehiculos">
            <Route index element={<VehiculosList />} />
            <Route path="nuevo" element={<VehiculoForm />} />
            <Route path=":vehiculoId" element={<VehiculoDetail />} />
          </Route>

          <Route path="vehiculos/:vehiculoId/inspecciones">
            <Route index element={<InspeccionList />} />
            <Route path="nueva" element={<InspeccionForm />} />
          </Route>

          <Route path="vehiculos/:vehiculoId/libro" element={<LibroOperacion />} />

          <Route path="mantenimiento">
            <Route index element={<OrdenesTrabajoList />} />
            <Route path="nueva" element={<OrdenTrabajoForm />} />
            <Route path=":otId" element={<OrdenTrabajoForm />} />
          </Route>

          <Route path="repuestos" element={<RepuestosList />} />

          <Route path="personal/certificaciones" element={<CertificacionesList />} />

          <Route path="reportes" element={
            <RequireRol roles={[Rol.JefeNacional, Rol.JefeRegional, Rol.DSNA]}>
              <ReportesAVC />
            </RequireRol>
          } />

          <Route path="admin/usuarios" element={
            <RequireRol roles={[Rol.JefeNacional]}>
              <AdminUsuarios />
            </RequireRol>
          } />

          <Route path="admin/checklists" element={
            <RequireRol roles={[Rol.JefeNacional]}>
              <AdminChecklists />
            </RequireRol>
          } />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
