# Nexus Core V2 — Project State

> Documento maestro de arquitectura, decisiones, bugs y roadmap.
> Cualquier nuevo chat, desarrollador o auditor debe empezar aquí.

---

## Resumen Ejecutivo

**Nexus Core V2** es una plataforma SaaS multi-tenant para pequeños negocios en República Dominicana. Permite a dueños de tiendas gestionar inventario, pedidos, catálogo público, WhatsApp, regalos corporativos y vitrina digital desde un dashboard unificado. Incluye un panel de control centralizado (PCC) para el operador de la plataforma.

| Atributo | Valor |
|----------|-------|
| Stack | Next.js 16.2.6, React 19.2.4, Supabase, Tailwind v4 |
| Base de datos | Supabase PostgreSQL (52 migraciones) |
| Auth | Custom (JWT firmado con HMAC-SHA256, sin Supabase Auth) |
| Sesión | Cookie `nx_session` (token firmado o legacy UUID) |
| Estado | **Beta QA** — módulos funcionales, bugs conocidos, S1/S2/S4/S5 corregidos |
| Hosting | Vercel (proyecto conectado vía GitHub) |
| Moneda | RD$ (peso dominicano) — hardcodeado en toda la UI |
| Último commit | Sprint P0-C — Dashboard Session Hardening (Jun 1) |
| Última verificación | 2026-06-01 — Sprint P0-C completado |

### Módulos

| Módulo | Estado | Prioridad QA |
|--------|--------|-------------|
| Catálogo público | ✅ Funcional | Media |
| Dashboard socio | ✅ Funcional | Alta |
| Inventario | ✅ Funcional (bugs conocidos) | Alta |
| Pedidos | ✅ Funcional | Alta |
| WhatsApp | ✅ Funcional | Media |
| Regalos corporativos | ✅ Funcional | Baja |
| Vitrina Studio | ⚠️ Beta | Alta |
| Banner Builder | 🔴 Oculto (feature flag) | Pospuesto |
| PCC (Panel Control Central) | ✅ Funcional | Alta |
| Auth (login/register) | ✅ Funcional | Crítica |
| Canje de regalos | ✅ Funcional | Baja |
| Landing pública | ✅ Funcional | Baja |
| Cupones | ⚠️ No auditado | Baja |
| Marketing | ⚠️ No auditado | Baja |

---

## Current Focus

### Sprint completado

**Sprint P0-B — PCC Security Hardening + Sprint P0-C — Dashboard Session Hardening**

### Estado

**Completados.** Ambos sprints de seguridad ejecutados y verificados.

**Sprint P0-B (commit `0f4bba5`):**
- S2 — PCC middleware ausente: implementado middleware PCC para rutas `/pcc/*`
- S4 — Cookie PCC forjable: firma criptográfica agregada a `nx_pcc`

**Sprint P0-C:**
- S1 — login-as sin autenticación: ahora requiere sesión PCC válida
- S5 — Legacy UUID session bypass: `nx_session` solo acepta tokens firmados, UUID legacy eliminado

### Logros acumulados

#### Sprint P0-B — PCC Security Hardening
- **PCC middleware (S2)**: Middleware propio para rutas `/pcc/*` que verifica sesión PCC válida antes de permitir acceso
- **Cookie PCC firmada (S4)**: `nx_pcc` ahora usa el mismo sistema de tokens firmados HMAC-SHA256 que `nx_session`, no un UUID plano
- **Validación completa**: PCC login → middleware protege → APIs PCC protegidas → logout funcional

#### Sprint P0-C — Dashboard Session Hardening
- **login-as protegido (S1)**: El endpoint `POST /api/auth/login-as` ahora verifica que quien invoca tenga una sesión PCC válida. Un atacante no puede escalar a dueño de tienda sin ser operador PCC
- **Sesiones firmadas obligatorias (S5)**: `getSessionFromCookieValue` ya no acepta UUIDs planos. Solo tokens firmados con HMAC-SHA256 son válidos. Esto cierra el bypass donde cualquiera podía setear `nx_session=<cualquier-uuid>` y autenticarse como cualquier tienda
- **Validación completa**: Dashboard login → middleware protege → logout → login-as → sesiones firmadas

### Estado de vulnerabilidades

| ID | Vulnerabilidad | Estado |
|----|---------------|--------|
| S1 | login-as sin autenticación | ✅ Corregido |
| S2 | PCC middleware ausente | ✅ Corregido |
| S4 | Cookie PCC forjable | ✅ Corregido |
| S5 | Legacy UUID session bypass | ✅ Corregido |

### Pendientes críticos (próximo sprint)

1. **Stock decremento inconsistente** — checkout puede decrementar stock incorrectamente en condiciones de carrera
2. **Realtime reconnection** — canales real-time no reconectan automáticamente al perder conexión

### Vulnerabilidades corregidas recientemente

| ID | Vulnerabilidad | Sprint |
|----|---------------|--------|
| — | Auth en `/api/push/send` | ✅ P1-A |
| — | RLS `push_subscriptions` tautológica | ✅ P1-A |
| — | IDOR `actualizarEstado` | ✅ P1-A |

### Próxima acción

Iniciar Sprint P1-B — Data Integrity:
1. Stock decremento inconsistente
2. Realtime reconnection

### Bloqueadores

- Ninguno.

---

## Known Risks

### R1 — Dependencia de auth custom JWT

| Campo | Valor |
|-------|-------|
| **Riesgo** | El sistema de auth usa HMAC-SHA256 con `AUTH_SECRET` compartido. Si el secret se filtra, cualquiera puede firmar tokens válidos. No hay rotación automática de secretos. |
| **Impacto** | Crítico — pérdida total de seguridad del sistema |
| **Probabilidad** | Baja (secret en .env.local, no expuesto en cliente) |
| **Mitigación** | `AUTH_SECRET` nunca debe estar en el repositorio ni en logs. Rotar manualmente si hay sospecha de fuga. Considerar migrar a Supabase Auth o JWT con RS256 en el futuro. |

### R2 — Service role key expuesta en entorno

| Campo | Valor |
|-------|-------|
| **Riesgo** | `SUPABASE_SERVICE_ROLE_KEY` da acceso total a la base de datos. Si se filtra (logs, Vercel env, error message), cualquier atacante puede leer/escribir todas las tablas. |
| **Impacto** | Crítico — destrucción total de datos |
| **Probabilidad** | Baja (solo en server-side, no en cliente) |
| **Mitigación** | No loguear la key. No exponerla en mensajes de error. Auditoría periódica de accesos. |

### R3 — React 19 + Next.js 16 edge compatibility

| Campo | Valor |
|-------|-------|
| **Riesgo** | Next.js 16.2.6 y React 19.2.4 son versiones bleeding edge. Bugs de compatibilidad pueden surgir en cualquier actualización. El proyecto ya experimentó un hooks violation P1 en dev mode. |
| **Impacto** | Alto — puede bloquear desarrollo o producción |
| **Probabilidad** | Media — bugs activos en dev mode |
| **Mitigación** | Pin versions en package.json. No actualizar sin probar en staging. Monitorear release notes de Next.js y React. |

### R4 — Sin tests automatizados en módulos críticos

| Campo | Valor |
|-------|-------|
| **Riesgo** | No hay tests unitarios ni de integración. Solo e2e con Playwright (no implementados en CI). Los deploys a producción son directos a main sin validación automática. |
| **Impacto** | Alto — bugs llegan a producción sin detección |
| **Probabilidad** | Alta — ya ocurrió con logout P0 y UUID P0 |
| **Mitigación** | Playwright está configurado como dependencia. Implementar tests para flujos críticos (login, crear producto, checkout) antes del beta launch. |

### R5 — Módulos sin auditoría (cupones, marketing, recovery center)

| Campo | Valor |
|-------|-------|
| **Riesgo** | Existen módulos funcionales cuyo estado es desconocido. Pueden contener bugs, deuda técnica o vulnerabilidades. |
| **Impacto** | Medio — bugs en funcionalidades poco usadas |
| **Probabilidad** | Media |
| **Mitigación** | Incluir en roadmap de estabilización pre-lanzamiento. No considerarlos blockers para beta. |

### R6 — Sin paginación en inventario y pedidos

| Campo | Valor |
|-------|-------|
| **Riesgo** | La carga de productos/pedidos es full SELECT sin LIMIT. Con >500 productos o >1000 pedidos, el rendimiento se degrada significativamente. |
| **Impacto** | Medio — degradación de UX con datasets grandes |
| **Probabilidad** | Baja (tiendas pequeñas, <200 productos típicamente) |
| **Mitigación** | Implementar paginación o infinite scroll antes de escala. |

### R7 — Banner Builder con feature flag

| Campo | Valor |
|-------|-------|
| **Riesgo** | Código de Banner Wizard (405 líneas) y DisenosLibrary existe en la base de código pero está oculto. Si hay cambios en los templates de vitrina, el Banner Builder puede romperse sin que nadie lo note. |
| **Impacto** | Medio — rotura silenciosa de funcionalidad |
| **Probabilidad** | Baja |
| **Mitigación** | No modificar `CatalogoModal.tsx` (PlantillaPreview) sin verificar Banner Wizard. Mantener `BANNER_BUILDER_ENABLED = false` hasta QA completo. |

---

## Arquitectura

### Stack técnico

```
Frontend:     Next.js 16.2.6 / React 19.2.4 / Tailwind v4 / TypeScript 5
Backend:      Server Actions ('use server') + API Routes (Next.js)
Base de datos: Supabase PostgreSQL (acceso directo via supabase-js, sin ORM)
Auth:         Custom JWT (HMAC-SHA256) + cookies + middleware
Despliegue:   Vercel + Supabase
Testing:      Playwright (e2e)
```

### Clientes Supabase

| Cliente | Archivo | Key | Uso |
|---------|---------|-----|-----|
| Server | `src/lib/supabase/server.ts` | ANON | Server Components, Server Actions (lectura/escritura limitada por RLS) |
| Public | `src/lib/supabase/public.ts` | ANON | Rutas públicas (login, register) |
| Admin | `src/lib/supabase/admin.ts` | SERVICE_ROLE | Server Actions de escritura (bypass RLS) |
| Client | `src/lib/supabase.ts` | ANON | Componentes cliente (real-time, lecturas) |

**Decisión clave:** No se usa `@supabase/ssr`. Se eliminó la dependencia en commit `af41a43` por problemas de compatibilidad con React 19. Todos los clientes son `createClient` directo de `@supabase/supabase-js`.

### Auth System

**Cookie:** `nx_session` (token firmado `base64(payload).hex(signature)`)

**Payload:** `{ tiendaId: UUID, exp: timestamp }` — expira en 30 días

**Flujo login:**
1. `POST /api/auth/login` — verifica password con scrypt (timing-safe)
2. Crea `createSessionToken(tiendaId)` vía Web Crypto API (HMAC-SHA-256)
3. Setea cookie `nx_session` con `secure: !isLocalhost`, `httpOnly: false` (accesible via JS)
4. Redirige a `/dashboard`

**Flujo logout:**
1. `POST /api/auth/logout` — borra cookies `nx_session` y `nx_colaborador`
2. Usa `NextResponse.cookies.set()` (server-side, no depende de `document.cookie`)

**Middleware:** `middleware.ts` — protege `/dashboard/:path*` y `/onboarding`, redirige `/login` si ya autenticado

**Legacy:** Soporta cookies en formato raw UUID (previo a la implementación de tokens firmados). Compatibilidad hacia atrás en `getSessionFromCookieValue`.

### Plan de suscripción

Campos en `tiendas`:
- `plan_nivel`: `basico` | `pro` | `ilimitado`
- `token_productos_limite`: número máximo de productos permitidos
- `tokens_disponibles`: saldo de tokens (se consumen por producto creado)
- `fecha_vencimiento`: fecha de expiración del plan
- `fecha_bloqueo_panel`: si está en pasado, el dashboard se bloquea
- `fecha_suspension_catalogo`: si está en pasado, el catálogo público se oculta

### Estructura de directorios

```
src/
├── app/
│   ├── api/              ← API Routes (auth, productos, pcc, dashboard, etc.)
│   ├── c/[slug]/         ← Landing de tienda (custom domain friendly)
│   ├── canje/            ← Canje de gift code (público)
│   ├── catalogo/[id_tienda]/ ← Catálogo público (PWA-ready)
│   │   ├── cart/         ← Carrito de compras
│   │   ├── producto/     ← Página individual de producto
│   │   ├── tickets/      ← Canje de tickets
│   │   └── layout.tsx    ← Layout PWA + bottom nav
│   ├── dashboard/        ← Dashboard del socio (módulo principal)
│   │   ├── analiticas/   ← Reportes y analytics
│   │   ├── bloqueado/    ← Pantalla de bloqueo por falta de pago
│   │   ├── configurar/   ← Configuración de tienda
│   │   ├── cupones/      ← Gestión de cupones
│   │   ├── inventario/   ← CRUD productos + import CSV
│   │   ├── marketing/    ← Herramientas de marketing
│   │   ├── pedidos/      ← Gestión de pedidos
│   │   ├── regalos/      ← Regalos corporativos entrantes
│   │   ├── vitrina/      ← Vitrina Studio + Banner Builder
│   │   └── whatsapp/     ← Configuración WhatsApp
│   ├── login/            ← Login del socio
│   ├── onboarding/       ← Setup inicial de tienda
│   ├── pcc/              ← Panel de Control Central (operador)
│   │   ├── tiendas/      ← Listado y gestión de tiendas
│   │   ├── finanzas/     ← MRR, ventas globales
│   │   ├── logs/         ← Auditoría de actividades
│   │   └── ...
│   ├── pcc-login/        ← Login del operador PCC
│   └── register/         ← Registro de nuevo socio
├── components/
│   ├── cart/             ← Componentes de carrito
│   ├── catalog/          ← Catálogo público (modals, cards, etc.)
│   ├── dashboard/        ← Componentes compartidos del dashboard
│   ├── pcc/              ← Componentes compartidos del PCC
│   └── store/            ← Store provider, gift forms
├── context/
│   ├── CartContext.tsx    ← Estado global del carrito
│   ├── ConfigProvider.tsx ← Configuración de tienda
│   ├── PermisosContext.tsx ← Roles y permisos (dueño/colaborador)
│   └── ThemeContext.tsx   ← Tema claro/oscuro
├── lib/
│   ├── auth/             ← Session token (create/verify/get)
│   ├── supabase/         ← Clientes Supabase (server/public/admin)
│   └── utils.ts          ← Formateo, parseo, helpers
└── types/
    └── database.ts       ← Tipos compartidos
```

---

## Arquitectura de Datos

### Mapa de entidades principales

```
tiendas (1) ──── tiene ──── (N) productos
tiendas (1) ──── tiene ──── (N) pedidos
tiendas (1) ──── tiene ──── (1) perfil_tienda
tiendas (1) ──── tiene ──── (0-1) catalogo_modal
tiendas (1) ──── tiene ──── (N) colaboradores
tiendas (1) ──── tiene ──── (N) regalos (gift_experiences)
tiendas (1) ──── tiene ──── (N) cupones
tiendas (1) ──── tiene ──── (N) disenos_biblioteca
tiendas (1) ──── tiene ──── (N) backup_history

catalogo_modal (1) ──── historial ──── (N) catalogo_modal_historial

regalos (1) ──── referencia ──── (N) productos (via items_list JSONB)
productos (1) ──── referencia ──── (N) pedidos (via detalles_pedido JSONB)

pedidos (1) ──── tiene ──── (N) detalles_pedido (JSONB embebido)
```

### Entidades

#### `tiendas`
Entidad raíz del multi-tenant. Cada fila es un negocio independiente.

| Campo clave | Tipo | Notas |
|-------------|------|-------|
| `id` | UUID | PK |
| `id_owner` | UUID | FK al owner (tabla `socios` o `colaboradores`) |
| `nombre_tienda` | text | Nombre comercial |
| `tipo_negocio` | text | `estandar` \| `ropa` \| `boutique` |
| `slug` | text | URL amigable (único) |
| `plan_nivel` | text | `basico` \| `pro` \| `ilimitado` |
| `token_productos_limite` | int | Máximo de productos permitidos |
| `tokens_disponibles` | int | Saldo de tokens para crear productos |
| `password_hash` | text | Hash scrypt para login del dueño |
| `fecha_vencimiento` | timestamptz | Expiración del plan |
| `fecha_bloqueo_panel` | timestamptz | Bloqueo administrativo |
| `fecha_suspension_catalogo` | timestamptz | Catálogo público oculto |
| `soft_deleted_at` | timestamptz | Soft delete |

#### `productos`
Catálogo de productos de cada tienda.

| Campo clave | Tipo | Notas |
|-------------|------|-------|
| `id` | UUID | PK |
| `id_tienda` | UUID | FK → tiendas.id |
| `nombre` | text | — |
| `slug` | text | URL amigable (único por tienda) |
| `precio` | numeric | Precio normal |
| `precio_oferta` | numeric | Nullable |
| `costo_compra` | numeric | Para cálculo de margen |
| `stock` | int | Stock total (suma de variantes si aplica) |
| `in_stock` | boolean | Toggle disponibilidad |
| `tallas` | JSONB | Array de objetos `{ talla, stock, precio, costo, sku }` |
| `tipo_articulo` | text | `prenda` \| `calzado` \| null |
| `imagen_url` | text | URL en Storage |
| `codigo_barra` | text | SKU/Código de barras |

#### `pedidos`
Pedidos recibidos desde el catálogo público.

| Campo clave | Tipo | Notas |
|-------------|------|-------|
| `id` | UUID | PK |
| `id_tienda` | UUID | FK → tiendas.id |
| `cliente_nombre` | text | — |
| `cliente_telefono` | text | — |
| `total` | numeric | — |
| `estado` | text | `pendiente` \| `confirmado` \| `completado` \| `cancelado` \| `rechazado` |
| `detalles_pedido` | JSONB | Array de `{ nombre, cantidad, precio_unitario, ... }` |
| `creado_at` | timestamptz | — |
| `is_gift` | boolean | Si el pedido es un regalo corporativo |

#### `catalogo_modal`
Configuración visual del catálogo público por tienda.

| Campo clave | Tipo | Notas |
|-------------|------|-------|
| `id_tienda` | UUID | PK, FK → tiendas.id |
| `plantilla_id` | text | ID de plantilla visual |
| `color_primario` | text | — |
| `color_fondo` | text | — |
| `logo_url` | text | — |
| `mensaje_bienvenida` | text | — |
| `activo` | boolean | — |
| `mostrar_stock` | boolean | — |
| `mostrar_precios` | boolean | — |

#### `catalogo_modal_historial`
Auditoría de cambios en la configuración del modal.

| Campo clave | Tipo | Notas |
|-------------|------|-------|
| `id` | UUID | PK |
| `id_tienda` | UUID | FK → tiendas.id |
| `plantilla_id` | text | Snapshot de la plantilla en ese momento |
| `config` | JSONB | Configuración completa |
| `creado_en` | timestamptz | — |

#### `colaboradores`
Empleados con acceso limitado al dashboard de la tienda.

| Campo clave | Tipo | Notas |
|-------------|------|-------|
| `id` | UUID | PK |
| `id_tienda` | UUID | FK → tiendas.id |
| `nombre` | text | — |
| `pin_hash` | text | PIN de acceso (hash scrypt) |
| `permisos` | JSONB | `{ dashboard: bool, productos: bool, pedidos: bool }` |

#### `gift_experiences` (Regalos)
Regalos corporativos B2B.

| Campo clave | Tipo | Notas |
|-------------|------|-------|
| `id` | UUID | PK |
| `store_id` | UUID | FK → tiendas.id |
| `sender_name` | text | Quien regala |
| `receiver_name` | text | Quien recibe |
| `gift_code` | text | Código único de canje |
| `items_list` | JSONB | Array de `{ product_id, nombre, precio }` |
| `status` | text | `pending` \| `approved` \| `cancelled` \| `redeemed` |
| `personal_message` | text | Mensaje personalizado |

#### `disenos_biblioteca`
Diseños guardados de vitrina/banners.

| Campo clave | Tipo | Notas |
|-------------|------|-------|
| `id` | UUID | PK |
| `id_tienda` | UUID | FK → tiendas.id |
| `tipo` | text | `banner` \| `diseno_vitrina` |
| `nombre` | text | — |
| `preview_url` | text | URL del PNG preview |
| `config` | JSONB | Configuración del diseño |
| `creado_en` | timestamptz | — |

#### `cupones`

| Campo clave | Tipo | Notas |
|-------------|------|-------|
| `id` | UUID | PK |
| `id_tienda` | UUID | FK → tiendas.id |
| `codigo` | text | Código único |
| `descuento` | numeric | Porcentaje o monto fijo |
| `tipo` | text | `porcentaje` \| `monto_fijo` |
| `activo` | boolean | — |
| `usos_maximos` | int | — |
| `usos_actuales` | int | — |

### Notas de diseño

- **JSONB embebido**: `detalles_pedido` y `items_list` son JSONB, no tablas separadas. Esto simplifica lecturas pero dificulta consultas analíticas complejas.
- **Sin relaciones formales**: La mayoría de las FKs no tienen constraints de clave foránea en la base de datos. La consistencia se mantiene a nivel de aplicación.
- **Real-time habilitado**: Las tablas `productos` y `pedidos` tienen publicación real-time para actualizaciones en vivo.
- **RLS por `id_tienda`**: Las políticas de seguridad filtran por `id_tienda` usando el valor extraído del JWT de sesión.
- **Backup history**: Tabla `backup_history` para snapshots periódicos de datos.
- **Rate limiting**: Tabla `nexus_rate_limits` para control de intentos de login.

---

## Decisiones de Producto

### 1. Tallas solo para ropa y boutique
Los campos `tallas` (JSONB) y `tipo_articulo` solo aplican cuando `tiendas.tipo_negocio === 'ropa'` o `'boutique'`. Para `estandar`, estos campos se ignoran. Implementado en `AgregarProductoForm.tsx:141-142` y `InventarioClient.tsx:307`.

### 2. Banner Builder oculto temporalmente
Feature flag `const BANNER_BUILDER_ENABLED = false` en `vitrina/page.tsx`. Oculta la pestaña [Banner] y el componente `BannerWizard`. Se habilitará post-beta. (Commit `b9d6508`)

### 3. Mobile-first
- Dashboard con bottom nav en mobile, sidebar en desktop
- Catálogo público con bottom nav fijo
- Tablas con vista cards en mobile (< md), tabla en desktop
- Modal overlay para crear/editar (full screen en mobile)

### 4. PCC separado del dashboard socio
El PCC (`/pcc`) tiene su propio login (`/pcc-login`), su propia sesión (`nx_pcc`), y un layout completamente separado. No comparte componentes con el dashboard socio. Los datos se sirven vía `/api/pcc/*`.

### 5. Auth custom sin Supabase Auth
Se implementó auth propio con JWT firmado localmente (Web Crypto API) debido a:
- Problemas de compatibilidad de `@supabase/ssr` con React 19
- Necesidad de multi-tenant sin depender de Supabase Auth (que es por proyecto, no por tenant)
- Control total sobre expiración, rotación y formato de sesión

### 6. Sin Supabase Auth — multi-tenant manual
El secret `AUTH_SECRET` permite firmar tokens. El multi-tenant se implementa mediante `id_tienda` en cada tabla. No hay `user_id` de Supabase Auth. Los colaboradores se gestionan via tabla `colaboradores` con hash de PIN.

### 7. Service role para escrituras sensibles
Todas las operaciones de escritura que requieren bypass RLS (editar producto, eliminar, toggle stock) usan `createAdminClient()` con `SUPABASE_SERVICE_ROLE_KEY`. Las lecturas y operaciones simples usan el cliente anon (RLS protege).

### 8. Glassmorphism UI redesign (commit 893f0ab)
Se aplicó un rediseño con fondos semitransparentes, backdrop blur, bordes sutiles y sombras. Implementado en dashboard, catálogo y PCC.

### 9. PWA con install prompt
El catálogo público es PWA (manifest.json, service worker). El dashboard tiene `PwaInstallPrompt` y `PwaRegister`. Los icons son SVG inline desde `/api/favicon`.

### 10. Sin IA, sin APIs externas
Decisión explícita: no se integran servicios de IA, external APIs de pago, ni chatbots. Todo el procesamiento es server-side en Next.js.

### 11. `tipo_negocio` define UX
El campo `tipo_negocio` en `tiendas` controla:
- Visibilidad de secciones en formularios
- Filtro de tallas en inventario
- Plantillas de vitrina
- (futuro) Precios de plan

### 12. SSOT: nickname para tienda slug
Cada tienda tiene un `slug` (alias) para URLs públicas tipo `nexus.do/c/mi-tienda`. Se configura en onboarding.

### 13. SKU único por producto, autogenerado por variante
El SKU de variante se eliminó de la UI. Ahora el usuario solo ingresa un SKU a nivel de producto (`codigo_barra`). Los SKU por variante se autogeneran con formato `{SKU-producto}-{TALLA}` (ej: `CAM-NEG-001-M`). Esto reduce la fricción en formularios de ropa/boutique sin perder compatibilidad con datos existentes.

### 14. ProductoForm unificado para crear y editar
Se implementó `ProductoForm.tsx` que maneja ambos modos (`create` / `edit`) con el mismo código. En modo `edit`, llama a `actualizarProducto()` en lugar de `crearProducto()`. El componente se abre desde `ProductoModal.tsx`, wrapper reutilizable con backdrop y layout consistente.

---

## Decision Log (cronológico)

### D001 — Auth custom en vez de Supabase Auth

| Campo | Valor |
|-------|-------|
| **Fecha** | Mayo 2026 (inicio del proyecto) |
| **Decisión** | Implementar auth propio con JWT firmado localmente (Web Crypto API) en lugar de usar Supabase Auth. |
| **Motivo** | `@supabase/ssr` incompatible con React 19. Multi-tenant requiere control por tienda, no por usuario Supabase. Necesidad de tokens con expiración larga (30 días) y sin dependencia externa. |
| **Impacto** | Más control pero más responsabilidad. Si `AUTH_SECRET` se filtra, todas las sesiones son vulnerables. |

### D002 — Sesión en cookie accessible via JS

| Campo | Valor |
|-------|-------|
| **Fecha** | Mayo 2026 |
| **Decisión** | Cookie `nx_session` con `httpOnly: false` (accesible via `document.cookie`). |
| **Motivo** | Server Components y Server Actions necesitan leer la cookie del lado del cliente para mantener sesión. Middleware también la lee. |
| **Impacto** | Vulnerable a XSS. Mitigado porque no hay datos sensibles en el token (solo tiendaId + exp). |

### D003 — Tallas solo para ropa y boutique

| Campo | Valor |
|-------|-------|
| **Fecha** | Mayo 2026 (migración 030) |
| **Decisión** | Los campos `tallas` y `tipo_articulo` solo se muestran/habilitan cuando `tipo_negocio === 'ropa'` o `'boutique'`. |
| **Motivo** | Simplificar UX para negocios de tipo estándar (floristerías, artesanías, etc.) que no manejan tallas. Reducir complejidad del formulario. |
| **Impacto** | Negocios `estandar` tienen formulario más simple. `boutique` necesita soporte correcto (bug: filtro talla solo visible para `ropa`). |

### D004 — PCC separado del dashboard socio

| Campo | Valor |
|-------|-------|
| **Fecha** | Mayo 2026 |
| **Decisión** | PCC (`/pcc`) es una aplicación independiente con su propio login, layout y API. |
| **Motivo** | El operador de la plataforma necesita acceso a datos de todas las tiendas, lo cual es un nivel de acceso radicalmente diferente al del socio. Separar previene escalada de privilegios accidental. |
| **Impacto** | Código duplicado (login, layout, componentes) pero seguridad mejorada. |

### D005 — Sin Supabase SSR

| Campo | Valor |
|-------|-------|
| **Fecha** | Mayo 2026 (commit `af41a43`) |
| **Decisión** | Eliminar `@supabase/ssr` y usar `@supabase/supabase-js` directo. |
| **Motivo** | Incompatibilidad con React 19. La librería SSR asumía patrones de React 18 que cambiaron en 19. |
| **Impacto** | Menos dependencias. Más control sobre creación de clientes. Responsabilidad manual de manejo de cookies. |

### D006 — Service role para escrituras

| Campo | Valor |
|-------|-------|
| **Fecha** | Mayo 2026 |
| **Decisión** | Usar `createAdminClient()` (service role key) para todas las operaciones de escritura sensibles (UPDATE, DELETE, INSERT en inventario). |
| **Motivo** | Las RLS policies con anon key no permiten escritura directa. Service role key bypass RLS y permite operaciones sin restricciones. |
| **Impacto** | Si la service role key se filtra, cualquiera puede escribir en la base de datos. Riesgo mitigado manteniéndola solo en server-side. |

### D007 — Mobile-first responsive

| Campo | Valor |
|-------|-------|
| **Fecha** | Mayo 2026 |
| **Decisión** | Diseñar primero para mobile, luego adaptar a desktop. |
| **Motivo** | El público objetivo (pequeños negocios en RD) usa principalmente teléfonos para gestionar su tienda. |
| **Impacto** | Dashboard con bottom nav en mobile, sidebar en desktop. Tablas con vista cards vs columnas. Modals full-screen vs centered. |

### D008 — Banner Builder oculto (feature flag)

| Campo | Valor |
|-------|-------|
| **Fecha** | Mayo 2026 (commit `b9d6508`) |
| **Decisión** | `const BANNER_BUILDER_ENABLED = false` — ocultar Banner Builder de la UI. |
| **Motivo** | El componente fue creado pero no tiene QA suficiente. Vitrina Studio necesita estabilizarse primero. Se habilitará post-beta. |
| **Impacto** | Código muerto temporalmente. Riesgo de rotura silenciosa si se modifican dependencias compartidas. |

### D009 — Glassmorphism UI Redesign

| Campo | Valor |
|-------|-------|
| **Fecha** | Mayo 2026 (commit `893f0ab`) |
| **Decisión** | Rediseñar toda la UI con fondos semitransparentes, backdrop blur, bordes sutiles y sombras. |
| **Motivo** | Mejorar percepción de calidad del producto. Diferenciarse de competidores con diseño estándar. |
| **Impacto** | Mayor consumo de recursos en dispositivos low-end (backdrop blur). Posibles conflictos de CSS layering. |

### D010 — Sin IA, sin APIs externas

| Campo | Valor |
|-------|-------|
| **Fecha** | Mayo 2026 |
| **Decisión** | No integrar servicios de IA, chatbots, ni APIs de pago externas. |
| **Motivo** | Mantener costos operativos predecibles. Evitar dependencias de terceros. Enfoque en MVP funcional. |
| **Impacto** | Funcionalidades como "sugerencias de producto" o "chatbot" quedan excluidas del roadmap. |

### D011 — SKU único por producto con autogeneración por variante

| Campo | Valor |
|-------|-------|
| **Fecha** | Mayo 2026 (Sprint UX V2) |
| **Decisión** | Eliminar campo SKU por variante de la UI. Un solo campo SKU a nivel de producto. Los SKU de variante se autogeneran con formato `{SKU-producto}-{TALLA}`. |
| **Motivo** | Los negocios pequeños no necesitan SKU individuales por talla. El campo añadía complejidad sin valor. El sistema no consume SKU por variante en ninguna funcionalidad crítica (stock, checkout, búsqueda). |
| **Impacto** | UI más simple para ropa/boutique. Datos existentes intactos (no hay migración). Compatibilidad hacia atrás garantizada. |

### D012 — ProductoForm unificado (crear + editar)

| Campo | Valor |
|-------|-------|
| **Fecha** | Mayo 2026 (Sprint UX V2) |
| **Decisión** | Unificar los 3 formularios de producto duplicados (AgregarProductoForm, ProductoActions inline, ProductoForm nuevo) en un solo componente `ProductoForm.tsx` con modo `create`/`edit`. |
| **Motivo** | Eliminar duplicación de código que causaba bugs (P1 editar producto) y mantenimiento costoso. Centralizar lógica de variantes, SKU, imagen y oferta. |
| **Impacto** | Bug P1 de edición resuelto. Código más mantenible. `ProductoRowActions.tsx` ahora es solo botones de fila. `AgregarProductoForm.tsx` legacy eliminado tras migrar FloatAddButton y QuickAddProduct. |

### D013 — Modal en React Portal

| Campo | Valor |
|-------|-------|
| **Fecha** | Mayo 2026 (Sprint 2 Estabilización) |
| **Decisión** | Migrar `ProductoModal` a `createPortal(children, document.body)` en lugar de renderizar anidado en el DOM del dashboard. |
| **Motivo** | El modal se contenía dentro de cards con `transform: translateY(-2px)` (hover-lift), lo que rompía `position: fixed`. El portal libera el modal de cualquier ancestro con `transform`, `perspective` o `filter`. |
| **Impacto** | El modal renderiza fuera de la jerarquía del dashboard. Sin `useState`/`useEffect` (usa `typeof document !== 'undefined'` para SSR). Sin cambios en consumidores. |

### D014 — hover-lift removido temporalmente

| Campo | Valor |
|-------|-------|
| **Fecha** | Mayo 2026 (Sprint 2 Estabilización) |
| **Decisión** | Eliminar `hover-lift:hover { transform: translateY(-2px) }` de las cards de producto en mobile (`InventarioClient.tsx:344`). |
| **Motivo** | El efecto visual en cards mobile causaba que `position: fixed` del modal se contuviera dentro del card (el `transform` crea un nuevo stacking context). Aunque el portal resuelve el problema de raíz, se optó por eliminar también la causa directa. |
| **Impacto** | Cards mobile pierden el efecto hover de elevación. Se eliminó temporalmente para validación; si se confirma que el portal es suficiente, no se restaurará. |

---

## Flujo de Usuario

### Socio (Dueño de tienda)

#### Registro
```
Landing (/) → Completar formulario register →
  POST /api/auth/register → Crear tienda en Supabase →
  Redirect a /onboarding →
    Subir logo
    Configurar slug/nickname
    Elegir tipo_negocio (estandar/ropa/boutique)
    Configurar WhatsApp
  → Redirect a /dashboard (primer login automático)
```

#### Login
```
/login → Ingresar usuario y password →
  POST /api/auth/login →
    Verificar rate limiting (nexus_rate_limits)
    Verificar password (scrypt, timing-safe)
    Crear session token (HMAC-SHA256, 30 días)
    Setear cookie nx_session (secure=!isLocalhost)
  → Redirect a /dashboard
```

#### Crear producto
```
/dashboard/inventario → Click [+ Nuevo Producto] →
  Modal "Nuevo Producto":
    Nombre* → Descripción → SKU → Categoría →
    Precio* + Costo → Oferta (toggle) →
    [Solo ropa/boutique: Tipo Artículo + Variantes toggle + Grid tallas] →
    Stock → Imagen (opcional, al fondo)
  → Server Action crearProducto() → revalidatePath
  → Toast "Producto creado" → Modal cierra → Lista actualiza
```

#### Recibir pedido
```
[Realtime] Llega pedido nuevo →
  DashboardShell muestra notificación toast + badge en sidebar
  /dashboard/pedidos → Ver lista filtrada por estado →
  Click pedido → Ver detalle →
  [Confirmar] / [Completar] / [Cancelar]
```

#### Editar catálogo público
```
/dashboard/vitrina → Tab [Catálogo] →
  Elegir plantilla (Premium/Minimalista/Moderno/Energético/Clásico) →
  Personalizar colores, logo, mensaje →
  Vista previa en tiempo real →
  Guardar → POST /api/dashboard/modal → Actualizar catalogo_modal →
  Catálogo público se actualiza al instante
```

### Cliente (Comprador)

#### Entrar al catálogo
```
Enlace: nexus.do/c/[slug] o nexus.do/catalogo/[id_tienda]
  → Landing de la tienda
  → Header con logo + nombre + WhatsApp CTA
  → Grid de productos con precios
  → Bottom nav: Inicio | Menú | Pedidos | Tickets
```

#### Agregar al carrito
```
ProductCard → Click → ProductQuickView (modal) →
  [Si tiene tallas/variantes] ModalSeleccionarTalla o ModalSeleccionPeso
  [Si boutique] ModalSeleccionPeso (unidad_medida = libra)
  → Seleccionar cantidad → Agregar al carrito
  → CartContext actualiza → Badge en bottom nav
```

#### Hacer pedido
```
Bottom nav → Carrito →
  Revisar items, cantidades, total
  Ingresar nombre + teléfono
  [Opcional] Cupón de descuento
  → Confirmar pedido
  → POST /api/checkout → Insert en pedidos (estado: pendiente)
  → CartContext vacía
  → Redirigir a /catalogo/[id_tienda]/exito
  → Número de pedido + instrucciones
```

#### WhatsApp
```
Botón WhatsApp flotante o CTA →
  Enlace: wa.me/[numero_tienda]?text=[mensaje_personalizado]
  → Abre WhatsApp
```

### Operador PCC

#### Login PCC
```
/pcc-login → Ingresar credenciales de operador →
  POST /api/auth/pcc-login → Verificar → Setear cookie nx_pcc →
  Redirect a /pcc/dashboard
```

#### Gestionar tienda
```
/pcc/tiendas → Lista de todas las tiendas →
  Click tienda → Ver detalle:
    Plan actual, tokens, fecha vencimiento
    Estado (activa/bloqueada/suspendida/eliminada)
    Última actividad
  Acciones:
    Modificar plan
    Bloquear/desbloquear panel
    Suspender/restaurar catálogo
    Soft delete / restaurar
```

#### Recargar tokens
```
/pcc/tiendas → Click tienda → Modal recarga de tokens →
  Ingresar cantidad de tokens → Confirmar →
  UPDATE tiendas SET tokens_disponibles = tokens_disponibles + N
  → Feedback toast
```

---

## Bugs Cerrados

### S1 — login-as sin autenticación (P0)
**Síntoma:** El endpoint `POST /api/auth/login-as` no verificaba que el llamante tuviera una sesión PCC válida. Cualquier persona con el UUID de una tienda podía generar una sesión de dueño.
**Fix:** Agregar verificación de sesión PCC (`getPCCSession()`) antes de ejecutar el login-as. Si no hay sesión PCC válida, retorna 401.
**Commit:** `0f4bba5` (Sprint P0-C)
**Archivos:** `src/app/api/auth/login-as/route.ts`

### S2 — PCC middleware ausente (P0)
**Síntoma:** Las rutas `/pcc/*` no tenían middleware de protección. El layout de PCC verificaba sesión, pero un atacante podía acceder directamente a rutas API de PCC sin autenticación.
**Fix:** Implementar middleware específico para `/pcc/:path*` que verifica `nx_pcc` antes de permitir el acceso. Middleware existente extendido.
**Commit:** `0f4bba5` (Sprint P0-B)
**Archivos:** `middleware.ts`

### S4 — Cookie PCC forjable (P0)
**Síntoma:** La cookie `nx_pcc` era un UUID plano. Un atacante podía setear `nx_pcc=<uuid-conocido>` y obtener acceso completo al PCC.
**Fix:** Migrar `nx_pcc` al mismo sistema de tokens firmados HMAC-SHA256 que `nx_session`. Ahora es un JWT custom con payload `{ id, exp }` y firma verificable.
**Commit:** `0f4bba5` (Sprint P0-B)
**Archivos:** `src/lib/auth/session.ts`, `src/app/api/auth/pcc-login/route.ts`

### S5 — Legacy UUID session bypass (P0)
**Síntoma:** `getSessionFromCookieValue` aceptaba UUIDs planos como sesión válida. Un atacante que conociera el UUID de una tienda podía setear `nx_session=<uuid>` y autenticarse sin password.
**Fix:** Eliminar compatibilidad con UUID legacy. `getSessionFromCookieValue` solo acepta tokens firmados. Cualquier cookie en formato UUID es rechazada.
**Commit:** `0f4bba5` (Sprint P0-C)
**Archivos:** `src/lib/auth/get-session.ts`

### P0 — Logout no funciona en producción (Vercel)
**Síntoma:** En Chrome 134+ (HTTPS), `document.cookie = 'nx_session=; max-age=0'` no borra la cookie porque fue creada sin flag `Secure` pero en canal HTTPS.
**Fix:** `login/route.ts` líneas 150, 228 — `secure: false` → `secure: !isLocalhost`
**Commit:** `b9d6508`
**Archivos:** `src/app/api/auth/login/route.ts`

### P0 — Server-side logout endpoint
**Síntoma:** `document.cookie` no es confiable en HTTPS para borrar cookies.
**Fix:** Nuevo endpoint `POST /api/auth/logout` que usa `NextResponse.cookies.set()` para borrar `nx_session` y `nx_colaborador`. DashboardShell (2 botones) y configurar page actualizados.
**Commit:** `66d3b19`
**Archivos:** `src/app/api/auth/logout/route.ts` (nuevo), `DashboardShell.tsx`, `configurar/page.tsx`

### P0 — Modal UUID Vitrina
**Síntoma:** Error `invalid input syntax for type uuid` al guardar diseño de modal en vitrina. `getTiendaIdFromCookie()` retornaba el JWT firmado completo en vez del UUID.
**Fix:** Reemplazar `getTiendaIdFromCookie()` por `getSession()` en todas las rutas `/api/dashboard/modal/*`.
**Commit:** `81435a9`
**Archivos:** `src/app/api/dashboard/modal/*/route.ts` (3 archivos)

### P0 — BannerWizard freeze
**Síntoma:** Al cambiar objetivo/estilo/producto en BannerWizard, la UI se congelaba.
**Fix:** 1) `setVariantes([])` en los 3 onChange handlers. 2) `if (generating) return` guard. 3) `setTimeout(80)` para spinner. 4) Ref callback estable con `data-ref-id`. 5) `useEffect` cleanup.
**Commit:** `b9d6508`
**Archivos:** `src/app/dashboard/vitrina/BannerWizard.tsx`

### P0 — Token Modal PCC
**Síntoma:** Modal de recarga de tokens no aparecía en PCC tiendas.
**Fix:** Agregar modal faltante en `pcc/tiendas/page.tsx`.
**Commit:** `c620ca2`

### Dashboard Analytics v2
Dashboard socio expandido con 8 secciones: chart, KPIs, ganancias condicionales, comparativas 2×2, top 5 productos, salud del negocio. Nueva función `calcularTodasLasMetricas()` retorna `DashboardFullMetrics`.
**Commit:** `23bc03c`

### Logo gigante en landing
**Síntoma:** Logo ocupaba toda la pantalla en landing por conflicto de CSS layering en Tailwind v4.
**Fix:** Ajuste de estilos de layout.
**Commit:** `4f805e2`

### UX Passes (Micro, Orders, Storefront, Performance, Motion, Native Feel)
Sprint de mejoras UX: skeleton loading, micro-interacciones, optimizaciones de rendimiento, gestos swipe, PWA, transitions.
**Commit:** `14b728d`

### Glassmorphism Redesign + Sidebar/Bottom Nav restructure
Rediseño visual completo con glassmorphism, sidebar restructurada, bottom nav con swipe transitions, botón PWA install.
**Commit:** `893f0ab`

### Varios dark mode fixes
Inputs en dark mode, FOUC (flash of unstyled content) del theme, colores de placeholder, has-checked en oscuro.
**Commit:** `5a85dab`

### Eliminación de dependencia @supabase/ssr
`@supabase/ssr` causaba problemas de compatibilidad con React 19. Reemplazado por `@supabase/supabase-js` directo en todos los clientes.
**Commit:** `af41a43`

### Lazy supabase client en login route
La ruta de login cargaba el cliente Supabase de forma eager, causando errores en Vercel Edge Runtime. Fix con lazy initialization.
**Commit:** `d9e0db7`

---

## Bugs Pendientes

### P1 — Inventario: editar producto no persiste (RESUELTO — Sprint UX V2 Fase 3)
**Síntoma:** Al editar un producto y guardar, los cambios no se reflejaban después de refrescar la página.
**Causa raíz:** El formulario de edición inline en `ProductoActions.tsx` tenía lógica de estado desconectada del server action. El `useActionState` no se sincronizaba correctamente con el modal.
**Fix:** Migrar editar producto a `ProductoForm(mode="edit")` + `ProductoModal`. El flujo ahora es: ProductoRowActions → ProductoModal → ProductoForm → actualizarProducto(). El formulario unificado maneja correctamente el estado y los datos.
**Estado:** ✅ Resuelto en Sprint UX V2 Fase 3.
**Archivos:** `src/components/inventario/ProductoForm.tsx`, `src/app/dashboard/inventario/ProductoRowActions.tsx`

### P1 — Hooks violation en Dashboard/Vitrina
**Síntoma:** Error "Rendered more hooks than during the previous render" en `Router (app-router.tsx:168:45)` al entrar a Dashboard/Vitrina en dev mode.
**Causa tentativa:** `React.memo(PlantillaPreview)` + React 19 reconciliation. Ocurre solo en dev mode. No reproducible en production build.
**Archivos:** `src/components/catalog/CatalogoModal.tsx`

### P1 — Auth en /api/push/send (RESUELTO — Sprint P1-A)
**Síntoma:** El endpoint `POST /api/push/send` no tenía autenticación.
**Fix:** `getSession(req)` verifica cookie `nx_session`. Retorna 401 si no hay sesión. Usa `session.tiendaId` en vez del body.
**Estado:** ✅ Cerrado en Sprint P1-A.
**Archivos:** `src/app/api/push/send/route.ts`

### P1 — RLS push_subscriptions ausente (RESUELTO — Sprint P1-A)
**Síntoma:** Política tautológica `id_tienda = (SELECT id_tienda FROM tiendas...)` — siempre verdadera porque `tiendas` no tiene columna `id_tienda`.
**Fix:** `id_tienda IN (SELECT id FROM tiendas)`. Migration `054_fix_rls_push_subscriptions.sql`.
**Estado:** ✅ Cerrado en Sprint P1-A.
**Archivos:** `supabase/migrations/053_push_subscriptions.sql`

### P1 — IDOR en actualizarEstado (RESUELTO — Sprint P1-A)
**Síntoma:** La primera SELECT de pedido no filtraba por `id_tienda`, permitiendo leer datos de pedidos de otras tiendas.
**Fix:** `.eq('id_tienda', sessionId)` agregado a la SELECT.
**Estado:** ✅ Cerrado en Sprint P1-A.
**Archivos:** `src/app/dashboard/pedidos/actions.ts`

### P2 — Stock decremento inconsistente
**Síntoma:** El checkout decrementa stock sin protección de condición de carrera. Dos pedidos simultáneos pueden decrementar el mismo stock por debajo de 0 o aceptar más stock del disponible.

### P2 — Realtime reconnection
**Síntoma:** Los canales real-time de Supabase en el dashboard no reconectan automáticamente al perder conexión. El usuario debe refrescar la página manualmente. El polling 30s mitiga parcialmente.

### P2 — WhatsApp templates modal
**Síntoma:** El modal de templates de WhatsApp tiene problemas de UX/interacción reportados. No auditado en profundidad.
**Archivos:** `src/app/dashboard/whatsapp/page.tsx`

### P2 — PWA QA pendiente
El catálogo público tiene capacidades PWA pero no se ha auditado:
- Service worker funcionalidad offline
- Manifest completo (icons, splash, colors)
- Estrategia de cache
- iOS compatibility (standalone mode)

### P2 — Regalos historial
El módulo de regalos corporativos (`/dashboard/regalos`) solo tiene `page.tsx`. No hay historial completo, filtros ni acciones masivas.

### P2 — Dashboard auto-refresh (RESUELTO — Sprint 2 Estabilización)
**Síntoma:** El dashboard no actualiza datos automáticamente. El usuario debe refrescar la página.
**Fix:** Implementado `setInterval(refrescarTodo, 30000)` como fallback junto a la suscripción real-time de Supabase (canal `realtime_productos`). El polling garantiza actualización incluso si el canal real-time falla.
**Estado:** ✅ Resuelto en Sprint 2 Estabilización.

### P3 — Banner Builder (post-beta)
Feature completo pero oculto tras `BANNER_BUILDER_ENABLED=false`. Pendiente QA y habilitación.

### P3 — Cupones y Marketing
Módulos existentes pero no auditados. Se desconoce su estado funcional.

---

## QA Status

### ✅ Aprobados (QA pasó en pruebas manuales)

| Módulo | Cover | Notas |
|--------|-------|-------|
| Auth — Login | Login con password, sesión 30 días, rate limiting | Fix P0 logout aplicado |
| Auth — Logout | Server-side endpoint, ambas cookies limpias | Commit `66d3b19` |
| Inventario — Crear | Form completo, imagen, variantes, oferta | Funciona para estandar y ropa |
| Inventario — Eliminar | Confirm dialog, server action | OK |
| Inventario — Listar | Cards mobile + table desktop, KPIs, filtros | OK |
| Pedidos — Listar | Lista filtrada por estado | OK |
| Catálogo público | Cards, quick view, carrito, checkout | OK |
| Dashboard — KPIs | 4 cards + chart + comparativas | OK |
| Dashboard — Analytics v2 | 8 secciones, métricas completas | Commit `23bc03c` |
| PCC — Dashboard | MRR, tiendas activas, health check | OK |
| PCC — Tiendas | CRUD, tokens, suscripciones | Fix token modal aplicado |

### ⚠️ Pendientes de QA

| Módulo | Riesgo | Notas |
|--------|--------|-------|
| Inventario — Editar | ✅ Resuelto | Bug P1 corregido. Edit usa ProductoForm unificado |
| Vitrina Studio | **ALTO** | Hooks violation P1, UX complejo |
| WhatsApp | Medio | Modal templates no auditado |
| Regalos | Bajo | Sin features complejos |
| Cupones | Desconocido | No auditado |
| Marketing | Desconocido | No auditado |
| PWA (catálogo) | Medio | Service worker, offline, iOS |
| Onboarding | Bajo | Flujo básico, no auditado |
| Recovery Center | Bajo | No auditado |

---

## Definition of Done (Beta)

Criterios para considerar Nexus Core V2 listo para lanzamiento beta público:

### 🟢 Must-have (bloqueante)

- [ ] **Login/Logout estable** en producción (Vercel HTTPS)
  - Sesión 30 días sin pérdida
  - Logout server-side funcional
  - Sin errores de cookie
- [ ] **Inventario completo**
  - Crear producto ✅
  - Editar producto ✅
  - Eliminar producto ✅
  - Listar con filtros ✅
  - Importar CSV ✅
  - Imagen subida/optimización ✅
- [ ] **Pedidos completo**
  - Recibir pedido desde catálogo público ✅
  - Listar con filtros por estado ✅
  - Confirmar/completar/cancelar ✅
  - Ticket imprimible ✅
- [ ] **Dashboard estable**
  - KPIs correctos ✅
  - Charts cargan ✅
  - Sin hooks violation P1
  - Auto-refresh implementado
- [ ] **Catálogo público funcional**
  - Cards de producto ✅
  - Quick view ✅
  - Carrito + checkout ✅
  - WhatsApp CTA ✅
  - Tallas/variantes en modal select ✅
  - Boutique (peso/libra) ✅
- [ ] **Vitrina Studio funcional**
  - Plantillas visuales ✅
  - Cambio de colores/logo ✅
  - Vista previa ✅
  - Sin hooks violation P1
- [ ] **Sin bugs P0/P1 abiertos**

### 🟡 Should-have (no bloqueante pero deseable)

- [ ] PWA validada (service worker, manifest, iOS)
- [ ] WhatsApp templates modal funcional
- [ ] Regalos historial (tabla + filtros)
- [ ] Dashboard auto-refresh
- [ ] E2E tests para flujos críticos (Playwright)

### 🔵 Could-have (post-beta)

- [ ] Banner Builder habilitado
- [ ] Cupones auditados
- [ ] Marketing auditado
- [ ] Exportación de reportes
- [ ] Bulk edit en inventario

---

## Roadmap Inmediato

### Sprint completado — Sprint P0-B + P0-C (Security Hardening)

**Sprint P0-B — PCC Security Hardening:**

| Tarea | Estado |
|-------|--------|
| S2 — PCC middleware ausente | ✅ |
| S4 — Cookie PCC forjable | ✅ |
| Validación: PCC login | ✅ |
| Validación: PCC logout | ✅ |
| Validación: Middleware PCC | ✅ |
| Validación: APIs PCC protegidas | ✅ |

**Sprint P0-C — Dashboard Session Hardening:**

| Tarea | Estado |
|-------|--------|
| S1 — login-as sin autenticación | ✅ |
| S5 — Legacy UUID session bypass | ✅ |
| Validación: Dashboard login | ✅ |
| Validación: Dashboard logout | ✅ |
| Validación: Login-as | ✅ |
| Validación: Sesiones firmadas | ✅ |

**Commit:** `0f4bba5`

### Sprint completado — Sprint P1-A — Push + Data Access Hardening

**Commit:** (pendiente)

| Tarea | Prioridad | Estado |
|-------|-----------|--------|
| Auth en `/api/push/send` | P1 | ✅ |
| Fix RLS `push_subscriptions` | P1 | ✅ |
| Fix IDOR `actualizarEstado` | P1 | ✅ |

**Correcciones:**

* **Auth `/api/push/send`**: `getSession(req)` verifica cookie `nx_session` antes de procesar. Retorna 401 si no hay sesión. Usa `session.tiendaId` en vez del body `id_tienda` (previene que un usuario autenticado envíe push a otra tienda).
* **RLS `push_subscriptions`**: Política tautológica corregida — `id_tienda = (SELECT id_tienda FROM tiendas WHERE id = id_tienda)` → `id_tienda IN (SELECT id FROM tiendas)`. Migration `054_fix_rls_push_subscriptions.sql` creada.
* **IDOR `actualizarEstado`**: Primera SELECT de pedido ahora filtra por `.eq('id_tienda', sessionId)`.

**Archivos modificados:**
* `src/app/api/push/send/route.ts` — auth agregado
* `src/app/dashboard/pedidos/actions.ts` — IDOR fix
* `supabase/migrations/053_push_subscriptions.sql` — RLS fix (fresh installs)
* `supabase/migrations/054_fix_rls_push_subscriptions.sql` — RLS fix (nueva migración)

**Validaciones ejecutadas:**
* Typecheck: ✅ sin errores
* Checkout: usa `sendPushToTienda()` directo (no pasa por `/api/push/send`)
* Subscribe/unsubscribe: usan `createAdminClient()` (bypass RLS, no afectado)

**Riesgos remanentes:**
* Clientes quick-buy (ProductCard, ProductQuickView, ProductDetailClient) llaman a `/api/push/send` sin sesión — recibirán 401 silencioso (`.catch()`). Push desde quick-buy solo funciona si el dueño está logueado en el dashboard mientras navega su catálogo.
* RLS no protege contra admin client (bypass intencional por diseño). La fix es defensa-en-profundidad para accesos con anon key.

### Sprint P1-B — Data Integrity

| Tarea | Prioridad | Estado |
|-------|-----------|--------|
| Stock decremento inconsistente | P2 | ⬜ |
| Realtime reconnection | P2 | ⬜ |

### Sprint P2 — Pre-lanzamiento

| Tarea | Prioridad | Estado |
|-------|-----------|--------|
| Hooks violation P1 — investigar | P2 | ⬜ |
| WhatsApp templates modal — auditoría y fix | P2 | ⬜ |
| Regalos historial — tabla completa con filtros | P2 | ⬜ |
| PWA QA completo (service worker, manifest, iOS) | P2 | ⬜ |
| Cupones — auditoría funcional | P3 | ⬜ |
| Marketing — auditoría funcional | P3 | ⬜ |
| E2E tests Playwright para flujos críticos | P2 | ⬜ |

---

## Technical Debt

### TD1 — Formulario de producto duplicado (Media — resuelto)

| Ítem | Detalle |
|------|---------|
| **Archivos** | `AgregarProductoForm.tsx` (496 lines) — eliminado |
| **Problema** | Existían 3 implementaciones del formulario de producto. `ProductoForm.tsx` unificado creado y adoptado para crear y editar. `ProductoActions.tsx` reemplazado por `ProductoRowActions.tsx` (sin form). |
| **Impacto** | Eliminado por completo. Ya no hay duplicación. |
| **Fix** | ✅ `ProductoForm.tsx` implementado. ✅ `FloatAddButton` y `QuickAddProduct` migrados. ✅ `AgregarProductoForm.tsx` eliminado. |

### TD2 — Componentes monolíticos (Alta)

| Ítem | Detalle |
|------|---------|
| **Archivos** | `InventarioClient.tsx` (518 lines), `DashboardShell.tsx` (1166 lines), `DashboardClient.tsx` (664 lines) |
| **Problema** | 4 componentes > 500 líneas cada uno, con lógica mezclada (UI + estado + handlers + JSX condicional). |
| **Impacto** | Difícil de mantener, testear y extender. |
| **Fix** | Dividir en componentes más pequeños siguiendo principios SRP. Priorizar `InventarioClient.tsx` (ya auditado). |

### TD3 — Vitrina Studio complejo (Media)

| Ítem | Detalle |
|------|---------|
| **Archivo** | `vitrina/page.tsx` (~1054 lines) |
| **Problema** | Un solo archivo maneja 3 tabs completas (Catálogo, WhatsApp, Banner), cada una con su propia lógica de estado, templates, previews y persistencia. |
| **Impacto** | Hooks violation P1 puede originarse aquí. Difícil de razonar. |
| **Fix** | Refactorizar en 3 componentes separados. Extraer lógica de templates a hooks. |

### TD4 — Banner Builder oculto (Media)

| Ítem | Detalle |
|------|---------|
| **Archivo** | `BannerWizard.tsx` (405 lines) |
| **Problema** | Código completo y funcional pero oculto tras feature flag. No recibe mantenimiento mientras está oculto. |
| **Impacto** | Posible rotura silenciosa si cambian dependencias (ej. PlantillaPreview). |
| **Fix** | QA completo y habilitación post-beta. No modificar `CatalogoModal.tsx` sin verificar Banner Wizard. |

### TD5 — Sin tests automatizados (Alta)

| Ítem | Detalle |
|------|---------|
| **Problema** | Cero tests unitarios, de integración o e2e en CI. Playwright está en devDependencies pero no se usa. |
| **Impacto** | Bugs P0 llegan a producción (logout, UUID). No hay red de seguridad para refactors. |
| **Fix** | Implementar tests e2e para flujos críticos (login, crear producto, checkout) antes del beta launch. |

### TD6 — Sin paginación (Media)

| Ítem | Detalle |
|------|---------|
| **Problema** | Consultas `SELECT * FROM productos WHERE id_tienda = X ORDER BY nombre` sin LIMIT ni OFFSET. |
| **Impacto** | Degradación con >500 productos o >1000 pedidos. |
| **Fix** | Implementar paginación server-side con cursor o offset. |

### TD7 — Auth: sin refresh token ni rotación (Baja)

| Ítem | Detalle |
|------|---------|
| **Problema** | Token JWT dura 30 días sin posibilidad de refresh. No hay blacklist de tokens revocados. |
| **Impacto** | Si un token se filtra, es válido por 30 días. No hay manera de forzar logout remoto. |
| **Fix** | Post-beta: implementar refresh token, version de token, o blacklist en DB. |

### TD8 — Módulos sin auditoría (Baja)

| Ítem | Detalle |
|------|---------|
| **Archivos** | `cupones/page.tsx`, `marketing/page.tsx`, `dashboard/analiticas/` |
| **Problema** | Existencia confirmada pero estado funcional desconocido. Sin auditoría ni tests. |
| **Impacto** | Posibles bugs o funcionalidad rota. |
| **Fix** | Incluir en sprint de estabilización pre-lanzamiento. |

### TD9 — Moneda hardcodeada (Baja)

| Ítem | Detalle |
|------|---------|
| **Problema** | RD$ hardcodeado en toda la UI. No hay soporte multi-moneda. |
| **Impacto** | Limita expansión a otros mercados. |
| **Fix** | Usar `moneda_simbolo` de la tabla `tiendas`. Post-beta. |

---

## Variables de Entorno

```
NEXT_PUBLIC_SUPABASE_URL=           # URL del proyecto Supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=      # Anon key (pública)
SUPABASE_SERVICE_ROLE_KEY=          # Service role key (secreta)
NEXT_PUBLIC_APP_URL=                # http://localhost:3000 en dev
AUTH_SECRET=                        # Secreto para firmar tokens JWT
RECOVERY_SECRET=                    # (opcional) Secreto para recovery
```

**Nota:** `SUPABASE_SERVICE_ROLE_KEY` debe existir y ser válida. Sin ella, `createAdminClient()` retorna `{ supabase: null }` y las operaciones de escritura fallan silenciosamente (error retornado pero no siempre mostrado al usuario).

---

## Archivos Clave

### Inventario

| Archivo | Líneas | Rol |
|---------|--------|-----|
| `src/app/dashboard/inventario/page.tsx` | 43 | Server component, fetch data |
| `src/app/dashboard/inventario/InventarioClient.tsx` | ~520 | Main UI: KPIs, search, filters, list, modals, CSV export |
| `src/app/dashboard/inventario/ProductoRowActions.tsx` | 108 | Row actions: editar (via ProductoModal), eliminar |
| `src/app/dashboard/inventario/AgregarProductoForm.tsx` | 496 | **ELIMINADO** — reemplazado por ProductoForm |
| `src/app/dashboard/inventario/ImportadorCSV.tsx` | 258 | CSV import |
| `src/app/dashboard/inventario/FloatAddButton.tsx` | 39 | FAB button (usa ProductoModal + ProductoForm) |
| `src/app/dashboard/inventario/actions.ts` | 143 | Server actions: CRUD producto |
| `src/components/inventario/ProductoForm.tsx` | 520 | Formulario unificado crear/editar (estándar, ropa, boutique) |
| `src/components/inventario/ProductoModal.tsx` | 37 | Modal wrapper reutilizable |

### Pedidos

| Archivo | Líneas | Rol |
|---------|--------|-----|
| `src/app/dashboard/pedidos/page.tsx` | — | Server component |
| `src/app/dashboard/pedidos/PedidosLista.tsx` | — | Lista con filtros |
| `src/app/dashboard/pedidos/PedidoRow.tsx` | — | Fila de pedido individual |
| `src/app/dashboard/pedidos/TicketPedido.tsx` | — | Ticket/imprimible |
| `src/app/dashboard/pedidos/BestSellers.tsx` | — | Top productos |
| `src/app/dashboard/pedidos/GraficoSemanal.tsx` | — | Chart semanal |
| `src/app/dashboard/pedidos/actions.ts` | — | Server actions |

### Dashboard

| Archivo | Líneas | Rol |
|---------|--------|-----|
| `src/app/dashboard/page.tsx` | — | Server component, fetch metrics |
| `src/app/dashboard/DashboardClient.tsx` | 664 | Main UI: 8 secciones, charts |
| `src/app/dashboard/DashboardShell.tsx` | 1166 | Layout: sidebar, bottom nav, header, notificaciones |
| `src/app/dashboard/dashboard-metrics.ts` | — | Lógica de métricas (calculate) |
| `src/app/dashboard/actions.ts` | 103 | Server action: recalcular dashboard |
| `src/app/dashboard/StoreToggle.tsx` | — | Toggle abierto/cerrado |
| `src/app/dashboard/QuickAddProduct.tsx` | — | Quick add desde dashboard (usa ProductoModal + ProductoForm) |

### Auth

| Archivo | Rol |
|---------|-----|
| `src/lib/auth/session.ts` | Create/verify session token (HMAC-SHA256) |
| `src/lib/auth/get-session.ts` | Get session from cookie/request |
| `src/app/api/auth/login/route.ts` | Login endpoint (scrypt, rate limit) |
| `src/app/api/auth/logout/route.ts` | Logout endpoint (server-side cookie clear) |
| `src/app/api/auth/register/route.ts` | Register endpoint |
| `middleware.ts` | Route protection |

### PCC

| Archivo | Rol |
|---------|-----|
| `src/app/pcc/page.tsx` | Dashboard PCC (MRR, health, activity) |
| `src/app/pcc/tiendas/page.tsx` | Gestión de tiendas (CRUD, tokens, modal) |
| `src/app/pcc/finanzas/` | Reportes financieros |
| `src/app/pcc/logs/` | Auditoría de actividades |
| `src/app/pcc/whatsapp/` | Configuración WhatsApp global |
| `src/app/pcc/landing-vitrina/` | Landing pages de tiendas |
| `src/app/pcc/configuracion/` | Configuración global del sistema |

### Vitrina

| Archivo | Líneas | Rol |
|---------|--------|-----|
| `src/app/dashboard/vitrina/page.tsx` | ~1054 | Vitrina Studio (3 tabs) + Banner Builder |
| `src/app/dashboard/vitrina/BannerWizard.tsx` | 405 | Banner Builder (oculto) |
| `src/app/dashboard/vitrina/DisenosLibrary.tsx` | — | Biblioteca de diseños |

### Catálogo público

| Archivo | Rol |
|---------|-----|
| `src/components/catalog/CatalogoModal.tsx` | Modal de configuración de catálogo + PlantillaPreview |
| `src/components/catalog/ProductCard.tsx` | Card de producto |
| `src/components/catalog/ProductQuickView.tsx` | Quick view modal |
| `src/components/catalog/BotonWhatsApp.tsx` | WhatsApp CTA |
| `src/components/catalog/BottomNav.tsx` | Navegación inferior |
| `src/components/catalog/TabInicio.tsx` | Tab de inicio |
| `src/components/catalog/TabMenu.tsx` | Tab de menú/productos |
| `src/components/catalog/TabPedidos.tsx` | Tab de historial pedidos |
| `src/components/catalog/TabTickets.tsx` | Tab de tickets/canje |
| `src/components/catalog/ModalSeleccionarTalla.tsx` | Selector de talla |
| `src/components/catalog/ModalSeleccionPeso.tsx` | Selector de peso (boutique) |

### Supabase Migrations (seleccionadas)

| Migración | Propósito |
|-----------|-----------|
| `028_add_tipo_negocio.sql` | Agrega `tipo_negocio` a tiendas |
| `030_add_tallas.sql` | Agrega columna `tallas` JSONB a productos |
| `031_add_tipo_articulo.sql` | Agrega `tipo_articulo` a productos |
| `046_catalogo_modal.sql` | Tabla `catalogo_modal` para configuración |
| `047_catalogo_modal_historial.sql` | Historial de cambios de modal |
| `048_rate_limiting.sql` | Rate limiting en login |
| `050_recovery_center.sql` | Centro de recuperación de datos |
| `051_whatsapp_templates.sql` | Templates de WhatsApp |
| `052_disenos_biblioteca.sql` | Biblioteca de diseños (vitrina) |

---

## Deployment Checklist

### Pre-deploy

- [ ] `AUTH_SECRET` configurado en Vercel Environment Variables
- [ ] `SUPABASE_SERVICE_ROLE_KEY` configurada en Vercel Environment Variables
- [ ] `NEXT_PUBLIC_SUPABASE_URL` configurada en Vercel Environment Variables
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` configurada en Vercel Environment Variables
- [ ] `NEXT_PUBLIC_APP_URL` configurada (https://... en producción)
- [ ] Migraciones Supabase aplicadas (hasta `052_disenos_biblioteca.sql`)
- [ ] Real-time habilitado en tablas `productos` y `pedidos`
- [ ] Build local sin errores: `npm run build`
- [ ] Type-check: `npm run type-check` (0 errores)
- [ ] Lint: `npm run lint` (0 errores)

### Post-deploy

- [ ] Login de socio: verificar sesión 30 días
- [ ] Logout: verificar que redirige a `/login` y cookie se borra
- [ ] Logout en HTTPS: verificar que el endpoint server-side funciona
- [ ] Crear producto: verificar que aparece en el listado
- [ ] Editar producto: verificar que cambios persisten al refrescar
- [ ] Eliminar producto: verificar confirmación y eliminación
- [ ] Catálogo público: verificar que muestra productos actualizados
- [ ] Carrito: verificar flujo completo de checkout
- [ ] Dashboard: verificar que KPIs y charts cargan
- [ ] Vitrina: verificar que cambios de modal se reflejan
- [ ] PCC: verificar login y gestión de tiendas
- [ ] PWA: verificar manifest y service worker registrados

### Rollback

- [ ] `git revert HEAD` para deshacer el último commit
- [ ] O `git reset --hard <commit-anterior> && git push --force` (con cuidado)
- [ ] En Vercel: redeploy del último deploy conocido bueno

---

## Recovery Guide

Si algo se rompe en producción, seguir esta checklist de diagnóstico:

### 1. Verificar Auth

```
Problema: Usuario no puede loguear o es redirigido al login después de autenticarse
```

- [ ] Abrir DevTools → Application → Cookies → Verificar que `nx_session` existe
- [ ] Si no existe: el login no creó la cookie
- [ ] Si existe: copiar valor y verificar formato (debe tener un `.` separador)
- [ ] Verificar que `AUTH_SECRET` en Vercel coincide con `.env.local`
- [ ] Ir a `/api/auth/session-id` (endpoint de diagnóstico, si existe)
- [ ] Verificar `middleware.ts` que no esté redirigiendo en bucle
- [ ] Verificar que el login devuelve `secure: !isLocalhost` (no `secure: false`)

### 2. Verificar Cookies

```
Problema: Logout no funciona o sesión no persiste
```

- [ ] Abrir DevTools → Application → Cookies → Ver `nx_session` y `nx_colaborador`
- [ ] Probar logout manual: `POST /api/auth/logout` desde console:
  ```js
  await fetch('/api/auth/logout', { method: 'POST' })
  ```
- [ ] Verificar que las cookies tienen `max-age: 0` después del logout
- [ ] Si el problema es solo en HTTPS: verificar flag `Secure`
- [ ] Verificar que `document.cookie` no está siendo usado (debe ser `fetch('/api/auth/logout')`)

### 3. Verificar Supabase

```
Problema: Datos no se guardan o consultas fallan
```

- [ ] Ir a Supabase Dashboard → SQL Editor → Probar consulta directa
- [ ] Verificar RLS policies: `SELECT * FROM rls_policies WHERE tablename = 'productos'`
- [ ] Verificar `SUPABASE_SERVICE_ROLE_KEY` en Vercel Environment Variables
- [ ] Probar service role: en local, consulta directa con service role key
- [ ] Verificar que la tabla existe y tiene las columnas esperadas
- [ ] Verificar real-time publication: `SELECT * FROM pg_publication_tables`
- [ ] Verificar row count: `SELECT count(*) FROM productos WHERE id_tienda = '...'`

### 4. Verificar Vercel

```
Problema: Build falla o deploy no refleja cambios
```

- [ ] Ir a Vercel Dashboard → Deployments → Ver último deploy
- [ ] Ver logs del build: buscar errores de TypeScript, ESLint, o módulos faltantes
- [ ] Verificar que el commit esperado está deployado
- [ ] Verificar Environment Variables en Vercel → Project Settings → Environment Variables
- [ ] Forzar redeploy: Vercel Dashboard → Deployments → ... → Redeploy
- [ ] Si el build falla: `npm run build` local para reproducir

### 5. Revisar Logs del Servidor

```
Problema: Error misterioso, no se reproduce local
```

- [ ] Buscar `console.log` o `console.error` en el código del módulo afectado
- [ ] Revisar logs de Vercel: Dashboard → Deployments → Último → Function Logs
- [ ] Los `console.log` en Server Actions aparecen en Vercel Function Logs
- [ ] Buscar strings `[DIAG]` en los logs (logging temporal agregado)
- [ ] Si no hay logs: agregar `console.log` temporal y redeployar

### Quick Diagnostic Script

```js
// Ejecutar en DevTools Console del dashboard
async function diag() {
  const c = document.cookie
  console.log('Cookies:', c)
  console.log('nx_session:', document.cookie.match(/nx_session=([^;]+)/)?.[1])
  try {
    const r = await fetch('/api/auth/session')
    const d = await r.json()
    console.log('Session API:', d)
  } catch(e) { console.error('Session API error:', e) }
}
```

---

## Changelog

### 2026-06-01 — Sprint P1-A — Push + Data Access Hardening

##### Corregido
- **Auth `/api/push/send`**: `getSession(req)` verifica cookie `nx_session`. Retorna 401 si no hay sesión. Usa `session.tiendaId` en vez del body.
- **RLS `push_subscriptions`**: Política tautológica corregida (`id_tienda = (SELECT id_tienda FROM tiendas...)` → `id_tienda IN (SELECT id FROM tiendas)`). Migration `054_fix_rls_push_subscriptions.sql`.
- **IDOR `actualizarEstado`**: Primera SELECT de pedido ahora filtra por `.eq('id_tienda', sessionId)`.

##### Archivos
- `src/app/api/push/send/route.ts`, `src/app/dashboard/pedidos/actions.ts`
- `supabase/migrations/053_push_subscriptions.sql`, `supabase/migrations/054_fix_rls_push_subscriptions.sql`

### 2026-06-01 — Sprint P0-B + P0-C Security Hardening

**Commit:** `0f4bba5`

##### Corregido
- **S1 — login-as sin autenticación**: ahora requiere sesión PCC válida para ejecutar login-as
- **S2 — PCC middleware ausente**: middleware propio para rutas `/pcc/*` con verificación de `nx_pcc`
- **S4 — Cookie PCC forjable**: `nx_pcc` migrada a token firmado HMAC-SHA256 (antes UUID plano)
- **S5 — Legacy UUID session bypass**: `getSessionFromCookieValue` ya no acepta UUIDs planos

##### Estado
- Vulnerabilidades críticas corregidas: ✅ S1, S2, S4, S5
- Pendientes principales: Auth push, RLS push_subscriptions, IDOR actualizarEstado, Stock decremento, Realtime reconnection

### 2026-05-30 — Sprint 2 Estabilización

#### Sprint UX Inventario V2 (mañana) + Sprint 2 Estabilización (tarde)

##### Añadido
- Dashboard auto-refresh polling: `setInterval(refrescarTodo, 30000)` como fallback junto a Supabase realtime
- `ProductoModal.tsx` migrado a React Portal (`createPortal` en `document.body`)

##### Modificado
- `FloatAddButton.tsx` — reemplazado inline modal + AgregarProductoForm por ProductoModal + ProductoForm(mode="create")
- `QuickAddProduct.tsx` — misma migración; ahora acepta `tipoNegocio` prop
- `DashboardClient.tsx` — import no utilizado de QuickAddProduct removido
- `InventarioClient.tsx:344` — hover-lift removido temporalmente de cards mobile
- `ProductoForm.tsx:505` — sticky footer simplificado (eliminado `sticky bottom-0`)

##### Eliminado
- `AgregarProductoForm.tsx` (496 líneas) — reemplazado por ProductoForm, sin referencias

##### Corregido
- **Green switches en mobile** — causa raíz: `hover-lift` con `translateY(-2px)` rompía `position: fixed` del modal
- **Modal stacking context** — React Portal elimina dependencia del contexto del dashboard; SSR seguro
- **Footer sticky interrupción** — los botones ahora aparecen naturalmente al final del formulario

##### Pendiente
- Hooks violation P1 (React.memo + React 19) — no abordado
- WhatsApp templates modal — no auditado
- Regalos historial — no implementado
- PWA QA — pendiente
- E2E tests — pendiente

### 2026-05-30 — Sprint UX Inventario V2 Fase 1-4

##### Añadido
- `PROJECT_STATE.md` v1→v2 creado como documento maestro del proyecto
- Auditoría UX de inventario completada (1792 líneas analizadas, 14 problemas encontrados)
- Diagnóstico logging en `actualizarProducto` (commit `663584c`)
- `ProductoForm.tsx` — formulario unificado crear/editar (520 líneas, soporta estándar, ropa, boutique)
- `ProductoModal.tsx` — modal wrapper reutilizable (37 líneas)
- `ProductoRowActions.tsx` — acciones de fila sin lógica de formulario (108 líneas)
- SKU único por producto con autogeneración `{SKU}-{TALLA}` para variantes
- Leyenda `St = Stock · Pr = Precio · Co = Costo` en tabla de variantes
- Columna `tallas` en exportación CSV con formato `S(5),M(3),L(7)`
- `imagen_url` agregado al payload de `actualizarProducto` (soportaba crear pero no editar)

##### Modificado
- `ProductoForm.tsx` — bifurca `actualizarProducto()` en modo `edit`, `crearProducto()` en modo `create`
- `ProductoActions.tsx` → eliminado (reemplazado por `ProductoRowActions.tsx`)
- `InventarioClient.tsx` — pasa `tiendaId`/`tipoNegocio` a `ProductoRowActions`, export CSV incluye tallas
- `actions.ts` — `actualizarProducto` ahora recibe y persiste `imagen_url`

##### Corregido
- **P1 Inventario edit** — causa raíz: formulario inline en ProductoActions con lógica de estado desconectada del server action. Fix: migrar a `ProductoForm(mode="edit")` + `ProductoModal`.

##### Pendiente
- Migrar `FloatAddButton` y `QuickAddProduct` de `AgregarProductoForm` a `ProductoForm`
- Eliminar `AgregarProductoForm.tsx` (una vez migrados los componentes dependientes)

### 2026-05-29

#### Cambios importantes
- Commit `66d3b19`: Server-side logout endpoint (`POST /api/auth/logout`)
- Commit `b9d6508`: Fix P0 logout (secure flag), BannerWizard freeze fix, BANNER_BUILDER_ENABLED hotfix
- Commit `81435a9`: Fix P0 Modal UUID en todas las rutas `/api/dashboard/modal/*`
- Commit `c620ca2`: Fix P0 Token Modal en PCC tiendas

#### Corregido
- P0 — Logout en producción (Vercel + Chrome 134+)
- P0 — Modal UUID (JWT crudo enviado como UUID a Supabase)
- P0 — BannerWizard freeze (state machine, refs, spinner)
- P0 — Token Modal faltante en PCC

### 2026-05-28

#### Añadido
- Dashboard Analytics v2: 8 secciones, chart, comparativas (commit `23bc03c`)
- Vitrina Studio: 3 tabs, historial unificado, hero simplificado
- Banner Builder V1 (oculto tras feature flag)

### 2026-05-27

#### Añadido
- Glassmorphism UI redesign (commit `893f0ab`)
- Sidebar restructure + bottom nav con swipe transitions

### 2026-05-26

#### Corregido
- Dark mode inputs, FOUC theme, colores en inputs (commit `5a85dab`)
- Logo landing en sidebar PCC (commit `72b8b69`)

### 2026-05-25

#### Corregido
- Eliminación de dependencia `@supabase/ssr` (commit `af41a43`)
- Lazy supabase client en login route para Vercel (commit `d9e0db7`)

### 2026-05-24

#### Añadido
- Inicio del proyecto (commit `aee2d03`)
- Migraciones 001-052 aplicadas
- MVP funcional: auth, inventario, pedidos, catálogo, PCC

---

## Convenciones del Código

- **Sin comentarios** en el código fuente (política del proyecto)
- **'use client'** / **'use server'** explícito en cada archivo
- **Tailwind CSS v4** con diseño responsive: `sm:` para tablet, `md:` para desktop
- **Dark mode** via atributo `data-theme` + `dark:` prefix
- **Moneda:** RD$ hardcodeado (no hay soporte multi-moneda)
- **Formularios:** Preferir `useActionState` + Server Actions para mutations
- **Componentes de una sola página** (no hay barrel exports)
- **Modals** con backdrop `bg-black/40 backdrop-blur-sm`
- **Loading states** con spinner SVG inline
- **Toasts** via `useToast()` desde `@/components/Toast`

---

## Glosario

| Término | Significado |
|---------|------------|
| PCC | Panel de Control Central — operador de la plataforma |
| Socio | Dueño de tienda |
| Colaborador | Empleado con acceso limitado al dashboard |
| Tienda | Negocio individual (cada tenant) |
| Tokens | Créditos para crear productos (según plan) |
| Vitrina | Landing page personalizable de cada tienda |
| Modal | Configuración visual del catálogo público |
| Regalos | Gift experiences corporativos (B2B) |
| Canje | Redención de gift code por el destinatario |
| RLS | Row Level Security — políticas de seguridad a nivel de fila en Supabase |
| Service Role | Rol de Supabase con permisos completos (bypass RLS) |
| Anon Key | Clave pública de Supabase (sujeta a RLS) |
| JWT | JSON Web Token — usado para sesión custom |
| scrypt | Algoritmo de derivación de clave para hash de passwords |
| HMAC-SHA256 | Algoritmo de firma simétrica usado para tokens de sesión |
