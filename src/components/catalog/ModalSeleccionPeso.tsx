'use client'

import { useState, useCallback } from 'react'
import { formatearPrecio } from '@/lib/utils'

const PRESET_LBS = [0.5, 1, 1.5, 2, 3]

interface Props {
  producto: { id: string; nombre: string; precio: number; precio_oferta?: number | null; imagen_url?: string | null }
  monedaSimbolo: string
  onConfirm: (peso_libras: number, modo_venta: 'libra') => void
  onClose: () => void
}

export default function ModalSeleccionPeso({ producto, monedaSimbolo, onConfirm, onClose }: Props) {
  const [tab, setTab] = useState<'peso' | 'dinero'>('peso')
  const [pesoInput, setPesoInput] = useState('1')
  const [dineroInput, setDineroInput] = useState('')

  const precioPorLibra = producto.precio_oferta ?? producto.precio

  const handlePesoConfirm = useCallback(() => {
    const lbs = parseFloat(pesoInput)
    if (!lbs || lbs <= 0) return
    onConfirm(lbs, 'libra')
  }, [pesoInput, onConfirm])

  const handleDineroConfirm = useCallback(() => {
    const pesos = parseFloat(dineroInput)
    if (!pesos || pesos <= 0) return
    const lbs = Math.round((pesos / precioPorLibra) * 100) / 100
    if (lbs <= 0) return
    onConfirm(lbs, 'libra')
  }, [dineroInput, precioPorLibra, onConfirm])

  const dineroCalculado = tab === 'peso' && parseFloat(pesoInput)
    ? parseFloat(pesoInput) * precioPorLibra
    : null
  const librasCalculadas = tab === 'dinero' && parseFloat(dineroInput)
    ? Math.round((parseFloat(dineroInput) / precioPorLibra) * 100) / 100
    : null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" />
      <div onClick={e => e.stopPropagation()} className="relative bg-white rounded-3xl rounded-b-none sm:rounded-3xl w-full max-w-sm shadow-2xl animate-in fade-in zoom-in-95 duration-300 overflow-hidden">
        <div className="p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900">Seleccionar cantidad</h3>
            <button onClick={onClose} className="w-7 h-7 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center hover:bg-slate-200 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <p className="text-sm font-semibold text-slate-800 mb-1">{producto.nombre}</p>
          <p className="text-xs text-slate-400 mb-4">{monedaSimbolo}{formatearPrecio(precioPorLibra)} / lb</p>

          {/* Tabs */}
          <div className="flex rounded-xl bg-slate-100 p-1 mb-4">
            <button onClick={() => setTab('peso')} className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${tab === 'peso' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              Por Peso
            </button>
            <button onClick={() => setTab('dinero')} className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${tab === 'dinero' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              Por Dinero
            </button>
          </div>

          {tab === 'peso' ? (
            <div className="space-y-3">
              <div className="grid grid-cols-5 gap-2">
                {PRESET_LBS.map(lbs => (
                  <button key={lbs} onClick={() => setPesoInput(String(lbs))} className={`py-2 rounded-lg text-sm font-semibold border transition-all ${pesoInput === String(lbs) ? 'bg-[var(--primary)] text-white border-[var(--primary)]' : 'bg-white text-slate-600 border-slate-200 hover:border-[var(--primary)] hover:text-[var(--primary)]'}`}>
                    {lbs} lb
                  </button>
                ))}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">O personaliza las libras</label>
                <input type="number" step="0.1" min="0.1" value={pesoInput} onChange={e => setPesoInput(e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-[var(--primary)] outline-none" />
              </div>
              {dineroCalculado !== null && (
                <p className="text-sm text-slate-500 text-center">
                  Equivalente a <span className="font-bold text-[var(--primary)]">{monedaSimbolo}{formatearPrecio(dineroCalculado)}</span>
                </p>
              )}
              <button onClick={handlePesoConfirm} disabled={!parseFloat(pesoInput) || parseFloat(pesoInput) <= 0} className="w-full py-2.5 bg-[var(--primary)] text-white font-bold rounded-xl text-sm hover:brightness-110 disabled:opacity-40 transition-all shadow-sm">
                Agregar {pesoInput} lb
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">¿Cuánto dinero quieres gastar?</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">{monedaSimbolo}</span>
                  <input type="number" step="1" min="1" value={dineroInput} onChange={e => setDineroInput(e.target.value)} placeholder="100" className="w-full pl-8 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-[var(--primary)] outline-none" />
                </div>
              </div>
              {librasCalculadas !== null && (
                <p className="text-sm text-slate-500 text-center">
                  Equivalente a <span className="font-bold text-emerald-600">{librasCalculadas} lb</span>
                </p>
              )}
              <button onClick={handleDineroConfirm} disabled={!parseFloat(dineroInput) || parseFloat(dineroInput) <= 0} className="w-full py-2.5 bg-[var(--primary)] text-white font-bold rounded-xl text-sm hover:brightness-110 disabled:opacity-40 transition-all shadow-sm">
                Agregar {dineroInput ? `${monedaSimbolo}${formatearPrecio(parseFloat(dineroInput))}` : ''}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}