# SEITrack — Sistema de Gestión Operativa SEI

PWA para la gestión integral de vehículos MRE (Máquinas para Respuesta a Emergencias)
del Servicio de Extinción de Incendios — UAEAC — Aeropuertos de Colombia.

## Stack
- **Frontend**: React 19 + Vite 6 + TypeScript 5 + Tailwind CSS v4
- **Estado**: Zustand 5 + React Query 5
- **Offline**: Dexie.js (IndexedDB) + Workbox Service Worker
- **Backend**: Supabase (PostgreSQL 16 + Auth + Storage + Realtime)
- **Deploy**: Vercel (PWA) + Supabase Cloud

## Estructura de roles
| Rol | Alcance |
|-----|---------|
| `jefe_nacional` | Todo el país — 6 regionales, 36 estaciones |
| `jefe_regional` | Su regional |
| `jefe_estacion` | Su estación |
| `bombero` | Su estación — operación diaria |
| `odma` | Inspecciones F1/F2/F3 asignadas |
| `dsna` | Solo lectura — reportes |

## Fases de inspección (Manual GSAN-4.1-05-01)
| Fase | Responsable | Frecuencia |
|------|-------------|------------|
| Cambio de turno | Bombero Maquinista | Cada turno |
| F0 | Bombero Maquinista | Diaria |
| F1 | ODMA | Según programa |
| F2 | ODMA | Según programa |
| F3 | ODMA | Según programa |

## Arranque rápido

```bash
# 1. Clonar y dependencias
git clone https://github.com/tu-org/seitrack
cd seitrack
npm install

# 2. Variables de entorno
cp .env.local.example .env.local
# Editar con tus credenciales de Supabase

# 3. Migraciones de base de datos
npx supabase db push

# 4. Desarrollo
npm run dev
```

## Migraciones SQL
```
supabase/migrations/
  0001_initial_schema.sql   ← tablas, enums, triggers
  0002_rls_policies.sql     ← Row Level Security por rol
  0003_seed_regionales.sql  ← 6 regionales + estaciones iniciales
```
