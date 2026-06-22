# Regalos V3.5 — Decisiones de Producto

> Documento oficial de decisiones de producto para Regalos V3.5.
> Aprobado durante auditoría de negocio — Junio 2026.
>
> **Estados:**
> - ✅ IMPLEMENTADO — existe en producción hoy
> - 🟡 APROBADO — PENDIENTE IMPLEMENTACIÓN — decisión tomada, no ejecutada
> - 🔵 POST-BETA — diferido para después del lanzamiento

---

## Visión

Regalos V3 NO es un checkout.
Regalos V3 NO es un carrito.
Regalos V3 NO es un pedido tradicional.

**Regalos V3 es:**
Una persona compra un regalo para otra.
La otra persona lo reclama.
El comercio coordina la entrega.

---

## Flujo aprobado

```
COMPRADOR                       COMERCIO                     DESTINATARIO
    │                              │                             │
    ├─ Compra ───────────────────► │                             │
    │  sender_name                  │  PENDING                    │
    │  receiver_name                │                             │
    │  receiver_phone ★             │                             │
    │  personal_message             │                             │
    │  (sin dirección)              │                             │
    │                              │                             │
    │                              ├─ [Aprobar] ───────────────► │
    │                              │  RESERVED                    │
    │                              │  stock--, reservado++        │
    │                              │                             │
    │                              │              [Abre enlace]  │
    │                              │              Ve quién envió  │
    │                              │              Lee mensaje     │
    │                              │              Ve productos    │
    │                              │              [Canjear] ────►│
    │                              │  CLAIMED                     │
    │                              │                             │
    │                              ├─ [Contactar destinatario] ─►│
    │                              │  wa.me/{receiver_phone}      │
    │                              │  "¿Dirección para entrega?"  │
    │                              │                             │
    │                              │  ←─── Coordinan entrega ──► │
    │                              │      (WhatsApp externo)      │
    │                              │                             │
    │                              ├─ [Marcar entregado]         │
    │                              │  DELIVERED                   │
    │                              │  stock--final, reservado--   │
```

---

## Decisiones de producto

### D1 — Delivery address NO se captura en compra

**Estado:** 🟡 APROBADO — PENDIENTE IMPLEMENTACIÓN

| Campo | Valor |
|-------|-------|
| **Decisión** | GiftPurchaseForm no pregunta dirección de entrega ni enlace de Maps. |
| **Motivo** | La entrega se coordina por WhatsApp post-canje entre el comercio y el destinatario. |
| **Impacto** | GiftPurchaseForm elimina sección `hasLocation` + textarea + delivery_link. |
| **Aplica a** | GiftPurchaseForm, gift-purchase/route.ts, checkout/route.ts |
| **Evidencia** | `GiftPurchaseForm.tsx:43-44` — `hasLocation` state y textarea aún existen. `gift-purchase/route.ts:10,55` — aún acepta y persiste `delivery_address`. `checkout/route.ts:18,311` — aún acepta `giftDeliveryAddress`. |

### D2 — Delivery address NO se captura en canje

**Estado:** 🟡 APROBADO — PENDIENTE IMPLEMENTACIÓN

| Campo | Valor |
|-------|-------|
| **Decisión** | GiftRedemption y canje/page no piden dirección al destinatario. |
| **Motivo** | El destinatario no debe proporcionar datos logísticos. Solo canjea y espera contacto del comercio. |
| **Impacto** | GiftRedemption elimina bloqueo por `delivery_address`. canje/page elimina `needsAddress`. |
| **Aplica a** | GiftRedemption.tsx, canje/page.tsx |
| **Evidencia** | `GiftRedemption.tsx:71` — `if (giftData.status === 'RESERVED' && !giftData.delivery_address)` aún bloquea. `canje/page.tsx:121` — `setNeedsAddress(true)` aún existe. Ambos componentes aún tienen textarea para dirección. |

### D3 — Delivery address es opcional, post-hoc, en dashboard

**Estado:** 🟡 APROBADO — PENDIENTE IMPLEMENTACIÓN

| Campo | Valor |
|-------|-------|
| **Decisión** | `delivery_address` se conserva en DB pero como campo informativo que el comercio llena en el dashboard después de coordinar con el destinatario. |
| **Motivo** | El comercio puede registrar la dirección para su registro interno sin que esto bloquee el flujo. |
| **Impacto** | `entregar_regalo_v2` debe eliminar el IS NULL check. "Marcar entregado" siempre visible. |
| **Aplica a** | GiftDashboard.tsx, entregar_regalo_v2 RPC |
| **Evidencia** | `entregar_regalo_v2` (070_gift_v2_delivery.sql:66-68) — `IF v_delivery_address IS NULL THEN RETURN error` aún bloquea. `GiftDashboard.tsx:520` — `{gift.delivery_address && (` aún oculta "Marcar entregado". No existe UI editable de delivery_address en el dashboard. |

### D4 — Canje es terminal

**Estado:** 🟡 APROBADO — PENDIENTE IMPLEMENTACIÓN

| Campo | Valor |
|-------|-------|
| **Decisión** | Después del canje exitoso, el destinatario ve pantalla de éxito con "Explorar tienda". NO redirige a carrito, NO addToCart, NO setIsOpen. |
| **Motivo** | El destinatario no es un comprador. No debe terminar en un carrito de compras. |
| **Impacto** | GiftRedemption elimina `useCart`/`addToCart`/`setIsOpen`. |
| **Aplica a** | GiftRedemption.tsx |
| **Evidencia** | `GiftRedemption.tsx:9` — `const { addToCart, setIsOpen } = useCart()` aún existe. Líneas 108-110 y 163-165: `addToCart()` aún se llama. Línea 279: `setIsOpen(true)` aún redirige al carrito. Botón dice "Ir al carrito por mi regalo". |

### D5 — WhatsApp como canal de coordinación primario

**Estado:** 🟡 APROBADO — PENDIENTE IMPLEMENTACIÓN

| Campo | Valor |
|-------|-------|
| **Decisión** | El comercio contacta al destinatario vía WhatsApp después del canje. No hay APIs de mensajería externas. Solo deep links `wa.me/{receiver_phone}`. |
| **Motivo** | WhatsApp es el canal universal en RD. No requiere integración API, solo enlaces. |
| **Impacto** | GiftDashboard añade botón "Contactar destinatario 📱" que abre WhatsApp con template pre-rellenado. |
| **Aplica a** | GiftDashboard.tsx |
| **Evidencia** | `GiftDashboard.tsx` — no existe ningún botón "Contactar" ni enlace `wa.me/` en el componente. |

### D6 — receiver_phone es campo obligatorio y prominente

**Estado:** ✅ IMPLEMENTADO

| Campo | Valor |
|-------|-------|
| **Decisión** | `receiver_phone` se captura en GiftPurchaseForm y se persiste en `gift_experiences`. |
| **Motivo** | Es el único canal de coordinación. Sin receiver_phone, el comercio no puede contactar al destinatario. |
| **Aplica a** | GiftPurchaseForm.tsx |
| **Evidencia** | `GiftPurchaseForm.tsx:37` — `const [receiverPhone, setReceiverPhone] = useState('')`. Línea 118: se envía al API. Línea 294: input type="tel". `gift-purchase/route.ts` lo persiste. Implementado en Sprint 3I-A. |

### D7 — Precios NO visibles para el destinatario

**Estado:** ✅ IMPLEMENTADO

| Campo | Valor |
|-------|-------|
| **Decisión** | Los destinatarios NO ven precios individuales, subtotales ni totales en regalos físicos. |
| **Motivo** | Un regalo no es una transacción. El foco debe estar en quién envió, el mensaje y los productos, no en el valor monetario. |
| **Excepción** | Gift Cards siempre muestran valor inicial y balance por ser instrumentos monetarios. |
| **Post-Beta** | Si hay demanda, evaluar `show_prices_to_receiver BOOLEAN DEFAULT FALSE` como opt-in del comprador. |
| **Aplica a** | GiftRedemption.tsx, canje/page.tsx |
| **Evidencia** | `GiftRedemption.tsx:263-276` — solo renderiza nombre + imagen + "Disfruta tu regalo". Sin precios. `canje/page.tsx:357-372` — solo renderiza nombre + imagen. Sin precios. `canje/page.tsx:278-289` (post-canje) — solo renderiza nombre. Sin precios. |

### D8 — Textos actualizados en compra y canje

**Estado:** 🟡 APROBADO — PENDIENTE IMPLEMENTACIÓN

| Campo | Valor |
|-------|-------|
| **Decisión** | Eliminar textos "Pago contra entrega" (herencia V1). Reemplazar por "El costo de envío se coordinará posteriormente con el destinatario." En canje: "al realizar el pedido" → "se coordinará con el comercio". |
| **Motivo** | Los textos actuales reflejan un modelo de checkout que no aplica a Regalos V3. |
| **Aplica a** | GiftPurchaseForm.tsx, GiftRedemption.tsx, canje/page.tsx |
| **Evidencia** | `GiftPurchaseForm.tsx:341` — "Pago contra entrega" aún presente. `GiftRedemption.tsx:211,213` — "72 horas" y "al realizar el pedido" aún presentes. `canje/page.tsx:378,380` — "72 horas" y "al realizar el pedido" aún presentes. |

---

## Resumen de estados

| Decisión | Estado |
|----------|--------|
| D1 — Sin delivery en compra | 🟡 Pendiente |
| D2 — Sin delivery en canje | 🟡 Pendiente |
| D3 — Address opcional post-hoc | 🟡 Pendiente |
| D4 — Canje terminal | 🟡 Pendiente |
| D5 — WhatsApp coordinación | 🟡 Pendiente |
| D6 — receiver_phone | ✅ Implementado |
| D7 — Sin precios al destinatario | ✅ Implementado |
| D8 — Textos actualizados | 🟡 Pendiente |

---

## Estados del sistema

| Estado | Significado | Acciones del comercio |
|--------|-------------|----------------------|
| `PENDING` | Compra realizada, pendiente de revisión | [Aprobar] [Rechazar] |
| `RESERVED` | Aprobado, stock reservado, código activo | [Copiar enlace] [Cancelar] [Convertir] |
| `CLAIMED` | Destinatario canjeó, coordinar entrega | [Contactar 📱] [🚚 Marcar entregado] [Convertir] [Cancelar] |
| `DELIVERED` | Entregado | [Convertir] |
| `REJECTED` | Comercio rechazó | — |
| `EXPIRED` | Expiró por tiempo | [Convertir] |
| `CANCELLED` | Comercio canceló | — |

> **Nota:** Las acciones [Contactar 📱] y [🚚 Marcar entregado] sin gate aún no están implementadas. Corresponden a D5 y D3 respectivamente.

---

## Columnas activas vs muertas

### Activas (para V3.5)

| Columna | Uso |
|---------|-----|
| `store_id` | FK a tienda |
| `sender_name` | Quién compró |
| `sender_phone` | Contacto del comprador |
| `receiver_name` | Quién recibe |
| `receiver_phone` | ★ Canal de coordinación |
| `personal_message` | Mensaje del comprador |
| `gift_code` | Código de canje |
| `items_list` | JSONB de productos |
| `status` | Estado actual |
| `stock_reservado` | Stock reservado |
| `reserved_expires_at` | Auto-expiración |
| `claimed_at` | Cuándo canjeó |
| `delivered_at` | Cuándo entregó |
| `converted_to_giftcard_at` | Si se convirtió |
| `created_at` | Cuándo se creó |
| `delivery_address` | Opcional informativo — el comercio lo llena en dashboard post-coordinación. NO bloquea el flujo. (Requiere D3.) |

### Muertas (🔵 post-Beta cleanup)

| Columna | Motivo |
|---------|--------|
| `delivery_location_link` | Nunca se muestra ni se lee |
| `shipping_cost` | Nunca se usa en ningún cálculo |
| `location_requested_at` | Nunca se setea |
| `product_id` | Reemplazado por `items_list` |
| `legacy_code` | Solo migración P3-C |

### V1-only (mantener por datos legacy)

| Columna | Motivo |
|---------|--------|
| `is_redeemed` | Solo flujo V1 |
| `approved_at` | Solo flujo V1 |

---

## Prioridad pre-Beta

| # | Tarea | Decisión | Prioridad | Esfuerzo |
|---|-------|----------|-----------|----------|
| 1 | GiftDashboard: delivery_address editable inline | D3 | **P0** | Frontend |
| 2 | GiftDashboard: "Marcar entregado" sin gate | D3 | **P0** | Frontend |
| 3 | GiftDashboard: Botón "Contactar destinatario 📱" → wa.me template | D5 | **P0** | Frontend |
| 4 | `entregar_regalo_v2`: remover IS NULL check | D3 | **P0** | Migración |
| 5 | GiftRedemption: remover bloqueo por delivery_address | D2 | **P0** | Frontend |
| 6 | GiftRedemption: canje terminal (remover addToCart/setIsOpen) | D4 | **P1** | Frontend |
| 7 | GiftPurchaseForm: remover sección delivery | D1 | **P1** | Frontend |
| 8 | canje/page: remover needsAddress textarea | D2 | **P1** | Frontend |
| 9 | Textos: reemplazar "Pago contra entrega", "72 horas", "al realizar el pedido" | D8 | **P1** | Frontend |
| 10 | Price visibility: columna + checkbox | D7 | **🔵 Post-Beta** | Migración + Frontend |

---

## Decisiones post-Beta candidatas

| Funcionalidad | Disparador para implementar |
|--------------|----------------------------|
| `show_prices_to_receiver` checkbox | Demanda real de compradores preguntando "¿puedo mostrar cuánto costó?" |
| Dead column cleanup ($delivery_location_link$, $shipping_cost$, $location_requested_at$) | Post-Beta housekeeping |
| V1 → V2 migration (`is_redeemed`, `approved_at`) | Cuando no queden regalos V1 activos |
| WhatsApp auto-notify after DELIVERED | Store feedback: "quiero que se notifique al destinatario automáticamente" |

---

## Lo que NO cambia

- RPCs atómicas con FOR UPDATE
- Stock management (stock--, stock_reservado++, -- al aprobar/entregar/cancelar/expirar)
- Gift codes con upper+trim+regex
- Expiración automática via cron (`procesar_expiracion_reservados_v2`)
- Conversión a Gift Card
- Push notifications (5 eventos)
- V1 legacy (`is_redeemed`, `approved_at`, flujo magic link)

---

## Riesgos documentados

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| Store no contacta al destinatario | Regalo en CLAIMED indefinidamente | Alerta si CLAIMED > 3 días (ya existe). Botón "Contactar" prominente. (Requiere D5.) |
| Store entrega sin marcar DELIVERED | Stats incorrectos, stock no liberado | Alerta por tiempo en CLAIMED. Store motivado a cerrar tarea. |
| Destinatario sin WhatsApp | No se puede coordinar | Fallback: store contacta al comprador via sender_phone. |
| receiver_phone incorrecto | Store no puede contactar | Store llama al comprador para obtener el número correcto. |
