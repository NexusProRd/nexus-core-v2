export interface PedidoBase {
  id: string
  cliente_nombre: string
  total: number
  estado: string
  creado_at: string
  detalles_pedido?: any
  metodo_pago?: string | null
}

export interface MetricasDashboard {
  pedidosHoy: PedidoBase[]
  pedidosHoyCount: number
  ventasHoy: number
  pendientes: number
  ultimosPedidos: PedidoBase[]
}

export interface ProductoResumen {
  nombre: string
  cantidad: number
  ingreso: number
}

export interface DashboardFullMetrics {
  ventasHoy: number
  ventasAyer: number
  ventasMes: number
  pedidosHoy: number
  pedidosAyer: number
  pedidosMes: number
  ticketPromedio: number
  mejorProducto: ProductoResumen | null
  ventasSemanaActual: number
  ventasSemanaAnterior: number
  pedidosSemanaActual: number
  pedidosSemanaAnterior: number
  ticketSemanaActual: number
  ticketSemanaAnterior: number
  ventasHistoricas: { fecha: string; ventas: number; pedidos: number }[]
  topProductos: ProductoResumen[]
  stockCritico: number
  productosAgotados: number
  pedidosPendientes: number
  whatsappConfigurado: boolean
  vitrinaConfigurada: boolean
  gananciaHoy: number
  gananciaMes: number
  margenPromedio: number
  tieneCostos: boolean
}

export const ESTADOS_INCLUIDOS = [
  'pendiente',
  'confirmado',
  'en_proceso',
  'en_camino',
  'entregado',
] as const

const ESTADOS_SET = new Set<string>(ESTADOS_INCLUIDOS)

function inicioDelMes(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01T00:00:00.000Z`
}

function fechaStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

function sumarDias(fecha: Date, dias: number): Date {
  const r = new Date(fecha)
  r.setDate(r.getDate() + dias)
  return r
}

function obtenerCosto(item: any): number {
  return Number(item.costo_real ?? item.costo ?? item.costo_unitario ?? 0)
}

export function calcularMetricasDashboard<T extends PedidoBase>(pedidos: T[]): MetricasDashboard & { pedidosHoy: T[] } {
  const hoyStr = new Date().toISOString().split('T')[0]

  const pedidosHoy = pedidos.filter(p => {
    if (!p.creado_at) return false
    return p.creado_at.slice(0, 10) === hoyStr && ESTADOS_SET.has(p.estado)
  })

  const ventasHoy = pedidosHoy.reduce((sum, p) => sum + Number(p.total || 0), 0)
  const pendientes = pedidos.filter(p => p.estado === 'pendiente').length
  const ultimosPedidos = pedidos.slice(0, 5)

  return {
    pedidosHoy,
    pedidosHoyCount: pedidosHoy.length,
    ventasHoy,
    pendientes,
    ultimosPedidos,
  }
}

export function calcularTodasLasMetricas(
  pedidos: PedidoBase[],
  giftRevenueHoy: number,
  productos: { nombre: string; stock: number }[],
  whatsappNumero: string | null,
  vitrinaActiva: boolean,
): DashboardFullMetrics {
  const ahora = new Date()
  const hoyStr = fechaStr(ahora)
  const ayerStr = fechaStr(sumarDias(ahora, -1))
  const inicioMes = inicioDelMes()

  const pedidosValidos = pedidos.filter(p => ESTADOS_SET.has(p.estado))

  // ---- Hoy ----
  const pedidosHoyArr = pedidosValidos.filter(p => p.creado_at?.slice(0, 10) === hoyStr)
  const pedidosHoy = pedidosHoyArr.length
  const ventasHoy = pedidosHoyArr.reduce((s, p) => s + Number(p.total || 0), 0) + giftRevenueHoy

  // ---- Ayer ----
  const pedidosAyerArr = pedidosValidos.filter(p => p.creado_at?.slice(0, 10) === ayerStr)
  const pedidosAyer = pedidosAyerArr.length
  const ventasAyer = pedidosAyerArr.reduce((s, p) => s + Number(p.total || 0), 0)

  // ---- Mes ----
  const pedidosMesArr = pedidosValidos.filter(p => p.creado_at >= inicioMes)
  const pedidosMes = pedidosMesArr.length
  const ventasMes = pedidosMesArr.reduce((s, p) => s + Number(p.total || 0), 0)

  const ticketPromedio = pedidosMes > 0 ? ventasMes / pedidosMes : (pedidosHoy > 0 ? ventasHoy / pedidosHoy : 0)

  // ---- Ganancias + Top productos (desde detalles_pedido JSONB) ----
  const prodAgg = new Map<string, { cantidad: number; ingreso: number }>()
  let costoTotalHoy = 0
  let costoTotalMes = 0
  let costoTotalGlobal = 0
  let ingresosConCosto = 0
  let itemsConCosto = 0
  let totalItems = 0

  for (const p of pedidosValidos) {
    const detalles = p.detalles_pedido
    if (!detalles) continue
    const arr = Array.isArray(detalles) ? detalles : [detalles]
    for (const d of arr) {
      const nombre = d.producto || d.nombre || 'Producto'
      const cant = Number(d.cantidad || 1)
      const precio = Number(d.precio_unitario || d.precio || 0)
      const costo = obtenerCosto(d)
      const ingresoItem = precio * cant
      const costoItem = costo * cant

      totalItems++
      if (costo > 0) itemsConCosto++

      const prev = prodAgg.get(nombre) || { cantidad: 0, ingreso: 0 }
      prodAgg.set(nombre, { cantidad: prev.cantidad + cant, ingreso: prev.ingreso + ingresoItem })

      costoTotalGlobal += costoItem

      if (p.creado_at?.slice(0, 10) === hoyStr) {
        costoTotalHoy += costoItem
      }
      if (p.creado_at >= inicioMes) {
        costoTotalMes += costoItem
        ingresosConCosto += ingresoItem
      }
    }
  }

  // Mejor producto
  let mejorProducto: ProductoResumen | null = null
  for (const [nombre, data] of prodAgg) {
    if (!mejorProducto || data.cantidad > mejorProducto.cantidad) {
      mejorProducto = { nombre, ...data }
    }
  }

  // Top 5 productos
  const topProductos = Array.from(prodAgg.entries())
    .map(([nombre, data]) => ({ nombre, ...data }))
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 5)

  // Ganancias
  const gananciaHoy = ventasHoy - costoTotalHoy
  const gananciaMes = ventasMes - costoTotalMes
  const margenPromedio = ingresosConCosto > 0 ? ((ventasMes - costoTotalMes) / ventasMes) * 100 : 0
  const tieneCostos = itemsConCosto > 0 && (itemsConCosto / totalItems) >= 0.5

  // ---- Comparativas semanales ----
  const hace7 = sumarDias(ahora, -6)
  const hace14 = sumarDias(ahora, -13)
  const inicioSemActual = fechaStr(hace7)
  const inicioSemAnterior = fechaStr(hace14)
  const finSemAnterior = fechaStr(sumarDias(ahora, -7))

  const resumenSemana = (desde: string, hasta: string) => {
    const filtr = pedidosValidos.filter(p => {
      if (!p.creado_at) return false
      const f = p.creado_at.slice(0, 10)
      return f >= desde && f <= hasta
    })
    return {
      ventas: filtr.reduce((s, p) => s + Number(p.total || 0), 0),
      pedidos: filtr.length,
      ticket: filtr.length > 0 ? filtr.reduce((s, p) => s + Number(p.total || 0), 0) / filtr.length : 0,
    }
  }

  const semanaActual = resumenSemana(inicioSemActual, hoyStr)
  const semanaAnterior = resumenSemana(inicioSemAnterior, finSemAnterior)

  // ---- Ventas históricas (90 días con ventas + pedidos) ----
  const ventasPorDia = new Map<string, { ventas: number; pedidos: number }>()
  for (const p of pedidosValidos) {
    if (!p.creado_at) continue
    const f = p.creado_at.slice(0, 10)
    const prev = ventasPorDia.get(f) || { ventas: 0, pedidos: 0 }
    ventasPorDia.set(f, {
      ventas: prev.ventas + Number(p.total || 0),
      pedidos: prev.pedidos + 1,
    })
  }

  const ventasHistoricas: { fecha: string; ventas: number; pedidos: number }[] = []
  for (let i = 89; i >= 0; i--) {
    const d = sumarDias(ahora, -i)
    const f = fechaStr(d)
    const data = ventasPorDia.get(f) || { ventas: 0, pedidos: 0 }
    ventasHistoricas.push({ fecha: f, ventas: data.ventas, pedidos: data.pedidos })
  }

  // ---- Salud del negocio ----
  const stockCritico = productos.filter(p => Number(p.stock) > 0 && Number(p.stock) < 5).length
  const productosAgotados = productos.filter(p => Number(p.stock) === 0).length
  const pedidosPendientes = pedidos.filter(p => p.estado === 'pendiente').length

  return {
    ventasHoy,
    ventasAyer,
    ventasMes,
    pedidosHoy,
    pedidosAyer,
    pedidosMes,
    ticketPromedio: Math.round(ticketPromedio * 100) / 100,
    mejorProducto,
    ventasSemanaActual: semanaActual.ventas,
    ventasSemanaAnterior: semanaAnterior.ventas,
    pedidosSemanaActual: semanaActual.pedidos,
    pedidosSemanaAnterior: semanaAnterior.pedidos,
    ticketSemanaActual: Math.round(semanaActual.ticket * 100) / 100,
    ticketSemanaAnterior: Math.round(semanaAnterior.ticket * 100) / 100,
    ventasHistoricas,
    topProductos,
    stockCritico,
    productosAgotados,
    pedidosPendientes,
    whatsappConfigurado: !!whatsappNumero,
    vitrinaConfigurada: vitrinaActiva,
    gananciaHoy: Math.round(gananciaHoy * 100) / 100,
    gananciaMes: Math.round(gananciaMes * 100) / 100,
    margenPromedio: Math.round(margenPromedio * 100) / 100,
    tieneCostos,
  }
}

export function calcularComparativo(
  actual: number,
  anterior: number,
): { variacion: number; direccion: 'up' | 'down' | 'equal' } {
  if (anterior === 0) return { variacion: actual > 0 ? 100 : 0, direccion: actual > 0 ? 'up' : 'equal' }
  const pct = ((actual - anterior) / anterior) * 100
  return {
    variacion: Math.round(pct * 100) / 100,
    direccion: pct > 0 ? 'up' : pct < 0 ? 'down' : 'equal',
  }
}
