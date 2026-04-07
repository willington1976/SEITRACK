# SEITrack — Sistema de Gestión Operativa SEI

PWA para la gestión integral de vehículos MRE del SEI — UAEAC — Aeropuertos de Colombia.
Manual de referencia: GSAN-4.1-05-01

---

## Stack técnico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19 + Vite 6 + TypeScript 5 |
| Estilos | Tailwind CSS v4 |
| Estado | Zustand 5 + React Query 5 |
| Offline | Dexie.js (IndexedDB) + Workbox |
| Backend | Supabase (PostgreSQL 16 + Auth + Storage + Realtime) |
| Push | Web Push API + Supabase Edge Functions |
| Deploy | Vercel (PWA) + Supabase Cloud |

---

## Arranque rápido

```bash
# 1. Instalar dependencias
npm install

# 2. Variables de entorno
cp .env.local.example .env.local
# → Editar con credenciales de Supabase y clave VAPID

# 3. Inicializar Supabase local (opcional)
npx supabase start

# 4. Ejecutar migraciones
npx supabase db push

# 5. Desarrollo
npm run dev
```

---

## Migraciones SQL (orden de ejecución)

```
supabase/migrations/
  0001_initial_schema.sql      ← tablas, enums, triggers
  0002_rls_policies.sql        ← Row Level Security por rol
  0003_seed_regionales.sql     ← 6 regionales
  0004_estaciones_reales.sql   ← 36 estaciones reales UAEAC
  0005_funciones_dashboard.sql ← RPCs: dashboard_nacional(), reporte_avc(), etc.
  0006_notificaciones_push.sql ← push_subscriptions + triggers de notificación
```

---

## Roles y permisos

| Rol | Alcance | Puede hacer |
|-----|---------|-------------|
| `jefe_nacional` | Nacional | Todo + admin usuarios |
| `jefe_regional` | Su regional | Ver todas sus estaciones, reportes AVC |
| `jefe_estacion` | Su estación | Firmar inspecciones, crear OTs, ver reportes |
| `bombero` | Su estación | Crear inspecciones F0, libro de operación |
| `odma` | Asignaciones | Inspecciones F1/F2/F3, cerrar OTs |
| `dsna` | Nacional | Solo lectura + exportar reportes |

---

## Fases de inspección (Cap. XI)

| Fase | Quien | Frecuencia |
|------|-------|-----------|
| Cambio de turno | Bombero Maquinista | Cada turno |
| F0 | Bombero Maquinista | Diaria |
| F1 | ODMA | Según programa fabricante |
| F2 | ODMA | Según programa fabricante |
| F3 | ODMA | Según programa fabricante |

---

## Funciones Supabase Edge

```bash
# Deploy notificaciones push (corre cada 5 min)
supabase functions deploy notify-maintenance --schedule "*/5 * * * *"
```

---

## Generar claves VAPID

```bash
npx web-push generate-vapid-keys
# Copiar en .env.local y en Supabase → Settings → Edge Functions → Secrets
```

---

## 36 estaciones reales cargadas

| Regional | Estaciones |
|----------|-----------|
| Norte | BAQ, SMR, VUP, RCH, MTR, CZU |
| Noroccidente | MDE, EOH, APO, UIB, BSC, TRB |
| Centro Sur | BOG, CLO, IBE, NVA, FLA, PPN |
| Oriente | VVC, EYP, AUC, PCR, SJE, MVP |
| Nororiente | CUC, BGA, EJA, OCV, RVE |
| Occidente | PEI, MZL, AXM, PSO, TCO, BUN |

---

SEITrack v0.3.0 · Fase 3 completa


---

## Edge Function: crear-usuario

### Deploy

```bash
supabase functions deploy crear-usuario
```

### Secrets requeridos en Supabase Dashboard

Ve a **Settings → Edge Functions → Manage secrets** y agrega:

| Secret | Valor |
|--------|-------|
| `SUPABASE_SERVICE_ROLE_KEY` | Tu service role key (Settings → API) |
| `SITE_URL` | `https://seitrack.vercel.app` |

> `SUPABASE_URL` y `SUPABASE_ANON_KEY` los inyecta Supabase automáticamente.

### Cómo funciona

1. El jefe nacional abre el formulario en `/admin/usuarios`
2. El frontend llama `POST /functions/v1/crear-usuario` con el Bearer token del jefe nacional
3. La Edge Function valida que el caller tiene rol `jefe_nacional`
4. Verifica que el email no existe y que la estación es válida
5. Crea el usuario en Supabase Auth
6. Inserta el perfil en la tabla `usuarios`
7. Registra la acción en `audit_log`
8. Retorna la contraseña temporal (si `enviar_email: false`) o confirma el envío del invite

### Modos de creación

**Contraseña temporal** — el sistema genera `SEI-XXXXX-YYYY`. El admin se la comunica al usuario de forma segura (WhatsApp institucional, llamada, etc.). El usuario puede cambiarla después.

**Email de invitación** — Supabase envía un correo con enlace de confirmación. Requiere que el dominio de correo esté configurado en Supabase Auth → Email Templates.

### Seguridad

- La `service_role_key` **nunca** sale del servidor — solo existe en la Edge Function
- La Edge Function verifica el JWT del caller y consulta la tabla `usuarios` para confirmar el rol
- Toda creación queda registrada en `audit_log` con quién la hizo y cuándo
- `enable_signup = false` en `config.toml` impide que alguien se registre solo
