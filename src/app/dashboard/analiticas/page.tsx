import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'
import AnaliticasContent from './AnaliticasContent'

export const dynamic = 'force-dynamic'

interface Pedido {
  id: string
  cliente_nombre: string
  total: number
  ganancia_neta: number
  estado: string
  creado_at: string
  items?: any
}

export default async function AnaliticasPage() {
  const { supabase } = createAdminClient()
  if (!supabase) return <div className="p-8 text-center text-slate-500">Error de conexión</div>

  const cookieStore = await cookies()
  const tiendaId = cookieStore.get('nx_session')?.value
  if (!tiendaId) return <div className="p-8 text-center text-slate-500">Sesión no válida</div>

  const [pedidosRes, tiendaRes, productosRes] = await Promise.all([
    supabase.from('pedidos').select('*').eq('id_tienda', tiendaId).order('creado_at', { ascending: false }),
    supabase.from('tiendas').select('tipo_negocio').eq('id', tiendaId).maybeSingle(),
    supabase.from('productos').select('nombre, costo_compra, stock, tallas, tipo_articulo').eq('id_tienda', tiendaId),
  ])

  const tipoNegocio = (tiendaRes.data as { tipo_negocio?: string } | null)?.tipo_negocio || 'estandar'
  const productos = productosRes.data || []

  const costosMap = new Map<string, number>()
  ;(productos as any[]).forEach(prod => {
    costosMap.set(prod.nombre?.toLowerCase(), prod.costo_compra || 0)
  })

  const pedidos = ((pedidosRes.data || []) as any[]).map((p: any) => ({
    id: p.id,
    cliente_nombre: p.cliente_nombre,
    total: p.total,
    ganancia_neta: p.ganancia_neta || 0,
    estado: p.estado,
    creado_at: p.creado_at,
    items: (p.detalles_pedido || []).map((i: any) => {
      let nombreProd = i.producto || i.nombre || ''
      const nombreLimpio = nombreProd.replace(/\s*\(.*?\)\s*$/, '').trim().toLowerCase()
      const costoNombre = costosMap.get(nombreLimpio) || costosMap.get(nombreProd.toLowerCase()) || 0
      return {
        cantidad: i.cantidad || i.quantity || 1,
        precio: i.precio || i.precio_unitario || 0,
        costo: i.costo_real ?? costoNombre,
        producto: nombreProd,
      }
    }),
  })) as Pedido[]

  const productosConTallas = productos
    .filter((p: any) => Array.isArray(p.tallas) && p.tallas.length > 0)
    .map((p: any) => ({
      nombre: p.nombre,
      stock: p.stock,
      tallas: Array.isArray(p.tallas) && p.tallas.length > 0 && typeof p.tallas[0] === 'object'
        ? p.tallas.map((t: any) => ({ talla: t.talla, stock: t.stock ?? 0, precio: t.precio ?? null }))
        : p.tallas,
      tipo_articulo: p.tipo_articulo || null,
    }))

  const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  const hoy = new Date()
  const ultimos7Dias = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(hoy)
    d.setDate(d.getDate() - (6 - i))
    return d
  })

  const dataGrafico = ultimos7Dias.map(fecha => {
    const año = fecha.getFullYear()
    const mes = String(fecha.getMonth() + 1).padStart(2, '0')
    const dia = String(fecha.getDate()).padStart(2, '0')
    const fechaLocalStr = `${año}-${mes}-${dia}`

    const pedidosDia = pedidos.filter(p => {
      if (!p.creado_at) return false
      const fechaPedidoLocal = new Date(p.creado_at)
      const pAño = fechaPedidoLocal.getFullYear()
      const pMes = String(fechaPedidoLocal.getMonth() + 1).padStart(2, '0')
      const pDia = fechaPedidoLocal.getDate()
      const pedidoLocalStr = `${pAño}-${pMes}-${String(pDia).padStart(2, '0')}`

      return pedidoLocalStr === fechaLocalStr && (p.estado === 'confirmado' || p.estado === 'entregado')
    })

    let ventasDia = 0
    let gananciasDia = 0

    pedidosDia.forEach(p => {
      ventasDia += Number(p.total || 0)
      const items = p.items || []
      items.forEach((item: any) => {
        const qty = Number(item.cantidad || item.quantity || 1)
        const precio = Number(item.precio || 0)
        const costo = Number(item.costo || item.costo_unidad || 0)
        gananciasDia += ((precio - costo) * qty)
      })
    })

    return {
      name: diasSemana[fecha.getDay()],
      ventas: ventasDia,
      ganancias: gananciasDia
    }
  })

  return (
    <AnaliticasContent
      pedidosIniciales={pedidos}
      tiendaId={tiendaId}
      tipoNegocio={tipoNegocio}
      productosConTallas={productosConTallas}
      dataGrafico={dataGrafico}
    />
  )
}
