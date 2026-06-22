'use client'

import { useCart } from '@/context/CartContext'
import Link from 'next/link'

export type TabId = 'inicio' | 'menu' | 'pedidos'

interface Props {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
  dark: boolean
  onToggleTheme: () => void
  logoUrl: string | null
  nombreTienda: string
  whatsappNumber?: string | null
  searchQuery: string
  onSearchChange: (q: string) => void
  storeId: string
}

const navItems: { id: TabId; label: string }[] = [
  { id: 'inicio', label: 'Inicio' },
  { id: 'menu', label: 'Productos' },
  { id: 'pedidos', label: 'Rastrear' },
]

export default function StoreHeader({
  activeTab,
  onTabChange,
  dark,
  onToggleTheme,
  logoUrl,
  nombreTienda,
  whatsappNumber,
  searchQuery,
  onSearchChange,
  storeId,
}: Props) {
  const { totalItems, setIsOpen } = useCart()
  const numeroLimpio = whatsappNumber?.replace(/\D/g, '') || ''

  const handleSearchChange = (value: string) => {
    onSearchChange(value)
    if (value && activeTab !== 'menu') {
      onTabChange('menu')
    }
  }

  return (
    <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800">
      {/* MOBILE: identidad + acciones */}
      <div className="md:hidden flex items-center justify-between h-12 px-4">
        <div className="flex items-center gap-2 min-w-0">
          {logoUrl ? (
            <img src={logoUrl} alt="" className="w-6 h-6 rounded-md object-cover ring-1 ring-slate-200 shrink-0" />
          ) : (
            <div className="w-6 h-6 rounded-md bg-[var(--primary)]/10 flex items-center justify-center shrink-0">
              <span className="text-[10px] font-bold text-[var(--primary)]">{nombreTienda.charAt(0)}</span>
            </div>
          )}
          <span className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{nombreTienda}</span>
        </div>
        <div className="flex items-center gap-1">
          <Link href={`/${storeId}/gift-card`}
            className="w-9 h-9 rounded-lg text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 flex items-center justify-center transition-all active:scale-90 touch-target"
            aria-label="Consultar Gift Card">
            💳
          </Link>
          <button onClick={() => onTabChange('menu')}
            className="w-9 h-9 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-all active:scale-90 touch-target"
            aria-label="Buscar productos">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          {numeroLimpio && (
            <a href={`https://wa.me/${numeroLimpio}`} target="_blank" rel="noopener noreferrer"
              className="w-9 h-9 rounded-lg text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 flex items-center justify-center transition-all active:scale-90 touch-target"
              aria-label="WhatsApp">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </a>
          )}
        </div>
      </div>

      {/* DESKTOP: identidad + navegación + buscador + acciones */}
      <div className="hidden md:flex items-center justify-between h-14 max-w-6xl mx-auto px-6">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5 min-w-0">
            {logoUrl ? (
              <img src={logoUrl} alt="" className="w-7 h-7 rounded-lg object-cover ring-1 ring-slate-200 shrink-0" />
            ) : (
              <div className="w-7 h-7 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center shrink-0">
                <span className="text-[11px] font-bold text-[var(--primary)]">{nombreTienda.charAt(0)}</span>
              </div>
            )}
            <span className="text-sm font-bold text-slate-900 truncate max-w-[160px]">{nombreTienda}</span>
          </div>

          <nav className="flex items-center gap-1">
            {navItems.map(item => (
              <button key={item.id} onClick={() => onTabChange(item.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === item.id
                    ? 'bg-[var(--primary)]/10 text-[var(--primary)] font-semibold'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                }`}>
                {item.label}
              </button>
            ))}
            <Link href={`/${storeId}/gift-card`}
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 transition-all">
              💳 Gift Card
            </Link>
          </nav>
        </div>

        <div className="relative flex-1 max-w-xs mx-4">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={e => handleSearchChange(e.target.value)}
            placeholder="Buscar productos..."
            className="w-full h-9 pl-9 pr-8 rounded-lg bg-slate-100 text-sm text-slate-700 placeholder-slate-400 border-0 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:bg-white transition-all"
          />
          {searchQuery && (
            <button onClick={() => onSearchChange('')} className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-all">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={onToggleTheme}
            className="w-9 h-9 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-all">
            {dark ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          <button onClick={() => setIsOpen(true)}
            className="relative w-9 h-9 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            {totalItems > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                {totalItems > 9 ? '9+' : totalItems}
              </span>
            )}
          </button>

          {numeroLimpio && (
            <a href={`https://wa.me/${numeroLimpio}`} target="_blank" rel="noopener noreferrer"
              className="w-9 h-9 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 flex items-center justify-center transition-all">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </a>
          )}
        </div>
      </div>
    </header>
  )
}
