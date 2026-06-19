'use client'

import { useState } from 'react'
import Link from 'next/link'

interface ResultData {
  code: string
  balance: number
  initial_value: number
  status: string
  expires_at: string | null
  usable: boolean
}

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  active: { label: 'Activa', className: 'bg-green-100 text-green-700' },
  redeemed: { label: 'Canjeada', className: 'bg-blue-100 text-blue-700' },
  expired: { label: 'Expirada', className: 'bg-amber-100 text-amber-700' },
  cancelled: { label: 'Cancelada', className: 'bg-red-100 text-red-700' },
}

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_MAP[status] || { label: status, className: 'bg-slate-100 text-slate-600' }
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${c.className}`}>
      {c.label}
    </span>
  )
}

interface Props {
  storeId: string
  storeName: string
  logoUrl: string | null
  colorPrimario: string
  whatsappNumber: string | null
}

export default function GiftCardConsultaClient({
  storeId, storeName, logoUrl, colorPrimario, whatsappNumber,
}: Props) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ResultData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/gift-card/consulta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Error al consultar Gift Card')
        return
      }

      setResult(data)
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('es-DO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  function isExpired(dateStr: string): boolean {
    return new Date(dateStr) < new Date()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="text-center mb-8">
          {logoUrl && (
            <img src={logoUrl} alt="" className="w-16 h-16 rounded-xl mx-auto mb-3 object-cover ring-2 ring-slate-200" />
          )}
          <h1 className="text-xl font-bold text-slate-900">{storeName}</h1>
          <p className="text-sm text-slate-500 mt-1">Consulta tu Gift Card</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Código de Gift Card
          </label>
          <input
            type="text"
            value={code}
            onChange={e => setCode(e.target.value)}
            placeholder="GCXXXXXXXXXX"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-center font-mono text-lg tracking-widest focus:outline-none focus:ring-2 transition-all"
            style={{ '--tw-ring-color': colorPrimario } as React.CSSProperties}
            maxLength={12}
            autoFocus
          />
          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="w-full mt-4 py-3 rounded-xl text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
            style={{ backgroundColor: colorPrimario }}
          >
            {loading ? 'Consultando...' : 'Consultar'}
          </button>
        </form>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
            <p className="text-sm text-red-700 text-center">{error}</p>
          </div>
        )}

        {result && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="text-center mb-4">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Código</span>
              <p className="text-lg font-mono font-bold text-slate-900 mt-1 select-all tracking-wider">{result.code}</p>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-sm text-slate-500">Estado</span>
                <StatusBadge status={result.status} />
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-sm text-slate-500">Saldo disponible</span>
                <span className="text-lg font-bold text-slate-900">RD$ {result.balance.toFixed(2)}</span>
              </div>
              {result.status !== 'cancelled' && (
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-sm text-slate-500">Valor inicial</span>
                  <span className="text-sm text-slate-700">RD$ {result.initial_value.toFixed(2)}</span>
                </div>
              )}
              {result.expires_at && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-slate-500">Vence</span>
                  <span className={`text-sm ${isExpired(result.expires_at) ? 'text-red-500' : 'text-slate-700'}`}>
                    {formatDate(result.expires_at)}
                  </span>
                </div>
              )}
            </div>

            {result.status === 'cancelled' && (
              <div className="mt-4 p-3 bg-red-50 rounded-xl text-center">
                <p className="text-sm font-medium text-red-700">Gift Card cancelada</p>
              </div>
            )}
          </div>
        )}

        <div className="text-center mt-6 space-y-2">
          <Link href={`/catalogo/${storeId}`} className="block text-sm text-slate-400 hover:text-slate-600 underline">
            Volver al catálogo
          </Link>
          {whatsappNumber && (
            <a
              href={`https://wa.me/${whatsappNumber.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-sm text-emerald-600 hover:text-emerald-700 underline"
            >
              Contactar por WhatsApp
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
