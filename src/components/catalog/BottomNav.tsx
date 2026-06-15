'use client'

import { useState, useEffect } from 'react'
import { useCart } from '@/context/CartContext'

export type TabId = 'inicio' | 'menu' | 'pedidos'

interface Props {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
}

export default function BottomNav({ activeTab, onTabChange }: Props) {
  const { totalItems, setIsOpen } = useCart()
  const [showRegalos, setShowRegalos] = useState(false)

  useEffect(() => {
    if (showRegalos) {
      const t = setTimeout(() => setShowRegalos(false), 4000)
      return () => clearTimeout(t)
    }
  }, [showRegalos])

  const baseClass = (tab: TabId) =>
    `flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all duration-200 ${
      activeTab === tab
        ? 'text-[var(--primary)] bg-[var(--primary)]/10 dark:bg-[var(--primary)]/20 font-semibold scale-[1.02]'
        : 'text-slate-400 dark:text-slate-500 hover:text-[var(--primary)] dark:hover:text-[var(--primary)] hover:bg-slate-100 dark:hover:bg-slate-800'
    }`

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/80 dark:bg-slate-950/90 backdrop-blur-2xl border-t border-slate-100 dark:border-slate-800 shadow-2xl will-change-transform" style={{ contain: 'layout style' }}>
      <div className="absolute -top-3 left-0 right-0 h-3 pointer-events-none" />
      <div className="max-w-lg mx-auto flex items-center justify-around px-1 pt-2 relative" style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom, 0px))' }}>
        {/* Inicio */}
        <button onClick={() => onTabChange('inicio')} className={`${baseClass('inicio')} relative touch-target native-press`}>
          {activeTab === 'inicio' && <span className="absolute -top-1 left-1/4 right-1/4 h-1 rounded-full bg-[var(--primary)] shadow-sm shadow-[var(--primary)]/30" />}
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className="text-[10px] font-semibold">Inicio</span>
        </button>

        {/* Productos */}
        <button onClick={() => onTabChange('menu')} className={`${baseClass('menu')} relative touch-target native-press`}>
          {activeTab === 'menu' && <span className="absolute -top-1 left-1/4 right-1/4 h-1 rounded-full bg-[var(--primary)] shadow-sm shadow-[var(--primary)]/30" />}
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <span className="text-[10px] font-semibold">Productos</span>
        </button>

        {/* Carrito — centro destacado FAB */}
        <div className="relative -mt-7 px-2 z-50" style={{ overflow: 'visible' }}>
          <button
            onClick={() => setIsOpen(true)}
            className="w-14 h-14 rounded-full bg-[var(--primary)] text-white shadow-xl shadow-[var(--primary)]/30 flex items-center justify-center hover:brightness-110 hover:shadow-[var(--primary)]/40 hover:scale-105 transition-all duration-200 active:scale-95 native-press"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </button>
          {totalItems > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-lg ring-2 ring-white dark:ring-slate-950">
              {totalItems > 9 ? '9+' : totalItems}
            </span>
          )}
        </div>

        {/* Rastrear */}
        <button onClick={() => onTabChange('pedidos')} className={`${baseClass('pedidos')} relative touch-target native-press`}>
          {activeTab === 'pedidos' && <span className="absolute -top-1 left-1/4 right-1/4 h-1 rounded-full bg-[var(--primary)] shadow-sm shadow-[var(--primary)]/30" />}
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <span className="text-[10px] font-semibold">Rastrear</span>
        </button>

        {/* Regalos (próximamente) */}
        <button onClick={() => setShowRegalos(true)} className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-slate-400 dark:text-slate-500 hover:text-[var(--primary)] dark:hover:text-[var(--primary)] hover:bg-slate-100 dark:hover:bg-slate-800 relative touch-target native-press transition-all duration-200">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
          </svg>
          <span className="text-[10px] font-semibold">Regalos</span>
          <span className="text-[8px] text-amber-500 font-medium -mt-0.5">Próximamente</span>
        </button>

      </div>

      {showRegalos && (
        <div className="fixed inset-0 z-50 flex items-end justify-center pb-24 px-4 pointer-events-none">
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 px-5 py-4 max-w-sm w-full pointer-events-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Regalos Corporativos</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Estamos trabajando para habilitar esta funcionalidad con la mayor brevedad posible.
                </p>
              </div>
              <button onClick={() => setShowRegalos(false)} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 -mr-1 -mt-1 p-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
