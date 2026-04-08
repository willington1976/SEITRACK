import { Outlet } from 'react-router'

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Elementos Aero-Decorativos */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full" />
      
      {/* Patrón de Rejilla técnica */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

      <div className="w-full max-w-md relative z-10 flex flex-col items-center">
        <div className="mb-12 text-center group">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-[2rem] bg-slate-900 border border-white/5 mb-6 shadow-2xl relative transition-all duration-500 group-hover:scale-105 group-hover:border-blue-500/30">
            <div className="absolute inset-0 bg-blue-500/5 blur-xl group-hover:bg-blue-500/10 transition-all" />
            
            {/* Logo Aero-SEI */}
            <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-blue-500 relative z-10">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
          </div>
          
          <h1 className="text-4xl font-bold text-white tracking-widest uppercase mb-1 font-mono">SEITrack</h1>
          <div className="flex items-center justify-center gap-3">
            <div className="h-[1px] w-8 bg-blue-500/30" />
            <p className="text-[10px] text-slate-500 font-mono tracking-[0.3em] uppercase">Mission Control · v0.4</p>
            <div className="h-[1px] w-8 bg-blue-500/30" />
          </div>
        </div>

        <div className="w-full">
          <Outlet />
        </div>

        {/* Footer Técnico */}
        <div className="mt-12 text-center">
          <p className="text-[9px] text-slate-600 font-mono tracking-widest uppercase opacity-50">
            UAEAC · SERVICIO DE EXTINCIÓN DE INCENDIOS · GSAN-4.1-05-01
          </p>
        </div>
      </div>
    </div>
  )
}
