'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase'

interface GiftCardRow {
  id: string
  code: string
  initial_value: number
  balance: number
  recipient_name: string | null
  status: string
  expires_at: string | null
  created_at: string
  original_gift_id: string | null
  gift_experiences: { gift_code: string } | null
}

const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
  active: { label: 'Activa', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  redeemed: { label: 'Canjeada', bg: 'bg-blue-100', text: 'text-blue-700' },
  expired: { label: 'Expirada', bg: 'bg-slate-100', text: 'text-slate-500' },
  cancelled: { label: 'Cancelada', bg: 'bg-red-100', text: 'text-red-700' },
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {})
}

export default function GiftCardsDashboard({ storeId }: { storeId: string }) {
  const [cards, setCards] = useState<GiftCardRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    const supabase = createClient()

    const fetchCards = async () => {
      const { data } = await supabase!
        .from('gift_cards')
        .select('*, gift_experiences!original_gift_id(gift_code)')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false })

      if (data) setCards(data as GiftCardRow[])
      setLoading(false)
    }

    fetchCards()

    const channel = supabase
      .channel('gift_cards_dashboard')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'gift_cards', filter: `store_id=eq.${storeId}` }, (payload) => {
        setCards((prev) => [payload.new as GiftCardRow, ...prev])
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'gift_cards', filter: `store_id=eq.${storeId}` }, (payload) => {
        const updated = payload.new as GiftCardRow
        setCards((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [storeId])

  const filtered = useMemo(() => {
    let result = cards

    if (statusFilter) {
      result = result.filter((c) => c.status === statusFilter)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (c) =>
          c.code.toLowerCase().includes(q) ||
          (c.recipient_name || '').toLowerCase().includes(q)
      )
    }

    return result
  }, [cards, search, statusFilter])

  const stats = useMemo(() => {
    const total = cards.length
    const active = cards.filter((c) => c.status === 'active').length
    const totalValue = cards.filter((c) => c.status === 'active').reduce((s, c) => s + Number(c.balance), 0)
    return { total, active, totalValue }
  }, [cards])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Total Gift Cards</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Activas</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.active}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Valor activo</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            RD$ {stats.totalValue.toLocaleString('es-DO', { minimumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          placeholder="Buscar por código o destinatario..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition-colors"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition-colors"
        >
          <option value="">Todos</option>
          <option value="active">Activas</option>
          <option value="redeemed">Canjeadas</option>
          <option value="expired">Expiradas</option>
          <option value="cancelled">Canceladas</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 rounded-2xl">
          <span className="text-5xl">💳</span>
          <p className="mt-3 text-slate-500 text-sm">
            {cards.length === 0 ? 'No hay Gift Cards aún' : 'Sin resultados'}
          </p>
        </div>
      ) : (
        <>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-medium text-slate-500">Código</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-500">Destinatario</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-500">Valor</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-500">Saldo</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-500">Estado</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-500">Expira</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-500">Gift origen</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-500"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((card) => (
                  <tr key={card.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4">
                      <code className="bg-slate-100 px-2 py-1 rounded text-xs font-mono text-slate-800 font-semibold select-all">
                        {card.code}
                      </code>
                    </td>
                    <td className="py-3 px-4 text-slate-700">{card.recipient_name || '—'}</td>
                    <td className="py-3 px-4 text-slate-700">RD$ {Number(card.initial_value).toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
                    <td className="py-3 px-4 text-slate-700">RD$ {Number(card.balance).toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig[card.status]?.bg || 'bg-slate-100'} ${statusConfig[card.status]?.text || 'text-slate-500'}`}>
                        {statusConfig[card.status]?.label || card.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-xs">
                      {card.expires_at
                        ? new Date(card.expires_at).toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric' })
                        : '—'}
                    </td>
                    <td className="py-3 px-4">
                      {card.gift_experiences?.gift_code ? (
                        <span className="text-xs font-mono text-slate-400">{card.gift_experiences.gift_code}</span>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => copyToClipboard(card.code)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium rounded-lg transition-colors"
                        title="Copiar código"
                      >
                        📋 Copiar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-3">
            {filtered.map((card) => (
              <div key={card.id} className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <code className="bg-slate-100 px-2 py-1 rounded text-xs font-mono text-slate-800 font-semibold select-all">
                      {card.code}
                    </code>
                    {card.recipient_name && (
                      <p className="text-sm text-slate-700 mt-1.5">{card.recipient_name}</p>
                    )}
                  </div>
                  <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${statusConfig[card.status]?.bg || 'bg-slate-100'} ${statusConfig[card.status]?.text || 'text-slate-500'}`}>
                    {statusConfig[card.status]?.label || card.status}
                  </span>
                </div>
                <div className="flex justify-between text-sm text-slate-500">
                  <span>Valor: <strong className="text-slate-700">RD$ {Number(card.initial_value).toLocaleString('es-DO', { minimumFractionDigits: 2 })}</strong></span>
                  <span>Saldo: <strong className="text-slate-700">RD$ {Number(card.balance).toLocaleString('es-DO', { minimumFractionDigits: 2 })}</strong></span>
                </div>
                {card.expires_at && (
                  <p className="text-xs text-slate-400 mt-2">
                    Expira: {new Date(card.expires_at).toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </p>
                )}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                  {card.gift_experiences?.gift_code ? (
                    <span className="text-xs text-slate-400">
                      Gift origen: <code className="font-mono">{card.gift_experiences.gift_code}</code>
                    </span>
                  ) : (
                    <span />
                  )}
                  <button
                    onClick={() => copyToClipboard(card.code)}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium rounded-lg transition-colors"
                  >
                    📋 Copiar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
