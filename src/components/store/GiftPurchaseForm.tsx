'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { useConfig } from '@/context/ConfigProvider'
import Image from 'next/image'

interface Producto {
  id: string
  nombre: string
  precio: number
  stock: number
  in_stock: boolean
  imagen_url: string | null
}

const generateGiftCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const array = new Uint8Array(10)
  crypto.getRandomValues(array)
  let code = ''
  for (let i = 0; i < 10; i++) {
    code += chars[array[i] % chars.length]
  }
  return code
}

export default function GiftPurchaseForm({ idTienda, whatsappNumber, defaultProduct, autoOpen }: { idTienda: string; whatsappNumber: string; defaultProduct?: Producto; autoOpen?: boolean }) {
  const [open, setOpen] = useState(autoOpen || false)
  const [productos, setProductos] = useState<Producto[]>([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Producto[]>(defaultProduct ? [defaultProduct] : [])
  const [sender, setSender] = useState('')
  const [senderPhone, setSenderPhone] = useState('')
  const [receiver, setReceiver] = useState('')
  const [receiverPhone, setReceiverPhone] = useState('')
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(false)
  const [giftCodeResult, setGiftCodeResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { currencyCode } = useConfig()

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('productos')
      .select('id, nombre, precio, imagen_url, stock, in_stock, tallas')
      .eq('id_tienda', idTienda)
      .then(({ data, error }) => {
        if (error) {
          console.error('Error fetching products:', error)
          return
        }
        if (data) {
          setProductos(
            (data as any[]).filter(
              (p) => !p.tallas || !Array.isArray(p.tallas) || p.tallas.length === 0
            ) as Producto[]
          )
        }
      })
  }, [idTienda])

  const filtered = useMemo(() => {
    if (!search.trim()) return []
    const q = search.toLowerCase()
    return productos.filter(
      p => p.nombre.toLowerCase().includes(q) && !selected.some(s => s.id === p.id)
    )
  }, [search, productos, selected])

  const sinStock = (p: Producto) => !p.in_stock || p.stock <= 0

  const total = useMemo(() => {
    return selected.reduce((sum, p) => sum + p.precio, 0)
  }, [selected])

  const addProduct = (p: Producto) => {
    setSelected(prev => [...prev, p])
    setSearch('')
  }

  const removeProduct = (id: string) => {
    setSelected(prev => prev.filter(p => p.id !== id))
  }

  const handleSubmit = async () => {
    if (!sender.trim() || !senderPhone.trim() || !receiver.trim() || selected.length === 0) {
      setError('Por favor complete todos los campos obligatorios')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const giftCode = generateGiftCode()
      const itemsPayload = selected.map(p => ({
        product_id: p.id,
        nombre: p.nombre,
        precio: p.precio,
        imagen_url: p.imagen_url,
      }))

      const res = await fetch('/api/gift-purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idTienda,
          sender: sender.trim(),
          senderPhone: senderPhone.trim(),
          receiver: receiver.trim(),
          receiverPhone: receiverPhone.trim() || null,
          message: message.trim() || null,
          items: itemsPayload,
          giftCode,
          whatsappNumber,
        }),
      })

      if (!res.ok) {
        const errData = await res.json()
        setError(errData.error || 'Error al procesar el regalo. Por favor intente nuevamente.')
        setLoading(false)
        return
      }

      const data = await res.json()
      setGiftCodeResult(data.giftCode || giftCode)

      setSuccess(true)
      setSender('')
      setSenderPhone('')
      setReceiver('')
      setReceiverPhone('')
      setMessage('')
      setSelected([])
      setSearch('')
    } catch (err: any) {
      console.error('Error submitting gift purchase:', err)
      setError(err.message || 'Error al procesar el regalo. Por favor intente nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="w-full bg-[var(--primary)] text-white font-semibold py-3.5 px-4 rounded-2xl hover:brightness-110 transition-all duration-200 text-sm shadow-sm hover:shadow-md flex items-center justify-center gap-2">
        <span className="text-lg">🎁</span>
        <span>Comprar Regalo</span>
      </button>

      {open && !success && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={e => e.stopPropagation()}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-5 sm:p-6 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <h3 className="text-lg font-bold text-slate-900">🎁 Regalo</h3>
              <button onClick={() => setOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex-shrink-0">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-[var(--primary)] outline-none"
                  placeholder="Buscar productos..." />
              </div>

              {search.trim() && (
                <div className="mt-1 border border-slate-200 rounded-xl max-h-48 overflow-y-auto divide-y divide-slate-100">
                  {filtered.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">Sin resultados</p>
                  ) : (
                    filtered.map(p => (
                      <button key={p.id} onClick={() => sinStock(p) ? null : addProduct(p)} type="button" disabled={sinStock(p)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${sinStock(p) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[var(--primary)]/5 cursor-pointer'}`}>
                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex-shrink-0 overflow-hidden">
                          {p.imagen_url ? (
                            <img src={p.imagen_url} alt={p.nombre} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{p.nombre}</p>
                          <p className="text-xs text-slate-500">{formatCurrency(p.precio, currencyCode)}</p>
                        </div>
                        {sinStock(p) ? (
                          <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">Agotado</span>
                        ) : (
                          <svg className="w-5 h-5 text-[var(--primary)] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {selected.length > 0 && (
              <div className="flex-shrink-0 mt-3 space-y-1.5">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Seleccionados</p>
                {selected.map(p => (
                  <div key={p.id}
                    className="flex items-center gap-3 px-2.5 py-2 bg-[var(--primary)]/5 rounded-xl">
                    <div className="w-8 h-8 rounded-md bg-white flex-shrink-0 overflow-hidden">
                      {p.imagen_url ? (
                        <img src={p.imagen_url} alt={p.nombre} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <p className="text-sm font-medium text-slate-900 flex-1 min-w-0 truncate">{p.nombre}</p>
                    <p className="text-xs text-slate-500 flex-shrink-0">{formatCurrency(p.precio, currencyCode)}</p>
                    <button onClick={() => removeProduct(p.id)} type="button"
                      className="p-0.5 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-100 transition-colors flex-shrink-0">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-1 px-1">
                  <span className="text-xs text-slate-500">{selected.length} producto{selected.length !== 1 ? 's' : ''}</span>
                  <span className="text-sm font-bold text-slate-900">Total: {formatCurrency(total, currencyCode)}</span>
                </div>
              </div>
            )}

            <div className="mt-4 space-y-3 overflow-y-auto flex-1 min-h-0 pr-1">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">De parte de...</label>
                <input type="text" value={sender} onChange={e => setSender(e.target.value)} required
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-[var(--primary)] outline-none" placeholder="Tu nombre" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Para...</label>
                <input type="text" value={receiver} onChange={e => setReceiver(e.target.value)} required
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-[var(--primary)] outline-none" placeholder="Nombre del destinatario" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">WhatsApp del destinatario <span className="text-xs text-slate-400">(opcional)</span></label>
                <div className="flex gap-2">
                  <span className="inline-flex items-center px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-500 bg-slate-50 font-medium">+1</span>
                  <input type="tel" value={receiverPhone} onChange={e => { const v = e.target.value.replace(/\D/g, '').slice(0, 10); setReceiverPhone(v) }}
                    className="flex-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-[var(--primary)] outline-none" placeholder="809 123 4567" />
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">Para notificar al destinatario cuando el regalo esté listo.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tu WhatsApp</label>
                <div className="flex gap-2">
                  <span className="inline-flex items-center px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-500 bg-slate-50 font-medium">+1</span>
                  <input type="tel" value={senderPhone} onChange={e => { const v = e.target.value.replace(/\D/g, '').slice(0, 10); setSenderPhone(v) }} required
                    className="flex-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-[var(--primary)] outline-none" placeholder="809 123 4567" />
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">El socio usará este número para enviarte el ticket de regalo.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mensaje personalizado</label>
                <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-[var(--primary)] outline-none resize-none" placeholder="Escribe tu mensaje..." />
              </div>

            </div>

            <div className="flex-shrink-0 mt-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-xs font-bold text-amber-800">Pendiente de confirmación</p>
                <p className="text-[11px] text-amber-600 mt-0.5">La tienda revisará tu solicitud y te notificará cuando el regalo esté listo.</p>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 mb-3">
                  {error}
                </div>
              )}

              <button onClick={handleSubmit} disabled={loading || !sender.trim() || !senderPhone.trim() || !receiver.trim() || selected.length === 0}
                className="w-full py-2.5 bg-[var(--primary)] text-white font-medium rounded-xl hover:brightness-110 transition-colors disabled:opacity-50 text-sm">
                {loading ? 'Enviando...' : 'Comprar Regalo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={e => e.stopPropagation()}>
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Solicitud registrada</h3>
            <div className="bg-slate-50 rounded-xl p-3 mb-4">
              <p className="text-xs text-slate-500 mb-1">Código de regalo</p>
              <p className="text-lg font-bold font-mono text-slate-900 tracking-wider select-all">{giftCodeResult}</p>
              <button onClick={() => navigator.clipboard.writeText(giftCodeResult)}
                className="mt-2 text-xs text-violet-600 hover:text-violet-800 underline underline-offset-2 transition-colors">
                📋 Copiar código
              </button>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-left">
              <p className="text-xs font-semibold text-amber-800 mb-1">Estado: Pendiente de confirmación</p>
              <p className="text-[11px] text-amber-700 leading-relaxed">
                Recibiremos tu solicitud y el equipo revisará la disponibilidad. Te notificaremos cuando el regalo esté listo para compartir con el destinatario.
              </p>
            </div>
            <button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent('Te he enviado un regalo 🎁. Tu código es: ' + giftCodeResult)}`, '_blank')}
              className="w-full mb-2 py-2.5 bg-emerald-500 text-white font-medium rounded-xl hover:brightness-110 transition-colors text-sm flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              Compartir por WhatsApp
            </button>
            <button onClick={() => { setOpen(false); setSuccess(false); setGiftCodeResult(''); setSender(''); setSenderPhone(''); setReceiver(''); setReceiverPhone(''); setMessage(''); setSelected([]); setSearch('') }}
              className="w-full py-2.5 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition-colors text-sm">
              Cerrar
            </button>
          </div>
        </div>
      )}
    </>
  )
}
