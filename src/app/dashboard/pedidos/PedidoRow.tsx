'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { actualizarEstado } from './actions'
import { formatearPrecio } from '@/lib/utils'
import TicketPedido from './TicketPedido'
import { usePermisos } from '@/context/PermisosContext'

interface DetallePedido {
  id: string
  id_producto: string | null
  producto: string
  cantidad: number
  precio_unitario: number
  productos: { nombre: string; imagen_url: string | null } | null
}

interface Pedido {
  id: string
  order_id?: string
  cliente_nombre: string
  cliente_telefono?: string | null
  total: number
  estado: string
  creado_at: string
  detalles_pedido: any
  is_gift?: boolean
  notas?: string | null
  id_tienda?: string
}

const badgeEstados: Record<string, { label: string; cls: string }> = {
  pendiente: { label: 'Recibido', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  en_preparacion: { label: 'En Preparación', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  en_proceso: { label: 'En Preparación', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  en_camino: { label: 'En Camino', cls: 'bg-purple-50 text-purple-700 border-purple-200' },
  entregado: { label: 'Entregado', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  confirmado: { label: 'Confirmado', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  rechazado: { label: 'Rechazado', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
  cancelado: { label: 'Cancelado', cls: 'bg-slate-100 text-slate-500 border-slate-200' },
  devuelto: { label: 'Devuelto', cls: 'bg-orange-50 text-orange-700 border-orange-200' },
}

export default function PedidoRow({ pedido }: { pedido: Pedido }) {
  const { permisos } = usePermisos()
  const [abierto, setAbierto] = useState(false)
  const [detalles, setDetalles] = useState<DetallePedido[] | null>(null)
  const [cargando, setCargando] = useState(false)

  const badge = badgeEstados[pedido.estado] || { label: pedido.estado, cls: 'bg-slate-50 text-slate-600 border-slate-200' }

  const toggleAccordion = async () => {
    if (abierto) { setAbierto(false); return }
    setAbierto(true)
    if (!detalles) {
      setCargando(true)
      const supabase = createClient()
      try {
        const { data } = await supabase.from('detalles_pedido').select('*').eq('id_pedido', pedido.id)
        if (data && data.length > 0) { setDetalles(data as DetallePedido[]); setCargando(false); return }
      } catch {}
      const jsonb = pedido.detalles_pedido as any
      if (jsonb && typeof jsonb === 'object') {
        const arr = Array.isArray(jsonb) ? jsonb : [jsonb]
        setDetalles(arr.map((d: any, i: number) => ({
          id: `old-${i}`, id_producto: null,
          producto: d.producto || d.producto_nombre || d.nombre || 'Producto',
          cantidad: d.cantidad || 1, precio_unitario: d.precio_unitario || d.precio || 0, productos: null
        })))
      } else { setDetalles([]) }
      setCargando(false)
    }
  }

  const [sendingLink, setSendingLink] = useState(false)

  const items = detalles || []
  const totalDetalles = items.reduce((s, d) => s + d.precio_unitario * d.cantidad, 0)

  const handleSendMagicLink = async () => {
    if (!pedido.cliente_telefono) { alert('Este pedido no tiene número de teléfono. Agrega uno para enviar el enlace mágico.'); return }
    if (sendingLink) return
    setSendingLink(true)
    const supabase = createClient()
    let { data, error: queryError } = await supabase
      .from('tickets')
      .select('code, gift_details, store_id')
      .eq('order_id', pedido.id)
      .maybeSingle()
    if (queryError) { alert('Error al consultar ticket: ' + queryError.message); setSendingLink(false); return }
    if (!data) {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
      let code = ''
      for (let i = 0; i < 10; i++) code += chars[Math.floor(Math.random() * chars.length)]
      const senderMatch = pedido.notas?.match(/De:\s*(.+?),/)
      const receiverMatch = pedido.notas?.match(/Para:\s*(.+?)(?:,|$)/)
      const msgMatch = pedido.notas?.match(/Msj:\s*"(.+?)"/)
      const { error: insertError } = await supabase.from('tickets').insert({
        order_id: pedido.id,
        store_id: pedido.id_tienda || '',
        code,
        gift_details: {
          sender_name: senderMatch ? senderMatch[1].trim() : '',
          recipient_name: receiverMatch ? receiverMatch[1].trim() : '',
          dedication: msgMatch ? msgMatch[1].trim() : '',
        },
      })
      if (insertError) { alert('Error al generar ticket: ' + insertError.message); setSendingLink(false); return }
      const si = senderMatch ? senderMatch[1].trim() : ''
      const ri = receiverMatch ? receiverMatch[1].trim() : ''
      const mi = msgMatch ? msgMatch[1].trim() : ''
      data = { code, gift_details: { sender_name: si, recipient_name: ri, dedication: mi }, store_id: pedido.id_tienda || '' }
    }
    const details = data.gift_details as any
    const recipient = details?.recipient_name || ''
    const storeId = data.store_id || pedido.id_tienda
    if (!storeId) { alert('Error: falta el ID de la tienda para generar el enlace.'); setSendingLink(false); return }
    const magicUrl = `${window.location.origin}/catalogo/${storeId}/tickets?code=${data.code}`
    const msg = encodeURIComponent(`¡Hola! Tu pedido de regalo para ${recipient} ha sido confirmado. 🎉 Aquí tienes el enlace mágico para que se lo envíes cuando quieras darle la sorpresa: ${magicUrl}`)
    window.open(`https://wa.me/${pedido.cliente_telefono.replace(/\D/g, '')}?text=${msg}`, '_blank')
    setSendingLink(false)
  }

  return (
    <div className="bg-white border-b border-slate-100 last:border-b-0">
      <button onClick={toggleAccordion} className="w-full flex items-center gap-3 px-4 sm:px-6 py-3 sm:py-4 hover:bg-slate-50 transition-colors text-left">
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900 truncate">
                {pedido.order_id ? `${pedido.order_id} — ` : ''}{pedido.cliente_nombre}
              </p>
              <p className="text-xs text-gray-900 font-medium mt-0.5">{new Date(pedido.creado_at).toLocaleString('es-DO')}</p>
            </div>
            <div className="text-right shrink-0 space-y-1">
              <p className="text-sm font-bold text-slate-900 whitespace-nowrap">RD${formatearPrecio(pedido.total)}</p>
              <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full border ${badge.cls}`}>{badge.label}</span>
              {pedido.is_gift && (
                <span className="block text-[10px] font-bold text-amber-600">🎁 Regalo</span>
              )}
            </div>
          </div>
          <div className="mt-1.5 text-xs text-gray-900 font-medium truncate">
            {detalles ? detalles.map(d => d.producto).join(', ') : 'Ver productos'}
          </div>
        </div>
        <svg className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${abierto ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {abierto && (
        <div className="px-4 sm:px-6 pb-4 border-t border-slate-100">
          {cargando ? (
            <p className="text-sm text-gray-900 font-medium py-3">Cargando...</p>
          ) : items.length > 0 ? (
            <div className="pt-4 space-y-2">
              {items.map(d => (
                  <div key={d.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-2.5">
                    <div className="flex items-center gap-3 min-w-0">
                      {d.productos?.imagen_url && <img src={d.productos.imagen_url} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" />}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{d.productos?.nombre || d.producto}</p>
                        <p className="text-xs text-gray-900 font-medium whitespace-nowrap">{d.cantidad} x RD${formatearPrecio(d.precio_unitario)}</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-slate-900 whitespace-nowrap ml-3 shrink-0">RD${formatearPrecio(d.precio_unitario * d.cantidad)}</span>
                  </div>
              ))}
              <div className="flex justify-between items-center pt-2 px-4">
                <span className="text-sm font-semibold text-gray-900">Total</span>
                <span className={`text-base font-bold ${totalDetalles !== pedido.total ? 'text-rose-600' : 'text-emerald-600'}`}>
                  RD${formatearPrecio(pedido.total)}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-900 font-medium py-3">Sin productos registrados</p>
          )}

          {/* Status buttons for pending orders */}
          {(permisos === null || permisos.pedidos) && pedido.estado === 'pendiente' && (
            <div className="flex gap-2 mt-4 flex-wrap">
              <form action={actualizarEstado}>
                <input type="hidden" name="pedidoId" value={pedido.id} />
                <input type="hidden" name="estado" value="en_proceso" />
                <button type="submit" onClick={() => {
                  const telefono = pedido.cliente_telefono?.replace(/\D/g, '')
                  if (!telefono) return
                  const codigoReal = pedido.order_id || pedido.id.slice(0, 8).toUpperCase()
                  const msg = `🛍️ *¡Hola!* Tu pedido *#${codigoReal}* ya fue recibido y lo estamos preparando. 🚀 En breve te avisaremos cuando vaya de camino... 🙌🔥`
                  window.open(`https://wa.me/${telefono}?text=${encodeURIComponent(msg)}`, '_blank')
                }} className="bg-emerald-600 text-white text-xs font-semibold px-5 py-2 rounded-full hover:bg-emerald-700 transition-colors">
                  Aceptar
                </button>
              </form>
              <form action={actualizarEstado}>
                <input type="hidden" name="pedidoId" value={pedido.id} />
                <input type="hidden" name="estado" value="rechazado" />
                <button type="submit" className="bg-rose-500 text-white text-xs font-semibold px-5 py-2 rounded-full hover:bg-rose-600 transition-colors">
                  Rechazar
                </button>
              </form>
              <form action={actualizarEstado}>
                <input type="hidden" name="pedidoId" value={pedido.id} />
                <input type="hidden" name="estado" value="cancelado" />
                <button type="submit" className="bg-slate-400 text-white text-xs font-semibold px-5 py-2 rounded-full hover:bg-slate-500 transition-colors">
                  Cancelar
                </button>
              </form>
            </div>
          )}

          {(permisos === null || permisos.pedidos) && pedido.estado === 'en_proceso' && (
            <div className="flex gap-2 mt-4">
              <button
                onClick={async () => {
                  const numeroCliente = pedido.cliente_telefono?.replace(/\D/g, '') || ''
                  const codigoReal = pedido.order_id || pedido.id.slice(0, 8).toUpperCase()
                  const msgEnCamino = `🛍️ *¡Hola, ${pedido.cliente_nombre}!* Tu pedido *#${codigoReal}* ya va en camino. 🛵 El mensajero se pondrá en contacto contigo muy pronto para la entrega. ¡Gracias por elegirnos! 🙌✨`
                  if (numeroCliente) {
                    window.open(`https://wa.me/${numeroCliente}?text=${encodeURIComponent(msgEnCamino)}`, '_blank')
                  }
                  const supabase = createClient()
                  await supabase.from('pedidos').update({ estado: 'en_camino' }).eq('id', pedido.id)
                }}
                className="bg-purple-600 text-white text-xs font-semibold px-5 py-2 rounded-full hover:bg-purple-700 transition-colors"
              >
                En Camino
              </button>
            </div>
          )}

          {(permisos === null || permisos.pedidos) && pedido.estado === 'en_camino' && (
            <div className="flex gap-2 mt-4">
              <form action={actualizarEstado}>
                <input type="hidden" name="pedidoId" value={pedido.id} />
                <input type="hidden" name="estado" value="entregado" />
                <button type="submit" className="bg-emerald-600 text-white text-xs font-semibold px-5 py-2 rounded-full hover:bg-emerald-700 transition-colors">
                  Marcar Entregado
                </button>
              </form>
            </div>
          )}

          {(permisos === null || permisos.pedidos) && pedido.estado === 'entregado' && (
            <div className="flex gap-2 mt-4">
              <form action={actualizarEstado}>
                <input type="hidden" name="pedidoId" value={pedido.id} />
                <input type="hidden" name="estado" value="devuelto" />
                <button type="submit" className="bg-orange-500 text-white text-xs font-semibold px-5 py-2 rounded-full hover:bg-orange-600 transition-colors">
                  Devolver
                </button>
              </form>
            </div>
          )}

          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2">
              {/* Magic Link for confirmed gift orders */}
              {(permisos === null || permisos.pedidos) && pedido.is_gift && pedido.estado === 'confirmado' && (
                <button
                  onClick={handleSendMagicLink}
                  disabled={sendingLink}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white text-xs font-semibold rounded-full hover:bg-purple-700 disabled:opacity-50 disabled:cursor-wait transition-colors shadow-sm"
                >
                  🪄 {sendingLink ? 'Enviando...' : 'Enviar Enlace Mágico'}
                </button>
              )}
              {/* WhatsApp contact */}
              <a
                href={`https://wa.me/${(pedido.cliente_telefono || '8499999999').replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${pedido.cliente_nombre}, estamos trabajando en tu pedido ${pedido.order_id || pedido.id.slice(0, 8).toUpperCase()}.`)}`}
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                Contactar
              </a>
            </div>

            <TicketPedido pedido={pedido} detalles={items} />
          </div>
        </div>
      )}
    </div>
  )
}
