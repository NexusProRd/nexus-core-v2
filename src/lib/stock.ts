export interface StockItem {
  id_producto: string | null
  nombre: string
  cantidad: number
  variante_seleccionada?: string | null
}

interface StockResult {
  ok: boolean
  errors: string[]
}

export async function gestionarStock(
  supabase: any,
  items: StockItem[],
  accion: 'deduct' | 'restore' | 'reserve' | 'unreserve'
): Promise<StockResult> {
  const errors: string[] = []
  const multiplicador = accion === 'deduct' ? -1 : 1

  for (const item of items) {
    if (!item.id_producto || item.cantidad <= 0) continue
    const pid = item.id_producto

    try {
      const { data: prod } = await supabase
        .from('productos')
        .select('id, tallas, stock, stock_reservado')
        .eq('id', pid)
        .single()

      if (!prod) {
        errors.push(`Producto no encontrado: ${item.nombre}`)
        continue
      }

      const tieneVariante = item.variante_seleccionada &&
        Array.isArray(prod.tallas) &&
        prod.tallas.some((t: any) => typeof t === 'object' && t.talla === item.variante_seleccionada)

      // ── reserve / unreserve (Regalos V2: no variantes) ──
      if (accion === 'reserve' || accion === 'unreserve') {
        if (tieneVariante) {
          errors.push(`${item.nombre} tiene variantes y no puede procesarse como regalo V2.`)
          continue
        }

        const delta = accion === 'reserve' ? item.cantidad : -item.cantidad
        const nuevoReservado = (prod.stock_reservado || 0) + delta

        if (nuevoReservado < 0) {
          errors.push(`Stock reservado insuficiente para ${item.nombre}.`)
          continue
        }

        if (accion === 'reserve') {
          const disponible = (prod.stock || 0) - (prod.stock_reservado || 0)
          if (disponible < item.cantidad) {
            errors.push(`Stock insuficiente para ${item.nombre}. Disponible: ${Math.max(0, disponible)}`)
            continue
          }
        }

        const { data: updated } = await supabase
          .from('productos')
          .update({ stock_reservado: Math.max(0, nuevoReservado) })
          .eq('id', pid)
          .eq('stock_reservado', prod.stock_reservado || 0)
          .select()

        if (!updated || updated.length === 0) {
          errors.push(`Conflicto de concurrencia al ${accion === 'reserve' ? 'reservar' : 'liberar'} stock de ${item.nombre}. Intenta de nuevo.`)
        }
        continue
      }

      // ── deduct / restore (existente, con stock_reservado en validación) ──
      if (tieneVariante) {
        const varianteActual = prod.tallas.find(
          (t: any) => typeof t === 'object' && t.talla === item.variante_seleccionada
        )
        const nuevoStockVariante = (varianteActual?.stock || 0) + multiplicador * item.cantidad

        if (accion === 'deduct') {
          const disponible = (varianteActual?.stock || 0) - (prod.stock_reservado || 0)
          if (nuevoStockVariante < 0 || disponible < item.cantidad) {
            errors.push(`Stock insuficiente para variante ${item.variante_seleccionada} de ${item.nombre}. Disponible: ${Math.max(0, disponible)}`)
            continue
          }
        }

        const tallasActualizadas = prod.tallas.map((t: any) => {
          if (typeof t === 'object' && t.talla === item.variante_seleccionada) {
            return { ...t, stock: Math.max(0, nuevoStockVariante) }
          }
          return t
        })

        const stockSum = tallasActualizadas.reduce((sum: number, v: any) => {
          return sum + (typeof v === 'object' ? (v.stock || 0) : 0)
        }, 0)

        const stockAntes = prod.stock
        const reservadoAntes = prod.stock_reservado || 0
        const { data: updatedV } = await supabase
          .from('productos')
          .update({ tallas: tallasActualizadas, stock: stockSum, in_stock: stockSum > 0 })
          .eq('id', pid)
          .eq('stock', stockAntes)
          .eq('stock_reservado', reservadoAntes)
          .select()

        if (!updatedV || updatedV.length === 0) {
          errors.push(`Conflicto de concurrencia al ${accion === 'deduct' ? 'descontar' : 'restaurar'} stock de ${item.nombre} (variante ${item.variante_seleccionada}). Intenta de nuevo.`)
        }
      } else {
        const nuevoStock = (prod.stock || 0) + multiplicador * item.cantidad

        if (accion === 'deduct') {
          const disponible = (prod.stock || 0) - (prod.stock_reservado || 0)
          if (nuevoStock < 0 || disponible < item.cantidad) {
            errors.push(`Stock insuficiente para ${item.nombre}. Disponible: ${Math.max(0, disponible)}`)
            continue
          }
        }

        const sanitized = Math.max(0, nuevoStock)
        const { data: updatedS } = await supabase
          .from('productos')
          .update({ stock: sanitized, in_stock: sanitized > 0 })
          .eq('id', pid)
          .eq('stock', prod.stock)
          .eq('stock_reservado', prod.stock_reservado || 0)
          .select()

        if (!updatedS || updatedS.length === 0) {
          errors.push(`Conflicto de concurrencia al ${accion === 'deduct' ? 'descontar' : 'restaurar'} stock de ${item.nombre}. Intenta de nuevo.`)
        }
      }
    } catch (e: any) {
      const accionLabel =
        accion === 'reserve' ? 'reservar' :
        accion === 'unreserve' ? 'liberar' :
        accion === 'deduct' ? 'descontar' : 'restaurar'
      errors.push(
        `Error al ${accionLabel} stock de ${item.nombre}: ${e.message}`
      )
    }
  }

  return { ok: errors.length === 0, errors }
}

export function extraerItemsPedido(detallesPedido: any): StockItem[] {
  if (!detallesPedido) return []
  const arr = Array.isArray(detallesPedido) ? detallesPedido : [detallesPedido]
  return arr.map((d: any) => ({
    id_producto: d.id_producto || null,
    nombre: d.producto || d.nombre || '',
    cantidad: d.cantidad || 1,
    variante_seleccionada: d.variante_seleccionada || null,
  }))
}
