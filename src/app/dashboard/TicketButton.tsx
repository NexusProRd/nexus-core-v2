'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function TicketButton({ pedidoId }: { pedidoId: string }) {
  const [loading, setLoading] = useState(false)

  const imprimir = async () => {
    setLoading(true)
    const supabase = createClient()
    const { data: pedido } = await supabase.from('pedidos').select('*').eq('id', pedidoId).single()
    const { data: detalles } = await supabase.from('detalles_pedido').select('*').eq('id_pedido', pedidoId)

    if (!pedido) { setLoading(false); return }

    let nombreTienda = 'Mi Tienda'
    if (pedido.id_tienda) {
      const { data: perfil } = await supabase
        .from('perfil_tienda')
        .select('nombre_comercial')
        .eq('id_tienda', pedido.id_tienda)
        .maybeSingle()
      if (perfil?.nombre_comercial) nombreTienda = perfil.nombre_comercial
    }

    const items = (detalles || []).map((d: any) => ({
      producto: d.producto, cantidad: d.cantidad, precio_unitario: d.precio_unitario
    }))

    let html = `<html><head><title>Ticket</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box;}
        body{font-family:'Courier New',Courier,monospace;font-size:12px;width:80mm;margin:0 auto;padding:12px 6px;color:#000;}
        h2{text-align:center;font-size:14px;letter-spacing:2px;text-transform:uppercase;margin-bottom:2px;}
        .sub{text-align:center;font-size:9px;margin-bottom:8px;}
        .l{border-top:1px dashed #000;margin:6px 0;}
        table{width:100%;border-collapse:collapse;font-size:11px;}
        th{padding:3px 0 2px;font-size:9px;text-transform:uppercase;border-bottom:1px solid #000;text-align:left;}
        td{padding:2px 0;}
        .der{text-align:right;}
        .cen{text-align:center;}
        .total-label{font-weight:bold;font-size:13px;}
        .total-value{font-weight:bold;font-size:15px;}
        .footer{text-align:center;margin-top:12px;font-size:9px;}
        @media print{body{width:80mm;padding:0;}}
      </style></head><body>
      <h2>${nombreTienda}</h2>
      <p class="sub">Comprobante de Venta</p>
      <div class="l"></div>
      <p style="font-size:10px;margin-bottom:3px;">Pedido: #${pedido.id.slice(0, 8).toUpperCase()}</p>
      <p style="font-size:10px;margin-bottom:3px;">Cliente: ${pedido.cliente_nombre}</p>
      <p style="font-size:10px;margin-bottom:3px;">Fecha: ${new Date(pedido.creado_at).toLocaleString('es-DO')}</p>
      <div class="l"></div>
      <table><thead><tr>
        <th>Producto</th><th class="cen">Cant</th><th class="der">Precio</th><th class="der">Subtotal</th>
      </tr></thead><tbody>`
    items.forEach((d: any) => {
      html += `<tr>
        <td>${d.producto}</td>
        <td class="cen">${d.cantidad}</td>
        <td class="der">RD$${d.precio_unitario.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
        <td class="der">RD$${(d.precio_unitario * d.cantidad).toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
      </tr>`
    })
    html += `</tbody></table><div class="l"></div>
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;">
        <span class="total-label">TOTAL</span>
        <span class="total-value">RD$${pedido.total.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
      </div>
      <div class="footer">¡Gracias por tu preferencia!</div>
      <script>window.print();window.close();<\/script></body></html>`

    const w = window.open('', '_blank', 'width=380,height=600')
    if (w) { w.document.write(html); w.document.close() }
    setLoading(false)
  }

  return (
    <button onClick={imprimir} disabled={loading}
      className="p-1.5 text-slate-400 hover:text-[var(--primary)] hover:bg-[var(--primary)]/5 rounded-lg transition-colors">
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
      </svg>
    </button>
  )
}
