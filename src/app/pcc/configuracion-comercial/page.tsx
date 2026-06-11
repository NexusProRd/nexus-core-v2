'use client'

import { useState, useEffect } from 'react'
import { formatCurrency } from '@/lib/utils'
import { ModalBokeh } from '@/components/pcc/BokehBackground'

interface PlanConfig {
  price: number
  limit: number
}

interface CommercialConfig {
  emprendedor: PlanConfig
  pro: PlanConfig
}

const PLAN_KEYS = {
  emprendedor: { price: 'plan_emprendedor_price', limit: 'plan_emprendedor_limit' },
  pro: { price: 'plan_pro_price', limit: 'plan_pro_limit' },
} as const

const DEFAULT_CONFIG: CommercialConfig = {
  emprendedor: { price: 380, limit: 15 },
  pro: { price: 900, limit: -1 },
}

export default function ConfiguracionComercialPage() {
  const [config, setConfig] = useState<CommercialConfig | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const currencyCode = 'DOP'
  const [editPlan, setEditPlan] = useState<'emprendedor' | 'pro' | null>(null)
  const [editPrice, setEditPrice] = useState(0)
  const [editLimit, setEditLimit] = useState(0)
  const [editIlimitado, setEditIlimitado] = useState(false)
  const [guardando, setGuardando] = useState(false)

  const cargar = async () => {
    try {
      const supabase = (await import('@/lib/supabase')).createClient()
      const claves = Object.values(PLAN_KEYS).flatMap(p => [p.price, p.limit])
      const { data, error: err } = await supabase.from('nexus_config').select('clave, valor').in('clave', claves)

      if (err) { setError('Error al cargar configuración'); return }

      const map = new Map(data?.map(r => [r.clave, r.valor]) ?? [])

      const parsed: CommercialConfig = {
        emprendedor: {
          price: Number(map.get(PLAN_KEYS.emprendedor.price)) || DEFAULT_CONFIG.emprendedor.price,
          limit: Number(map.get(PLAN_KEYS.emprendedor.limit)) || DEFAULT_CONFIG.emprendedor.limit,
        },
        pro: {
          price: Number(map.get(PLAN_KEYS.pro.price)) || DEFAULT_CONFIG.pro.price,
          limit: Number(map.get(PLAN_KEYS.pro.limit)) ?? DEFAULT_CONFIG.pro.limit,
        },
      }
      setConfig(parsed)
    } catch { setError('Error de conexión') }
    setCargando(false)
  }

  useEffect(() => { cargar() }, [])

  const abrirEdicion = (plan: 'emprendedor' | 'pro') => {
    if (!config) return
    setEditPlan(plan)
    setEditPrice(config[plan].price)
    setEditLimit(config[plan].limit)
    setEditIlimitado(config[plan].limit === -1)
    setError('')
  }

  const guardarPlan = async () => {
    if (!editPlan || !config) return
    if (editPrice <= 0) { setError('El precio debe ser mayor a 0'); return }
    if (!editIlimitado && editLimit <= 0) { setError('El límite debe ser mayor a 0 o -1 (ilimitado)'); return }
    if (!editIlimitado && editLimit > 100000) { setError('El límite máximo es 100,000'); return }

    const finalLimit = editIlimitado ? -1 : editLimit

    setGuardando(true)
    try {
      const supabase = (await import('@/lib/supabase')).createClient()
      const keys = PLAN_KEYS[editPlan]

      const { error: err1 } = await supabase.from('nexus_config').upsert(
        { clave: keys.price, valor: String(editPrice) },
        { onConflict: 'clave' }
      )
      if (err1) { setError('Error al guardar precio'); setGuardando(false); return }

      const { error: err2 } = await supabase.from('nexus_config').upsert(
        { clave: keys.limit, valor: String(finalLimit) },
        { onConflict: 'clave' }
      )
      if (err2) { setError('Error al guardar límite'); setGuardando(false); return }

      setEditPlan(null)
      await cargar()
    } catch { setError('Error de conexión') }
    setGuardando(false)
  }

  const PlanCard = ({ plan, label, color }: { plan: 'emprendedor' | 'pro'; label: string; color: string }) => {
    if (!config) return null
    const c = config[plan]
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 sm:p-6 border border-slate-200/60 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-${color}-100 flex items-center justify-center`}>
              <svg className={`w-5 h-5 text-${color}-600`} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Plan {label}</h3>
              <p className="text-xs text-slate-400">Configuración del plan</p>
            </div>
          </div>
          <button onClick={() => abrirEdicion(plan)}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-all shadow-sm">
            Editar
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl p-4 bg-slate-50 border border-slate-100">
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Precio mensual</p>
            <p className="text-2xl font-extrabold text-slate-900">{formatCurrency(c.price, currencyCode)}</p>
          </div>
          <div className="rounded-xl p-4 bg-slate-50 border border-slate-100">
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Límite productos</p>
            <p className="text-2xl font-extrabold text-slate-900">
              {c.limit === -1 ? '∞ Ilimitado' : c.limit}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6 sm:space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in-up">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Configuración Comercial</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Precios y límites de productos por plan</p>
        </div>
        <button onClick={cargar} disabled={cargando}
          className="px-4 py-2.5 bg-white/80 backdrop-blur-sm border border-slate-200/80 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 disabled:opacity-50 transition-all shadow-sm">
          {cargando ? 'Cargando...' : 'Refrescar'}
        </button>
      </header>

      {error && <div className="bg-rose-50/80 border border-rose-200/80 rounded-2xl p-4 text-sm font-medium text-rose-600">{error}</div>}

      {cargando ? (
        <div className="py-20 text-center text-sm text-slate-400">Cargando configuración comercial...</div>
      ) : config ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in-up delay-1">
          <PlanCard plan="emprendedor" label="Emprendedor" color="emerald" />
          <PlanCard plan="pro" label="Pro" color="indigo" />
        </div>
      ) : null}

      {/* Edit Modal */}
      {editPlan && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setEditPlan(null)}>
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-200/80 relative overflow-hidden" onClick={e => e.stopPropagation()}>
            <ModalBokeh />
            <div className="text-center mb-5 relative">
              <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-indigo-100 flex items-center justify-center">
                <svg className="w-7 h-7 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
              </div>
              <h3 className="text-lg font-bold text-slate-900">Plan {editPlan === 'emprendedor' ? 'Emprendedor' : 'Pro'}</h3>
              <p className="text-sm text-slate-500 mt-1">Configura precio y límite de productos</p>
            </div>
            <div className="space-y-4 relative">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Precio mensual (RD$)</label>
                <input type="number" min={1} value={editPrice}
                  onChange={e => setEditPrice(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-4 py-3 text-center text-2xl font-extrabold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Límite de productos</label>
                <input type="number" value={editIlimitado ? -1 : editLimit}
                  disabled={editIlimitado}
                  onChange={e => setEditLimit(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-3 text-center text-2xl font-extrabold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed" />
                <label className="flex items-center gap-2 mt-2 text-sm text-slate-600 cursor-pointer">
                  <input type="checkbox" checked={editIlimitado}
                    onChange={e => setEditIlimitado(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                  Productos ilimitados (-1)
                </label>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setEditPlan(null)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">Cancelar</button>
                <button onClick={guardarPlan} disabled={guardando}
                  className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm">
                  {guardando ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
