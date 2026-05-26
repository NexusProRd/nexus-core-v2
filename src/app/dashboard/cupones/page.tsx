'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { getTiendaIdFromCookie } from '@/lib/cookie-utils'

interface Cupon {
  id: string
  store_id: string
  code: string
  discount_type: 'percentage' | 'fixed'
  value: number
  min_purchase_amount: number
  usage_limit: number
  usage_count: number
  is_active: boolean
  created_at: string
}

export default function CuponesPage() {
  const [cupones, setCupones] = useState<Cupon[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [storeId, setStoreId] = useState<string | null>(null)
  const supabase = createClient()

  const [code, setCode] = useState('')
  const [value, setValue] = useState('')
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage')
  const [minPurchase, setMinPurchase] = useState('')
  const [usageLimit, setUsageLimit] = useState('')

  useEffect(() => { cargar() }, [])

  const cargar = async () => {
    const sessionId = await getTiendaIdFromCookie()
    if (!sessionId) { setLoading(false); return }
    setStoreId(sessionId)
    const res = await fetch('/api/cupones')
    if (!res.ok) { setLoading(false); return }
    const { data } = await res.json()
    setCupones((data || []) as Cupon[])
    setLoading(false)
  }

  const generarCodigo = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let c = ''
    for (let i = 0; i < 8; i++) c += chars.charAt(Math.floor(Math.random() * chars.length))
    setCode(c)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setError('')

    const val = parseFloat(value)
    const min = parseFloat(minPurchase) || 0
    const limit = parseInt(usageLimit) || 0

    if (!code.trim()) { setError('El código es obligatorio'); setSaving(false); return }
    if (val <= 0) { setError('El valor debe ser mayor a 0'); setSaving(false); return }
    if (discountType === 'percentage' && val > 100) { setError('El porcentaje no puede superar 100'); setSaving(false); return }
    if (min < 0) { setError('El monto mínimo no puede ser negativo'); setSaving(false); return }
    if (!storeId) { setError('Tienda no encontrada'); setSaving(false); return }

    const res = await fetch('/api/cupones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: code.trim().toUpperCase(),
        discount_type: discountType,
        value: val,
        min_purchase_amount: min,
        usage_limit: limit,
      }),
    })

    if (!res.ok) {
      const errData = await res.json()
      setError('Error al crear: ' + (errData.error || 'Error desconocido'))
    } else {
      setShowForm(false)
      setCode(''); setValue(''); setMinPurchase(''); setUsageLimit('')
      cargar()
    }
    setSaving(false)
  }

  const toggleActivo = async (cupon: Cupon) => {
    await fetch('/api/cupones', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: cupon.id, is_active: !cupon.is_active }),
    })
    cargar()
  }

  return (
    <div className="min-h-screen">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
          <Link href="/dashboard" className="text-[var(--primary)] hover:underline text-sm font-medium">← Volver al Dashboard</Link>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">Cupones de Descuento</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-4 sm:py-6 px-3 sm:px-6 lg:px-8">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-slate-500">{cupones.length} cupón(es)</p>
            <button onClick={() => setShowForm(!showForm)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--primary)] text-white text-sm font-medium rounded-xl hover:brightness-110 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              {showForm ? 'Cancelar' : 'Nuevo Cupón'}
            </button>
          </div>

          {showForm && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-4">Crear Cupón</h3>
              {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-2.5 rounded-xl text-sm mb-4">{error}</div>}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Código</label>
                  <div className="flex gap-2">
                    <input type="text" value={code} onChange={e => setCode(e.target.value.toUpperCase())} maxLength={20}
                      className="flex-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-[var(--primary)] outline-none uppercase" placeholder="VERANO2024" />
                    <button type="button" onClick={generarCodigo}
                      className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors">Generar</button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Valor</label>
                    <input type="number" step="0.01" value={value} onChange={e => setValue(e.target.value)} required
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-[var(--primary)] outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
                    <select value={discountType} onChange={e => setDiscountType(e.target.value as 'percentage' | 'fixed')}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-[var(--primary)] outline-none">
                      <option value="percentage">Porcentaje (%)</option>
                      <option value="fixed">Monto Fijo (RD$)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Compra Mínima</label>
                    <input type="number" step="0.01" value={minPurchase} onChange={e => setMinPurchase(e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-[var(--primary)] outline-none" placeholder="0 = sin mínimo" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Límite de Usos</label>
                    <input type="number" value={usageLimit} onChange={e => setUsageLimit(e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-[var(--primary)] outline-none" placeholder="0 = ilimitado" />
                  </div>
                </div>

                <button type="submit" disabled={saving}
                  className="w-full py-2.5 bg-[var(--primary)] text-white font-medium rounded-xl hover:brightness-110 transition-colors disabled:opacity-50 text-sm">
                  {saving ? 'Creando...' : 'Crear Cupón'}
                </button>
              </form>
            </div>
          )}

          {loading ? (
            <p className="text-sm text-slate-400 text-center py-8">Cargando...</p>
          ) : cupones.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-slate-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <p className="text-sm text-slate-500">No hay cupones creados</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cupones.map(c => (
                <div key={c.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-900 font-mono">{c.code}</span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${c.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {c.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                      <div className="flex gap-3 mt-1.5 text-xs text-slate-500 flex-wrap">
                        <span className="font-semibold text-[var(--primary)]">
                          {c.discount_type === 'percentage' ? `${c.value}% OFF` : `RD$${c.value.toFixed(2)} OFF`}
                        </span>
                        {c.min_purchase_amount > 0 && <span>Mín: RD${c.min_purchase_amount.toFixed(2)}</span>}
                        <span>Usos: {c.usage_count || 0}{c.usage_limit > 0 ? `/${c.usage_limit}` : ''}</span>
                      </div>
                    </div>
                    <button onClick={() => toggleActivo(c)}
                      className={`relative w-9 h-4.5 rounded-full transition-colors shrink-0 ${c.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                      <span className={`absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full shadow transition-transform ${c.is_active ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
