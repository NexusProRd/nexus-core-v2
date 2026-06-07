import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { cookies, headers } from 'next/headers'
import { getSessionFromCookieValue } from '@/lib/auth/get-session'
import DashboardClient from './DashboardClient'
import { calcularMetricasDashboard, calcularTodasLasMetricas } from './dashboard-metrics'

export default async function DashboardPage() {
  const { supabase } = createAdminClient()
  if (!supabase) redirect('/login')
  const cookieStore = await cookies()
  const rawSession = cookieStore.get('nx_session')?.value
  const session = await getSessionFromCookieValue(rawSession)
  if (!session.valid || !session.tiendaId) redirect('/login')
  const sessionId = session.tiendaId

  const { data: tienda } = await supabase
    .from('tiendas')
    .select('id, nombre_tienda, slug, tienda_abierta, tokens_disponibles, fecha_vencimiento, tipo_negocio, onboarding_completo, preguntas_recuperacion')
    .eq('id', sessionId)
    .single()
  if (!tienda) redirect('/login')
  if (!tienda.onboarding_completo) redirect('/onboarding')

  const headersList = await headers()
  const host = headersList.get('host')
  const proto = headersList.get('x-forwarded-proto') ?? 'http'

  const { data: perfil } = await supabase
    .from('perfil_tienda')
    .select('nombre_comercial, whatsapp_numero, logo_url, slogan, sobre_nosotros, horario')
    .eq('id_tienda', tienda.id)
    .maybeSingle()

  const hoyStr = new Date().toISOString().split('T')[0]
  const inicioHoy = `${hoyStr}T00:00:00.000Z`

  const [pedidosRes, productosRes, modalRes, regalosCountRes, giftsHoyRes] = await Promise.all([
    supabase
      .from('pedidos')
      .select('id, cliente_nombre, total, estado, creado_at, detalles_pedido')
      .eq('id_tienda', tienda.id)
      .order('creado_at', { ascending: false }),
    supabase
      .from('productos')
      .select('nombre, stock, id')
      .eq('id_tienda', tienda.id),
    supabase
      .from('nexus_catalogo_modal')
      .select('activo')
      .eq('id_tienda', tienda.id)
      .maybeSingle(),
    supabase
      .from('gift_experiences')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', tienda.id)
      .eq('status', 'pending'),
    supabase
      .from('gift_experiences')
      .select('items_list')
      .eq('store_id', tienda.id)
      .eq('status', 'approved')
      .gte('created_at', inicioHoy),
  ])

  const pedidos = pedidosRes.data || []
  const productos = productosRes.data || []
  const modalConfig = modalRes.data
  const regalosPendientes = regalosCountRes.count || 0
  const giftsAprobadosHoy = giftsHoyRes.data || []

  const ventasRegalos = (giftsAprobadosHoy || []).reduce((sum, g) => {
    const items = (g.items_list as { precio: number }[]) || []
    return sum + items.reduce((s, i) => s + Number(i.precio || 0), 0)
  }, 0)

  const metricas = calcularMetricasDashboard(pedidos || [])
  const metricasCompletas = calcularTodasLasMetricas(
    pedidos || [],
    ventasRegalos,
    (productos || []) as { nombre: string; stock: number }[],
    perfil?.whatsapp_numero || null,
    modalConfig?.activo === true,
  )

  const stockBajo = productos?.filter(p => Number(p.stock) < 5).sort((a, b) => a.stock - b.stock) || []
  const productosActivos = productos?.filter(p => Number(p.stock) > 0).length || 0
  const productosSinStock = productos?.filter(p => Number(p.stock) === 0).slice(0, 5) || []

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

  const preguntas = tienda.preguntas_recuperacion as { pregunta: string; respuesta: string }[] | null
  const preguntasCompletas = preguntas && preguntas.length === 3 && preguntas.every(p => p.respuesta?.trim())
  const checklist = {
    recuperacion: !!preguntasCompletas,
    logo: !!perfil?.logo_url,
    informacion: !!perfil?.sobre_nosotros && !!perfil?.horario,
    productos: (productos?.length || 0) > 2,
  }

  const nombreTienda = perfil?.nombre_comercial || tienda.nombre_tienda || 'Mi Tienda'
  const whatsappNumero = perfil?.whatsapp_numero || null
  const catalogoUrl = tienda.slug
    ? `${proto}://${host}/c/${tienda.slug}`
    : `${proto}://${host}/catalogo/${tienda.id}`
  const tiendaAbierta = tienda.tienda_abierta !== false

  return (
    <DashboardClient
      tiendaId={tienda.id}
      nombreTienda={nombreTienda}
      whatsappNumero={whatsappNumero}
      catalogoUrl={catalogoUrl}
      tiendaSlug={tienda.slug || null}
      tiendaAbierta={tiendaAbierta}
      tokensDisponibles={tienda.tokens_disponibles ?? 0}
      fechaVencimiento={tienda.fecha_vencimiento || null}
      tipoNegocio={tipoNegocio}
      tallasStockBajo={tallasStockBajo}
      checklist={checklist}
      initialStats={{
        ventasHoy: metricasCompletas.ventasHoy,
        pendientes: metricas.pendientes,
        pedidosHoy: metricas.pedidosHoyCount,
        regalosPendientes: regalosPendientes || 0,
        stockBajo,
        ultimosPedidos: metricas.ultimosPedidos,
        productosActivos,
        productosAgotados: metricasCompletas.productosAgotados,
        productosSinStock,
      }}
      metricasCompletas={metricasCompletas}
    />
  )
}
