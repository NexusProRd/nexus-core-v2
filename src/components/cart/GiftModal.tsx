'use client'

import { useState, useEffect } from 'react'

interface GiftModalProps {
  open: boolean
  initialSender: string
  initialReceiver: string
  initialReceiverPhone: string
  initialMessage: string
  initialSenderPhone?: string
  onSave: (sender: string, receiver: string, receiverPhone: string, message: string, senderPhone: string) => void
  onCancel: () => void
}

export default function GiftModal({ open, initialSender, initialReceiver, initialReceiverPhone, initialMessage, initialSenderPhone, onSave, onCancel }: GiftModalProps) {
  const [sender, setSender] = useState(initialSender)
  const [senderPhone, setSenderPhone] = useState(initialSenderPhone || '')
  const [receiver, setReceiver] = useState(initialReceiver)
  const [receiverPhone, setReceiverPhone] = useState(initialReceiverPhone)
  const [message, setMessage] = useState(initialMessage)

  useEffect(() => {
    setSender(initialSender)
    setSenderPhone(initialSenderPhone || '')
    setReceiver(initialReceiver)
    setReceiverPhone(initialReceiverPhone)
    setMessage(initialMessage)
  }, [initialSender, initialSenderPhone, initialReceiver, initialReceiverPhone, initialMessage])

  if (!open) return null

  const canSave = sender.trim().length > 0 && senderPhone.trim().length > 0 && receiver.trim().length > 0 && receiverPhone.trim().length > 0

  return (
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-backdrop-in" onClick={onCancel} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl elevation-3 w-full max-w-sm p-6 animate-scale-in">
          <h2 className="text-lg font-bold text-slate-900 text-center mb-6">🎁 Configurar regalo</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">De parte de <span className="text-rose-500">*</span></label>
              <input type="text" value={sender} onChange={e => setSender(e.target.value)}
                placeholder="¿Quién envía el regalo?"
                className="w-full px-4 py-3 text-[16px] border border-slate-200 rounded-xl focus:ring-2 focus:ring-[var(--primary)] outline-none text-slate-900" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tu WhatsApp <span className="text-rose-500">*</span></label>
              <input type="tel" value={senderPhone} onChange={e => setSenderPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="809 123 4567"
                className="w-full px-4 py-3 text-[16px] border border-slate-200 rounded-xl focus:ring-2 focus:ring-[var(--primary)] outline-none text-slate-900" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Para <span className="text-rose-500">*</span></label>
              <input type="text" value={receiver} onChange={e => setReceiver(e.target.value)}
                placeholder="¿Para quién es?"
                className="w-full px-4 py-3 text-[16px] border border-slate-200 rounded-xl focus:ring-2 focus:ring-[var(--primary)] outline-none text-slate-900" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">WhatsApp del destinatario <span className="text-rose-500">*</span></label>
              <input type="tel" value={receiverPhone} onChange={e => setReceiverPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="809 123 4567"
                className="w-full px-4 py-3 text-[16px] border border-slate-200 rounded-xl focus:ring-2 focus:ring-[var(--primary)] outline-none text-slate-900" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Mensaje personalizado</label>
              <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3}
                placeholder="Escribe una dedicatoria..."
                className="w-full px-4 py-3 text-[16px] border border-slate-200 rounded-xl focus:ring-2 focus:ring-[var(--primary)] outline-none text-slate-900 resize-none" />
            </div>
          </div>

          <p className="text-[11px] text-slate-500 mt-4 leading-relaxed">
            📱 Lo utilizaremos para coordinar la entrega del regalo.
          </p>

          <div className="flex gap-3 mt-6">
            <button onClick={onCancel}
              className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors native-press">
              Cancelar
            </button>
            <button onClick={() => onSave(sender.trim(), receiver.trim(), receiverPhone.trim(), message.trim(), senderPhone.trim())}
              disabled={!canSave}
              className="flex-1 px-4 py-2.5 bg-[var(--primary)] text-white rounded-xl text-sm font-medium hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed native-press elevation-1">
              Comprar Regalo
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
