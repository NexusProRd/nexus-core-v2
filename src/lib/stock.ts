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
  accion: 'deduct' | 'restore'
): Promise<StockResult> {
  const errors: string[] = []
  const multiplicador = accion === 'deduct' ? -1 : 1

  for (const item of items) {
    if (!item.id_producto || item.cantidad <= 0) continue
    const pid = item.id_producto

    try {
      const { data: prod } = await supabase
        .from('productos')
        .select('id, tallas, stock')
        .eq('id', pid)
        .single()

      if (!prod) {
        errors.push(`Producto no encontrado: ${item.nombre}`)
        continue
      }

      const tieneVariante = item.variante_seleccionada &&
        Array.isArray(prod.tallas) &&
        prod.tallas.some((t: any) => typeof t === 'object' && t.talla === item.variante_seleccionada)

      if (tieneVariante) {
        const varianteActual = prod.tallas.find(
          (t: any) => typeof t === 'object' && t.talla === item.variante_seleccionada
        )
        const nuevoStockVariante = (varianteActual?.stock || 0) + multiplicador * item.cantidad

        if (accion === 'deduct' && nuevoStockVariante < 0) {
          errors.push(`Stock insuficiente para variante ${item.variante_seleccionada} de ${item.nombre}. Disponible: ${varianteActual?.stock || 0}`)
          continue
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
        const { data: updatedV } = await supabase
          .from('productos')
          .update({ tallas: tallasActualizadas, stock: stockSum, in_stock: stockSum > 0 })
          .eq('id', pid)
          .eq('stock', stockAntes)
          .select()

        if (!updatedV || updatedV.length === 0) {
          errors.push(`Conflicto de concurrencia al ${accion === 'deduct' ? 'descontar' : 'restaurar'} stock de ${item.nombre} (variante ${item.variante_seleccionada}). Intenta de nuevo.`)
        }
      } else {
        const nuevoStock = (prod.stock || 0) + multiplicador * item.cantidad

        if (accion === 'deduct' && nuevoStock < 0) {
          errors.push(`Stock insuficiente para ${item.nombre}. Disponible: ${prod.stock || 0}`)
          continue
        }

        const sanitized = Math.max(0, nuevoStock)
        const { data: updatedS } = await supabase
          .from('productos')
          .update({ stock: sanitized, in_stock: sanitized > 0 })
          .eq('id', pid)
          .eq('stock', prod.stock)
          .select()

        if (!updatedS || updatedS.length === 0) {
          errors.push(`Conflicto de concurrencia al ${accion === 'deduct' ? 'descontar' : 'restaurar'} stock de ${item.nombre}. Intenta de nuevo.`)
        }
      }
    } catch (e: any) {
      errors.push(
        `Error al ${accion === 'deduct' ? 'descontar' : 'restaurar'} stock de ${item.nombre}: ${e.message}`
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
