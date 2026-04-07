import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Usuario } from '@/core/types'
import type { Rol } from '@/core/enums'

interface AuthState {
  usuario:  Usuario | null
  token:    string | null
  isReady:  boolean
  setUsuario: (u: Usuario | null) => void
  setToken:   (t: string | null) => void
  setReady:   (r: boolean) => void
  clear:      () => void

  // helpers RBAC
  hasRole:     (...roles: Rol[]) => boolean
  canEdit:     () => boolean
  isNacional:  () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      usuario:  null,
      token:    null,
      isReady:  false,

      setUsuario: (usuario) => set({ usuario }),
      setToken:   (token)   => set({ token }),
      setReady:   (isReady) => set({ isReady }),
      clear:      ()        => set({ usuario: null, token: null }),

      hasRole: (...roles) => {
        const u = get().usuario
        return !!u && roles.includes(u.rol as Rol)
      },
      canEdit: () => {
        const u = get().usuario
        if (!u) return false
        return ['jefe_nacional','jefe_regional','jefe_estacion','bombero'].includes(u.rol)
      },
      isNacional: () => get().usuario?.rol === 'jefe_nacional',
    }),
    { name: 'seitrack-auth-store', partialize: (s) => ({ usuario: s.usuario }) }
  )
)
