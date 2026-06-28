# RC-UAT-02 — Informe Final de Auditoría

**Fecha**: 27-Jun-2026
**Auditor**: Automatizado (node.js + Supabase REST API)
**Alcance**: 9 escenarios de negocio sobre datos reales (Primus Company)
**Estado**: ✅ COMPLETO

---

## Resumen Ejecutivo

| Escenario | Estado | Hallazgos |
|-----------|--------|-----------|
| E1 — Compra normal | ✅ Completo | 0 bugs |
| E2 — Compra con variantes | 🔴 P1 | 1 bug crítico |
| E3 — Compra con cupón | ✅ Completo | 0 bugs |
| E4 — Gift Card | ✅ Completo | 0 bugs |
| E5 — Regalos | 🔴 P1 | 6 bugs |
| E6 — Cancelaciones | ✅ Consistente | 0 bugs (con P1-06 conocido) |
| E7 — Rollbacks | ✅ Consistente | 0 bugs |
| E8 — Financiero | ✅ Consistente | 0 bugs |
| E9 — Consistencia Global | ✅ Consistente | 0 bugs |

**Total: 7 bugs P1** — 1 en checkout, 6 en gift lifecycle RPCs

---

## Hallazgos Críticos (P1)

### H-001: `idProductoReal()` trunca UUIDs con guiones

- **Archivo**: `src/app/api/checkout/route.ts:9-12`
- **Causa**: La regex `/-[^-]+$/` extrae el sufijo tras el último guión, pero los UUIDs como `a1b2c3d4-e5f6-7890-abcd-ef1234567890` contienen múltiples guiones. Al aplicarla a `a1b2c3d4-e5f6-7890-abcd-ef1234567890-L` se obtiene `L` en lugar del UUID real.
- **Impacto**: Toda compra con variantes retorna 500 (idProductoReal retorna string vacío).
- **Clasificación**: **P1** — Bloqueante, 0 workarounds.

### H-002 a H-007: Bugs en Gift Lifecycle RPCs (cantidad ignorada)

Todas las RPCs de regalos usan `+1` o `-1` fijo en operaciones de stock, ignorando el campo `items_list[].cantidad`. El checkout ya escribe `cantidad` correctamente, y el modelo de negocio permite cantidad > 1.

| ID | RPC | Línea | Operación | Bug |
|----|-----|-------|-----------|-----|
| H-002 | `aprobar_regalo_v2` | `088_gift_variante_stock_rpc.sql:118` | `UPDATE productos SET stock = stock - 1` | Debería restar `cantidad`, no 1 |
| H-003 | `entregar_regalo_v2` | `088_gift_variante_stock_rpc.sql:239,253,269` | `UPDATE productos SET stock = stock - 1` (3 ramas) | Debería restar `cantidad`, no 1 |
| H-004 | `revertir_entrega_regalo_v2` | `088_gift_variante_stock_rpc.sql:341,360,367,374` | `UPDATE productos SET stock = stock + 1` (2 ramas) | Debería sumar `cantidad`, no 1 |
| H-005 | `convertir_regalo_a_giftcard_v2` | `077_fix_convertir_regalo_a_giftcard_v2.sql:77` | `UPDATE productos SET stock = stock + 1` (unreserve) | Debería sumar `cantidad`, no 1 |
| H-006 | `convertir_regalo_a_giftcard_v2` | `077_fix_convertir_regalo_a_giftcard_v2.sql:91-93` | `precio := (SELECT SUM(p.precio) FROM ...)` | Debería ser `SUM(p.precio * d.cantidad)` |
| H-007 | `cancelar_regalo_v2` | `073_approve_cancel_gift_v2.sql:159` | `UPDATE productos SET stock = stock + 1` (unreserve) | Debería sumar `cantidad`, no 1 |

**Impacto acumulado**: Inventario incorrecto, GC con valor incorrecto, regalos con cantidad>1 imposibles de procesar correctamente.
**Clasificación**: **P1** — Pérdida de datos de inventario.

---

## Escenarios No Críticos (sin hallazgos)

### E1 — Compra Normal
- Ciclo completo: checkout → pago → confirmación
- Stock: 50→49 (correcto)
- ✅ Sin errores

### E3 — Compra con Cupón
- Cupón PRIMUS20: 20% descuento, 1 uso consumido
- ✅ Sin errores

### E4 — Gift Card
- 4 sub-escenarios: GC parcial, total, insuficiente, GC+Cupón
- GC-001 creada ($500), consumida correctamente
- Cupón y GC combinados: total 1250→750 (cupón 20%→1000→GC -500→500 final)
- ✅ Sin errores

### E6 — Cancelaciones
- Pedido normal cancelado + stock restaurado
- Gift PENDING → rechazado (correcto)
- Gift RESERVED/CLAIMED → cancelado (con bug H-007 conocido)
- Gift DELIVERED → rechazado (correcto)
- ✅ Consistente

### E7 — Rollbacks
- Stock, variante stock, GC restore, coupon decrement, pedido fallido
- ✅ Todos los rollbacks funcionan

### E8 — Financiero
- Fórmula `ganancia_neta = (precio - costo) * cantidad` correcta
- Jabón: (250-150)*3 = 300 ✅
- Camiseta M: (250-150)*1 = 100 ✅
- Camiseta L: (250-150)*1 = 100 ✅
- Margen: 40-43.8%
- ✅ Consistente

### E9 — Consistencia Global
- 10 checks automáticos: stock≥0, in_stock, reservado≤stock, GC balance, cupones, gift status, detalles, ganancia_neta, variantes
- Envío Exprés: stock=0, in_stock=true (cosmético — producto de servicio, no físico)
- ✅ Consistente

---

## Métricas del Sistema

| Métrica | Valor |
|---------|-------|
| Productos activos | 3 |
| Stock total físico | 70 unidades |
| Pedidos totales | 32 |
| Cupones activos | 2 |
| Gift Cards activas | 0 |
| Regalos activos | 0 |

---

## Prioridad de Corrección

1. **H-001** (`idProductoReal`) — **BLOQUEANTE**: Sin esto, ninguna compra con variantes funciona.
2. **H-002 a H-007** (Gift lifecycle) — **ALTA**: Sin esto, los regalos con cantidad>1 corrompen inventario.
3. B7 (Gift quantity>1 UI) — **P3**: Depende de H-002..H-007.

---

## Archivos de Auditoría

| Archivo | Propósito |
|---------|-----------|
| `uat-e1.js` | Escenario 1 — Compra normal |
| `uat-e2.js` | Escenario 2 — Compra con variantes |
| `uat-e3.js` | Escenario 3 — Cupón |
| `uat-e4.js` | Escenario 4 — Gift Card |
| `uat-e5.js` | Escenario 5 — Regalos |
| `uat-e6.js` | Escenario 6 — Cancelaciones |
| `uat-e7.js` | Escenario 7 — Rollbacks |
| `uat-e8.js` | Escenario 8 — Financiero |
| `uat-e9.js` | Escenario 9 — Consistencia Global |

---

*Fin del informe — Nexus RC-UAT-02*
