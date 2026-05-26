import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { cookies, headers } from 'next/headers'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const { supabase } = createAdminClient()
  if (!supabase) redirect('/login')
  const cookieStore = await cookies()
  const sessionId = cookieStore.get('nx_session')?.value
  if (!sessionId) redirect('/login')

  const { data: tienda } = await supabase
    .from('tiendas')
    .select('id, nombre_tienda, slug, tienda_abierta, tokens_disponibles, fecha_vencimiento, tipo_negocio, onboarding_completo')
    .eq('id', sessionId)
    .single()
  if (!tienda) redirect('/login')
  if (!tienda.onboarding_completo) redirect('/onboarding')

  const headersList = await headers()
  const host = headersList.get('host')
  const proto = headersList.get('x-forwarded-proto') ?? 'http'

  const { data: perfil } = await supabase
    .from('perfil_tienda')
    .select('nombre_comercial')
    .eq('id_tienda', tienda.id)
    .single()

  const hoy = new Date()
  const hoyISO = hoy.toISOString().split('T')[0]
  const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).toISOString()

  const { data: pedidos } = await supabase
    .from('pedidos')
    .select('id, cliente_nombre, total, estado, creado_at, detalles_pedido')
    .eq('id_tienda', tienda.id)
    .order('creado_at', { ascending: false })

  const { data: productos } = await supabase
    .from('productos')
    .select('nombre, stock, id')
    .eq('id_tienda', tienda.id)

  const { count: regalosPendientes } = await supabase
    .from('gift_experiences')
    .select('*', { count: 'exact', head: true })
    .eq('store_id', tienda.id)
    .eq('status', 'pending')

  const { data: giftsAprobadosHoy } = await supabase
    .from('gift_experiences')
    .select('items_list')
    .eq('store_id', tienda.id)
    .eq('status', 'approved')
    .gte('created_at', inicioHoy)

  const ventasRegalos = (giftsAprobadosHoy || []).reduce((sum, g) => {
    const items = (g.items_list as { precio: number }[]) || []
    return sum + items.reduce((s, i) => s + Number(i.precio || 0), 0)
  }, 0)

  const pedidosHoy = pedidos?.filter(p => {
    if (!p.creado_at) return false
    const pedidoFecha = new Date(p.creado_at).toISOString().split('T')[0]
    return pedidoFecha === hoyISO && p.estado !== 'cancelado' && p.estado !== 'rechazado'
  }) || []

  const ventasPedidos = pedidosHoy
    .filter(p => p.estado === 'confirmado')
    .reduce((s, p) => s + Number(p.total || 0), 0)

  const ventasHoy = ventasPedidos + ventasRegalos
  const pendientes = pedidos?.filter(p => p.estado === 'pendiente').length || 0
  const ultimosPedidos = pedidos?.slice(0, 5) || []
  const stockBajo = productos?.filter(p => Number(p.stock) < 5).sort((a, b) => a.stock - b.stock) || []

  const tipoNegocio = tienda.tipo_negocio || 'estandar'
  let tallasStockBajo: { producto: string; tallas: string[] }[] = []
  if (tipoNegocio === 'ropa') {
    const { data: prods } = await supabase.from('productos').select('nombre, stock, tallas').eq('id_tienda', tienda.id)
    if (prods) {
      for (const p of prods) {
        if (p.tallas && p.tallas.length > 0 && p.stock > 0) {
          const porTalla = p.stock / p.tallas.length
          const bajas = p.tallas.filter((_: string) => porTalla < 5)
          if (bajas.length > 0) tallasStockBajo.push({ producto: p.nombre, tallas: bajas })
        }
      }
    }
  }

  const nombreTienda = perfil?.nombre_comercial || tienda.nombre_tienda || 'Mi Tienda'
  const catalogoUrl = tienda.slug
    ? `${proto}://${host}/c/${tienda.slug}`
    : `${proto}://${host}/catalogo/${tienda.id}`
  const tiendaAbierta = tienda.tienda_abierta !== false

  return (
    <DashboardClient
      tiendaId={tienda.id}
      nombreTienda={nombreTienda}
      catalogoUrl={catalogoUrl}
      tiendaSlug={tienda.slug || null}
      tiendaAbierta={tiendaAbierta}
      tokensDisponibles={tienda.tokens_disponibles ?? 0}
      fechaVencimiento={tienda.fecha_vencimiento || null}
      tipoNegocio={tipoNegocio}
      tallasStockBajo={tallasStockBajo}
      initialStats={{
        ventasHoy,
        pendientes,
        pedidosHoy: pedidosHoy.length,
        regalosPendientes: regalosPendientes || 0,
        stockBajo,
        ultimosPedidos,
      }}
    />
  )
}
