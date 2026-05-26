import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { supabase, error: adminError } = createAdminClient()
  if (adminError || !supabase) {
    return NextResponse.json({ error: 'Error de configuración del servidor.' }, { status: 500 })
  }

  const url = new URL(request.url)
  const action = url.searchParams.get('action') || ''

  if (action === 'diagnostico') {
    const results: { prueba: string; estado: 'ok' | 'error' | 'advertencia'; detalle: string }[] = []

    // 1. Conexión DB
    try {
      const { count: dbCount, error: dbError } = await supabase
        .from('tiendas')
        .select('*', { count: 'exact', head: true })
      if (dbError) {
        results.push({ prueba: 'Conexión Base de Datos', estado: 'error', detalle: dbError.message })
      } else {
        results.push({ prueba: 'Conexión Base de Datos', estado: 'ok', detalle: `${dbCount ?? 0} tiendas encontradas` })
      }
    } catch (e: any) {
      results.push({ prueba: 'Conexión Base de Datos', estado: 'error', detalle: e?.message || 'Error desconocido' })
    }

    // 2. Storage
    try {
      const { data: buckets } = await supabase.storage.listBuckets()
      const imgBucket = buckets?.find(b => b.name === 'img_products')
      if (!imgBucket) {
        results.push({ prueba: 'Storage img_products', estado: 'error', detalle: 'Bucket no encontrado' })
      } else {
        results.push({ prueba: 'Storage img_products', estado: 'ok', detalle: `Bucket ${imgBucket.public ? 'público' : 'privado'}` })
      }
    } catch (e: any) {
      results.push({ prueba: 'Storage img_products', estado: 'error', detalle: e?.message || 'Error al listar buckets' })
    }

    // 3. Stock negativo
    try {
      const { count: stockNegCount, error: stockNegErr } = await supabase
        .from('productos')
        .select('*', { count: 'exact', head: true })
        .lt('stock', 0)
      if (stockNegErr) {
        results.push({ prueba: 'Stock negativo', estado: 'advertencia', detalle: `No se pudo verificar: ${stockNegErr.message}` })
      } else {
        results.push({ prueba: 'Stock negativo', estado: stockNegCount && stockNegCount > 0 ? 'advertencia' : 'ok', detalle: stockNegCount && stockNegCount > 0 ? `${stockNegCount} producto(s) con stock negativo` : '0 productos con stock negativo' })
      }
    } catch (e: any) {
      results.push({ prueba: 'Stock negativo', estado: 'advertencia', detalle: e?.message || 'Error al verificar' })
    }

    // 4. Pedidos sin detalles
    try {
      const { count: pedidosHuerfanosCount, error: pedidosErr } = await supabase
        .from('pedidos')
        .select('*', { count: 'exact', head: true })
        .not('id', 'in', '(select id_pedido from detalles_pedido)')
      if (pedidosErr) {
        results.push({ prueba: 'Pedidos huérfanos', estado: 'advertencia', detalle: `No se pudo verificar: ${pedidosErr.message}` })
      } else {
        results.push({ prueba: 'Pedidos huérfanos', estado: pedidosHuerfanosCount && pedidosHuerfanosCount > 0 ? 'advertencia' : 'ok', detalle: pedidosHuerfanosCount && pedidosHuerfanosCount > 0 ? `${pedidosHuerfanosCount} sin detalles` : '0 pedidos huérfanos' })
      }
    } catch (e: any) {
      results.push({ prueba: 'Pedidos huérfanos', estado: 'advertencia', detalle: e?.message || 'Error al verificar' })
    }

    // 5. Tiendas soft-deleted
    try {
      const { count: softDelCount, error: softDelErr } = await supabase
        .from('tiendas')
        .select('*', { count: 'exact', head: true })
        .not('soft_deleted_at', 'is', null)
      if (softDelErr) {
        results.push({ prueba: 'Tiendas eliminadas (soft)', estado: 'advertencia', detalle: `No se pudo verificar: ${softDelErr.message}` })
      } else {
        results.push({ prueba: 'Tiendas eliminadas (soft)', estado: softDelCount && softDelCount > 0 ? 'advertencia' : 'ok', detalle: softDelCount && softDelCount > 0 ? `${softDelCount} pendientes de purga (30 días)` : '0 eliminadas' })
      }
    } catch (e: any) {
      results.push({ prueba: 'Tiendas eliminadas (soft)', estado: 'advertencia', detalle: e?.message || 'Error al verificar' })
    }

    return NextResponse.json({ results })
  }

  if (action === 'logs') {
    const { data, error } = await supabase
      .from('nexus_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      return NextResponse.json({ data: [], error: error.message })
    }

    const sanitized = (data || []).map((log: any) => ({
      id: log.id,
      modulo: log.modulo || '—',
      accion: (log as any).accion || (log as any).action || '—',
      detalle: log.detalle || '',
      created_at: log.created_at,
    }))

    return NextResponse.json({ data: sanitized })
  }

  return NextResponse.json({ error: 'Acción no reconocida' }, { status: 400 })
}

export async function POST(request: Request) {
  const { supabase, error: adminError } = createAdminClient()
  if (adminError || !supabase) {
    return NextResponse.json({ error: 'Error de configuración del servidor.' }, { status: 500 })
  }

  let body: { action: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 })
  }

  const { action } = body

  const handleAction = async (): Promise<NextResponse> => {
    switch (action) {
      case 'reparar-inventario': {
        const operaciones: string[] = []

        try {
          const { data: negativos } = await supabase
            .from('productos')
            .select('id, nombre, stock')
            .lt('stock', 0)
          if (negativos && negativos.length > 0) {
            const { error: fixNeg } = await supabase
              .from('productos')
              .update({ stock: 0 })
              .in('id', negativos.map(p => p.id))
            operaciones.push(fixNeg ? `Error corrigiendo stock negativo: ${fixNeg.message}` : `${negativos.length} producto(s) con stock negativo corregido(s) a 0`)
          } else {
            operaciones.push('0 productos con stock negativo')
          }
        } catch (e: any) { operaciones.push(`Error: ${e.message}`) }

        try {
          const { data: malMarcados } = await supabase
            .from('productos')
            .select('id')
            .gt('stock', 0)
            .eq('in_stock', false)
          if (malMarcados && malMarcados.length > 0) {
            const { error: fixStock } = await supabase
              .from('productos')
              .update({ in_stock: true })
              .in('id', malMarcados.map(p => p.id))
            operaciones.push(fixStock ? `Error marcando in_stock: ${fixStock.message}` : `${malMarcados.length} producto(s) con stock > 0 marcados como disponibles`)
          } else {
            operaciones.push('0 productos mal marcados')
          }
        } catch (e: any) { operaciones.push(`Error: ${e.message}`) }

        try {
          const { data: sinStock } = await supabase
            .from('productos')
            .select('id')
            .eq('stock', 0)
            .eq('in_stock', true)
          if (sinStock && sinStock.length > 0) {
            const { error: fixSinStock } = await supabase
              .from('productos')
              .update({ in_stock: false })
              .in('id', sinStock.map(p => p.id))
            operaciones.push(fixSinStock ? `Error actualizando sin stock: ${fixSinStock.message}` : `${sinStock.length} producto(s) sin stock marcados como no disponibles`)
          } else {
            operaciones.push('0 productos sin stock mal marcados')
          }
        } catch (e: any) { operaciones.push(`Error: ${e.message}`) }

        return NextResponse.json({ ok: true, operaciones })
      }

      case 'recalcular-analiticas': {
        const operaciones: string[] = []

        try {
          const { data: pedidos } = await supabase
            .from('pedidos')
            .select('id, id_tienda, total')
            .neq('estado', 'pendiente')

          if (!pedidos || pedidos.length === 0) {
            operaciones.push('0 pedidos para recalcular')
          } else {
            let actualizados = 0
            for (const pedido of pedidos) {
              const { data: detalles } = await supabase
                .from('detalles_pedido')
                .select('id_producto, cantidad, precio_unitario')
                .eq('id_pedido', pedido.id)

              if (!detalles || detalles.length === 0) continue

              let costoTotal = 0
              for (const det of detalles) {
                if (det.id_producto) {
                  const { data: prod } = await supabase
                    .from('productos')
                    .select('costo_compra')
                    .eq('id', det.id_producto)
                    .single()
                  if (prod) {
                    costoTotal += Number(prod.costo_compra || 0) * det.cantidad
                  }
                }
              }

              const ganancia = Number(pedido.total) - costoTotal
              const { error: upd } = await supabase
                .from('pedidos')
                .update({ ganancia_neta: Math.max(0, ganancia) })
                .eq('id', pedido.id)

              if (!upd) actualizados++
            }
            operaciones.push(`${actualizados} pedido(s) actualizados con ganancia neta recalculada`)
          }
        } catch (e: any) { operaciones.push(`Error: ${e.message}`) }

        return NextResponse.json({ ok: true, operaciones })
      }

      case 'reparar-suscripciones': {
        try {
          const { data, error } = await supabase.rpc('automatizar_suscripciones_nexus')
          if (error) {
            return NextResponse.json({ ok: true, procesadas: 0, error: error.message })
          }
          return NextResponse.json({ ok: true, procesadas: data })
        } catch (e: any) {
          return NextResponse.json({ ok: true, procesadas: 0, error: e.message })
        }
      }

      case 'reparar-storage': {
        const operaciones: string[] = []

        try {
          const { data: productos } = await supabase
            .from('productos')
            .select('id, nombre, imagen_url')
            .not('imagen_url', 'is', null)

          if (productos && productos.length > 0) {
            let rotas = 0
            for (const prod of productos) {
              if (!prod.imagen_url || prod.imagen_url.trim() === '') {
                const { error: clean } = await supabase
                  .from('productos')
                  .update({ imagen_url: null })
                  .eq('id', prod.id)
                if (!clean) rotas++
              }
            }
            operaciones.push(`${rotas} imagen(es) vacías limpiadas en productos`)
          } else {
            operaciones.push('0 productos con imágenes')
          }
        } catch (e: any) { operaciones.push(`Error en productos: ${e.message}`) }

        try {
          const { data: perfiles } = await supabase
            .from('perfil_tienda')
            .select('id, logo_url')
            .not('logo_url', 'is', null)

          if (perfiles && perfiles.length > 0) {
            let rotas = 0
            for (const perfil of perfiles) {
              if (!perfil.logo_url || perfil.logo_url.trim() === '') {
                const { error: clean } = await supabase
                  .from('perfil_tienda')
                  .update({ logo_url: null })
                  .eq('id', perfil.id)
                if (!clean) rotas++
              }
            }
            operaciones.push(`${rotas} logo(s) vacíos limpiados en perfiles`)
          } else {
            operaciones.push('0 perfiles con logo')
          }
        } catch (e: any) { operaciones.push(`Error en perfiles: ${e.message}`) }

        return NextResponse.json({ ok: true, operaciones })
      }

      case 'reparar-pedidos': {
        const operaciones: string[] = []

        try {
          const { data: huerfanos } = await supabase
            .from('pedidos')
            .select('id')
            .filter('id', 'not.in', '(select id_pedido from detalles_pedido)')

          if (huerfanos && huerfanos.length > 0) {
            const { error: del } = await supabase
              .from('pedidos')
              .delete()
              .in('id', huerfanos.map(p => p.id))
            operaciones.push(del ? `Error: ${del.message}` : `${huerfanos.length} pedido(s) sin detalles eliminados`)
          } else {
            operaciones.push('0 pedidos huérfanos')
          }
        } catch (e: any) { operaciones.push(`Error: ${e.message}`) }

        try {
          const { data: detallesHuerfanos } = await supabase
            .from('detalles_pedido')
            .select('id, id_producto')
            .not('id_producto', 'is', null)
            .filter('id_producto', 'not.in', '(select id from productos)')

          if (detallesHuerfanos && detallesHuerfanos.length > 0) {
            const ids = detallesHuerfanos.map(d => d.id)
            const { error: clean } = await supabase
              .from('detalles_pedido')
              .update({ id_producto: null })
              .in('id', ids)
            operaciones.push(clean ? `Error: ${clean.message}` : `${ids.length} detalle(s) con producto eliminado fueron limpiados`)
          } else {
            operaciones.push('0 detalles con producto huérfano')
          }
        } catch (e: any) { operaciones.push(`Error: ${e.message}`) }

        return NextResponse.json({ ok: true, operaciones })
      }

      default:
        return NextResponse.json({ error: 'Acción no reconocida' }, { status: 400 })
    }
  }

  return handleAction()
}
