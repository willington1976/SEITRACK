import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router'
import App from './App'
import { initSeedData } from './db/dexie'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,       // 5 min
      gcTime:    1000 * 60 * 60 * 24,  // 24h en cache
      retry: (failureCount, error: unknown) => {
        // No reintentar en errores de auth
        if (error && typeof error === 'object' && 'status' in error) {
          const status = (error as { status: number }).status
          if (status === 401 || status === 403) return false
        }
        return failureCount < 2
      },
      networkMode: 'offlineFirst',
    },
    mutations: {
      networkMode: 'offlineFirst',
    }
  }
})

// Inicializar datos de referencia en IndexedDB
initSeedData().catch(console.error)

// Escuchar eventos de conectividad para flush de cola
window.addEventListener('online', () => {
  import('./db/sync-queue').then(({ flushQueue }) => flushQueue())
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
)
