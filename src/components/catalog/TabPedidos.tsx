'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { useConfig } from '@/context/ConfigProvider'

interface Props {
  id_tienda: string
}

interface DetalleItem {
  producto: string
  cantidad: number
  precio_unitario: number
}

interface OrderData {
  id: string
  order_id: string | null
  cliente_nombre: string
  total: number
  estado: string
  creado_at: string
  detalles_pedido?: DetalleItem[] | null
  nombre_tienda?: string
  direccion?: string
  rnc?: string
}

const steps = [
  {
    key: 'pendiente', label: 'Recibido',
    icon: (cls: string) => (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color: 'text-amber-500', bg: 'bg-amber-100',
    desc: 'Hemos recibido tu pedido',
  },
  {
    key: 'en_proceso', label: 'En Preparación',
    icon: (cls: string) => (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 16v-4M6 16v-4M2 12h20M6 8V6a2 2 0 012-2h8a2 2 0 012 2v2M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
      </svg>
    ),
    color: 'text-blue-500', bg: 'bg-blue-100',
    desc: 'Lo estamos preparando con cuidado',
  },
  {
    key: 'en_camino', label: 'En Camino',
    icon: (cls: string) => (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2-1m8 1l2-1h3a1 1 0 001-1v-3.586a1 1 0 00-.293-.707l-2.414-2.414A1 1 0 0014.586 7H13m-4 9a2 2 0 100 4 2 2 0 000-4zm8 0a2 2 0 100 4 2 2 0 000-4z" />
      </svg>
    ),
    color: 'text-purple-500', bg: 'bg-purple-100',
    desc: 'Tu pedido va en camino',
  },
  {
    key: 'entregado', label: 'Entregado',
    icon: (cls: string) => (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color: 'text-emerald-500', bg: 'bg-emerald-100',
    desc: 'Entregado con éxito',
  },
]

const statusOrder = ['pendiente', 'en_proceso', 'en_camino', 'entregado']

export default function TabPedidos({ id_tienda }: Props) {
  const { currencyCode } = useConfig()
  const [pedido, setPedido] = useState<OrderData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [lastSearchedId, setLastSearchedId] = useState<string | null>(null)

  const supabase = createClient()
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const buscarPedido = async (codigo: string) => {
    setLoading(true)
    setError('')

    const q = codigo.trim().toUpperCase()

    const { data, error: err } = await supabase
      .rpc('track_pedido', { p_id_tienda: id_tienda, p_query: q })
      .maybeSingle()
    const row = data as unknown as OrderData | undefined

    if (!row && codigo.includes('-') && codigo.length > 30) {
      const { data: retryData } = await supabase
        .rpc('track_pedido', { p_id_tienda: id_tienda, p_query: codigo.trim() })
        .maybeSingle()
      const retryRow = retryData as unknown as OrderData | undefined

      if (retryRow) {
        setPedido(retryRow)
        setLastSearchedId(retryRow.id)
        startPolling(retryRow.id)
        setLoading(false)
        return
      }
    }

    if (err || !row) {
      setError('No encontramos un pedido con ese código. Verifica el número e intenta de nuevo.')
      setPedido(null)
    } else {
      setPedido(row)
      setLastSearchedId(row.id)
      startPolling(row.id)
    }
    setLoading(false)
  }

  const startPolling = (pedidoId: string) => {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      const { data } = await supabase
        .rpc('track_pedido', { p_id_tienda: id_tienda, p_query: pedidoId })
        .maybeSingle()
      if (data) setPedido(data as unknown as OrderData)
    }, 6000)
  }

  const handleSearch = async () => {
    const q = searchQuery.trim()
    if (!q) return
    setSearching(true)
    setError('')
    await buscarPedido(q)
    setSearching(false)
  }

  const handleDownloadPDF = async () => {
    if (!pedido) return
    const { data: perfil } = await supabase
      .from('perfil_tienda')
      .select('nombre_comercial, logo_url')
      .eq('id_tienda', id_tienda)
      .maybeSingle()
    const nombreComercial = perfil?.nombre_comercial || pedido.nombre_tienda || 'Tu Tienda'
    const logoUrl = perfil?.logo_url
    const ventana = window.open('', '_blank', 'width=600,height=800')
    if (!ventana) return
    ventana.document.write(`
      <html><head><title>Comprobante_${pedido.order_id || 'pedido'}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; padding: 50px 20px; color: #1e293b; display: flex; justify-content: center; }
        .invoice-card { background: #ffffff; max-width: 550px; width: 100%; border-radius: 24px; padding: 40px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.05), 0 10px 10px -5px rgba(0,0,0,0.04); border: 1px solid #e2e8f0; }
        .invoice-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #f1f5f9; padding-bottom: 24px; margin-bottom: 24px; }
        .logo-area { display: flex; align-items: center; gap: 12px; }
        .logo-img { width: 44px; height: 44px; object-fit: contain; border-radius: 12px; }
        .logo-fallback { width: 44px; height: 44px; background: #7c3aed; color: white; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 20px; }
        .shop-name { font-size: 20px; font-weight: 800; color: #0f172a; }
        .shop-address { font-size: 12px; color: #64748b; margin-top: 2px; max-width: 220px; line-height: 1.4; }
        .invoice-title { font-size: 14px; font-weight: 800; color: #7c3aed; text-transform: uppercase; letter-spacing: 0.1em; text-align: right; }
        .order-id { font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 4px; font-family: monospace; }
        .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 32px; font-size: 13px; }
        .meta-label { color: #64748b; font-weight: 500; margin-bottom: 4px; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; }
        .meta-value { font-weight: 700; color: #334155; }
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        .th-item { text-align: left; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; padding-bottom: 12px; border-bottom: 1px solid #e2e8f0; }
        .th-item.right { text-align: right; }
        .td-item { padding: 14px 0; font-size: 14px; color: #334155; border-bottom: 1px solid #f1f5f9; }
        .td-item.bold { font-weight: 600; color: #0f172a; }
        .td-item.right { text-align: right; }
        .total-section { display: flex; justify-content: flex-end; margin-top: 16px; }
        .total-wrapper { max-width: 240px; background: #f8fafc; border-radius: 16px; padding: 16px; display: flex; justify-content: space-between; align-items: center; border: 1px solid #e2e8f0; }
        .total-label { font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; }
        .total-value { font-size: 20px; font-weight: 800; color: #059669; }
        .invoice-footer { text-align: center; font-size: 12px; color: #94a3b8; margin-top: 40px; padding-top: 20px; border-top: 1px solid #f1f5f9; font-weight: 500; }
      </style></head><body>
      <div class="invoice-card">
        <div class="invoice-header">
          <div class="logo-area">
            ${logoUrl ? `<img src="${logoUrl}" alt="${nombreComercial}" class="logo-img" />` : `<div class="logo-fallback">${(nombreComercial || 'T').charAt(0).toUpperCase()}</div>`}
            <div>
              <div class="shop-name">${nombreComercial}</div>
              <div class="shop-address">${pedido?.direccion || 'Dirección no especificada'}</div>
              ${pedido?.rnc && pedido.rnc.trim() !== '' ? `<div style="font-size: 12px; color: #64748b; margin-top: 4px; font-weight: 500;">RNC: ${pedido.rnc}</div>` : ''}
            </div>
          </div>
          <div>
            <div class="invoice-title">Comprobante Digital</div>
            <div class="order-id">#${pedido?.order_id || pedido?.id?.slice(0, 8).toUpperCase()}</div>
          </div>
        </div>
        <div class="meta-grid">
          <div><div class="meta-label">Facturado A</div><div class="meta-value">${pedido?.cliente_nombre}</div></div>
          <div style="text-align: right;"><div class="meta-label">Fecha de Emisión</div><div class="meta-value">${new Date(pedido?.creado_at).toLocaleDateString('es-DO', { day: 'numeric', month: 'short', year: 'numeric' })}</div></div>
        </div>
        <table class="items-table" style="width: 100%;">
          <thead>
            <tr>
              <th class="th-item">Detalle del Producto</th>
              <th class="th-item" style="text-align:center;">Cant</th>
              <th class="th-item" style="text-align:right;">P. Unitario</th>
              <th class="th-item right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${(pedido?.detalles_pedido || []).map((det: any) => `
              <tr>
                <td class="td-item bold">${det.producto}</td>
                <td class="td-item" style="text-align:center;">${det.cantidad}</td>
                <td class="td-item" style="text-align:right;">${formatCurrency(Number(det.precio_unitario || 0), currencyCode)}</td>
                <td class="td-item right bold">${formatCurrency(Number(det.subtotal ?? (det.precio_unitario || 0) * det.cantidad), currencyCode)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ${pedido?.detalles_pedido && (pedido.detalles_pedido as any[]).some((d: any) => Number(d.impuesto) > 0) ? `
          <div style="margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; color: #475569;">
              <span>Subtotal (sin impuesto)</span>
              <span style="font-weight: 600; color: #334155;">${formatCurrency(Number((pedido.detalles_pedido as any[]).reduce((s: number, d: any) => s + Number(d.subtotal ?? (d.precio_unitario || 0) * (d.cantidad || 0)), 0)), currencyCode)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; color: #475569;">
              <span>Impuesto</span>
              <span style="font-weight: 600; color: #334155;">${formatCurrency(Number((pedido.detalles_pedido as any[]).reduce((s: number, d: any) => s + Number(d.impuesto || 0), 0)), currencyCode)}</span>
            </div>
          </div>
        ` : ''}
        <div class="total-section">
          <div class="total-wrapper">
            <span class="total-label">Total Neto</span>
            <span class="total-value">${formatCurrency(Number(pedido?.total || 0), currencyCode)}</span>
          </div>
        </div>
        <div class="invoice-footer">¡Gracias por tu preferencia y confianza! 🙏✨</div>
      </div>
      <script>window.print();window.close();<\/script>
      </body></html>
    `)
    ventana.document.close()
  }

  useEffect(() => {
    if (!id_tienda || typeof id_tienda !== 'string') {
      setLoading(false)
      return
    }
    const lastOrderId = localStorage.getItem(`nexus-last-order-${id_tienda}`)
    if (!lastOrderId) {
      setLoading(false)
      return
    }
    buscarPedido(lastOrderId)
  }, [id_tienda])

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  const currentIndex = pedido ? statusOrder.indexOf(pedido.estado) : -1

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-12 sm:pt-20 pb-12">
      <div className="max-w-lg mx-auto">
        {/* Search card */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 mb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Mi Pedido</h3>
              <p className="text-xs text-slate-400">Ingresa tu número de orden</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Ej: 3B1B06F8 o código del pedido"
              className="w-full sm:flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] placeholder:text-slate-400"
            />
            <button
              onClick={handleSearch}
              disabled={searching || !searchQuery.trim()}
              className="w-full sm:w-auto px-5 py-2.5 bg-[var(--primary)] text-white font-medium rounded-xl hover:brightness-110 transition-all disabled:opacity-50 text-sm shadow-sm whitespace-nowrap"
            >
              {searching ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Buscando
                </span>
              ) : 'Buscar'}
            </button>
          </div>

          {error && (
            <p className="text-xs text-rose-600 mt-3 text-center">{error}</p>
          )}
        </div>

        {/* Timeline */}
        {loading && (
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-slate-100 shadow-sm p-8 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 flex items-center justify-center animate-pulse">
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="text-sm text-slate-400">Buscando tu pedido...</p>
          </div>
        )}

        {pedido && !loading && (
          <>
            {/* Order header */}
            <div className="bg-gradient-to-br from-white to-slate-50 rounded-3xl border border-slate-100 shadow-sm p-6 mb-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Mi Pedido</p>
                <span className="text-xs font-mono font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg">
                  {pedido.order_id || pedido.id.slice(0, 8).toUpperCase()}
                </span>
              </div>
              <p className="text-lg font-bold text-slate-900 mt-3">{pedido.cliente_nombre}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-2xl font-extrabold text-emerald-600">{formatCurrency(Number(pedido.total ?? 0), currencyCode)}</span>
                <span className="text-xs text-slate-400">{new Date(pedido.creado_at).toLocaleDateString('es-DO', { day: 'numeric', month: 'long' })}</span>
              </div>
              <button onClick={handleDownloadPDF} className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-all cursor-pointer">
                📥 Descargar Comprobante PDF
              </button>
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
              <h4 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                Estado del pedido
              </h4>

              <div className="relative">
                <div className="absolute left-5 top-2 bottom-2 w-0.5 bg-slate-200" />

                <div className="space-y-0">
                  {steps.map((step, idx) => {
                    const isCompleted = idx <= currentIndex
                    const isCurrent = idx === currentIndex

                    return (
                      <div key={step.key} className="relative flex items-start gap-4 pb-8 last:pb-0">
                        <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all duration-500 ${
                          isCompleted ? `${step.bg} ${step.color}` : 'bg-slate-100 text-slate-300'
                        } ${isCurrent ? 'ring-4 ring-offset-2 ring-offset-white ' + step.bg : ''}`}>
                          {step.icon(`w-5 h-5 ${isCompleted ? '' : 'text-slate-300'}`)}
                        </div>

                        <div className="flex-1 min-w-0 pt-1.5">
                          <p className={`text-sm font-bold ${isCompleted ? 'text-slate-900' : 'text-slate-400'}`}>
                            {step.label}
                          </p>
                          {isCurrent && (
                            <p className="text-xs text-slate-500 mt-0.5">{step.desc}</p>
                          )}
                          {isCurrent && step.key !== 'entregado' && (
                            <div className="flex items-center gap-1.5 mt-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              <span className="text-[11px] font-medium text-emerald-600">En proceso</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </>
        )}

        {!pedido && !loading && !error && (
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-slate-100 shadow-sm p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Rastrea tu Pedido</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Ingresa el número de tu orden en el campo de arriba para ver el estado actual de tu pedido.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
