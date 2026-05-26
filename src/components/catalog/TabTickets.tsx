'use client'

import { useState } from 'react'
import GiftRedemption from '@/components/store/GiftRedemption'

interface GiftFormData {
  sender: string
  receiver: string
  message: string
}

interface Props {
  id_tienda: string
  onGiftModeActivate: (data: GiftFormData) => void
  giftMode: boolean
}

export default function TabTickets({ id_tienda, onGiftModeActivate, giftMode }: Props) {
  const [giftCode, setGiftCode] = useState('')
  const [showGiftModal, setShowGiftModal] = useState(false)
  const [sender, setSender] = useState('')
  const [receiver, setReceiver] = useState('')
  const [message, setMessage] = useState('')
  const [showForm, setShowForm] = useState(false)

  const handleActivateGiftMode = () => {
    if (!receiver.trim()) return
    onGiftModeActivate({ sender: sender.trim(), receiver: receiver.trim(), message: message.trim() })
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-6 sm:pt-10 pb-8 space-y-5">
      {/* ===== CANJE MINIMALISTA ===== */}
      <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] border border-slate-100 shadow-sm p-5 sm:p-6">
        <label className="block text-sm font-semibold text-slate-700 mb-3">
          ¿Tienes un código de regalo o descuento?
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={giftCode}
            onChange={e => setGiftCode(e.target.value.toUpperCase())}
            placeholder="Ej: NX-GIFT-123"
            maxLength={20}
            className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] placeholder:text-slate-400 transition-all"
          />
          <button
            onClick={() => setShowGiftModal(true)}
            disabled={!giftCode.trim()}
            className="px-6 py-3 bg-[var(--primary)] text-white font-semibold rounded-xl hover:brightness-110 transition-all disabled:opacity-50 text-sm shadow-sm whitespace-nowrap"
          >
            Validar
          </button>
        </div>
      </div>

      {showGiftModal && giftCode.trim() && (
        <GiftRedemption idTienda={id_tienda} defaultCode={giftCode.trim()} onOpen={() => setShowGiftModal(false)} />
      )}

      {/* ===== COMPRAR REGALO ÚNICO ===== */}
      <div className={`rounded-[2rem] p-0.5 transition-all duration-500 ${giftMode ? 'bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 shadow-xl shadow-orange-200/40' : ''}`}>
        <div className={`rounded-[2rem] p-5 sm:p-6 ${giftMode ? 'bg-white' : 'bg-white/80 backdrop-blur-xl border border-slate-100 shadow-sm'}`}>
          {!showForm && !giftMode ? (
            /* Collapsed: just a prominent button */
            <div className="text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-500/20 to-rose-500/20 flex items-center justify-center">
                <svg className="w-7 h-7 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">Comprar un regalo único</h3>
              <p className="text-sm text-slate-400 mb-5">Configura un regalo personalizado con mensaje secreto y seguimiento exclusivo</p>
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-rose-500 text-white font-bold rounded-xl hover:brightness-110 transition-all shadow-lg shadow-amber-500/25"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Crear regalo ahora
              </button>
            </div>
          ) : (
            /* Expanded form */
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-rose-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Comprar un regalo único</h3>
                  <p className="text-[11px] text-slate-400">Completa los detalles del regalo</p>
                </div>
              </div>

              <div className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Tu nombre (remitente)</label>
                    <input
                      type="text" value={sender} onChange={e => setSender(e.target.value)}
                      placeholder="¿Quién envía el regalo?"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] placeholder:text-slate-400 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre del destinatario</label>
                    <input
                      type="text" value={receiver} onChange={e => setReceiver(e.target.value)}
                      placeholder="¿Para quién es?"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] placeholder:text-slate-400 transition-all"
                    />
                  </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mensaje o dedicatoria</label>
                  <textarea
                    value={message} onChange={e => setMessage(e.target.value)}
                    placeholder="Escribe un mensaje personalizado para el destinatario..."
                    rows={2}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] placeholder:text-slate-400 resize-none transition-all"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-5">
                {!giftMode && (
                  <button
                    onClick={() => { setShowForm(false); setSender(''); setReceiver(''); setMessage('') }}
                    className="px-4 py-2.5 border border-slate-200 text-slate-600 font-medium rounded-xl hover:bg-slate-50 transition-all text-sm"
                  >
                    Cancelar
                  </button>
                )}
                <button
                  onClick={handleActivateGiftMode}
                  disabled={!receiver.trim()}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 shadow-sm ${
                    giftMode
                      ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white hover:brightness-110'
                      : 'bg-[var(--primary)] text-white hover:brightness-110'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {giftMode ? 'Modo Regalo activo — Ir al Menú' : 'Configurar regalo'}
                </button>
              </div>

              {giftMode && (
                <p className="text-center text-[11px] text-emerald-600 font-medium mt-3">
                  ✓ Todos los productos que agregues se enviarán como regalo
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ===== HINT ===== */}
      <div className="bg-slate-50 rounded-2xl p-4 flex items-start gap-3">
        <svg className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Al configurar un regalo, ve a <strong>Productos</strong> para elegir los artículos. El destinatario recibirá un código secreto para canjear su regalo.
        </p>
      </div>
    </div>
  )
}
