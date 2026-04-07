import { Outlet } from 'react-router'

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-sei-900 via-sei-800 to-sei-600 flex flex-col items-center justify-center p-4">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur mb-4">
          {/* Logo SEI — camión de bomberos simplificado */}
          <svg viewBox="0 0 40 40" width="36" height="36" fill="none">
            <rect x="4" y="18" width="28" height="14" rx="3" fill="white" opacity="0.9"/>
            <rect x="26" y="12" width="8" height="10" rx="2" fill="white" opacity="0.7"/>
            <circle cx="11" cy="33" r="4" fill="white"/>
            <circle cx="25" cy="33" r="4" fill="white"/>
            <rect x="6" y="22" width="6" height="4" rx="1" fill="#0F6E56"/>
            <rect x="14" y="22" width="6" height="4" rx="1" fill="#0F6E56"/>
            <path d="M28 8 L34 14" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
            <path d="M32 8 L34 10" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
          </svg>
        </div>
        <h1 className="text-2xl font-semibold text-white tracking-tight">SEITrack</h1>
        <p className="text-sei-100/70 text-sm mt-1">UAEAC · Servicio de Extinción de Incendios</p>
      </div>
      <div className="w-full max-w-sm">
        <Outlet />
      </div>
    </div>
  )
}
