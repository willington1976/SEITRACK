\# SEITrack — Sistema de Gestión Operativa SEI



PWA para la gestión integral de vehículos MRE (Máquinas para Respuesta a Emergencias) del Servicio de Extinción de Incendios — UAEAC.



\## 🛠 Tech Stack

\- \*\*Frontend\*\*: React 19 + Vite 6 + TypeScript 5 + Tailwind CSS v4.

\- \*\*Estado/Caché\*\*: Zustand 5 + React Query 5.

\- \*\*Offline-First\*\*: Dexie.js (IndexedDB) + Workbox Service Worker.

\- \*\*Backend\*\*: Supabase (Postgres 16 + Auth + RLS + Realtime).

\- \*\*Normativa\*\*: Manual GSAN-4.1-05-01 (Fases F0, F1, F2, F3).



\## 🤖 AI Interaction Rules (STRICT TOKEN EFFICIENCY)

Para minimizar el consumo de créditos y evitar escaneos innecesarios, cualquier IA debe cumplir estas directivas:



1\. \*\*Zero Courtesy\*\*: Prohibido usar saludos, introducciones o cierres. Respuestas 100% técnicas y directas.

2\. \*\*Source of Truth (Types)\*\*: Antes de proponer cambios de lógica, consulta obligatoriamente las definiciones en `src/core/types`.

3\. \*\*Context Scope\*\*:

&#x20;  - \*\*UI\*\*: Solo archivos en `src/components` o `src/screens`.

&#x20;  - \*\*Lógica/Estado\*\*: Solo `src/store` o `src/hooks`.

&#x20;  - \*\*Base de Datos\*\*: Solo archivos en `supabase/migrations`.

4\. \*\*No Full Scan\*\*: No realices búsquedas globales. Si el archivo no está en las rutas mencionadas, solicita la ruta específica.

5\. \*\*Anti-Sycophancy\*\*: Corrige errores técnicos o de normativa (GSAN) de forma directa sin preámbulos.



\## 📂 Estructura de Roles y Seguridad

| Rol | Alcance |

|-----|---------|

| `jefe\_nacional` | Nacional (6 regionales, 36 estaciones). |

| `jefe\_regional` | Regional específica. |

| `jefe\_estacion` | Estación asignada. |

| `bombero` | Operación diaria y cambio de turno. |

| `odma` | Inspecciones técnicas F1/F2/F3. |



\## 🚀 Desarrollo

```bash

\# 1. Instalar dependencias

npm install



\# 2. Base de datos

npx supabase db push



\# 3. Ejecutar

npm run dev


<!-- fix-cache 04/08/2026 15:32:40 -->
