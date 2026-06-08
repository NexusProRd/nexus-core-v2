# Nexus Core V2 — Project State

> Documento maestro de arquitectura, decisiones, bugs y roadmap.
> Cualquier nuevo chat, desarrollador o auditor debe empezar aquí.


## Resumen Ejecutivo

**Nexus Core V2** es una plataforma SaaS multi-tenant para pequeños negocios en República Dominicana. Permite a dueños de tiendas gestionar inventario, pedidos, catálogo público, WhatsApp, regalos corporativos y vitrina digital desde un dashboard unificado. Incluye un panel de control centralizado (PCC) para el operador de la plataforma.

| Atributo | Valor |
|----------|-------|
| Stack | Next.js 16.2.6, React 19.2.4, Supabase, Tailwind v4 |
| Base de datos | Supabase PostgreSQL (63 migraciones) |
| Auth | Custom (JWT firmado con HMAC-SHA256, sin Supabase Auth) |
| Sesión | Cookie `nx_session` (token firmado o legacy UUID) |
| Estado | **Beta QA** — módulos funcionales, stock hardening completo, gift audit corregido, Subsistema B migrado a A, production readiness auditado |
| Hosting | Vercel (proyecto conectado vía GitHub) |
| Moneda | RD$ (peso dominicano) — hardcodeado en toda la UI |
| Último commit | `c95af08` — Sprint 4B.2 + Legal 1A: Onboarding alignment, RLS fix (Jun 7) |
| Última verificación | 2026-06-07 — Sprint 4B.2 + Legal 1A completados + Typecheck PASS + Build PASS |

### Módulos

| Módulo | Estado | Prioridad QA |
|--------|--------|-------------|
| Catálogo público | ✅ Funcional | Media |
| Dashboard socio | ✅ Funcional | Alta |
| Inventario | ✅ Funcional (stock hardening completo) | Alta |
| Pedidos | ✅ Funcional | Alta |
| WhatsApp | ✅ Funcional | Media |
| Regalos corporativos | ✅ Funcional (migrado Subsistema B → A) | Media |
| Vitrina Studio | ⚠️ Beta | Alta |
| Banner Builder | 🔴 Oculto (feature flag) | Pospuesto |
| PCC (Panel Control Central) | ✅ Funcional | Alta |
| Auth (login/register) | ✅ Funcional | Crítica |
| Canje de regalos | ✅ Funcional (redemption unificada vía RPC) | Media |
| Landing pública | ✅ Funcional | Baja |
| Cupones | ⚠️ No auditado | Baja |
| Marketing | ⚠️ No auditado | Baja |

---

## Current Focus

### Sprints completados

**Sprint P3-C — Migración Subsistema B → A** + **Production Readiness Audit**
**Sprint 3 — Commercial Infrastructure Foundation**
**Sprint 4A — Commercial Normalization**
**Sprint 4B — Commercial Management Modal**
**Sprint 4C — Legacy plan_nivel Removal**
**Sprint 5A — Commercial Enforcement Fixes**
**Sprint 5A.1 — Commercial UX Polish**
**Sprint 5B.1 — Registration Conversion Improvements**
**Sprint 5C.1 — Register Simplification**
**Sprint 5C.2 — Onboarding Express**
**Sprint 5C.2.1 — Recovery Code UX**
**Sprint 5C.3A — Seguridad de Cuenta**
**Sprint 5C.4 — Primera Experiencia (Checklist Dashboard)**
**Sprint 5C.4.1 — UX Polish Checklist & Deep Links**
**Sprint 5C.5 — Slug Hardening (Server + Frontend Validation)**
**Sprint Hardening Comercial Fase 1 — 10 Server-Side Enforcement Entry Points**
**Sprint Comercial 2D — Diseño Técnico Final del Modelo Comercial**
**Sprint Comercial 2D.1 — PCC Hardening (Penalty Dates Recalculation)**
**Sprint Comercial 3A — Landing Alignment (Q1-Q6 + Pro CTA + Hero)**
**Sprint Conversión 4A — Audit de Conversión (First-Use Journey Analysis)**
**Sprint Conversión 4B.1 — Catalog Presence Card on Dashboard (W1 + W5)**
**Sprint Conversión 4B.2 — Onboarding Alineado al Cliente Ideal**
**Sprint Legal 1A — Auditoría y Corrección RLS de Pedidos**

### Estado

**P3-C Completado.** Subsistema B (tickets/pedidos.is_gift) eliminado. Toda la lógica de regalos unificada en gift_experiences. Tickets migrados con backfill, creación de gifts redirigida a gift_experiences, enlaces legacy redirigen a /canje. Stock management, aprobación y canje permanecen inalterados.

**Production Readiness Audit completado:** Verdict — LISTO PARA PRODUCCIÓN con 75% confianza. Sin bloqueadores P0. Riesgos aceptados: middleware ausente (corrección: `middleware.ts` SÍ existe en raíz del proyecto, protege /pcc, /dashboard, /login), AUTH_SECRET débil, quick-buy stock failures no mostrados al usuario. Recomendación: lanzar hoy con monitoreo activo.

**Sprint 3 Completado.** Nuevas columnas comerciales en tiendas (`plan_tipo`, `plan_status`, `is_founder`, `trial_started_at`, `trial_ends_at`). Backfill aplicado para tiendas existentes. Registro migrado a trial de 30 días. Helper comercial centralizado (`src/lib/commercial.ts`). PCC Tiendas muestra Plan, Estado y Founder. Typecheck PASS. Build PASS.

**Sprint 4A Completado.** Migración de `plan_nivel` a `plan_tipo` en PCC Tiendas (filtro), WhatsApp Broadcast (filtro, display, template), Suscripciones API (response). MRR real basado en `plan_tipo` y precios desde `nexus_config` — reemplaza hardcodeo (`activas * 150`) en metrics y precio único en finanzas. Fix de backfill en migración 058 (`WHERE plan_tipo IS NULL` → `WHERE trial_started_at IS NULL`). Typecheck PASS. Build PASS.

**Sprint 4B Completado.** Modal de configuración comercial en PCC Tiendas para editar `plan_tipo`, `plan_status` e `is_founder` de cada tienda. Acceso desde menú de acciones (desktop y mobile) con "Config. Comercial". Modal con dropdowns para plan_tipo (Emprendedor/Pro), plan_status (6 estados) y toggle is_founder. Actualización directa vía `supabase.from('tiendas').update()` con logging a `nexus_logs`. Typecheck PASS. Build PASS.

**Sprint 4C Completado.** Eliminación completa de `plan_nivel` del código fuente. Tipo `PlanNivel` y campo `plan_nivel` eliminados de `SocioTienda`. Referencias eliminadas de register, onboarding, backups y tests. Bug corregido en suscripciones (`ilimitado` → `pro`). Migración 059 preparada (no ejecutada) para dropear la columna en DB. Typecheck PASS. Build PASS.

**Sprint 5A Completado.** Corrección del enforcement comercial para alinear con reglas de negocio: `is_founder=true` → ilimitado, `token_productos_limite=-1` → ilimitado, `token_productos_limite>0` → límite efectivo. Bug corregido: `>= -1` bloqueaba usuarios Pro. `esIlimitado()` ahora usado correctamente. Importador CSV ya no bypassa límites — verifica antes de insertar. Valores iniciales corregidos: register ya no deja `token_productos_limite` en NULL, onboarding reemplaza hardcode 50 por `getDefaultLimit('emprendedor')` (15). UX mínima: contador `productos / límite` visible en inventario. Typecheck PASS. Build PASS.

**Sprint 5A.1 Completado.** Cierre de UX del límite de productos: botón "Nuevo Producto" deshabilitado al alcanzar límite (evita formularios que serán rechazados); mensajes de error mejorados con contador `"Has alcanzado el límite de tu plan (15 / 15 productos)"`; CTA de upsell por WhatsApp añadido en formulario, CSV y contador del inventario, usando número de soporte configurado en `nexus_config` (sin hardcode). Typecheck PASS. Build PASS.

**Sprint 5B.1 Completado.** Auto-login post-registro: `createSessionToken()` + cookie `nx_session` en register, success screen redirige a /onboarding con auto-redirect 5s. Trial unificado a 30 días en register, onboarding y success screen. Typecheck PASS. Build PASS.

**Sprint 5C.1 Completado.** Register simplificado: eliminados slug input y preguntas de seguridad, registro reducido de 12 a 5 campos. perfil_tienda creado automáticamente en register. 2 productos semilla genéricos creados en register. Enforcement dates (30/37/60) seteados en register. Dashboard y inventario migrados a .maybeSingle(). Typecheck PASS. Build PASS.

**Sprint 5C.2 Completado.** Onboarding Express: reducido a solo país + tipo_negocio. Botón "Omitir por ahora" con defaults seguros (DO, RD$, estandar, onboarding_completo=true). Todos los demás campos movidos a Configuración (5C.3). guardarTienda simplificado a solo upsert de pais_codigo/moneda_simbolo/tipo_negocio/onboarding_completo. Typecheck PASS. Build PASS.

**Sprint 5C.2.1 Completado.** Recovery Code UX: eliminado auto-redirect post-registro que enviaba al usuario a onboarding después de 5s sin dar tiempo a copiar el código. Agregado botón "📋 Copiar código" con `navigator.clipboard.writeText()` y feedback visual "✅ Código copiado". Advertencia visual reforzada (borde más visible, texto "GUARDA ESTE CÓDIGO EN UN LUGAR SEGURO"). Navegación solo mediante botón explícito "Ir a mi tienda". Dependencia de `useRouter` eliminada. Typecheck PASS. Build PASS.

**Sprint 5C.3A Completado.** Nueva sección Seguridad en `/dashboard/configurar` con dos bloques funcionales:
- Código de recuperación: mostrar/copiar/regenerar con feedback visual
- Preguntas de recuperación: 3 preguntas configurables con select + validación de unicidad
- Nueva API route `/api/auth/seguridad` con GET (leer estado) y POST (regenerar-codigo / guardar-preguntas)
- Typecheck PASS. Build PASS.

**Sprint 5C.4 Completado.** Nuevo componente `PrimerosPasos` en dashboard con checklist de activación:
- 4 tareas: recuperación, logo, información, productos
- Barra de progreso visual (0/4 → 4/4)
- Checklist computado en server page (`preguntas_recuperacion`, `perfil_tienda`, `productos`)
- Pasado como prop a `DashboardClient` y renderizado condicional
- Typecheck PASS. Build PASS.

**Sprint 5C.4.1 Completado.** UX Polish del checklist con deep links y navegación directa:
- CTAs navegan a `/dashboard/configurar#seguridad`, `#logo`, `#informacion`
- Anclas `id="seguridad"`, `id="logo"`, `id="informacion"` en configurar page
- Auto-scroll suave via `scrollIntoView({ behavior: 'smooth' })` tras carga de datos
- Eliminada tarea "Personalizar catálogo" (no crítica para activación inicial)
- Barra de progreso actualizada de 0/5 → 0/4 y contador basado en ITEMS.keys
- CTAs mejorados: "Configurar ahora", "Subir logo", "Completar perfil"
- Typecheck PASS. Build PASS.

**Sprint 5C.5 Completado.** Slug hardening completo:
- Slugify unificado en `src/lib/slug.ts` con normalización de acentos, límite 60 chars y fallback
- 28 slugs reservados en `src/lib/reserved-slugs.ts` + validación `SLUG_PATTERN`
- Validación server-side en PATCH `/api/tiendas`: slugify → validarSlug → slugDisponible → UPDATE
- Reuso de `slugDisponible()` en register y PATCH para unicidad
- Manejo de error UNIQUE constraint (código 23505) en ambos endpoints
- Frontend validation en configurar/page.tsx: checks de slug reservado y longitud antes de llamada API
- Register route refactorizada para usar slugify() compartido
- Typecheck PASS. Build PASS.

**Sprint Hardening Comercial Fase 1 Completado.** Cierre de 10 bypass entry points:
- Helper `checkTiendaActiva()` en `src/lib/commercial.ts` — enforcement server-side contra `esta_activa` + `fecha_bloqueo_panel`
- `esIlimitado(null)` corregido: null ahora se trata como limitado (default 15)
- Server Actions protegidos: crearProducto, actualizarProducto, eliminarProducto, toggleStock, ImportadorCSV, actualizarEstado, eliminarTodosLosPedidos, recalcularDashboard
- API routes protegidas: PATCH/DELETE `/api/tiendas`, POST `/api/perfil`
- Migración 060: `cron.unschedule('automatizar-suscripciones')` — deshabilita cron legacy peligroso que usaría `tokens_disponibles=0` para desactivar todas las tiendas
- Typecheck PASS. Build PASS.

**Sprint Comercial 2D Completado.** Diseño técnico final del modelo comercial aprobado:
- Modelo: Trial Emprendedor 30d → dashboard_suspended (15d) → catalog_suspended (16d) → deleted
- Paid: active → grace (15d) → dashboard_suspended (15d) → catalog_suspended (15d) → deleted
- Separación estricta: `plan_tipo` (contractual) vs `plan_status` (operacional)
- `plan_tipo` y `token_productos_limite` nunca los modifica el cron ni el login fallback
- Migración 061: cron v2 (`automatizar_suscripciones_v2()`) — reemplaza cron legacy, maneja todas las transiciones de `plan_status`
- `checkTiendaActiva()` reescrita con staircase lógico descendente — corrige `plan_status` al vuelo según fechas
- DashboardShell migrada de inline check a `checkTiendaActiva()`
- Fechas corregidas en register: `fecha_suspension_catalogo` 37→45d, `fecha_eliminacion_total` 60→61d
- Typecheck PASS. Build PASS.

**Sprint Comercial 2D.1 Completado.** PCC Hardening — cierre del único riesgo pendiente:
- Helper `calcularPenaltyDates()` creado en PCC Tiendas: recalcula `fecha_bloqueo_panel=vencimiento+15d`, `fecha_suspension_catalogo=vencimiento+30d`, `fecha_eliminacion_total=vencimiento+45d`
- 5 ubicaciones corregidas: handleRecargarTokens (individual), batch activar, batch recargar, handleToggleSuspender (desuspender), handleAprobar
- Ahora siempre setea `plan_status='active'` y `esta_activa=true` en cualquier activación/renovación
- Penalty dates ya no se extienden proporcionalmente — se recalculan desde el nuevo `fecha_vencimiento`
- Typecheck PASS. Build PASS.

**Sprint Comercial 3A Completado.** Landing alineada con modelo comercial definitivo:
- Q1: Eliminadas características Pro falsas de landing (analytics, priority support, "todas las funciones")
- Q2: FAQ #7 corregida: trial es Emprendedor, no Pro
- Q3: Pricing disclaimer: "Prueba Nexus 30 días gratis con el plan Emprendedor"
- Q4: Register subtitle: "30 días gratis · 15 productos · Sin tarjeta"
- Q5: Register success: "con el plan Emprendedor" en vez de "todas las funciones"
- Q6: Trust bar: "Soporte por WhatsApp" en vez de "24/7 Soporte local"
- Pro CTA cambiado de "Probar 30 Días Gratis" a "Consultar Plan Pro" (WhatsApp)
- Hero hero: línea de tipos de negocio ("ropa, accesorios, cosméticos, tecnología y más")
- Typecheck PASS. Build PASS.

**Sprint Conversión 4A Completado.** Auditoría del journey first-use:
- Landing → register → onboarding → dashboard → primer producto → catálogo → primer pedido
- 11 hallazgos (F1-F11): stats en 0, paso redundante en checklist, catálogo no visible hasta muy tarde, sin "¡Rayos!" moment
- 7 quick wins propuestos (W1-W7): "Ver mi tienda" button, catalog card, seed products by negocio, etc.
- Conclusión: usuario siente "Tal vez más adelante", no "Necesito esto ahora"
- Sin cambios de código — solo auditoría documentada en conversación
- Commits incluidos en `28b1e82` / `8102c75`

**Sprint Conversión 4B.1 Completado.** Catalog Presence Card en dashboard (quick wins W1 + W5):
- Nueva tarjeta prominente "Tu tienda ya está online" con gradiente teal/emerald, posicionada tras checklist
- Context-aware: "Comparte..." si hay productos activos, "Agrega productos..." si no hay
- Botón "Ver mi tienda" abre catálogo en nueva pestaña
- Componente `CopiarEnlace` reusado para "Copiar enlace" con feedback toast
- URL del catálogo mostrada en formato `<code>` monospace
- Sección antigua "Tu enlace de ventas" eliminada del footer del dashboard
- Typecheck PASS. Build PASS.

**Sprint Conversión 4B.2 Completado.** Onboarding alineado al cliente ideal:
- Bug corregido en `ProductoForm.tsx:77`: `tipoNegocio !== 'estandar'` → `tipoNegocio === 'ropa'` — evita que tipos no-ropa activen el sistema de variantes/tallas
- Nuevos tipos en onboarding: `cosmetica` (Cosméticos y Belleza), `tecnologia` (Gadgets y Tecnología), más el renombrado `ropa` (Ropa y Accesorios) y `estandar` (Otro / General)
- Migración `062_add_onboarding_types.sql`: añade `cosmetica`, `tecnologia` al CHECK constraint de `tipo_negocio`
- Landing Industrias actualizada: 4 disponibles (Ropa, Cosméticos, Tecnología, General) + 3 próximamente (Colmados, Servicios, Tours)
- Sin lógica especializada para cosmética/tecnología — todo no-ropa se comporta como estándar
- Sin migración de datos — tiendas existentes mantienen su tipo actual
- Typecheck PASS. Build PASS.

**Sprint Legal 1A Completado.** Corrección de riesgos críticos P0 de privacidad:
- Migración `063_fix_pedidos_rls.sql`: drop de `select_pedidos_anon` (`USING(true)`), recreación de `delete_pedidos_own_store` scoped a la tienda del owner
- RPC `track_pedido(p_id_tienda, p_query)`: SECURITY DEFINER que requiere `id_tienda` + `order_id` para tracking legítimo, sin exponer `cliente_telefono`
- RPC `obtener_id_pedido_por_order(p_id_tienda, p_order_id)`: devuelve UUID del pedido para flujos quick-buy post-INSERT
- `TabPedidos.tsx`: migrado de `supabase.from('pedidos').select()` directo a RPC; real-time reemplazado por polling cada 6s
- `TrackOrderModal.tsx`: eliminada búsqueda por teléfono (`cliente_telefono.ilike.%"`), ahora requiere `id_tienda` + solo busca por order_id
- 4 flujos quick-buy (`ProductCard`, `ProductQuickView`, `ProductDetailClient`, `TrackingClic`): `.insert().select()` reemplazado por `.insert()` + RPC para obtener el id
- `éxito page`: migrado de `createPublicClient()` a `createAdminClient()` para evitar dependencia de anon SELECT
- Sin cambios en checkout API, gift-purchase, dashboard, PCC — todos usan admin client y no dependen de anon SELECT
- Typecheck PASS. Build PASS.

Todos los sprints de seguridad, hardening, data integrity, gift unification y commercial foundation ejecutados:
- **P0-B/C**: Security Hardening (`0f4bba5`)
- **P1-A/A.1**: Push + Data Access Hardening (`6890792` / `4037c39`)
- **P1-B.1/B.2**: Data Integrity — stock en todos los flujos (`13d1e0d` / `0ad023b`)
- **P2-PREP**: Inventory consistency audit
- **P2-A**: Stock concurrency hardening — B4/B5 (`412bbef`)
- **P2-B**: Fix variant stock restore — B6 (`f09dabf`)
- **P2-C**: Gift approve hardening (`c564a7e`)
- **P2-D**: Gift inventory integrity — I1/I2 (`c6619aa`)
- **P3-A**: Gift redemption unification — R3 (`df028c2`)
- **P3-C**: Gift subsystem migration B→A — legacy_code, tickets drop, is_gift defer (`ef92631`)
- **Sprint 3**: Commercial Infrastructure Foundation (`d305ced` + `3268d49`)
- **Sprint 4A**: Commercial Normalization (`d461c54`)
- **Sprint 4B**: Commercial Management Modal (`dd8f603`)
- **Sprint 4C**: Legacy plan_nivel Removal (`ea1474f`)
- **Sprint 5A**: Commercial Enforcement Fixes
- **Sprint 5A.1**: Commercial UX Polish

### Estado de vulnerabilidades

| ID | Vulnerabilidad | Estado |
|----|---------------|--------|
| S1 | login-as sin autenticación | ✅ Corregido (P0-C) |
| S2 | PCC middleware ausente | ✅ Corregido (P0-B) |
| S4 | Cookie PCC forjable | ✅ Corregido (P0-B) |
| S5 | Legacy UUID session bypass | ✅ Corregido (P0-C) |
| B3 | ProductDetailClient sin stock decrement | ✅ Corregido (P1-B.1) |
| B1/B2/B8 | RPC decrement_stock ignora cantidad/variante/validación | ✅ Corregido (P1-B.2) |
| B4/B5 | Stock race condition (checkout/gift-purchase) | ✅ Corregido (P2-A) |
| B6 | Variant stock restore no funciona en quick-buy | ✅ Corregido (P2-B) |
| I1 | Gift stock descontado dos veces | ✅ Corregido (P2-D) |
| I2 | Gift rechazado sin restauración | ✅ Corregido (P2-D) |
| R3 | GiftRedemption canje no atómico (client-side) | ✅ Corregido (P3-A) |
| — | Gift detection regression (notas marker ausente) | ✅ Corregido (P3-C blocking fix) |

### Pendientes críticos (próximo sprint)

1. **Notificaciones WhatsApp al comprador** — sender_phone + deep link WA para aprobado/canjeado/expirado
2. **Landing + Pricing copy fixes** — alinear con modelo comercial definitivo (audit Sprint 3)
3. **Trial PRO implementation** — register como Pro con 30d ilimitado, auto-transition a Emprendedor
4. **Over-limit UI banners** — stores con >15 productos post-trial deben mostrar aviso
5. **Configuración de expiración por tienda** — 24h/48h/72h/7d configurable para gifts
6. **B7 — Gift quantity > 1** — agregar `cantidad` a `items_list`
7. **Rotar AUTH_SECRET** — Dev secret (`nexus-super-secret-2026-ultra-secure`) debe reemplazarse antes de producción real
8. **Quick-buy stock failure UX** — Mostrar error al usuario cuando `gestionarStock()` falla (actualmente solo console.error)

### Issues de auditoría comercial resueltos

De la auditoría Sprint 4D, estos hallazgos fueron corregidos en Sprint 5A / 5A.1:

| ID | Hallazgo | Sprint |
|----|----------|--------|
| P0-1 | Sin upgrade prompts | ✅ Sprint 5A.1 — CTA WhatsApp en error de límite y contador |
| P0-2 | Límite solo en 1/6 caminos | ✅ Sprint 5A — CSV check, onboarding semilla hereda límite |
| P0-3 | is_founder decorativo | ✅ Sprint 5A — is_founder bypass en crearProducto y CSV |
| P0-4 | plan_status trial sin enforce | ✅ Sprint 2D — cron v2 + login fallback + staircase checkTiendaActiva |
| P0-5 | token_productos_limite inicial incorrecto | ✅ Sprint 5A — register + onboarding usan getDefaultLimit |
| P1-1 | Discrepancia trial 7 vs 30 días | ✅ Sprint 5B.1 — unificado a 30 días en register, onboarding, success screen |
| P1-2 | Sin mensaje de upgrade en error | ✅ Sprint 5A.1 — mensaje mejorado + CTA WhatsApp |
| P1-3 | Sin banner de trial en dashboard | Pendiente (fuera de alcance UX — sprint futuro) |
| P1-4 | Sin contador de productos en inventario | ✅ Sprint 5A — contador visible |
| P2-2 | Onboarding semilla sin verificar límite | ✅ Sprint 5A — límite correcto desde registro (15), menos que 2 semillas |
| — | Slug editable en register (fricción innecesaria) | ✅ Sprint 5C.1 — slug auto-generado, no mostrado en register |
| — | 6 preguntas de seguridad en register (fricción alta) | ✅ Sprint 5C.1 — eliminadas de register |
| — | perfil_tienda ausente sin onboarding (crash riesgo) | ✅ Sprint 5C.1 — creado en register (non-blocking) |
| — | Dashboard .single() crash si perfil_tienda falta | ✅ Sprint 5C.1 — migrado a .maybeSingle() en dashboard + inventario |
| — | Seed products dependientes de onboarding | ✅ Sprint 5C.1 — creados en register (non-blocking) |

---

## Sprint 4D — Commercial Enforcement Audit (Pendiente de implementación)

Auditoría end-to-end del enforcement comercial completada. Hallazgos clasificados por prioridad.

### P0 — Afectan monetización o enforcement directamente

| ID | Hallazgo | Impacto |
|----|----------|---------|
| P0-1 | Sin upgrade prompts en toda la app — cero referencias a upgrade/mejorar/cambiar plan | Usuario que choca límite se va sin camino de conversión |
| P0-2 | Límite de productos solo se enforcea en 1 de ~6 caminos (crearProducto en actions.ts) — importación CSV, backup restore, gift purchase, onboarding semilla, API productos, actualizarProducto no verifican | Bypass completo del límite comercial |
| P0-3 | `is_founder` no tiene lógica de negocio — no cambia límite, descuento, trial ni bypass | Founder es decorativo |
| P0-4 | `plan_status: 'trial'` se asigna pero nunca se enforcea — no hay expiración automática, transición trial→grace ni reacción a `trial_ends_at` | Trial es decorativo |
| P0-5 | `token_productos_limite` inicial inconsistente — register no lo setea (NULL), onboarding lo setea a 50 (no 15), getDefaultLimit(15) nunca se llama | ✅ Sprint 5A — register + onboarding usan getDefaultLimit |

### P1 — Problemas de UX comercial importantes

| ID | Hallazgo | Impacto |
|----|----------|---------|
| P1-1 | Discrepancia trial: backend asigna 30 días, onboarding lo sobrescribe a 7, pantalla de éxito dice 7, landing dice 30 | Confianza del usuario |
| P1-2 | Sin mensaje de upgrade en error de límite — solo `'Límite de plan alcanzado'` sin info del plan actual, límite ni cómo obtener más | Usuario no sabe que existe Pro |
| P1-3 | Sin banner de trial en dashboard — no muestra días restantes, ni "estás en trial, actualiza a Pro", ni fecha de expiración | Usuario no sabe cuándo expira |
| P1-4 | Sin contador de productos usados en inventario — no muestra "12 de 15 productos" ni barra de progreso | Usuario descubre límite al chocar |
| P1-5 | Sistema híbrido token/plan — `tokens_disponibles` legacy convive con `plan_tipo` sin integración; PCC recarga tokens pero no cambia plan | Upgrade path tokens→plan ausente |

### P2 — Mejoras recomendadas

| ID | Hallazgo |
|----|----------|
| P2-1 | `precio_servicio` (RD$49) relic en finanzas/route.ts — código muerto |
| P2-2 | Onboarding inserta 2 productos semilla sin verificar `token_productos_limite` |
| P2-3 | Sin expiración automática de `plan_status: 'trial'` — no hay cron, trigger ni server action |

### Resumen

| Prioridad | Hallazgos | Impacto |
|-----------|-----------|---------|
| **P0** | 5 | Límites bypassables, sin upgrade path, founder decorativo, trial sin enforce, límite inicial incorrecto |
| **P1** | 5 | Inconsistencia trial, sin upgrade UX, sin estado de plan visible, contador de productos ausente, sistema híbrido token/plan |
| **P2** | 3 | `precio_servicio` relic, onboarding sin límite, sin expiración automática |

### Conclusión

Infraestructura comercial bien diseñada en datos (`plan_tipo`, `plan_status`, fechas de enforcement) pero débilmente implementada en runtime:
- Límite de productos solo se enforcea en 1 de ~6 caminos de creación
- Upgrade path no existe — usuario emprendedor en límite no puede subir a Pro desde la app
- Trial es puramente informativo sin lógica de expiración
- Founder es cosmetic-only
- `token_productos_limite` inicial incorrecto (50 vs 15)

La monetización real depende de que PCC administre manualmente cada tienda, no de la app operando autónomamente.

---

### Vulnerabilidades corregidas recientemente

| ID | Vulnerabilidad | Sprint |
|----|---------------|--------|
| — | Gift detection regression (checkout sin marker) | ✅ P3-C blocking fix |

### Próxima acción

Rotar AUTH_SECRET, quick-buy UX error handling, ejecutar migración 059 en DB, implementar hallazgos de auditoría comercial.

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

### ~~R8 — Gift subsystem duplication~~ ✅ Resuelto

| Campo | Valor |
|-------|-------|
| **Estado** | **RESUELTO** en Sprint P3-C (`ef92631`). Subsistema B eliminado. Toda la lógica de regalos unificada en `gift_experiences`. |

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
- `plan_tipo`: `emprendedor` | `pro` (nuevo modelo comercial, reemplaza `plan_nivel`)
- `plan_status`: `trial` | `active` | `grace` | `dashboard_suspended` | `catalog_suspended` | `deleted`
- `is_founder`: boolean — flag de fundador, solo PCC
- `trial_started_at`: inicio del periodo trial
- `trial_ends_at`: fin del periodo trial
- `plan_nivel`: `basico` | `pro` | `ilimitado` (legacy — pendiente de deprecar)
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
| `plan_tipo` | text | `emprendedor` \| `pro` (nuevo modelo) |
| `plan_status` | text | `trial` \| `active` \| `grace` \| `dashboard_suspended` \| `catalog_suspended` \| `deleted` |
| `is_founder` | boolean | Default false. Solo PCC. |
| `trial_started_at` | timestamptz | Inicio de trial |
| `trial_ends_at` | timestamptz | Fin de trial |
| `plan_nivel` | text | `basico` \| `pro` \| `ilimitado` (legacy — deprecar pronto) |
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

### D015 — Stock management unificado en gestionarStock()

| Campo | Valor |
|-------|-------|
| **Fecha** | Junio 2026 (Sprint P1-B) |
| **Decisión** | Migrar todos los flujos de descuento/restauración de stock a una única función `gestionarStock()` en `@/lib/stock.ts`. Eliminar cualquier `rpc('decrement_stock')` y `UPDATE productos SET stock = stock - N` directo. |
| **Motivo** | Existían 4 implementaciones diferentes de descuento de stock, cada una con bugs distintos (B1 cantidad, B2 variantes, B3 faltante, B4 race condition). Unificar permite aplicar validaciones (B8), optimistic locking (B4/B5) y tracking en un solo punto. |
| **Impacto** | 9/9 flujos convergen en una función. `rpc('decrement_stock')` sin callers activos. Mantenimiento centralizado. |

### D016 — Gift approve hardening: abortar si gestionarStock falla

| Campo | Valor |
|-------|-------|
| **Fecha** | Junio 2026 (Sprint P2-C) |
| **Decisión** | GiftDashboard.tsx y DashboardShell.tsx deben abortar la aprobación del gift si `gestionarStock('deduct')` retorna error. No actualizar `status = 'approved'` sin haber descontado stock. |
| **Motivo** | El flujo anterior aprobaba el gift incluso si el descuento de stock fallaba (stock insuficiente, error de DB), creando una discrepancia gift aprobado + stock no descontado. |
| **Impacto** | Gift approval es atómica: o se descuenta stock y se aprueba, o no ocurre ninguna de las dos. Sin cambios en rejection path. |

### D017 — Purchase-time stock deduct eliminado (gift)

| Campo | Valor |
|-------|-------|
| **Fecha** | Junio 2026 (Sprint P2-D) |
| **Decisión** | Eliminar `gestionarStock('deduct')` de `gift-purchase/route.ts`. La compra de un gift solo debe validar disponibilidad (stock > 0, in_stock), no descontar stock. El descuento ocurre una única vez al aprobar el gift. |
| **Motivo** | I1 confirmado: el stock se descontaba dos veces (compra + aprobación). Al eliminar el descuento de compra, el rechazo de gift ya no requiere restauración (I2 resuelto implícitamente). El flujo correcto es: compra valida → store aprueba → stock-- único. |
| **Impacto** | Stock consistente en todo el ciclo de vida del gift. `handle_expired_gifts()` con `stock + 1` ahora es correcto (restaura el único descuento de aprobación). Sin cambios en GiftDashboard/DashboardShell.

### D018 — Gift redemption unificado vía RPC atómico

| Campo | Valor |
|-------|-------|
| **Fecha** | Junio 2026 (Sprint P3-A) |
| **Decisión** | GiftRedemption.tsx debe usar el RPC `procesar_canje_regalo` (con FOR UPDATE) como única fuente de verdad para canje de gift_experiences, eliminando las queries directas SELECT + UPDATE y la validación de expiración client-side. |
| **Motivo** | La auditoría de gifts identificó dos caminos de canje paralelos para la misma tabla: `/canje` usaba RPC atómico, GiftRedemption usaba SELECT + client-side expiry + UPDATE directo. Esto introducía race condition, expiración client-side manipulable y stock check redundante. Unificar elimina el riesgo y centraliza la lógica. |
| **Impacto** | Ambos caminos (`/canje` y GiftRedemption) ahora ejecutan el mismo RPC con FOR UPDATE. La validación de expiración es server-side. Sin cambios en tablas, sin nuevas migraciones. SELECT cosmético preservado para modal de éxito. |

### D019 — Migración Subsistema B (tickets/pedidos.is_gift) → Subsistema A (gift_experiences)

| Campo | Valor |
|-------|-------|
| **Fecha** | Junio 2026 (Sprint P3-C) |
| **Decisión** | Migrar todos los datos, lógica de creación, redirección de enlaces y queries desde `tickets` + `pedidos.is_gift` hacia `gift_experiences`. Añadir columna `legacy_code` para trazabilidad de tickets migrados. Mantener `pedidos.is_gift` durante transición. |
| **Motivo** | Cero código compartido entre subsistemas. Subsistema B carece de status intermedio, expiración server-side, y atomicidad en canje. Mantener ambos duplica ~500 líneas en 8 archivos. Riesgo aceptable: datos no financieros, volumen bajo. |
| **Impacto** | Se agregan 2 migraciones (055 backfill, 056 drop tickets). `tickets` table eliminada. `pedidos.is_gift` preservada (defer). `/tickets?code=` redirige a `/canje?gift=`. Backup/Restore actualizado. |

---

## Flujo de Usuario

### Socio (Dueño de tienda)

#### Registro
```
Landing (/) → Register (5 campos: nombre, tienda, whatsapp, password x2) →
  Slug auto-generado desde nombre_tienda
  Auto-login via cookie nx_session (5B.1)
  perfil_tienda creado automáticamente (5C.1)
  2 productos semilla creados automáticamente (5C.1)
  Enforcement dates seteados (30/37/60 días) (5C.1)
  → Success screen (recovery code + copiar código) → botón explícito →
  Onboarding Express (país + tipo_negocio) (5C.2) →
  → Dashboard
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

### P0 — Stock decremento ausente en ProductDetailClient (B3 — Sprint P1-B.1)
**Síntoma:** ProductDetailClient creaba pedidos sin decrementar stock. Cada compra desde la página de producto era sobreventa garantizada.
**Fix:** Agregado `gestionarStock()` con cantidad real y variante después de crear el pedido.
**Commit:** `13d1e0d`
**Archivos:** `src/app/catalogo/[...]/producto/[...]/ProductDetailClient.tsx`

### P1 — Stock decremento inconsistente (B1/B2/B8 — Sprint P1-B.2)
**Síntoma:** ProductCard, ProductQuickView, DashboardShell y GiftDashboard usaban `rpc('decrement_stock')` que siempre descuenta 1 (ignora cantidad) y no maneja variantes. No validaban stock antes de crear pedido.
**Fix:** Migrados a `gestionarStock()` con cantidad real, variante seleccionada, y validación previa de disponibilidad.
**Commit:** `0ad023b`
**Archivos:** `src/components/catalog/ProductCard.tsx`, `src/components/catalog/ProductQuickView.tsx`, `src/app/dashboard/DashboardShell.tsx`, `src/components/dashboard/GiftDashboard.tsx`

### P2 — Stock race condition (B4/B5 — Sprint P2-A)
**Síntoma:** Checkout y gift-purchase decrementaban stock sin protección de condición de carrera. Dos pedidos simultáneos podían sobrepasar stock disponible.
**Fix:** Optimistic locking via `.eq('stock', prod.stock)` antes del `update()`, con `.select()` post-update para validar que el cambio se aplicó. `gestionarStock()` rechaza `nuevoStock < 0`.
**Commit:** `412bbef`
**Archivos:** `src/lib/stock.ts`

### P1 — Variant stock restore no funciona (B6 — Sprint P2-B)
**Síntoma:** Al cancelar pedidos quick-buy (ProductCard, ProductQuickView, ProductDetailClient), `gestionarStock('restore')` no identificaba la variante porque `detalles_pedido` no persistía `variante_seleccionada` ni `id_producto`.
**Fix:** Los 3 flujos quick-buy ahora persisten `id_producto` + `variante_seleccionada` en JSONB `detalles_pedido`. `extraerItemsPedido()` usa estos campos para identificar producto y variante.
**Commit:** `f09dabf`
**Archivos:** `src/components/catalog/ProductCard.tsx`, `src/components/catalog/ProductQuickView.tsx`, `src/app/catalogo/[...]/ProductDetailClient.tsx`, `src/lib/stock.ts`

### P2 — Gift approve sin verificar stock (Sprint P2-C)
**Síntoma:** GiftDashboard y DashboardShell aprobaban gifts incluso si `gestionarStock('deduct')` fallaba (stock insuficiente, error de DB). El gift quedaba aprobado pero el stock no se descontaba.
**Fix:** Ambos componentes ahora verifican el resultado de `gestionarStock()`. Si retorna error, se aborta la operación con alerta y no se actualiza el status del gift.
**Commit:** `c564a7e`
**Archivos:** `src/components/dashboard/GiftDashboard.tsx`, `src/app/dashboard/DashboardShell.tsx`

### I1 — Gift stock descontado dos veces (Sprint P2-D)
**Síntoma:** `gift-purchase/route.ts` descontaba stock al comprar el gift, y GiftDashboard/DashboardShell volvían a descontar al aprobarlo. Un mismo gift descontaba stock dos veces.
**Fix:** Eliminado `gestionarStock('deduct')` de `gift-purchase/route.ts`. La compra solo valida disponibilidad. El descuento ocurre una única vez, al aprobar el gift.
**Commit:** `c6619aa`
**Archivos:** `src/app/api/gift-purchase/route.ts`

### I2 — Gift rechazado sin restauración (Sprint P2-D)
**Síntoma:** Al rechazar un gift, GiftDashboard y DashboardShell solo actualizaban `status = 'rejected'` sin llamar a `gestionarStock('restore')`. El stock quedaba永久emente descontado.
**Fix:** Resuelto implícitamente por I1 — al no descontar stock durante la compra, el rechazo ya no necesita restaurar nada. Sin cambios de código adicionales.
**Commit:** `c6619aa`
**Archivos:** (sin cambios — efecto de I1)

### R3 — GiftRedemption canje no atómico (Sprint P3-A)
**Síntoma:** GiftRedemption.tsx ejecutaba SELECT + validación expiry client-side + UPDATE directo de `is_redeemed` en vez del RPC `procesar_canje_regalo`. Esto creaba un segundo camino de canje con race condition (SELECT + UPDATE no atómico), validación de expiración manipulable (JS Date), y stock check redundante (stock ya descontado al aprobar).
**Fix:** Reemplazada toda la lógica por `supabase.rpc('procesar_canje_regalo', ...)`, idéntico al flujo de `/canje`/RedeemButton. El RPC maneja validación, expiración y actualización atómicamente con FOR UPDATE. SELECT cosmético preservado para datos del modal de éxito.
**Commit:** `df028c2`
**Archivos:** `src/components/store/GiftRedemption.tsx`

---

## Bugs Pendientes

### P1 — Hooks violation en Dashboard/Vitrina
**Síntoma:** Error "Rendered more hooks than during the previous render" en `Router (app-router.tsx:168:45)` al entrar a Dashboard/Vitrina en dev mode.
**Causa tentativa:** `React.memo(PlantillaPreview)` + React 19 reconciliation. Ocurre solo en dev mode. No reproducible en production build.
**Archivos:** `src/components/catalog/CatalogoModal.tsx`

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

### ~~P2 — Gift subsystem unification~~ ✅ Resuelto
**Resuelto en P3-C** (`ef92631`): Subsistema B eliminado. `tickets` table dropped. Toda la lógica unificada en `gift_experiences`.

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
| Regalos | Medio | Auditado I1/I2 corregidos, subsistema unificación pendiente |
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
- [ ] **Stock integrity**
  - Stock se descuenta en todos los flujos ✅ (P1-B.1, P1-B.2)
  - Stock usa optimistic locking contra race conditions ✅ (P2-A)
  - Variant stock restore funcional ✅ (P2-B)
  - Gift stock sin double deduct ✅ (P2-D)
  - Gift reject sin pérdida de stock ✅ (P2-D)
- [ ] **Dashboard estable**
  - KPIs correctos ✅
  - Charts cargan ✅
  - Sin hooks violation P1
  - Auto-refresh implementado ✅
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
- [ ] **Sin bugs P0/P1 abiertos** (se registraron y cerraron 10+ bugs de integridad de datos y seguridad)

### 🟡 Should-have (no bloqueante pero deseable)

- [ ] PWA validada (service worker, manifest, iOS)
- [ ] WhatsApp templates modal funcional
- [ ] Regalos historial (tabla + filtros)
- [x] Gift subsystem unification (pedidos+tickets → gift_experiences) ✅ P3-C
- [ ] Realtime reconnection estable
- [ ] E2E tests para flujos críticos (Playwright)

### 🔵 Could-have (post-beta)

- [ ] Banner Builder habilitado
- [ ] Cupones auditados
- [ ] Marketing auditado
- [ ] Exportación de reportes
- [ ] Bulk edit en inventario

---

## Roadmap Inmediato

### Sprint completado — P0-B + P0-C (Security Hardening)
**Commit:** `0f4bba5`
- S2 — PCC middleware ausente ✅
- S4 — Cookie PCC forjable ✅
- S1 — login-as sin autenticación ✅
- S5 — Legacy UUID session bypass ✅

### Sprint completado — P1-A + P1-A.1 (Push + Data Access Hardening)
**Commits:** `6890792`, `4037c39`
- Auth en `/api/push/send` ✅
- RLS `push_subscriptions` tautológica ✅
- IDOR `actualizarEstado` ✅
- Restaurar quick-buy push (regresión) ✅

### Sprint completado — P1-B (Data Integrity)
**Commits:** `13d1e0d` (B3), `0ad023b` (B1/B2/B8)
- B3 — ProductDetailClient sin stock decrement ✅
- B1/B2 — RPC decrement_stock ignora cantidad/variante ✅
- B8 — Sin validación de stock previa ✅
- B4/B5 — Stock race condition → postergado a P2-A

### Sprint completado — P2-PREP (Inventory Consistency Audit)
**Audit only**
- Confirmado: inventario unificado al 100%. Todos los flujos usan `gestionarStock()`. 0 callers de `decrement_stock` RPC.
- Resultado: siguiente sprint recomendado → P2-B (B6) antes que B4/B5.

### Sprint completado — P2-A (Stock Concurrency Hardening)
**Commit:** `412bbef`
- B4 — TOCTOU race en checkout: optimistic locking + `.select()` post-update ✅
- B5 — Variant optimistic lock en gift-purchase: `.eq('stock', prod.stock)` ✅
- `gestionarStock()` rechaza `nuevoStock < 0` ✅

### Sprint completado — P2-B (Fix Variant Stock Restore)
**Commit:** `f09dabf`
- B6 — Variant stock restore en quick-buy ✅
- 3 flujos persisten `id_producto` + `variante_seleccionada` en JSONB `detalles_pedido`
- `extraerItemsPedido()` + `gestionarStock('restore')` funcional

### Sprint completado — P2-C (Gift Approve Hardening)
**Commit:** `c564a7e`
- GiftDashboard y DashboardShell abortan si `gestionarStock()` falla ✅
- Gift approval es atómica: no se aprueba sin descontar stock

### Sprint completado — P2-D (Gift Inventory Integrity)
**Commit:** `c6619aa`
- I1 — Eliminar `gestionarStock('deduct')` de `gift-purchase/route.ts` ✅
- I2 — Rechazo sin restore: resuelto implícitamente por I1 ✅
- `handle_expired_gifts()` evaluado: `stock + 1` ahora correcto

### Sprint completado — P3-A (Gift Redemption Unification)
**Commit:** `df028c2`
- R3 — GiftRedemption migrado a RPC `procesar_canje_regalo` ✅
- Eliminado SELECT autorización + expiry client-side + UPDATE directo
- Ambos caminos (`/canje` y GiftRedemption) usan el mismo RPC atómico

### Sprint completado — P3-C (Gift Subsystem Migration B→A)
**Commit:** `ef92631`
- Migración 055: `legacy_code` + backfill tickets → gift_experiences ✅
- Migración 056: drop tickets table, `is_gift` column deferred ✅
- `/tickets?code=` → redirect → `/canje?gift=` ✅
- `pedidos/actions.ts`: creación de gifts via gift_experiences ✅
- DashboardShell/PedidoRow: magic link via gift_experiences, URL → `/canje` ✅
- `/api/regalos`: unificado a solo gift_experiences ✅
- `checkout/route.ts`: removed ticket cross-reference, `🎁 Modo Regalo` marker added ✅
- PCC backup/restore: removed tickets from data set ✅
- `/api/ticket-redeem`: removed (orphaned) ✅
- Blocking fix: gift detection regression (notas marker ausente) ✅

### Sprint completado — Sprint 3 (Commercial Infrastructure Foundation)
**Commits:** `1906499` (+ uncommitted)
- Migración 057: seed commercial plan configuration (`plan_emprendedor_price`, `plan_pro_price`, limits) ✅
- Migración 058: add commercial columns to `tiendas` (`plan_tipo`, `plan_status`, `is_founder`, `trial_started_at`, `trial_ends_at`) ✅
- Backfill aplicado para tiendas existentes (conservative: existing → `emprendedor` + `trial`) ✅
- Registro migrado a trial de 30 días (nuevas tiendas nacen en trial) ✅
- Helper comercial centralizado (`src/lib/commercial.ts`) con labels, colores, helpers de plan/status ✅
- PCC Tiendas: tabla muestra Plan, Estado y Founder (reemplaza badge legacy) + filtro por estado ✅
- PCC Configuración Comercial (`/pcc/configuracion-comercial`) para precios y límites de planes ✅
- `src/types/database.ts`: nuevos tipos `PlanTipo`, `PlanStatus` en `SocioTienda` ✅
- Typecheck PASS ✅
- Build PASS ✅

### Sprint completado — Sprint 4A (Commercial Normalization)
**Commits:** `d461c54`
- Fix backfill en migración 058: `WHERE plan_tipo IS NULL` → `WHERE trial_started_at IS NULL` ✅
- PCC Tiendas: filtro de plan migrado de `plan_nivel` a `plan_tipo` (Emprendedor/Pro) ✅
- PCC WhatsApp: filtro, display y template `{plan}` migrados a `plan_tipo` ✅
- Suscripciones API: response migrado a `plan_tipo` + `plan_status` ✅
- MRR metrics: reemplazado `activas * 150` por suma basada en `plan_tipo` y precios desde `nexus_config` ✅
- MRR finanzas: MRR diferenciado por plan, `plan_tipo` en pagos pendientes ✅
- Typecheck PASS ✅
- Build PASS ✅

### Sprint completado — Sprint 4B (Commercial Management Modal)
**Commits:** `dd8f603`
- Modal "Config. Comercial" en PCC Tiendas con edición de `plan_tipo`, `plan_status`, `is_founder` ✅
- Acceso desde menú de acciones desktop y mobile ✅
- Handler `handleGuardarComercial` con `supabase.from('tiendas').update()` y logging a `nexus_logs` ✅
- Typecheck PASS ✅
- Build PASS ✅

### Sprint completado — Sprint 4C (Legacy plan_nivel Removal)
**Commits:** `ea1474f`
- Eliminado `PlanNivel` type y `plan_nivel` field de `src/types/database.ts` ✅
- Eliminado `plan_nivel: 'basico'` de `register/route.ts` ✅
- Eliminado `plan_nivel: 'basico'` de `onboarding/page.tsx` ✅
- Eliminado `plan_nivel` del backup restore (`backups/route.ts`) ✅
- Bug fix: `s.plan === 'ilimitado'` → corregido en `suscripciones/page.tsx` (2 ocurrencias) ✅
- Eliminado `plan_nivel: 'basico'` de `tests/nexus-hybrid.spec.ts` ✅
- Migración 059 preparada (no ejecutada): `DROP COLUMN plan_nivel` ✅
- Typecheck PASS ✅
- Build PASS ✅

### Sprint completado — Sprint 5B.1 (Registration Conversion Improvements)
- Auto-login post-registro: `createSessionToken()` + cookie `nx_session` en register/route.ts ✅
- Success screen redirige a /onboarding (no a /login) ✅
- Auto-redirect 5s a onboarding con cleanup ✅
- Trial unificado a 30 días: register, onboarding y success screen consistentes ✅
- Onboarding enforcement dates movidos a 30/37/60 días ✅
- Typecheck PASS ✅
- Build PASS ✅

### Sprint completado — Sprint 5C.2 (Onboarding Express)
- Onboarding reducido a 2 campos: país + tipo_negocio ✅
- Server action `guardarTienda` simplificado a solo pais_codigo/moneda_simbolo/tipo_negocio/onboarding_completo ✅
- Server action `omitirOnboarding` con defaults seguros + redirect ✅
- Botón "Omitir por ahora" visible en UI ✅
- Todos los campos removidos (logo, slogan, categorías, horario, etc.) → Configuración (5C.3) ✅
- Imports huérfanos eliminados ✅
- Typecheck PASS ✅
- Build PASS ✅

### Sprint completado — Sprint 5C.2.1 (Recovery Code UX)
- Eliminado auto-redirect useEffect (5s a onboarding) ✅
- Eliminada dependencia de `useRouter` ✅
- Agregado botón "📋 Copiar código" con `navigator.clipboard.writeText()` ✅
- Feedback visual "✅ Código copiado" por 2.5s al copiar ✅
- Advertencia visual reforzada (borde amber-300, texto más claro) ✅
- Navegación únicamente mediante botón explícito "Ir a mi tienda" ✅
- Typecheck PASS ✅
- Build PASS ✅

### Sprint completado — Sprint 5C.1 (Register Simplification)
- Slug input eliminado del register — auto-generado desde nombre_tienda ✅
- URL preview informativa debajo de nombre_tienda ✅
- Preguntas de seguridad (6 inputs) eliminadas del register ✅
- WhatsApp preview formateado debajo del campo ✅
- Registro reducido de 12 a 5 campos ✅
- perfil_tienda creado automáticamente en register (non-blocking) ✅
- 2 productos semilla creados en register (non-blocking) ✅
- Enforcement dates (fecha_vencimiento, fecha_bloqueo_panel, fecha_suspension_catalogo, fecha_eliminacion_total) seteados en register ✅
- Dashboard safeguards: .single() → .maybeSingle() en dashboard/page.tsx e inventario/page.tsx ✅
- Typecheck PASS ✅
- Build PASS ✅

### Pendientes (próximo sprint)

| Tarea | Prioridad | Estado |
|-------|-----------|--------|
| **Sprint 5C.2.1 — Recovery Code UX** | P1 | ✅ |
| **Sprint 5C.3A — Seguridad de Cuenta** | P1 | ✅ |
| **Sprint 5C.4 — Checklist Primera Experiencia** | P1 | ✅ |
| **Sprint 5C.4.1 — UX Polish Checklist & Deep Links** | P1 | ✅ |
| Migración 059 ejecución en DB (drop plan_nivel) | P1 | ✅ (preparada) |
| Rotar AUTH_SECRET (dev secret débil) | P1 | ⬜ |
| Quick-buy stock failure UX | P1 | ⬜ |
| Hooks violation P1 | P2 | ⬜ |
| WhatsApp templates modal | P2 | ⬜ |
| Regalos historial | P2 | ⬜ |
| WhatsApp gift notifications (sender) | P2 | ⬜ |
| Auto-approve gifts por tienda | P2 | ⬜ |
| Gift expiry configurable (24h/48h/72h/7d) | P2 | ⬜ |
| PWA QA completo | P2 | ⬜ |
| Realtime reconnection | P2 | ⬜ |
| E2E tests Playwright | P2 | ⬜ |
| Cupones — auditoría | P3 | ⬜ |
| Marketing — auditoría | P3 | ⬜ |
| B7 — Gift quantity > 1 | P3 | ⬜ |
| Gift Cards / Wallet | P4 | ⬜ |
| Drop `pedidos.is_gift` column (cleanup) | P4 | ⬜ |

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

### 2026-06-07 — Sprint 5C.2.1 — Recovery Code UX

##### Cambios

- **Auto-redirect eliminado** — Se eliminó el `useEffect` con `setTimeout` de 5s que redirigía automáticamente a onboarding, porque el usuario perdía el código de recuperación sin haberlo copiado.
- **Botón copiar código** — Nuevo botón "📋 Copiar código" que ejecuta `navigator.clipboard.writeText(codigo)`. Muestra "✅ Código copiado" como feedback temporal (2.5s) sin necesidad de ToastProvider.
- **Advertencia reforzada** — Borde `border-2 border-amber-300`, padding aumentado, texto "GUARDA ESTE CÓDIGO EN UN LUGAR SEGURO" con ícono de advertencia, `select-all` en el código.
- **Navegación manual obligatoria** — El único botón para avanzar es el "Ir a mi tienda" explícito. No hay redirección automática.
- **Dependencias eliminadas** — `useRouter` y `next/navigation` eliminados del archivo.

##### Verificación

- Typecheck PASS ✅
- Build PASS ✅

##### Archivos modificados

```
src/app/register/page.tsx | -useRouter, -auto-redirect useEffect, +copiado state, +botón copiar, +advertencia mejorada
```

##### Archivos adicionales

- `PROJECT_STATE.md` — Actualizado con Sprint 5C.2.1 completado

### 2026-06-07 — Sprint 5C.3A + 5C.4 + 5C.4.1 — Seguridad, Checklist, UX Polish

##### Cambios

- **Sprint 5C.3A — Seguridad de Cuenta**: Nueva sección Seguridad en `/dashboard/configurar` con código de recuperación (mostrar/copiar/regenerar) y preguntas de recuperación (3 preguntas configurables con select + validación). Nueva API route `/api/auth/seguridad`.
- **Sprint 5C.4 — Checklist Primera Experiencia**: Nuevo componente `PrimerosPasos.tsx` con barra de progreso y 4 tareas (recuperación, logo, información, productos). Checklist computado en server page desde `preguntas_recuperacion`, `perfil_tienda.sobre_nosotros/horario/logo_url` y `productos.length > 2`. Renderizado condicional en DashboardClient.
- **Sprint 5C.4.1 — UX Polish**: Deep links con hash anchors (`#seguridad`, `#logo`, `#informacion`). Auto-scroll suave tras carga de datos. Eliminada tarea "Personalizar catálogo" (no crítica). Barra de progreso 0/4. CTAs mejorados.

##### Archivos modificados

```
src/app/dashboard/page.tsx                    | +14 / -1 (preguntas_recuperacion, perfil fields, checklist)
src/app/dashboard/DashboardClient.tsx         |  +7 / -1 (checklist prop + PrimerosPasos render)
src/app/dashboard/configurar/page.tsx         | +227 / -2 (seguridad state/handlers/UI, anclas, auto-scroll)
src/app/api/auth/seguridad/route.ts           | +65 (nueva API route)
src/components/dashboard/PrimerosPasos.tsx    | +121 (nuevo componente checklist)
```

##### Verificación

- Typecheck PASS ✅
- Build PASS ✅

##### Commit

`e3d05d1` — pushed to `origin/main`

### 2026-06-07 — Post-Deploy Audit — Logging Cleanup

##### Cambios

Auditoría completa de `console.log/error/warn` en `src/`. Eliminados ~60 logs temporales de debugging. Conservados ~50 errores operativos.

**Logs eliminados (temporales / debugging):**

- `onboarding/page.tsx` — 7 logs `[onboarding]` (debug Sprint 5C.2 hotfix), 1 error con `JSON.stringify(error)` sanitizado
- `inventario/actions.ts` — 3 logs `[DIAG]` (debug Sprint UX V2)
- `api/checkout/route.ts` — 2 logs `console.log` push diagnostic
- `DashboardShell.tsx` — 4 logs `[Realtime pedidos]` (suscribiendo/evento/éxito/cleanup)
- `PedidosLista.tsx` — 6 logs `[WHATSAPP_TEMPLATES]` debugging
- `ProductCard.tsx` — 1 log `console.log` push status
- `ProductQuickView.tsx` — 1 log `console.log` push status
- `ProductDetailClient.tsx` — 1 log `console.log` push status
- `api/push/quickbuy/route.ts` — 1 log push diagnostic
- `api/push/send/route.ts` — 1 log push diagnostic
- `PushSubscribeButton.tsx` — 11 logs `[Push]` (permission, VAPID, SW, subscribe, status)
- `CartContext.tsx` — 2 logs `[CartProvider]` hydration debug
- `lib/push.ts` — 3 logs `[Push Server]` sending/sent/done count
- `RedeemButton.tsx` — 3 logs `[Redeem]` itemsList/localStorage (exponía datos de items)
- `canje/page.tsx` — 2 logs `[canje]` debug (warn code missing, log query)
- `TabPedidos.tsx` — 1 log suscripción real-time

**Riesgo encontrado:** `onboarding/page.tsx:47` — `JSON.stringify(error)` exponía detalles internos de error de Supabase. Sanitizado a mensaje genérico.

**Logs conservados (operativos):**
Stock errors, push errors (catch handlers), gift errors, API errors, WhatsApp errors, catálogo errors, config errors, dashboard errors — todos como `console.error` con contexto.

##### Verificación

- Typecheck PASS ✅

##### Commit

`c3ed5c0` — parte del changelog (commit de PROJECT_STATE.md)

### 2026-06-07 — Sprint 5C.2 — Onboarding Express (Hotfix)

##### Corrección

- **Bug fix**: Restaurado fallback `createClient()` en `guardarTienda`. El server action ahora usa `const db = (adminError || !adminSupabase ? supabase : adminSupabase)`, mismo patrón del código original. Se eliminó el redirect a `/login` cuando `createAdminClient()` falla (causaba redirect loop: onboarding → login → onboarding).
- **Logging**: `console.error('[onboarding] Error al guardar tienda:', error)` agregado para visibilidad de errores de upsert.
- **Eliminado** `omitirOnboarding` y botón "Omitir por ahora" — país y tipo_negocio son campos obligatorios.
- **Subtítulo actualizado**: "Selecciona tu país y tipo de negocio para continuar."

### 2026-06-07 — Sprint 5C.2 — Onboarding Express

##### Cambios

- **Onboarding simplificado** — Reducido de ~12 campos a solo 2: país + tipo_negocio.
- **Server action `guardarTienda`** — Simplificado: solo upsert de `pais_codigo`, `moneda_simbolo`, `tipo_negocio`, `onboarding_completo`. Ya no setea nombre_tienda, whatsapp, logo, direccion, rnc, slogan, categorias, horario, sobre_nosotros, palette, seed products, enforcement dates, ni perfil_tienda — todo eso ya lo maneja register (5C.1).
- **Nueva server action `omitirOnboarding`** — Setea defaults seguros (`pais_codigo='DO'`, `moneda_simbolo='RD$'`, `tipo_negocio='estandar'`, `onboarding_completo=true`) y redirige a `/dashboard`.
- **UI actualizada** — Título "Completa tu tienda", subtítulo "Puedes personalizar el resto más adelante desde Configuración.", botón "Omitir por ahora" como link secundario.
- **Imports eliminados**: PALETTES, LogoUpload, generatePwaIcons, getDefaultLimit.
- **Código eliminado**: ~195 líneas de UI, lógica de logo/PWA, seed products, enforcement dates, perfil_tienda upsert, palette selector.

##### Verificación

- Typecheck PASS ✅
- Build PASS ✅

##### Archivos modificados

```
src/app/onboarding/page.tsx | 70 líneas (+), 248 líneas (-) neto
```

### 2026-06-07 — Sprint 5C.1 — Register Simplification

##### Cambios

- **Register page** — Eliminados slug input y 6 preguntas de seguridad del formulario. Añadida URL preview informativa debajo de nombre_tienda. Añadido WhatsApp preview formateado debajo del teléfono. Registro reducido de 12 a 5 campos.
- **Register API** — Eliminada validación de preguntas y campo `preguntas_recuperacion` del insert. Slug siempre auto-generado desde nombre_tienda. Añadidos enforcement dates (fecha_vencimiento 30d, fecha_bloqueo_panel 30d, fecha_suspension_catalogo 37d, fecha_eliminacion_total 60d).
- **perfil_tienda** — Creado automáticamente en register (non-blocking, best-effort).
- **Seed products** — 2 productos genéricos (Jabón Artesanal, Envío Exprés) creados en register (non-blocking).
- **Dashboard safeguards** — `.single()` → `.maybeSingle()` en `dashboard/page.tsx` e `inventario/page.tsx` para evitar crash si perfil_tienda no existe.

##### Verificación

- Typecheck PASS ✅
- Build PASS ✅

##### Archivos modificados

```
src/app/api/auth/register/route.ts          | +36 / -22 líneas
src/app/register/page.tsx                   | -125 líneas (neto)
src/app/dashboard/page.tsx                  | +1 / -1 (maybeSingle)
src/app/dashboard/inventario/page.tsx       | +1 / -1 (maybeSingle)
```

### 2026-06-07 — Sprint 5B.1 — Registration Conversion Improvements

##### Cambios

- **Auto-login** — `register/route.ts` ahora crea session token con `createSessionToken()` y setea cookie `nx_session` post-registro (mismo mecanismo que login).
- **Success screen** — Redirige a /onboarding en vez de /login. Auto-redirect 5s con cleanup.
- **Trial unificado** — Todas las referencias cambiadas de 7 a 30 días: register success screen, onboarding enforcement dates (30/37/60).
- **No requiere login manual** después del registro.

##### Verificación

- Typecheck PASS ✅
- Build PASS ✅

##### Archivos modificados

```
src/app/api/auth/register/route.ts          | +38 / -5 líneas (createSessionToken, cookie)
src/app/register/page.tsx                   | +15 / -3 líneas (redirectTo, auto-redirect useEffect, texto 30 días)
src/app/onboarding/page.tsx                | +1 / -1 (fechas 30/37/60)
```

### 2026-06-06 — Sprint 4C — Legacy plan_nivel Removal (`ea1474f`)

##### Cambios

- **Database types** — Eliminado `PlanNivel` type y campo `plan_nivel` de `SocioTienda`
- **Register** — Eliminado `plan_nivel: 'basico'` del INSERT en `register/route.ts`
- **Onboarding** — Eliminado `plan_nivel: 'basico'` del upsert en `onboarding/page.tsx`
- **Backups** — Eliminado `plan_nivel` del restore en `backups/route.ts` (backups legacy seguirán funcionando)
- **Suscripciones** — Bug fix: `s.plan === 'ilimitado'` reemplazado por `emprendedor`/`pro` (2 ocurrencias)
- **Tests** — Eliminado `plan_nivel: 'basico'` de `nexus-hybrid.spec.ts`
- **Migración 059** — SQL preparado (no ejecutado): `ALTER TABLE tiendas DROP COLUMN plan_nivel`

##### Verificación

- Typecheck PASS ✅
- Build PASS ✅

##### Archivos modificados

```
src/app/api/auth/register/route.ts           | -1 línea
src/app/onboarding/page.tsx                  | -1 línea
src/app/api/backups/route.ts                 | -1 línea
src/types/database.ts                        | -2 líneas (type + field)
src/app/pcc/suscripciones/page.tsx           | -4 líneas (bug fix)
tests/nexus-hybrid.spec.ts                   | -1 línea
supabase/migrations/059_drop_plan_nivel.sql  | +12 líneas (nuevo)
```

### 2026-06-06 — Sprint 4B — Commercial Management Modal (`dd8f603`)

##### Cambios

- **PCC Tiendas** — Nuevo modal "Config. Comercial" en el menú de acciones de cada tienda (desktop y mobile)
- **Plan Tipo** — Dropdown editable (Emprendedor / Pro)
- **Plan Status** — Dropdown editable (trial / active / grace / dashboard_suspended / catalog_suspended / deleted)
- **is_founder** — Toggle editable
- **Handler `handleGuardarComercial`** — Actualiza vía `supabase.from('tiendas').update()` con logging a `nexus_logs`
- **Estados** — Loading, disabled guard, cancelar/guardar buttons

##### Verificación

- Typecheck PASS ✅
- Build PASS ✅

##### Archivos modificados

```
src/app/pcc/tiendas/page.tsx | +80 líneas (3 estados, handler, modal, item menú)
```

### 2026-06-06 — Sprint 4A — Commercial Normalization

##### Cambios

- **Fix backfill** — Migración 058: `WHERE plan_tipo IS NULL` → `WHERE trial_started_at IS NULL`
- **PCC Tiendas** — Filtro de plan migrado de `plan_nivel` a `plan_tipo`
- **PCC WhatsApp** — Filtro, display y template `{plan}` migrados a `plan_tipo`
- **Suscripciones API** — Response migrado a `plan_tipo` + `plan_status`
- **MRR metrics** — Reemplazado `activas * 150` por suma basada en `plan_tipo` y precios desde `nexus_config`
- **MRR finanzas** — MRR diferenciado por plan, `plan_tipo` en pagos pendientes

##### Verificación

- Typecheck PASS ✅
- Build PASS ✅

##### Archivos modificados

```
src/app/api/pcc/metrics/route.ts      | +24 / -12
src/app/api/pcc/finanzas/route.ts     | +16 / -8
src/app/api/pcc/suscripciones/route.ts | +6 / -3
src/app/pcc/tiendas/page.tsx          | +4 / -4
src/app/pcc/whatsapp/page.tsx         | +12 / -12
supabase/migrations/058_commercial_infrastructure.sql | +2 / -2
```

### 2026-06-05 — Sprint 3 — Commercial Infrastructure Foundation

##### Cambios

- **Migración 057** — Seed commercial plan configuration keys (`plan_emprendedor_price`, `plan_pro_price`, limits) en `nexus_config`
- **Migración 058** — Add `plan_tipo`, `plan_status`, `is_founder`, `trial_started_at`, `trial_ends_at` a `tiendas` + backfill stores existentes
- **Registro** — Migrado a trial de 30 días: nuevas tiendas nacen con `plan_tipo='emprendedor'`, `plan_status='trial'`, `trial_ends_at=30 días`
- **Helper comercial** — `src/lib/commercial.ts`: `getPlanLabel`, `getPlanColor`, `getStatusLabel`, `getStatusColor`, `getDefaultLimit`, helpers de plan/status
- **PCC Tiendas** — Tabla y cards mobile ahora muestran Plan (vía `getPlanLabel/getPlanColor`), Estado (vía `getStatusLabel/getStatusColor`), y Founder badge. Filtro por estado agregado.
- **PCC Configuración Comercial** — Nueva página `/pcc/configuracion-comercial` para gestionar precios y límites de planes
- **Database types** — Nuevos tipos `PlanTipo`, `PlanStatus` en `SocioTienda`

##### Verificación

- Typecheck PASS ✅
- Build PASS ✅

##### Archivos modificados

```
src/app/api/auth/register/route.ts              |  30 ++---
src/app/pcc/configuracion-comercial/page.tsx    | 214 ++++++++++++++++++++++++++
src/app/pcc/layout.tsx                          |   1 +
src/app/pcc/tiendas/page.tsx                    |  70 ++++----
src/lib/commercial.ts                           |  59 ++++++++
src/types/database.ts                           |  10 ++
supabase/migrations/057_commercial_config.sql   |  10 ++
supabase/migrations/058_commercial_infrastructure.sql |  59 ++++++++
```

### 2026-06-03 — Sprint P3-C — Gift Subsystem Migration B→A (+ blocking fix + production audit)

##### Cambios

- **Migración 055** — `legacy_code` column en gift_experiences + backfill de todos los tickets existentes
- **Migración 056** — Drop tickets table, `eliminar_tienda_completa` actualizado, `is_gift` column preservada (defer)
- **Redirección** — `/catalogo/{storeId}/tickets?code=X` redirige a `/canje?gift=X&id=storeId` vía `findGiftByCode` server action
- **Creación de gifts** — `actualizarEstado` inserta en `gift_experiences` en vez de `tickets`
- **Magic link** — DashboardShell y PedidoRow crean `gift_experiences`, URL apunta a `/canje`
- **API regalos** — Unificado a solo `gift_experiences` (eliminada UNION con tickets)
- **Checkout** — Removida búsqueda de ticket por `gift_details.id_pedido`. Agregado `🎁 Modo Regalo` a `notas` para detección de gifts
- **PCC backup** — Tickets eliminados del backup dataset y restore
- **API ticket-redeem** — Eliminado (orphaned: frontend usa server actions)

##### Blocking fix

- Regresión de detección de gifts: `🎁 Modo Regalo` nunca se escribía en `notas`. Corregido en checkout route + dual-check (notas + `is_gift` legacy) en `actualizarEstado`.

##### Production Readiness Audit

- **Verdict:** LISTO PARA PRODUCCIÓN (75% confianza). Sin bloqueadores P0.
- **Riesgos aceptados:** AUTH_SECRET débil (dev), quick-buy stock failures sin feedback UX
- **Recomendación:** Lanzar hoy con monitoreo activo

##### Impacto

- Subsistema B eliminado: ~500 líneas de código muerto removidas de 8 archivos
- Cero cambios en stock management, aprobación, canje RPC
- Enlaces legacy redirigen correctamente
- `pedidos.is_gift` column preservada para compatibilidad durante transición

##### Commit

`ef92631` — pushed to `origin/main`

##### Archivos modificados

```
src/app/api/checkout/route.ts                   |  23 +--
src/app/api/pcc/backups/[id]/restore/route.ts   |   6 -
src/app/api/pcc/backups/route.ts                |   8 +-
src/app/api/regalos/route.ts                    |  55 ++----
src/app/api/ticket-redeem/route.ts              |  32 ---
src/app/catalogo/[id_tienda]/tickets/actions.ts | 112 +--------
src/app/catalogo/[id_tienda]/tickets/page.tsx   | 245 ++-------------
src/app/dashboard/DashboardShell.tsx            |  58 +++---
src/app/dashboard/pedidos/PedidoRow.tsx         |  64 +++----
src/app/dashboard/pedidos/actions.ts            |  55 +++---
supabase/migrations/055_migrate_tickets_to_gift_experiences.sql |  97 ++++++++
supabase/migrations/056_drop_tickets_table.sql                  |  35 ++++
```
12 files changed, 136 insertions(+), 522 deletions(-)

### 2026-06-02 — Sprint P3-A — Gift Redemption Unification (R3)

##### Corregido
- **R3** — GiftRedemption.tsx migrado de queries directas (SELECT + UPDATE) a RPC `procesar_canje_regalo`.
- Eliminado: SELECT con filtros de autorización, validación de expiración client-side (JS Date), UPDATE directo de `is_redeemed`, stock check redundante.
- SELECT cosmético preservado (`sender_name, receiver_name, personal_message`) para datos del modal de éxito.

##### Impacto
- Ambos caminos de canje (`/canje` y GiftRedemption) ahora usan el mismo RPC atómico con FOR UPDATE.
- Validación de expiración es server-side (no manipulable por cliente).
- Sin cambios en tablas, sin migraciones nuevas.

##### Commit
`df028c2` — pushed to `origin/main`

##### Archivos
- `src/components/store/GiftRedemption.tsx` — `+15 / -46 lines`

### 2026-06-02 — Sprint P2-D — Gift Inventory Integrity (I1+I2)

##### Corregido
- **I1** — `gift-purchase/route.ts` ya no descuenta stock al comprar el gift. El descuento ocurre una sola vez, al aprobar (GiftDashboard/DashboardShell). Stock validation preservada.
- **I2** — Resuelto implícitamente por I1: al no descontar en compra, el rechazo no necesita restore.

##### Evaluado
- `handle_expired_gifts()` con `stock + 1` es ahora correcto (restaura el único descuento de aprobación). Sin cambios.

##### Commit
`c6619aa` — pushed to `origin/main`

##### Archivos
- `src/app/api/gift-purchase/route.ts` — `-16 lines` (removido `gestionarStock('deduct')` + import)

### 2026-06-02 — Sprint P2-C — Gift Approve Hardening

##### Corregido
- GiftDashboard y DashboardShell ahora abortan si `gestionarStock('deduct')` retorna error. No se actualiza `status = 'approved'` sin haber descontado stock.

##### Commit
`c564a7e` — pushed to `origin/main`

##### Archivos
- `src/components/dashboard/GiftDashboard.tsx`
- `src/app/dashboard/DashboardShell.tsx`

### 2026-06-02 — Post-hardening project reassessment (audit)

##### Auditado
- Top 10 riesgos identificados, prioridades P0-P4, módulos listos/no listos.
- Sprint recomendado: P2-B (B6) antes que features nuevos.
- Sprint no recomendado: B7/Vitrina Studio (postergar).

### 2026-06-02 — Sprint P2-B — Fix Variant Stock Restore (B6)

##### Corregido
- **B6** — 3 flujos quick-buy (ProductCard, ProductQuickView, ProductDetailClient) ahora persisten `id_producto` + `variante_seleccionada` en JSONB `detalles_pedido`. `extraerItemsPedido()` usa estos campos para restaurar stock de variante correctamente.

##### Commit
`f09dabf` — pushed to `origin/main`

##### Archivos
- `src/components/catalog/ProductCard.tsx`
- `src/components/catalog/ProductQuickView.tsx`
- `src/app/catalogo/[...]/ProductDetailClient.tsx`
- `src/lib/stock.ts`

### 2026-06-02 — Sprint P2-PREP — Inventory Consistency Verification (audit)

##### Auditado
- Confirmado: inventario unificado al 100%. Los 9 flujos de stock usan `gestionarStock()`.
- `rpc('decrement_stock')` sin callers activos.
- Resultado: B6 prioritario sobre B4/B5.

### 2026-06-02 — Sprint P2-A — Stock Concurrency Hardening (B4+B5)

##### Corregido
- **B4** — TOCTOU race en checkout mitigado: `gestionarStock()` ahora hace `.eq('stock', prod.stock)` (optimistic lock) + `.select()` post-update para validar que el cambio se aplicó atómicamente.
- **B5** — Mismo optimistic lock aplicado al path de variantes en gift-purchase.
- `gestionarStock()` rechaza `nuevoStock < 0` en vez de silenciar con `Math.max(0, ...)`.

##### Commit
`412bbef` — pushed to `origin/main`

##### Archivos
- `src/lib/stock.ts`

### 2026-06-01 — Sprint P1-B.2 — Unify quick-buy stock logic (B1+B2+B8)

##### Corregido
- **B1** — `rpc('decrement_stock')` siempre descontaba 1, ignorando `quantity`. Reemplazado por `gestionarStock()` que respeta la cantidad real.
- **B2** — `rpc('decrement_stock')` solo actualizaba `productos.stock`, no las variantes en `tallas[]`. `gestionarStock()` actualiza ambos.
- **B8** — Los 4 flujos no validaban stock antes de crear pedido/aprobar regalo. Agregada validación: si `in_stock` es false, stock <= 0, o variante sin stock suficiente, se muestra alert y se aborta.

##### Flujos migrados
| Componente | Antes | Después |
|-----------|-------|---------|
| ProductCard | `rpc('decrement_stock', { pid })` | `gestionarStock(supabase, items, 'deduct')` |
| ProductQuickView | `rpc('decrement_stock', { pid })` | `gestionarStock(supabase, items, 'deduct')` |
| DashboardShell gift | Loop `rpc('decrement_stock')` | `gestionarStock(supabase, items, 'deduct')` batch |
| GiftDashboard gift | Loop `rpc('decrement_stock')` | `gestionarStock(supabase, items, 'deduct')` batch |

##### Mecanismo único
Todos los flujos ahora usan el mismo `gestionarStock()` de `@/lib/stock`.
`rpc('decrement_stock')` queda sin uso activo.

##### Archivos
- `src/components/catalog/ProductCard.tsx`
- `src/components/catalog/ProductQuickView.tsx`
- `src/app/dashboard/DashboardShell.tsx`
- `src/components/dashboard/GiftDashboard.tsx`

### 2026-06-01 — Sprint P1-B.1 — Fix B3: ProductDetailClient sin stock decrement

##### Corregido
- **B3**: ProductDetailClient nunca ejecutaba `decrement_stock`. El pedido se creaba, `detalles_pedido` se insertaba, pero el stock nunca se descontaba. Cada compra desde la página de producto era sobreventa garantizada.

##### Solución
- Importado `gestionarStock` desde `@/lib/stock` (mismo mecanismo que checkout)
- Llamado `gestionarStock(supabase, items, 'deduct')` después de crear el pedido
- Usa `cantidad: quantity` (respeta la cantidad comprada) y `variante_seleccionada: selectedTalla || null` (maneja variantes)

##### Archivos
- `src/app/catalogo/[...]/producto/[...]/ProductDetailClient.tsx`

### 2026-06-01 — Sprint P1-A.1 — Restore Quick-Buy Push

##### Corregido
- **Regresión P1-A**: Quick-buy (ProductCard, ProductQuickView, ProductDetailClient) dejó de enviar push al requerir auth en `/api/push/send`.

##### Solución
- Nuevo endpoint `/api/push/quickbuy` que verifica existencia del pedido (`pedidos.id + id_tienda + estado = pendiente`) antes de enviar push.
- Los 3 componentes ahora llaman a `/api/push/quickbuy` en vez de `/api/push/send`.

##### Seguridad
- `/api/push/send` sigue protegido con session auth (P1-A preservado).
- `/api/push/quickbuy` requiere pedido UUID válido y existente en DB.
- Atacante necesita UUID de pedido real (cryptográficamente aleatorio) para abusar.

##### Archivos
- `src/app/api/push/quickbuy/route.ts` (nuevo)
- `src/components/catalog/ProductCard.tsx`
- `src/components/catalog/ProductQuickView.tsx`
- `src/app/catalogo/[...]/ProductDetailClient.tsx`

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

---

## Product Vision

Nexus ya no se encuentra en fase de hardening.

La visión a largo plazo es convertir Nexus en el sistema operativo para pequeños negocios.

### Objetivos

- Inventario centralizado
- Pedidos digitales
- Ventas presenciales
- WhatsApp operativo
- Marketing automatizado
- Fidelización de clientes
- Analíticas empresariales
- Automatización de tareas repetitivas

### Principio

Cada nueva funcionalidad debe cumplir al menos uno de estos objetivos:

- aumentar ventas
- ahorrar tiempo
- mejorar retención
- aumentar recurrencia
- generar hábito de uso

---

## Product Roadmap Ideas

> **NOTA:** Las siguientes ideas **NO representan compromisos de implementación.**  
> Son oportunidades estratégicas identificadas para futuras versiones.  
> La prioridad podrá cambiar según feedback de usuarios reales y necesidades del negocio.

---

### P-01 — Cierre de Caja Automatizado

**Objetivo:** Entregar un resumen diario automático del desempeño del negocio.

**Posibles métricas:**
- ventas brutas
- costo de mercancía
- ganancia neta
- producto más vendido
- comparación contra el día anterior

**Beneficio:** Genera hábito diario y claridad financiera para el comerciante.

**Impacto estimado:** Muy alto.

---

### P-02 — Multiplicador de Ticket

**Objetivo:** Implementar cross-selling automático dentro del catálogo.

**Ejemplos:**
- desayuno → globo personalizado
- vestido → aretes
- regalo → tarjeta personalizada

**Beneficio:** Incrementar ticket promedio y ventas por pedido.

**Impacto estimado:** Alto.

---

### P-03 — Revive-Muertos

**Objetivo:** Detectar clientes que llevan un período prolongado sin comprar.

**Acción:** Permitir enviar mensajes de reactivación mediante WhatsApp con un clic.

**Beneficio:** Incrementar recompra y retención.

**Impacto estimado:** Muy alto.

---

### P-04 — Despachador Express

**Objetivo:** Enviar información de entrega al mensajero mediante WhatsApp en un clic.

**Información incluida:**
- nombre cliente
- teléfono
- dirección
- monto a cobrar
- enlace Google Maps

**Beneficio:** Reducir tiempo operativo y errores manuales.

**Impacto estimado:** Muy alto.

---

### P-05 — Copiloto de Estados

**Objetivo:** Generar textos promocionales para WhatsApp Status e Instagram Stories.

**Acción:** Botón disponible desde productos del inventario.

**Beneficio:** Reducir fricción de marketing para pequeños negocios.

**Impacto estimado:** Medio-Alto.

---

### P-06 — Radar VIP

**Objetivo:** Identificar y visualizar clientes más valiosos.

**Posibles funciones:**
- ranking mensual
- clientes recurrentes
- top compradores

**Beneficio:** Fidelización y seguimiento de clientes importantes.

**Impacto estimado:** Alto.

---

### P-07 — Simulador de Escasez

**Objetivo:** Mostrar mensajes de urgencia basados en stock real.

**Ejemplos:**
- Solo quedan 2 disponibles
- Últimas unidades

**Regla:** Nunca mostrar información falsa.

**Beneficio:** Incrementar conversión utilizando stock real.

**Impacto estimado:** Alto.

---

### P-08 — Capturador de Reseñas

**Objetivo:** Solicitar opiniones automáticamente después de una entrega.

**Posibles funciones:**
- estrellas
- comentarios
- reputación pública
- métricas de satisfacción

**Beneficio:** Generar prueba social y aumentar confianza.

**Impacto estimado:** Muy alto.

---

### P-09 — Caja Física (Mini POS)

**Objetivo:** Permitir registrar ventas presenciales utilizando la misma infraestructura de inventario y pedidos.

**Posibles características:**
- venta rápida
- selección de productos
- efectivo
- transferencia
- tarjeta

**Comportamiento esperado:**
- descontar inventario
- registrar pedido
- marcar como pagado
- marcar como entregado

**Beneficio:** Unificar ventas físicas y digitales.

**Impacto estratégico:** Transformar Nexus de catálogo digital a sistema operativo completo del negocio.

**Impacto estimado:** Extremadamente alto.

---

# Commercial Plans Architecture (Auditado)

**Estado:** AUDITADO

**Resultado:** VIABLE SIN REESTRUCTURACIÓN MAYOR

**Complejidad:** MEDIA

**Prioridad:** PRE-LANZAMIENTO — debe implementarse antes del lanzamiento comercial.

---

## Modelo Comercial Objetivo

### Founder

* Interno.
* Configurable únicamente desde PCC.
* Acceso vitalicio.
* Productos ilimitados.
* No visible públicamente.

### Emprendedor

* Precio: RD$380 / mes.
* Límite de productos (pendiente definición final).
* Dashboard, Catálogo, Gifts.

### Pro

* Precio: RD$900 / mes.
* Productos ilimitados.
* Analytics, funciones avanzadas.

### Omnicanal (Futuro)

* Caja Física.
* Inventario unificado.
* Ventas presenciales + online.

---

## Arquitectura Recomendada

Mantener arquitectura basada en tabla `tiendas`.

No migrar a sistema complejo de suscripciones.

**Campos a agregar en `tiendas`:**

| Campo | Tipo | Notas |
|-------|------|-------|
| `plan_tipo` | TEXT | `founder` \| `emprendedor` \| `pro` \| `omnicanal` \| `enterprise` |
| `plan_status` | TEXT | `active` \| `expired` \| `cancelled` \| `suspended` \| `trial` |
| `is_founder` | BOOLEAN | Default false. Solo PCC. |
| `product_limit` | INT | Default 15. -1 = ilimitado. |
| `features` | JSONB | Capacidades específicas del plan. |

**Columnas legacy a deprecar:** `token_productos_limite`, `tokens_disponibles`, `plan_nivel`. Mantener durante transición.

---

## Feature Flags

Separar **PLAN** de **CAPACIDADES**.

Ejemplos de capacidades:

* `analytics_enabled`
* `gifts_enabled`
* `physical_pos` (Omnicanal)
* `custom_domain` (futuro)
* `unlimited_products`

**Ventaja:** Agregar nuevas características no requiere crear un nuevo plan. Compatible con add-ons futuros y Enterprise.

---

## Founder

Implementación recomendada:

```sql
is_founder BOOLEAN DEFAULT false
founder_since TIMESTAMPTZ
```

Founder **NO** es un plan público.
Solo configurable desde PCC.
No visible en register, onboarding ni landing.

---

## Migración

Migración gradual desde **tokens** → **planes**, manteniendo compatibilidad temporal.

**Fases:**

1. Agregar columnas nuevas + backfill desde datos legacy.
2. Enforcement dual (columnas nuevas + legacy).
3. Activación: reemplazar enforcement legacy.
4. Limpieza: deprecar y eliminar columnas legacy (post-lanzamiento).

**Plan inicial para usuarios existentes:**

| Estado actual | Plan asignado |
|---------------|---------------|
| Activa con tokens | `emprendedor` + `active` |
| Trial sin tokens | `emprendedor` + `trial` |
| Bloqueada | `emprendedor` + `expired` |

---

## Wildcard Subdomains (Auditado)

**Estado:** AUDITADO

**Resultado:** VIABLE SIN REESTRUCTURACIÓN MAYOR

**Complejidad:** MEDIA

---

### Objetivo Futuro

Soportar:

* pcc.nexusrd.do
* dashboard.nexusrd.do
* {slug}.nexusrd.do

Ejemplos:

* pastelesmaria.nexusrd.do
* boutiqueana.nexusrd.do
* floristeriarosa.nexusrd.do

---

### Arquitectura Recomendada

Patrón:

Host Detection
↓
Middleware Rewrite
↓
/c/[slug]

Reutilizar completamente:

/c/[slug]

como catálogo canónico.

No duplicar lógica.

No crear una segunda implementación del catálogo.

---

### Hallazgos de la Auditoría

**Compatibilidad actual:**

* Base de datos compatible mediante slug único.
* Catálogo actual reutilizable.
* App Router compatible.
* Next.js compatible.
* Arquitectura compatible.

**Bloqueadores:**

1. Middleware no detecta subdominios actualmente.
2. No existen rewrites para host.
3. Cookies no comparten sesión entre subdominios.
4. MetadataBase usa dominio principal fijo.

---

### Cambios Futuros Requeridos

1. **Middleware:** Detección de host.
2. **Rewrite:** {subdominio}.nexusrd.do → /c/[slug]
3. **Cookies:** domain=.nexusrd.do
4. **Metadata dinámica por host.**

---

### Riesgo Principal

Cookies cross-subdomain.

Clasificación: MEDIA

---

### Compatibilidad con Planes

**Emprendedor:** nexusrd.do/c/slug

**Pro:** slug.nexusrd.do

**Omnicanal (futuro):** midominio.com

---

### Prioridad

POST-LANZAMIENTO

No implementar antes del lanzamiento comercial inicial.

---

## Custom Domains (Future)

**Objetivo:** Permitir dominios propios para tiendas.

**Ejemplos:**
- mitienda.com
- pastelesmaria.com

**Estado:** Planificación futura.

Posible relación con planes superiores.

---

## Founder Feedback System (Future)

**Idea:** Sistema interno para gestionar feedback de Founders.

**Funciones previstas:**
- generación de formularios
- formularios semanales
- enlaces únicos
- respuestas almacenadas
- visualización desde PCC
- seguimiento de participación

**Objetivo:** Centralizar feedback y evitar depender de mensajes dispersos por WhatsApp.

**Estado:** Documentado. No implementado.
