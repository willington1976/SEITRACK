import { cn } from '@/lib/utils'

interface Props {
  children: React.ReactNode
  className?: string
  padding?: boolean
}

export function Card({ children, className, padding = true }: Props) {
  return (
    <div className={cn(
      'glass-panel rounded-xl shadow-2xl shadow-black/50 overflow-hidden relative',
      padding && 'p-5',
      className
    )}>
      {/* Reflejo superior sutil */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}

export function CardHeader({ title, subtitle, action }: {
  title: string; subtitle?: string; action?: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between mb-4 relative z-10">
      <div>
        <h2 className="text-sm font-semibold text-slate-100 tracking-tight uppercase">{title}</h2>
        {subtitle && <p className="text-[11px] text-slate-400 font-medium mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
