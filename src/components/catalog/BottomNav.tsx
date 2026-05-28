'use client'

import { useCart } from '@/context/CartContext'

export type TabId = 'inicio' | 'menu' | 'pedidos' | 'tickets'

interface Props {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
}

export default function BottomNav({ activeTab, onTabChange }: Props) {
  const { totalItems, setIsOpen } = useCart()

  const baseClass = (tab: TabId) =>
    `flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-all ${
      activeTab === tab
        ? 'text-[var(--primary)] bg-[var(--primary)]/5'
        : 'text-slate-400 hover:text-[var(--primary)] hover:bg-slate-100'
    }`

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-2xl border-t border-slate-100 elevation-4 will-change-transform" style={{ contain: 'layout style' }}>
      {/* FLOATING CART FIX: Extra spacer so the FAB never clips */}
      <div className="absolute -top-3 left-0 right-0 h-3 pointer-events-none" />
      {/* MOBILE EXPERIENCE PASS: Touch-friendly tabs with min 44px targets, active indicator, safe area */}
      <div className="max-w-lg mx-auto flex items-center justify-around px-1 pt-2 relative" style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom, 0px))' }}>
        {/* MOTION SYSTEM PASS: Tab indicator with spring easing */}
        {/* Inicio */}
        <button onClick={() => onTabChange('inicio')} className={`${baseClass('inicio')} relative touch-target native-press`}>
          {activeTab === 'inicio' && <span className="absolute -top-1 left-[30%] right-[30%] h-[3px] rounded-full bg-[var(--primary)]" />}
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className="text-[10px] font-semibold">Inicio</span>
        </button>

        {/* Productos */}
        <button onClick={() => onTabChange('menu')} className={`${baseClass('menu')} relative touch-target native-press`}>
          {activeTab === 'menu' && <span className="absolute -top-1 left-[30%] right-[30%] h-[3px] rounded-full bg-[var(--primary)]" />}
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <span className="text-[10px] font-semibold">Productos</span>
        </button>

        {/* FLOATING CART FIX + MOBILE EXPERIENCE PASS: Carrito — centro destacado con z-index superior */}
        <div className="relative -mt-7 px-2 z-50" style={{ overflow: 'visible' }}>
          {/* MOBILE EXPERIENCE PASS: Enhanced FAB with haptic-style press feedback */}
          <button
            onClick={() => setIsOpen(true)}
            className="w-14 h-14 rounded-full bg-[var(--primary)] text-white elevation-4 flex items-center justify-center hover:brightness-110 hover:shadow-[var(--primary)]/30 transition-all native-press"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </button>
          {totalItems > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-md ring-2 ring-white">
              {totalItems > 9 ? '9+' : totalItems}
            </span>
          )}
        </div>

        {/* Rastrear */}
        <button onClick={() => onTabChange('pedidos')} className={`${baseClass('pedidos')} relative touch-target native-press`}>
          {activeTab === 'pedidos' && <span className="absolute -top-1 left-[30%] right-[30%] h-[3px] rounded-full bg-[var(--primary)]" />}
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <span className="text-[10px] font-semibold">Rastrear</span>
        </button>

        {/* Tickets */}
        <button onClick={() => onTabChange('tickets')} className={`${baseClass('tickets')} relative touch-target native-press`}>
          {activeTab === 'tickets' && <span className="absolute -top-1 left-[30%] right-[30%] h-[3px] rounded-full bg-[var(--primary)]" />}
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
          </svg>
          <span className="text-[10px] font-semibold">Tickets</span>
        </button>
      </div>
    </nav>
  )
}
