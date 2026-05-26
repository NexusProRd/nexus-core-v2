'use client'

interface PedidoRaw {
  id: string
  cliente_nombre: string
  total: number
  estado: string
  creado_at: string
  detalles_pedido: any
}

interface ProductoAgregado {
  nombre: string
  cantidad: number
}

export default function BestSellers({ pedidos }: { pedidos: PedidoRaw[] }) {
  const confirmados = pedidos.filter(p => p.estado === 'confirmado')

  const mapa = new Map<string, number>()
  for (const p of confirmados) {
    const detalles = Array.isArray(p.detalles_pedido) ? p.detalles_pedido : []
    for (const d of detalles) {
      const nombre = d.producto || d.producto_nombre || d.nombre
      if (!nombre) continue
      const cant = d.cantidad || 1
      mapa.set(nombre, (mapa.get(nombre) || 0) + cant)
    }
  }

  const ordenado: ProductoAgregado[] = Array.from(mapa.entries())
    .map(([nombre, cantidad]) => ({ nombre, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad)

  const top = ordenado.slice(0, 5)
  const bottom = ordenado.filter(p => p.cantidad > 0).slice(-5).reverse()

  if (ordenado.length === 0) return null

  const maxCant = ordenado[0]?.cantidad || 1

  const BarraProducto = ({ p, i }: { p: ProductoAgregado; i?: number }) => (
    <div className="flex items-center gap-3">
      {i !== undefined && (
        <span className="text-xs font-bold text-slate-400 w-5 shrink-0">#{i + 1}</span>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 truncate">{p.nombre}</p>
        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
          <div
            className="bg-green-500 rounded-full h-2 transition-all"
            style={{ width: `${(p.cantidad / maxCant) * 100}%` }}
          />
        </div>
      </div>
      <span className="text-sm font-bold text-slate-900 shrink-0">{p.cantidad}</span>
    </div>
  )

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-6">
      <div>
        <h3 className="text-lg font-bold text-slate-900 mb-3">Más vendidos</h3>
        <div className="space-y-3">
          {top.map((p, i) => (
            <BarraProducto key={p.nombre} p={p} i={i} />
          ))}
        </div>
      </div>

      {bottom.length > 0 && bottom.some(p => p !== top[0]) && (
        <div className="border-t pt-6">
          <h3 className="text-lg font-bold text-slate-900 mb-3">Menos vendidos</h3>
          <div className="space-y-3">
            {bottom.filter(p => !top.some(t => t.nombre === p.nombre) || bottom.length === ordenado.length).map((p, i) => (
              <BarraProducto key={p.nombre} p={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
