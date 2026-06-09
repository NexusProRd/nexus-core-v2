'use client'

import { useState, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { actualizarEstado } from './actions'
import { formatearPrecio } from '@/lib/utils'
import TicketPedido from './TicketPedido'
import { usePermisos } from '@/context/PermisosContext'
import { useToast } from '@/components/Toast'
import { reemplazarVars } from './PedidosLista'

interface DetallePedido {
  id: string
  id_producto: string | null
  producto: string
  cantidad: number
  precio_unitario: number
  productos: { nombre: string; imagen_url: string | null } | null
  impuesto?: number
  subtotal?: number
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

const STATUS_CONFIG = {
  pendiente:    { label: 'Recibido',     icon: '🆕', dot: 'bg-amber-500',   bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800', step: 0 },
  en_preparacion: { label: 'Preparando', icon: '👩‍🍳', dot: 'bg-blue-500',   bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800', step: 1 },
  en_proceso:   { label: 'Preparando',   icon: '👩‍🍳', dot: 'bg-blue-500',   bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800', step: 1 },
  en_camino:    { label: 'En Camino',    icon: '🛵',  dot: 'bg-purple-500', bg: 'bg-purple-50 dark:bg-purple-500/10', text: 'text-purple-700 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800', step: 2 },
  entregado:    { label: 'Entregado',    icon: '✅',  dot: 'bg-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800', step: 3 },
  confirmado:   { label: 'Confirmado',   icon: '✅',  dot: 'bg-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800', step: -1 },
  rechazado:    { label: 'Rechazado',    icon: '✕',   dot: 'bg-rose-500',   bg: 'bg-rose-50 dark:bg-rose-500/10', text: 'text-rose-700 dark:text-rose-400', border: 'border-rose-200 dark:border-rose-800', step: -1 },
  cancelado:    { label: 'Cancelado',    icon: '—',   dot: 'bg-slate-400',  bg: 'bg-slate-100 dark:bg-slate-500/10', text: 'text-slate-600 dark:text-slate-400', border: 'border-slate-200 dark:border-slate-700', step: -1 },
  devuelto:     { label: 'Devuelto',     icon: '↩️',  dot: 'bg-orange-500', bg: 'bg-orange-50 dark:bg-orange-500/10', text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-800', step: -1 },
}

const STEPS = [
  { key: 'pendiente', label: 'Recibido', icon: '🆕' },
  { key: 'en_proceso', label: 'Preparando', icon: '👩‍🍳' },
  { key: 'en_camino', label: 'En Camino', icon: '🛵' },
  { key: 'entregado', label: 'Entregado', icon: '✅' },
]

const STATUS_ACTIONS: Record<string, { label: string; estado: string; cls: string; icon: string; templateKey?: string; defaultMsg?: string }> = {
  pendiente: {
    label: 'Aceptar', estado: 'en_proceso',
    cls: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    icon: '✓',
    templateKey: 'confirmado',
    defaultMsg: '¡Hola {cliente}! 🎉 Tu pedido {pedido} ha sido confirmado. En breve comenzaremos a prepararlo.',
  },
  en_proceso: {
    label: 'En Camino', estado: 'en_camino',
    cls: 'bg-purple-600 hover:bg-purple-700 text-white',
    icon: '🛵',
    templateKey: 'en_camino',
    defaultMsg: '¡Hola {cliente}! 🚴‍♂️ Tu pedido {pedido} va en camino. Pronto lo recibirás.',
  },
  en_camino: {
    label: 'Entregar', estado: 'entregado',
    cls: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    icon: '✅',
    templateKey: 'entregado',
    defaultMsg: '¡Hola {cliente}! ✅ Tu pedido {pedido} ha sido entregado. ¡Gracias por confiar en {tienda}! 🙌',
  },
  entregado: {
    label: 'Devolver', estado: 'devuelto',
    cls: 'bg-orange-500 hover:bg-orange-600 text-white',
    icon: '↩️',
  },
}

export default function PedidoRow({ pedido, plantillas, tiendaNombre }: { pedido: Pedido; plantillas?: Record<string, string>; tiendaNombre?: string }) {
  const { permisos } = usePermisos()
  const { toast } = useToast()
  const [abierto, setAbierto] = useState(false)
  const [detalles, setDetalles] = useState<DetallePedido[] | null>(null)
  const [cargando, setCargando] = useState(false)
  const [accionando, setAccionando] = useState<string | null>(null)
  const formResubmitRef = useRef(false)

  const cfg = STATUS_CONFIG[pedido.estado as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pendiente

  const toggleAccordion = async () => {
    if (abierto) { setAbierto(false); return }
    setAbierto(true)
    if (!detalles) {
      setCargando(true)
      const jsonb = pedido.detalles_pedido as any
      if (jsonb && typeof jsonb === 'object') {
        const arr = Array.isArray(jsonb) ? jsonb : [jsonb]
        setDetalles(arr.map((d: any, i: number) => ({
          id: `old-${i}`, id_producto: null,
          producto: d.producto || d.producto_nombre || d.nombre || 'Producto',
          cantidad: d.cantidad || 1,
          precio_unitario: d.precio_unitario || d.precio || 0,
          productos: null,
          impuesto: d.impuesto || 0,
          subtotal: d.subtotal ?? (d.precio_unitario || d.precio || 0) * (d.cantidad || 1),
        })))
      } else { setDetalles([]) }
      setCargando(false)
    }
  }

  const [sendingLink, setSendingLink] = useState(false)

  const items = detalles || []
  const totalDetalles = items.reduce((s, d) => s + d.precio_unitario * d.cantidad, 0)
  const detallesStr = items.map(d => `${d.cantidad}x ${d.productos?.nombre || d.producto}`).join(', ')

  const handleSendMagicLink = async () => {
    if (!pedido.cliente_telefono) { toast('Este pedido no tiene número de teléfono', 'warning'); return }
    if (sendingLink) return
    setSendingLink(true)
    const supabase = createClient()

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    for (let i = 0; i < 10; i++) code += chars[Math.floor(Math.random() * chars.length)]
    const senderMatch = pedido.notas?.match(/De:\s*(.+?),/)
    const receiverMatch = pedido.notas?.match(/Para:\s*(.+?)(?:,|$)/)
    const msgMatch = pedido.notas?.match(/Msj:\s*"(.+?)"/)

    const { error: insertError } = await supabase.from('gift_experiences').insert({
      store_id: pedido.id_tienda || '',
      sender_name: senderMatch ? senderMatch[1].trim() : '',
      receiver_name: receiverMatch ? receiverMatch[1].trim() : '',
      personal_message: msgMatch ? msgMatch[1].trim() : '',
      gift_code: code,
      is_redeemed: false,
      status: 'approved',
      approved_at: new Date().toISOString(),
      sender_phone: pedido.cliente_telefono || null,
      items_list: [],
    })

    if (insertError) { toast('Error al generar gift', 'error'); setSendingLink(false); return }

    const recipient = receiverMatch ? receiverMatch[1].trim() : ''
    const storeId = pedido.id_tienda
    if (!storeId) { toast('Falta el ID de la tienda', 'error'); setSendingLink(false); return }
    const magicUrl = `${window.location.origin}/canje?gift=${code}&id=${storeId}`
    const msg = encodeURIComponent(`¡Hola! Tu pedido de regalo para ${recipient} ha sido confirmado. 🎉 Aquí tienes el enlace mágico para que se lo envíes cuando quieras darle la sorpresa: ${magicUrl}`)
    window.open(`https://wa.me/${pedido.cliente_telefono.replace(/\D/g, '')}?text=${msg}`, '_blank')
    toast('Enlace mágico enviado por WhatsApp', 'success')
    setSendingLink(false)
  }

  const ejecutarAccion = async (estado: string, waMsg?: string) => {
    setAccionando(estado)
    if (waMsg) window.open(`https://wa.me/${pedido.cliente_telefono?.replace(/\D/g, '')}?text=${encodeURIComponent(waMsg)}`, '_blank')
    const supabase = createClient()
    await supabase.from('pedidos').update({ estado }).eq('id', pedido.id)
    setAccionando(null)
    toast(`Pedido marcado como «${(STATUS_CONFIG as any)[estado]?.label || estado}»`, 'success')
  }

  const action = (STATUS_ACTIONS as any)[pedido.estado]
  const puedeAccion = (permisos === null || permisos.pedidos) && action

  const codigoReal = pedido.order_id || pedido.id.slice(0, 8).toUpperCase()

  return (
    <div className="bg-white dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-700/50 last:border-b-0 transition-colors">
      {/* ORDERS UX PASS: Compact header row */}
      <button onClick={toggleAccordion} className="w-full flex items-center gap-3 px-4 sm:px-6 py-3.5 sm:py-4 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors text-left group">
        {/* Status dot */}
        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${cfg.dot} ${pedido.estado === 'pendiente' ? 'animate-pulse' : ''}`} />

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                  {pedido.cliente_nombre}
                </p>
                {(pedido.notas?.includes('🎁 Modo Regalo') || pedido.is_gift) && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 font-bold">🎁</span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                {pedido.order_id ? `#${pedido.order_id} · ` : ''}{new Date(pedido.creado_at).toLocaleString('es-DO')}
              </p>
            </div>
            <div className="text-right shrink-0 ml-2">
              <p className="text-sm font-bold text-slate-900 dark:text-white whitespace-nowrap">RD${formatearPrecio(pedido.total)}</p>
              <span className={`inline-flex items-center gap-1 mt-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                <span>{cfg.icon}</span>
                <span>{cfg.label}</span>
              </span>
            </div>
          </div>
          <div className="mt-1.5 text-xs text-slate-400 dark:text-slate-500 truncate flex items-center gap-1.5">
            {items.length > 0 ? (
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                {items.length} producto{items.length !== 1 ? 's' : ''}
              </span>
            ) : (
              'Ver detalle'
            )}
            {pedido.cliente_telefono && (
              <span className="flex items-center gap-1 ml-2">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                Contacto
              </span>
            )}
          </div>
        </div>
        <svg className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${abierto ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {abierto && (
        <div className="px-4 sm:px-6 pb-5 border-t border-slate-100 dark:border-slate-700/50">
          {/* ORDERS UX PASS: Progress timeline */}
          {cfg.step >= 0 && (
            <div className="pt-4 pb-2">
              <div className="flex items-center justify-between px-1">
                {STEPS.map((s, i) => {
                  const completed = i < cfg.step
                  const current = i === cfg.step
                  const upcoming = i > cfg.step
                  return (
                    <div key={s.key} className="flex flex-col items-center relative flex-1">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                        completed ? 'bg-emerald-500 text-white shadow-sm' :
                        current ? 'bg-[var(--primary)] text-white shadow-md ring-2 ring-[var(--primary)]/30 scale-110' :
                        'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500'
                      }`}>
                        {completed ? '✓' : current ? s.icon : i + 1}
                      </div>
                      <span className={`text-[10px] mt-1 font-medium text-center leading-tight ${
                        completed ? 'text-emerald-600 dark:text-emerald-400' :
                        current ? 'text-slate-800 dark:text-white font-semibold' :
                        'text-slate-400 dark:text-slate-500'
                      }`}>{s.label}</span>
                      {i < STEPS.length - 1 && (
                        <div className={`absolute top-3.5 left-[calc(50%+14px)] w-[calc(100%-28px)] h-0.5 -translate-y-1/2 ${
                          completed ? 'bg-emerald-500' : current ? 'bg-gradient-to-r from-emerald-500 to-slate-200 dark:to-slate-600' : 'bg-slate-200 dark:bg-slate-600'
                        }`} />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Terminal status (rechazado/cancelado/devuelto) indicator */}
          {cfg.step === -1 && (
            <div className="pt-4 pb-2 flex items-center justify-center">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl ${cfg.bg} ${cfg.text} ${cfg.border} border`}>
                <span className="text-lg">{cfg.icon}</span>
                <span className="text-sm font-semibold">Pedido {cfg.label.toLowerCase()}</span>
              </div>
            </div>
          )}

          {/* ORDERS UX PASS: Product details */}
          {cargando ? (
            <div className="flex justify-center py-6">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                Cargando productos...
              </div>
            </div>
          ) : items.length > 0 ? (
            <div className="pt-4 space-y-2">
              {items.map(d => (
                <div key={d.id} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 rounded-xl px-3.5 py-3 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800/80">
                  <div className="flex items-center gap-3 min-w-0">
                    {d.productos?.imagen_url ? (
                      <img src={d.productos.imagen_url} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0 ring-1 ring-black/5" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0">
                        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{d.productos?.nombre || d.producto}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{d.cantidad} × RD${formatearPrecio(d.precio_unitario)}</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white whitespace-nowrap ml-3 shrink-0">RD${formatearPrecio(d.precio_unitario * d.cantidad)}</span>
                </div>
              ))}
              <div className="flex justify-between items-center pt-1 px-1">
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Total</span>
                <div className="text-right">
                  {items.some(d => Number(d.impuesto) > 0) && (
                    <div className="text-[11px] text-slate-400 dark:text-slate-500 leading-tight">
                      <div>Subtotal: RD${formatearPrecio(items.reduce((s, d) => s + Number(d.subtotal ?? d.precio_unitario * d.cantidad), 0))}</div>
                      <div>Impuesto: RD${formatearPrecio(items.reduce((s, d) => s + Number(d.impuesto || 0), 0))}</div>
                    </div>
                  )}
                  <span className={`text-base font-bold ${totalDetalles !== pedido.total && !items.some(d => Number(d.impuesto) > 0) ? 'text-rose-600' : 'text-emerald-600'}`}>
                    RD${formatearPrecio(pedido.total)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-6 text-sm text-slate-400 dark:text-slate-500 gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
              Sin productos registrados
            </div>
          )}

          {/* ORDERS UX PASS: Quick actions */}
          {puedeAccion && (
            <div className="flex gap-2 mt-4 flex-wrap">
              {pedido.estado === 'pendiente' ? (
                <>
                  <button
                    onClick={async () => {
                      setAccionando('en_proceso')
                      const telefono = pedido.cliente_telefono?.replace(/\D/g, '')
                      if (telefono) {
                        const raw = plantillas?.confirmado || '¡Hola {cliente}! 🎉 Tu pedido {pedido} ha sido confirmado. En breve comenzaremos a prepararlo.'
                        const msg = reemplazarVars(raw, {
                          cliente: pedido.cliente_nombre,
                          pedido: `#${codigoReal}`,
                          tienda: tiendaNombre || '',
                          detalles: detallesStr,
                          total: `RD$${formatearPrecio(pedido.total)}`,
                          fecha: new Date(pedido.creado_at).toLocaleDateString('es-DO'),
                        })
                        window.open(`https://wa.me/${telefono}?text=${encodeURIComponent(msg)}`, '_blank')
                      }
                      const supabase = createClient()
                      await supabase.from('pedidos').update({ estado: 'en_proceso' }).eq('id', pedido.id)
                      setAccionando(null)
                      toast('Pedido marcado como «Preparando»', 'success')
                    }}
                    disabled={accionando === 'en_proceso'}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-all press-scale-sm shadow-sm shadow-emerald-600/20 disabled:opacity-50"
                  >
                    {accionando === 'en_proceso' ? (
                      <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    )}
                    {accionando === 'en_proceso' ? 'Aceptando...' : 'Aceptar'}
                  </button>
                  <form action={actualizarEstado}>
                    <input type="hidden" name="pedidoId" value={pedido.id} />
                    <input type="hidden" name="estado" value="rechazado" />
                    <button type="submit"
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-white dark:bg-slate-700 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-600 transition-all press-scale-sm"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                      Rechazar
                    </button>
                  </form>
                  <form action={actualizarEstado}>
                    <input type="hidden" name="pedidoId" value={pedido.id} />
                    <input type="hidden" name="estado" value="cancelado" />
                    <button type="submit"
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-600 transition-all press-scale-sm"
                    >
                      Cancelar
                    </button>
                  </form>
                </>
              ) : action && (
                pedido.estado === 'en_proceso' ? (
                  <button
                    onClick={async () => {
                      setAccionando(action.estado)
                      const telefono = pedido.cliente_telefono?.replace(/\D/g, '')
                      if (telefono) {
                        const raw = plantillas?.[action.templateKey || ''] || action.defaultMsg || ''
                        const msg = reemplazarVars(raw, {
                          cliente: pedido.cliente_nombre,
                          pedido: `#${codigoReal}`,
                          tienda: tiendaNombre || '',
                          detalles: detallesStr,
                          total: `RD$${formatearPrecio(pedido.total)}`,
                          fecha: new Date(pedido.creado_at).toLocaleDateString('es-DO'),
                        })
                        window.open(`https://wa.me/${telefono}?text=${encodeURIComponent(msg)}`, '_blank')
                      }
                      const supabase = createClient()
                      await supabase.from('pedidos').update({ estado: action.estado }).eq('id', pedido.id)
                      setAccionando(null)
                      toast(`Pedido marcado como «${(STATUS_CONFIG as any)[action.estado]?.label || action.estado}»`, 'success')
                    }}
                    disabled={accionando === action.estado}
                    className={`inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold rounded-xl transition-all press-scale-sm shadow-sm disabled:opacity-50 ${action.cls}`}
                  >
                    {accionando === action.estado ? (
                      <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    ) : (
                      <span className="text-sm">{action.icon}</span>
                    )}
                    {accionando === action.estado ? 'Actualizando...' : action.label}
                  </button>
                ) : (
                  <form action={actualizarEstado} onSubmit={async (e) => {
                    if (formResubmitRef.current) { formResubmitRef.current = false; return }
                    e.preventDefault()
                    const telefono = pedido.cliente_telefono?.replace(/\D/g, '')
                    if (telefono) {
                      const raw = plantillas?.[action.templateKey || ''] || action.defaultMsg || ''
                      const msg = reemplazarVars(raw, {
                        cliente: pedido.cliente_nombre,
                        pedido: `#${codigoReal}`,
                        tienda: tiendaNombre || '',
                        detalles: detallesStr,
                        total: `RD$${formatearPrecio(pedido.total)}`,
                        fecha: new Date(pedido.creado_at).toLocaleDateString('es-DO'),
                      })
                      window.open(`https://wa.me/${telefono}?text=${encodeURIComponent(msg)}`, '_blank')
                    }
                    formResubmitRef.current = true
                    setTimeout(() => { (e.target as HTMLFormElement).requestSubmit() }, 300)
                  }}>
                    <input type="hidden" name="pedidoId" value={pedido.id} />
                    <input type="hidden" name="estado" value={action.estado} />
                    <button type="submit"
                      className={`inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold rounded-xl transition-all press-scale-sm shadow-sm ${action.cls}`}
                    >
                      <span className="text-sm">{action.icon}</span>
                      {action.label}
                    </button>
                  </form>
                )
              )}
            </div>
          )}

          {/* ORDERS UX PASS: Bottom actions row */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/50">
            <div className="flex items-center gap-2">
              {/* Magic Link for confirmed gift orders */}
              {(permisos === null || permisos.pedidos) && (pedido.notas?.includes('🎁 Modo Regalo') || pedido.is_gift) && pedido.estado === 'confirmado' && (
                <button
                  onClick={handleSendMagicLink}
                  disabled={sendingLink}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white text-xs font-semibold rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-wait transition-all press-scale-sm shadow-sm"
                >
                  🪄 {sendingLink ? 'Enviando...' : 'Enlace Mágico'}
                </button>
              )}
              {/* ORDERS UX PASS: WhatsApp contact - more prominent */}
              <a
                href={`https://wa.me/${(pedido.cliente_telefono || '8499999999').replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${pedido.cliente_nombre}, estamos trabajando en tu pedido #${codigoReal}.`)}`}
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-medium rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-all press-scale-sm border border-emerald-200 dark:border-emerald-800/50"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                <span>WhatsApp</span>
              </a>
              <TicketPedido pedido={pedido} detalles={items} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
