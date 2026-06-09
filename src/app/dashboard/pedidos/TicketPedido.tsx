'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { formatearPrecio } from '@/lib/utils'

interface Detalle {
  id: string
  producto: string
  cantidad: number
  precio_unitario: number
  impuesto?: number
  subtotal?: number
  total?: number
}

interface Pedido {
  id: string
  order_id?: string | null
  cliente_nombre: string
  total: number
  creado_at: string
  id_tienda?: string
}

export default function TicketPedido({ pedido, detalles }: { pedido: Pedido; detalles: Detalle[] }) {
  const ticketRef = useRef<HTMLDivElement>(null)
  const [storeName, setStoreName] = useState('')

  const codigoTicket = pedido.order_id || pedido.id.slice(0, 8).toUpperCase()

  const imprimir = async () => {
    if (!storeName && pedido.id_tienda) {
      const supabase = createClient()
      const { data: perfil } = await supabase
        .from('perfil_tienda')
        .select('nombre_comercial')
        .eq('id_tienda', pedido.id_tienda)
        .maybeSingle()
      if (perfil?.nombre_comercial) setStoreName(perfil.nombre_comercial)
    }

    const contenido = ticketRef.current?.innerHTML
    if (!contenido) return
    const nombre = storeName || 'Mi Tienda'
    const ventana = window.open('', '_blank', 'width=380,height=600')
    if (!ventana) return
    ventana.document.write(`
      <html><head><title>Ticket #${codigoTicket}</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'Courier New',Courier,monospace; font-size:12px; width:80mm; margin:0 auto; padding:12px 6px; color:#000; }
        h2 { text-align:center; font-size:14px; letter-spacing:2px; text-transform:uppercase; margin-bottom:2px; }
        .sub { text-align:center; font-size:9px; margin-bottom:8px; }
        .linea { border-top:1px dashed #000; margin:6px 0; }
        table { width:100%; border-collapse:collapse; font-size:11px; }
        th { padding:3px 0 2px; font-size:9px; text-transform:uppercase; border-bottom:1px solid #000; text-align:left; }
        td { padding:2px 0; }
        .der { text-align:right; }
        .cen { text-align:center; }
        .total-label { font-weight:bold; font-size:13px; }
        .total-value { font-weight:bold; font-size:15px; }
        .footer { text-align:center; margin-top:12px; font-size:9px; }
        .info { font-size:10px; margin-bottom:3px; }
        @media print { body { width:80mm; padding:0; } }
      </style></head><body>
      <h2>${nombre}</h2>
      <p class="sub">Comprobante de Venta</p>
      <div class="linea"></div>
      <p class="info">Pedido: #${codigoTicket}</p>
      <p class="info">Cliente: ${pedido.cliente_nombre}</p>
      <p class="info">Fecha: ${new Date(pedido.creado_at).toLocaleString('es-DO')}</p>
      <div class="linea"></div>
      <table>
        <thead>
          <tr>
            <th>Producto</th>
            <th class="cen">Cant</th>
            <th class="der">Precio</th>
            <th class="der">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${detalles.map(d => `
            <tr>
              <td>${d.producto}</td>
              <td class="cen">${d.cantidad}</td>
              <td class="der">RD$${formatearPrecio(d.precio_unitario)}</td>
              <td class="der">RD$${formatearPrecio(d.subtotal ?? d.precio_unitario * d.cantidad)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      ${detalles.some(d => Number(d.impuesto) > 0) ? `
        <div class="linea"></div>
        <div style="display:flex;justify-content:space-between;padding:4px 0;">
          <span>Subtotal (sin impuesto):</span>
          <span>RD$${formatearPrecio(detalles.reduce((s, d) => s + Number(d.subtotal ?? d.precio_unitario * d.cantidad), 0))}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:4px 0;">
          <span>Impuesto:</span>
          <span>RD$${formatearPrecio(detalles.reduce((s, d) => s + Number(d.impuesto || 0), 0))}</span>
        </div>
        <div class="linea"></div>
      ` : `
        <div class="linea"></div>
      `}
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;">
        <span class="total-label">TOTAL</span>
        <span class="total-value">RD$${formatearPrecio(pedido.total)}</span>
      </div>
      <div class="footer">¡Gracias por tu preferencia!</div>
      <script>window.print();window.close();<\/script>
      </body></html>
    `)
    ventana.document.close()
  }

  return (
    <div>
      <div ref={ticketRef} style={{ display: 'none' }}>
        <h2>{storeName || 'Mi Tienda'}</h2>
        <p className="sub">Comprobante de Venta</p>
        <div className="linea" />
        <p className="info">Pedido: #{codigoTicket}</p>
        <p className="info">Cliente: {pedido.cliente_nombre}</p>
        <p className="info">Fecha: {new Date(pedido.creado_at).toLocaleString('es-DO')}</p>
        <div className="linea" />
        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th className="cen">Cant</th>
              <th className="der">Precio</th>
              <th className="der">Subtotal</th>
            </tr>
          </thead>
            <tbody>
              {detalles.map(d => (
                <tr key={d.id}>
                  <td>{d.producto}</td>
                  <td className="cen">{d.cantidad}</td>
                  <td className="der">RD${formatearPrecio(d.precio_unitario)}</td>
                  <td className="der">RD${formatearPrecio(d.subtotal ?? d.precio_unitario * d.cantidad)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {detalles.some(d => Number(d.impuesto) > 0) && (
            <>
              <div className="linea" />
              <div>
                <span>Subtotal (sin impuesto): </span>
                <span>RD${formatearPrecio(detalles.reduce((s, d) => s + Number(d.subtotal ?? d.precio_unitario * d.cantidad), 0))}</span>
              </div>
              <div>
                <span>Impuesto: </span>
                <span>RD${formatearPrecio(detalles.reduce((s, d) => s + Number(d.impuesto || 0), 0))}</span>
              </div>
            </>
          )}
          <div className="linea" />
        <div>
          <span className="total-label">TOTAL</span>
          <span className="total-value">RD${formatearPrecio(pedido.total)}</span>
        </div>
      </div>

      <button
        onClick={imprimir}
        className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-[var(--primary)] hover:bg-[var(--primary)]/5 rounded-lg px-2.5 py-2 text-xs font-medium transition-all press-scale-sm"
        title="Imprimir ticket"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
        </svg>
        Imprimir
      </button>
    </div>
  )
}
