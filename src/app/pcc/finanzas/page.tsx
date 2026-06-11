'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'
import { ModalBokeh } from '@/components/pcc/BokehBackground'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'

interface OtroIngreso {
  id: string; concepto: string; monto: number; creado_at: string
}
interface Gasto {
  id: string; tipo: string; concepto: string; monto: number; periodicidad: string; created_at: string
}
interface FinanzasData {
  config: { precioServicio: number }
  resumen: { mrr: number; activas: number; tokensEsteMes: number; ingresoToken: number; totalOtros: number; totalIngresos: number }
  otrosIngresos: OtroIngreso[]
  pagosPendientes: { cantidad: number; totalPendiente: number; tiendas: { id: string; nombre?: string; plan: string; vence: string; precio: number; vencida: boolean }[] }
}
interface HistorialItem {
  fecha: string; ventas: number; tokens: number; otros: number; gastos: number; ingresos: number; neto: number
}

const COLORS = { ventas: '#6366f1', tokens: '#f59e0b', otros: '#10b981', gastos: '#ef4444', neto: '#8b5cf6' }

export default function FinanzasPage() {
  const [data, setData] = useState<FinanzasData | null>(null)
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [historial, setHistorial] = useState<HistorialItem[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [precioModal, setPrecioModal] = useState(false)
  const [nuevoPrecio, setNuevoPrecio] = useState(49)
  const [guardando, setGuardando] = useState(false)
  const [otroConcepto, setOtroConcepto] = useState('')
  const [otroMonto, setOtroMonto] = useState('')
  const [guardandoOtro, setGuardandoOtro] = useState(false)
  const [periodo, setPeriodo] = useState<'semanal' | 'mensual' | 'anual'>('mensual')
  const currencyCode = 'DOP'

  const [gastoConcepto, setGastoConcepto] = useState('')
  const [gastoMonto, setGastoMonto] = useState('')
  const [gastoTipo, setGastoTipo] = useState<'fijo' | 'variable'>('variable')
  const [gastoPeriodicidad, setGastoPeriodicidad] = useState<'mensual' | 'unico'>('unico')
  const [guardandoGasto, setGuardandoGasto] = useState(false)

  const cargar = useCallback(async () => {
    try {
      const [resFin, resGastos, resHist] = await Promise.all([
        fetch('/api/pcc/finanzas'),
        fetch('/api/pcc/gastos'),
        fetch(`/api/pcc/finanzas/historial?periodo=${periodo}`),
      ])
      if (resFin.ok) {
        const json = await resFin.json()
        setData(json)
        setNuevoPrecio(json.config?.precioServicio || 49)
      } else setError('Error al cargar datos financieros')
      if (resGastos.ok) {
        const json = await resGastos.json()
        setGastos(json.data || [])
      }
      if (resHist.ok) {
        const json = await resHist.json()
        setHistorial(json.data || [])
      }
    } catch { setError('Error de conexión') }
    setCargando(false)
  }, [periodo])

  useEffect(() => { cargar() }, [cargar])

  const guardarPrecio = async () => {
    setGuardando(true)
    try {
      const supabase = (await import('@/lib/supabase')).createClient()
      await supabase.from('nexus_config').upsert({ clave: 'precio_servicio', valor: String(nuevoPrecio) }, { onConflict: 'clave' })
      setPrecioModal(false); cargar()
    } catch { setError('Error al guardar') }
    setGuardando(false)
  }

  const registrarOtroIngreso = async () => {
    if (!otroConcepto.trim() || !otroMonto) return
    setGuardandoOtro(true)
    try {
      const res = await fetch('/api/pcc/finanzas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ concepto: otroConcepto.trim(), monto: Number(otroMonto) }) })
      if (res.ok) { setOtroConcepto(''); setOtroMonto(''); cargar() }
      else setError('Error al registrar ingreso')
    } catch { setError('Error de conexión') }
    setGuardandoOtro(false)
  }

  const eliminarOtroIngreso = async (id: string) => {
    if (!confirm('¿Eliminar este ingreso?')) return
    try { await fetch('/api/pcc/finanzas', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }); cargar() }
    catch { setError('Error al eliminar') }
  }

  const agregarGasto = async () => {
    if (!gastoConcepto.trim() || !gastoMonto) return
    setGuardandoGasto(true)
    try {
      const res = await fetch('/api/pcc/gastos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: gastoTipo, concepto: gastoConcepto.trim(), monto: Number(gastoMonto), periodicidad: gastoPeriodicidad }) })
      if (res.ok) { setGastoConcepto(''); setGastoMonto(''); cargar() }
      else { const j = await res.json(); setError(j.error || 'Error al registrar gasto') }
    } catch { setError('Error de conexión') }
    setGuardandoGasto(false)
  }

  const eliminarGasto = async (id: string) => {
    if (!confirm('¿Eliminar este gasto?')) return
    try { await fetch('/api/pcc/gastos', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }); cargar() }
    catch { setError('Error al eliminar') }
  }

  const gastosFijos = gastos.filter(g => g.tipo === 'fijo')
  const gastosVariables = gastos.filter(g => g.tipo === 'variable')
  const totalGastosFijos = gastosFijos.reduce((s, g) => s + Number(g.monto), 0)
  const totalGastosVariables = gastosVariables.reduce((s, g) => s + Number(g.monto), 0)
  const totalGastos = totalGastosFijos + totalGastosVariables

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6 sm:space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in-up">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Dashboard Financiero</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">MRR, ingresos, gastos, y ganancia neta</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setPrecioModal(true)}
            className="px-4 py-2.5 bg-white/80 backdrop-blur-sm border border-slate-200/80 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-all shadow-sm">
            ⚙️ Precio Servicio
          </button>
          <button onClick={cargar} disabled={cargando}
            className="px-4 py-2.5 bg-white/80 backdrop-blur-sm border border-slate-200/80 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 disabled:opacity-50 transition-all shadow-sm">
            {cargando ? 'Cargando...' : 'Refrescar'}
          </button>
        </div>
      </header>

      {error && <div className="bg-rose-50/80 border border-rose-200/80 rounded-2xl p-4 text-sm font-medium text-rose-600">{error}</div>}

      {cargando ? (
        <div className="py-20 text-center text-sm text-slate-400">Cargando datos financieros...</div>
      ) : data ? (
        <>
          {/* ─── Resumen de Ingresos y Gastos ─── */}
          <section className="animate-fade-in-up delay-1">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 sm:p-6 border border-slate-200/60 shadow-sm">
              <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Resumen Financiero
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-4">
                <div className="bg-indigo-50/70 rounded-xl p-4 border border-indigo-100/60">
                  <p className="text-xs text-indigo-500 font-semibold uppercase tracking-wider">MRR</p>
                  <p className="text-xl font-extrabold text-indigo-900 mt-1">{formatCurrency(data.resumen.mrr, currencyCode)}</p>
                  <p className="text-xs text-indigo-400 mt-0.5">{data.resumen.activas} tiendas</p>
                </div>
                <div className="bg-amber-50/70 rounded-xl p-4 border border-amber-100/60">
                  <p className="text-xs text-amber-500 font-semibold uppercase tracking-wider">Tokens</p>
                  <p className="text-xl font-extrabold text-amber-900 mt-1">{formatCurrency(data.resumen.ingresoToken, currencyCode)}</p>
                  <p className="text-xs text-amber-400 mt-0.5">{data.resumen.tokensEsteMes} tok.</p>
                </div>
                <div className="bg-emerald-50/70 rounded-xl p-4 border border-emerald-100/60">
                  <p className="text-xs text-emerald-500 font-semibold uppercase tracking-wider">Otros</p>
                  <p className="text-xl font-extrabold text-emerald-900 mt-1">{formatCurrency(data.resumen.totalOtros, currencyCode)}</p>
                  <p className="text-xs text-emerald-400 mt-0.5">Manuales</p>
                </div>
                <div className="bg-rose-50/70 rounded-xl p-4 border border-rose-100/60">
                  <p className="text-xs text-rose-500 font-semibold uppercase tracking-wider">Gastos</p>
                  <p className="text-xl font-extrabold text-rose-900 mt-1">{formatCurrency(totalGastos, currencyCode)}</p>
                  <p className="text-xs text-rose-400 mt-0.5">{gastos.length} registro(s)</p>
                </div>
                <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Ganancia Neta</p>
                  <p className="text-xl font-extrabold text-white mt-1">{formatCurrency(data.resumen.totalIngresos - totalGastos, currencyCode)}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Ingresos − Gastos</p>
                </div>
              </div>
            </div>
          </section>

          {/* ─── Gráficos ─── */}
          <section className="animate-fade-in-up delay-1">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 sm:p-6 border border-slate-200/60 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                  Historial de Ingresos
                </h2>
                <div className="flex bg-slate-100 rounded-xl p-0.5 gap-0.5">
                  {(['semanal', 'mensual', 'anual'] as const).map(p => (
                    <button key={p} onClick={() => setPeriodo(p)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${periodo === p ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                      {p === 'semanal' ? 'Semanal' : p === 'mensual' ? 'Mensual' : 'Anual'}
                    </button>
                  ))}
                </div>
              </div>
              {historial.length > 0 ? (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={historial}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="fecha" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                      <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px' }} />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                      <Bar dataKey="ventas" name="Ventas" fill={COLORS.ventas} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="tokens" name="Tokens" fill={COLORS.tokens} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="otros" name="Otros" fill={COLORS.otros} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="gastos" name="Gastos" fill={COLORS.gastos} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-slate-400 text-center py-10">No hay datos históricos para este período</p>
              )}
            </div>
          </section>

          {/* ─── Gastos ─── */}
          <section className="animate-fade-in-up delay-2">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 sm:p-6 border border-slate-200/60 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <svg className="w-4 h-4 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                Gastos
                <span className="ml-auto text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">{formatCurrency(totalGastos, currencyCode)}/mes</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-rose-50/50 rounded-xl p-4 border border-rose-100/60">
                  <p className="text-xs font-bold text-rose-600 uppercase tracking-wider">Fijos</p>
                  <p className="text-lg font-extrabold text-rose-900 mt-1">{formatCurrency(totalGastosFijos, currencyCode)}</p>
                  <p className="text-xs text-rose-400">{gastosFijos.length} registro(s)</p>
                </div>
                <div className="bg-amber-50/50 rounded-xl p-4 border border-amber-100/60">
                  <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">Variables</p>
                  <p className="text-lg font-extrabold text-amber-900 mt-1">{formatCurrency(totalGastosVariables, currencyCode)}</p>
                  <p className="text-xs text-amber-400">{gastosVariables.length} registro(s)</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <select value={gastoTipo} onChange={e => setGastoTipo(e.target.value as 'fijo' | 'variable')}
                  className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:ring-2 focus:ring-rose-400 outline-none">
                  <option value="variable">Variable</option>
                  <option value="fijo">Fijo</option>
                </select>
                <input value={gastoConcepto} onChange={e => setGastoConcepto(e.target.value)}
                  placeholder="Concepto (ej: Renta local)"
                  className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-rose-400 outline-none" />
                <input value={gastoMonto} onChange={e => setGastoMonto(e.target.value)}
                  type="number" min={1} placeholder="Monto RD$"
                  className="w-full sm:w-32 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-rose-400 outline-none" />
                <select value={gastoPeriodicidad} onChange={e => setGastoPeriodicidad(e.target.value as 'mensual' | 'unico')}
                  className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:ring-2 focus:ring-rose-400 outline-none">
                  <option value="unico">Único</option>
                  <option value="mensual">Mensual</option>
                </select>
                <button onClick={agregarGasto} disabled={guardandoGasto || !gastoConcepto.trim() || !gastoMonto}
                  className="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold rounded-xl disabled:opacity-50 transition-all shadow-sm">
                  {guardandoGasto ? 'Guardando...' : 'Agregar'}
                </button>
              </div>

              {gastos.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {gastos.map(g => (
                    <div key={g.id} className="flex items-center justify-between py-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${g.tipo === 'fijo' ? 'bg-rose-400' : 'bg-amber-400'}`} />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{g.concepto}</p>
                          <p className="text-xs text-slate-400">{g.tipo === 'fijo' ? 'Fijo' : 'Variable'} · {g.periodicidad === 'mensual' ? 'Mensual' : 'Único'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        <p className="text-sm font-bold text-rose-600">{formatCurrency(g.monto, currencyCode)}</p>
                        <button onClick={() => eliminarGasto(g.id)}
                          className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 text-center py-4">No hay gastos registrados</p>
              )}
            </div>
          </section>

          {/* ─── Otros Ingresos ─── */}
          <section className="animate-fade-in-up delay-2">
            <h2 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Otros Ingresos
              {data.resumen.totalOtros > 0 && <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full ml-auto">{formatCurrency(data.resumen.totalOtros, currencyCode)}</span>}
            </h2>
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-sm p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <input value={otroConcepto} onChange={e => setOtroConcepto(e.target.value)} placeholder="Concepto"
                  className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-emerald-400 outline-none" />
                <input value={otroMonto} onChange={e => setOtroMonto(e.target.value)} type="number" min={1} placeholder="Monto RD$"
                  className="w-full sm:w-40 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-emerald-400 outline-none" />
                <button onClick={registrarOtroIngreso} disabled={guardandoOtro || !otroConcepto.trim() || !otroMonto}
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold rounded-xl disabled:opacity-50 transition-all shadow-sm">
                  {guardandoOtro ? 'Guardando...' : 'Agregar'}
                </button>
              </div>
              {data.otrosIngresos.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {data.otrosIngresos.map(i => (
                    <div key={i.id} className="flex items-center justify-between py-2.5">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{i.concepto}</p>
                        <p className="text-xs text-slate-400">{new Date(i.creado_at).toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        <p className="text-sm font-bold text-emerald-600">{formatCurrency(i.monto, currencyCode)}</p>
                        <button onClick={() => eliminarOtroIngreso(i.id)} className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 text-center py-4">No hay otros ingresos registrados</p>
              )}
            </div>
          </section>

          {/* ─── Pagos Pendientes ─── */}
          <section className="animate-fade-in-up delay-3">
            <h2 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Pagos Pendientes ({data.pagosPendientes.cantidad})
            </h2>
            {data.pagosPendientes.tiendas.length > 0 ? (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                  <p className="text-sm text-slate-500 font-medium">Total pendiente por cobrar</p>
                  <p className="text-lg font-extrabold text-amber-600">{formatCurrency(data.pagosPendientes.totalPendiente, currencyCode)}</p>
                </div>
                <div className="divide-y divide-slate-100">
                  {data.pagosPendientes.tiendas.map(t => (
                    <div key={t.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className={`w-2 h-2 rounded-full ${t.vencida ? 'bg-rose-500' : 'bg-amber-400'}`} />
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{t.nombre || t.id.slice(0, 8)}</p>
                          <p className="text-xs text-slate-400">{t.vencida ? 'Vencida' : 'Por vencer'} · {new Date(t.vence).toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-400">{t.plan}</p>
                        <p className="text-sm font-bold text-slate-700">{formatCurrency(t.precio, currencyCode)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 text-center border border-slate-200/60 shadow-sm">
                <p className="text-sm text-slate-400">No hay pagos pendientes</p>
                <p className="text-xs text-slate-300 mt-1">Todas las suscripciones están al día</p>
              </div>
            )}
          </section>
        </>
      ) : null}

      {/* ─── Precio Modal ─── */}
      {precioModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setPrecioModal(false)}>
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-200/80 relative overflow-hidden" onClick={e => e.stopPropagation()}>
            <ModalBokeh />
            <div className="text-center mb-5 relative">
              <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-indigo-100 flex items-center justify-center">
                <svg className="w-7 h-7 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <h3 className="text-lg font-bold text-slate-900">Precio del Servicio</h3>
              <p className="text-sm text-slate-500 mt-1">Define cuánto cobrarás por tienda al mes</p>
            </div>
            <div className="space-y-4 relative">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Precio mensual (RD$)</label>
                <input type="number" min={1} value={nuevoPrecio}
                  onChange={e => setNuevoPrecio(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-4 py-3 text-center text-2xl font-extrabold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setPrecioModal(false)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">Cancelar</button>
                <button onClick={guardarPrecio} disabled={guardando}
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
