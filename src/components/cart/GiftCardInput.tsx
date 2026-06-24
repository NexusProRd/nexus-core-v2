'use client'

import { useState } from 'react'
import { formatCurrency } from '@/lib/utils'

interface GiftCardInputProps {
  storeId: string
  currencyCode: string
  onApply: (code: string, balance: number) => void
  onRemove: () => void
  appliedCode: string | null
  appliedBalance: number | null
}

export default function GiftCardInput({
  storeId,
  currencyCode,
  onApply,
  onRemove,
  appliedCode,
  appliedBalance,
}: GiftCardInputProps) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const normalized = code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12)

  const handleApply = async () => {
    if (normalized.length < 12) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/checkout/validate-gift-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: normalized, storeId }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Error al validar Gift Card')
        return
      }

      onApply(normalized, data.balance)
      setCode('')
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  if (appliedCode) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">💳</span>
            <div>
              <p className="text-xs font-semibold text-emerald-800">
                Gift Card aplicada
              </p>
              <code className="text-xs font-mono text-emerald-600 select-all">
                {appliedCode}
              </code>
            </div>
          </div>
          <button
            onClick={onRemove}
            className="text-xs font-medium text-rose-600 hover:text-rose-700 px-2 py-1 rounded-lg hover:bg-rose-50 transition-colors"
          >
            Quitar
          </button>
        </div>
        {appliedBalance !== null && (
          <p className="text-xs text-emerald-700 mt-1.5">
            Saldo disponible: {formatCurrency(appliedBalance, currencyCode)}
          </p>
        )}
      </div>
    )
  }

  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
        💳 Gift Card
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          value={normalized}
          onChange={(e) => { setCode(e.target.value); setError(null) }}
          onKeyDown={(e) => { if (e.key === 'Enter') handleApply() }}
          placeholder="GC..."
          maxLength={12}
          className="flex-1 px-4 py-3 text-[16px] font-mono uppercase tracking-wider border border-slate-200 rounded-xl focus:ring-2 focus:ring-[var(--primary)] outline-none text-slate-900 placeholder:text-slate-300"
        />
        <button
          onClick={handleApply}
          disabled={normalized.length < 12 || loading}
          className="px-4 py-3 bg-[var(--primary)] text-white rounded-xl text-sm font-semibold hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed native-press whitespace-nowrap"
        >
          {loading ? (
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </span>
          ) : (
            'Aplicar'
          )}
        </button>
      </div>
      {error && (
        <p className="text-xs text-rose-600 mt-1.5">{error}</p>
      )}
      <p className="text-[11px] text-slate-400 mt-1">
        Código de 12 caracteres que comienza con GC
      </p>
    </div>
  )
}
