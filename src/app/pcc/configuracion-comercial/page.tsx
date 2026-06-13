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

  // ── Payment Methods ──
  interface BankAccount {
    id: string
    banco: string
    titular: string
    tipo_cuenta: string
    numero_cuenta: string
    moneda: string
    activo: boolean
  }

  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [paypalEmail, setPaypalEmail] = useState('')
  const [paypalActivo, setPaypalActivo] = useState(false)
  const [cargandoPagos, setCargandoPagos] = useState(true)
  const [guardandoPagos, setGuardandoPagos] = useState(false)
  const [showAccountModal, setShowAccountModal] = useState(false)
  const [editAccountId, setEditAccountId] = useState<string | null>(null)
  const [formBanco, setFormBanco] = useState('')
  const [formTitular, setFormTitular] = useState('')
  const [formTipo, setFormTipo] = useState('Ahorros')
  const [formNumero, setFormNumero] = useState('')
  const [formMoneda, setFormMoneda] = useState('DOP')
  const [formActivo, setFormActivo] = useState(true)
  const [errorPagos, setErrorPagos] = useState('')

  const cargarPagos = async () => {
    try {
      const supabase = (await import('@/lib/supabase')).createClient()
      const { data } = await supabase.from('nexus_config').select('clave, valor').in('clave', ['bank_accounts', 'paypal_email', 'paypal_activo'])
      const map = new Map(data?.map(r => [r.clave, r.valor]) ?? [])
      const raw = map.get('bank_accounts')
      if (raw) { try { setBankAccounts(JSON.parse(raw)) } catch { setBankAccounts([]) } }
      setPaypalEmail(map.get('paypal_email') || '')
      setPaypalActivo(map.get('paypal_activo') === 'true')
    } catch { setErrorPagos('Error al cargar métodos de pago') }
    setCargandoPagos(false)
  }

  useEffect(() => { cargarPagos() }, [])

  const guardarBankAccounts = async (cuentas: BankAccount[]) => {
    try {
      const supabase = (await import('@/lib/supabase')).createClient()
      await supabase.from('nexus_config').upsert({ clave: 'bank_accounts', valor: JSON.stringify(cuentas) }, { onConflict: 'clave' })
    } catch { setErrorPagos('Error al guardar cuentas bancarias') }
  }

  const abrirNuevaCuenta = () => {
    setEditAccountId(null)
    setFormBanco('')
    setFormTitular('')
    setFormTipo('Ahorros')
    setFormNumero('')
    setFormMoneda('DOP')
    setFormActivo(true)
    setErrorPagos('')
    setShowAccountModal(true)
  }

  const abrirEditarCuenta = (acc: BankAccount) => {
    setEditAccountId(acc.id)
    setFormBanco(acc.banco)
    setFormTitular(acc.titular)
    setFormTipo(acc.tipo_cuenta)
    setFormNumero(acc.numero_cuenta)
    setFormMoneda(acc.moneda)
    setFormActivo(acc.activo)
    setErrorPagos('')
    setShowAccountModal(true)
  }

  const guardarCuenta = async () => {
    if (!formBanco.trim() || !formTitular.trim() || !formNumero.trim()) {
      setErrorPagos('Todos los campos son obligatorios'); return
    }
    let nuevas: BankAccount[]
    if (editAccountId) {
      nuevas = bankAccounts.map(a => a.id === editAccountId ? { ...a, banco: formBanco, titular: formTitular, tipo_cuenta: formTipo, numero_cuenta: formNumero, moneda: formMoneda, activo: formActivo } : a)
    } else {
      nuevas = [...bankAccounts, { id: `acc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, banco: formBanco, titular: formTitular, tipo_cuenta: formTipo, numero_cuenta: formNumero, moneda: formMoneda, activo: formActivo }]
    }
    setBankAccounts(nuevas)
    setShowAccountModal(false)
    setErrorPagos('')
    await guardarBankAccounts(nuevas)
  }

  const eliminarCuenta = async (id: string) => {
    const nuevas = bankAccounts.filter(a => a.id !== id)
    setBankAccounts(nuevas)
    await guardarBankAccounts(nuevas)
  }

  const toggleActivoCuenta = async (id: string) => {
    const nuevas = bankAccounts.map(a => a.id === id ? { ...a, activo: !a.activo } : a)
    setBankAccounts(nuevas)
    await guardarBankAccounts(nuevas)
  }

  const guardarPayPal = async () => {
    setGuardandoPagos(true)
    setErrorPagos('')
    try {
      const supabase = (await import('@/lib/supabase')).createClient()
      await supabase.from('nexus_config').upsert({ clave: 'paypal_email', valor: paypalEmail }, { onConflict: 'clave' })
      await supabase.from('nexus_config').upsert({ clave: 'paypal_activo', valor: paypalActivo ? 'true' : 'false' }, { onConflict: 'clave' })
    } catch { setErrorPagos('Error al guardar PayPal') }
    setGuardandoPagos(false)
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

      {/* ── Métodos de Cobro ── */}
      <div className="pt-8 border-t border-slate-200/60 animate-fade-in-up delay-2">
        <header className="mb-6">
          <h2 className="text-lg font-extrabold text-slate-900">Métodos de Cobro</h2>
          <p className="text-sm text-slate-500 mt-1">Configura las cuentas bancarias y métodos de pago para suscripciones</p>
        </header>

        {errorPagos && <div className="mb-4 bg-rose-50/80 border border-rose-200/80 rounded-2xl p-4 text-sm font-medium text-rose-600">{errorPagos}</div>}

        {/* Block A: Transferencias Bancarias */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 sm:p-6 border border-slate-200/60 shadow-sm mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Transferencias Bancarias</h3>
                <p className="text-xs text-slate-400">Cuentas para que los comercios realicen pagos de suscripción</p>
              </div>
            </div>
            {!cargandoPagos && (
              <button onClick={abrirNuevaCuenta}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-all shadow-sm">
                + Agregar
              </button>
            )}
          </div>

          {cargandoPagos ? (
            <div className="py-8 text-center text-sm text-slate-400">Cargando cuentas bancarias...</div>
          ) : bankAccounts.length === 0 ? (
            <div className="py-8 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <p className="text-sm text-slate-400 font-medium">No hay cuentas bancarias configuradas</p>
              <button onClick={abrirNuevaCuenta} className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-semibold">Agregar primera cuenta</button>
            </div>
          ) : (
            <div className="space-y-3">
              {bankAccounts.map(acc => (
                <div key={acc.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200 transition-all">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-900">{acc.banco}</span>
                      {acc.activo ? (
                        <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium border border-emerald-200">Activa</span>
                      ) : (
                        <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium border border-slate-200">Inactiva</span>
                      )}
                      <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium border border-slate-200">{acc.moneda}</span>
                    </div>
                    <p className="text-sm text-slate-500 mt-1 truncate">{acc.titular} · {acc.tipo_cuenta} · {acc.numero_cuenta}</p>
                  </div>
                  <div className="flex items-center gap-1.5 ml-3 shrink-0">
                    <button onClick={() => toggleActivoCuenta(acc.id)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${acc.activo ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'}`}>
                      {acc.activo ? 'Desactivar' : 'Activar'}
                    </button>
                    <button onClick={() => abrirEditarCuenta(acc)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all">
                      Editar
                    </button>
                    <button onClick={() => eliminarCuenta(acc.id)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 transition-all">
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Block B: PayPal */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 sm:p-6 border border-slate-200/60 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">PayPal</h3>
              <p className="text-xs text-slate-400">Correo electrónico para recibir pagos vía PayPal</p>
            </div>
            {!paypalActivo && (
              <span className="ml-auto text-xs bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full font-medium border border-amber-200">Próximamente</span>
            )}
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Correo electrónico de PayPal</label>
              <input type="email" value={paypalEmail}
                onChange={e => setPaypalEmail(e.target.value)}
                placeholder="pagos@ejemplo.com"
                className="w-full px-4 py-3 text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-700">Activar PayPal</p>
                <p className="text-xs text-slate-400">Habilitar como método de pago para suscripciones</p>
              </div>
              <button onClick={() => setPaypalActivo(!paypalActivo)}
                className={`relative w-12 h-6 rounded-full transition-colors ${paypalActivo ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${paypalActivo ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>
            <button onClick={guardarPayPal} disabled={guardandoPagos}
              className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-sm">
              {guardandoPagos ? 'Guardando...' : 'Guardar PayPal'}
            </button>
          </div>
        </div>
      </div>

      {/* Account Modal */}
      {showAccountModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowAccountModal(false)}>
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-200/80 relative overflow-hidden" onClick={e => e.stopPropagation()}>
            <ModalBokeh />
            <div className="text-center mb-5 relative">
              <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-blue-100 flex items-center justify-center">
                <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-900">{editAccountId ? 'Editar Cuenta' : 'Agregar Cuenta'}</h3>
              <p className="text-sm text-slate-500 mt-1">Datos de la cuenta bancaria</p>
            </div>
            <div className="space-y-4 relative">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Banco</label>
                <input type="text" value={formBanco} onChange={e => setFormBanco(e.target.value)}
                  placeholder="Ej: Banco Popular"
                  className="w-full px-4 py-3 text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Titular</label>
                <input type="text" value={formTitular} onChange={e => setFormTitular(e.target.value)}
                  placeholder="Nombre del titular"
                  className="w-full px-4 py-3 text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Tipo</label>
                  <select value={formTipo} onChange={e => setFormTipo(e.target.value)}
                    className="w-full px-4 py-3 text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="Ahorros">Ahorros</option>
                    <option value="Corriente">Corriente</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Moneda</label>
                  <select value={formMoneda} onChange={e => setFormMoneda(e.target.value)}
                    className="w-full px-4 py-3 text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="DOP">DOP</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Número de Cuenta</label>
                <input type="text" value={formNumero} onChange={e => setFormNumero(e.target.value)}
                  placeholder="Número de cuenta"
                  className="w-full px-4 py-3 text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">Cuenta activa</span>
                <button onClick={() => setFormActivo(!formActivo)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${formActivo ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${formActivo ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowAccountModal(false)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">Cancelar</button>
                <button onClick={guardarCuenta}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm">
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
