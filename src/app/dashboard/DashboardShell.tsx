'use client'

import { useEffect, useState, useCallback, createContext, useContext, useRef, memo } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { checkTiendaActiva } from '@/lib/commercial'
import type { PlanTipo, PlanStatus } from '@/lib/commercial'
import { formatCurrency, generarMensaje } from '@/lib/utils'
import type { VarsWhatsApp } from '@/lib/utils'
import { useTheme } from '@/context/ThemeContext'
import { getPalette, applyPalette } from '@/lib/palettes'
import type { NexusAnuncio, NexusAnuncioTipo } from '@/types/database'

const TIPOS: { value: NexusAnuncioTipo; label: string; icon: string; color: string }[] = [
  { value: 'actualizacion', label: 'Actualización', icon: '🚀', color: 'purple' },
  { value: 'mantenimiento', label: 'Mantenimiento', icon: '🔧', color: 'amber' },
  { value: 'aviso_pago', label: 'Aviso de Pago', icon: '⚠️', color: 'rose' },
]

import PwaRegister from '@/components/PwaRegister'
import InstallAppButton from '@/components/InstallAppButton'
import PushSubscribeButton from '@/components/PushSubscribeButton'
import { SessionProvider, usePermisos } from '@/context/PermisosContext'
import ToastProvider, { useToast } from '@/components/Toast'
import { DashboardContext } from './DashboardContext'

interface DetallePedido {
  id: string
  producto: string
  cantidad: number
  precio_unitario: number
  impuesto?: number
  subtotal?: number
}

interface Pedido {
  id: string
  order_id?: string | null
  cliente_nombre: string
  cliente_telefono?: string | null
  total: number
  estado: string
  detalles_pedido: DetallePedido[] | null
  creado_at: string
  is_gift?: boolean
  id_tienda?: string
  notas?: string | null
}

const FALLBACK_CONFIRMADO = '🛍️ *¡Hola, {cliente}!* Tu pedido #{pedido} ya fue recibido y lo estamos preparando en *{tienda}*. 🚀 En breve te avisaremos cuando vaya de camino. ¡Muchas gracias por tu confianza! 🙏✨'

interface GiftAlert {
  id: string
  store_id: string
  sender_name: string
  sender_phone: string | null
  receiver_name: string
  gift_code: string
  personal_message: string | null
  items_list: { product_id: string; nombre: string; precio: number; imagen_url: string | null }[]
  status: string
  created_at: string
}

interface OrderAlertContextType {
  showAlert: (pedido: Pedido) => void
}

const OrderAlertContext = createContext<OrderAlertContextType | null>(null)

export function useOrderAlert() {
  return useContext(OrderAlertContext)
}

function SidebarDesktop({ tiendaId }: { tiendaId?: string }) {
  const { esDueno, nombreColaborador, permisos } = usePermisos()
  const pathname = usePathname()
  const [marketingExpanded, setMarketingExpanded] = useState(true)

  const isMarketingChild = (p: string) =>
    p.startsWith('/dashboard/portadas') || p.startsWith('/dashboard/cupones') || p.startsWith('/dashboard/regalos') || p.startsWith('/dashboard/marketing')

  useEffect(() => {
    if (isMarketingChild(pathname) && !marketingExpanded) setMarketingExpanded(true)
  }, [pathname])

  const navItems = esDueno
    ? [
        { href: '/dashboard', label: 'Inicio', icon: 'home', group: 'a' },
        { href: '/dashboard/pedidos', label: 'Pedidos', icon: 'cart', group: 'b' },
        { href: '/dashboard/inventario', label: 'Productos', icon: 'box', group: 'b' },
        { href: '/dashboard/vitrina', label: 'Vitrina', icon: 'window', group: 'c' },
        { href: '/dashboard/marketing', label: 'Marketing', icon: 'megaphone', group: 'c', isGroup: true },
        { href: '/dashboard/analiticas', label: 'Analíticas', icon: 'chart', group: 'c' },
        { href: '/dashboard/whatsapp', label: 'WhatsApp', icon: 'chat', group: 'c' },
        { href: '/dashboard/configurar', label: 'Configuración', icon: 'settings', group: 'd' },
        { href: '/dashboard/suscripcion', label: 'Suscripción', icon: 'credit', group: 'd' },
      ]
    : permisos?.dashboard
    ? [
        { href: '/dashboard', label: 'Inicio', icon: 'home', group: 'a' },
        { href: '/dashboard/pedidos', label: 'Pedidos', icon: 'cart', group: 'b' },
        { href: '/dashboard/inventario', label: 'Productos', icon: 'box', group: 'b' },
        { href: '/dashboard/vitrina', label: 'Vitrina', icon: 'window', group: 'c' },
        { href: '/dashboard/marketing', label: 'Marketing', icon: 'megaphone', group: 'c', isGroup: true },
        { href: '/dashboard/analiticas', label: 'Analíticas', icon: 'chart', group: 'c' },
        { href: '/dashboard/whatsapp', label: 'WhatsApp', icon: 'chat', group: 'c' },
      ]
    : [
        ...(permisos?.dashboard ? [{ href: '/dashboard', label: 'Inicio', icon: 'home', group: 'a' }] : []),
        ...(permisos?.productos ? [{ href: '/dashboard/inventario', label: 'Productos', icon: 'box', group: 'b' }] : []),
        ...(permisos?.pedidos ? [{ href: '/dashboard/pedidos', label: 'Pedidos', icon: 'cart', group: 'b' }] : []),
      ]

  const marketingSubItems = esDueno || permisos?.dashboard
    ? [
        { href: '/dashboard/portadas', label: 'Portadas', icon: 'stack' },
        { href: '/dashboard/cupones', label: 'Cupones', icon: 'tag' },
        { href: '/dashboard/regalos', label: 'Regalos', icon: 'gift' },
      ]
    : []

  const esActivo = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  const iconSVG = (icon: string) => {
    switch (icon) {
      case 'home': return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
      case 'chart': return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
      case 'box': return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
      case 'cart': return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
      case 'tag': return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
      case 'gift': return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
      // UX EVOLUTION
      case 'window': return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 2v4m8-4v4M4 10h16" /></svg>
      case 'chat': return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
      case 'megaphone': return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
      case 'stack': return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
      case 'settings': return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
      case 'credit': return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
      default: return null
    }
  }

  return (
    // SIDEBAR NAV FIX
    <aside className="hidden md:flex w-56 fixed h-full z-30 flex-col bg-[#0c0c10]/90 backdrop-blur-2xl border-r border-white/[0.06] pt-14 will-change-transform" style={{ contain: 'layout style paint' }}>
      <nav className="flex-1 p-2 space-y-0.5">
          {navItems.map((item, i) => {
            const active = esActivo(item.href)
            const prevGroup = i > 0 ? navItems[i-1].group : null
            const showDivider = prevGroup && item.group !== prevGroup

            if ((item as any).isGroup) {
              const marketingActive = isMarketingChild(pathname)
              return (
                <div key={item.href}>
                  {showDivider && <div className="h-px bg-white/[0.06] mx-3 my-1.5" />}
                  <button onClick={() => setMarketingExpanded(!marketingExpanded)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all text-sm font-medium no-tap-delay press-scale-sm ${
                      marketingActive
                        ? 'text-white bg-white/[0.07] border-l-[3px] border-[var(--primary)] shadow-[inset_0_0_12px_-8px_var(--primary)] pl-[9px]'
                        : 'text-white/40 hover:text-white/80 hover:bg-white/5 border-l-[3px] border-transparent pl-[9px]'
                    }`}>
                    {iconSVG(item.icon)}
                    <span className="flex-1 text-left truncate">{item.label}</span>
                    <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${marketingExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                  {marketingExpanded && (
                    <div className="ml-3 space-y-0.5 mt-0.5">
                      {marketingSubItems.map(sub => {
                        const subActive = esActivo(sub.href)
                        return (
                          <Link key={sub.href} href={sub.href}
                            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all text-sm font-medium no-tap-delay press-scale-sm ${
                              subActive
                                ? 'text-white bg-white/[0.07] border-l-[3px] border-[var(--primary)] shadow-[inset_0_0_12px_-8px_var(--primary)] pl-[9px]'
                                : 'text-white/40 hover:text-white/80 hover:bg-white/5 border-l-[3px] border-transparent pl-[9px]'
                            }`}>
                            {iconSVG(sub.icon)}
                            <span className="truncate">{sub.label}</span>
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            }

            return (
              <div key={item.href}>
                {showDivider && <div className="h-px bg-white/[0.06] mx-3 my-1.5" />}
                <Link href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all text-sm font-medium no-tap-delay press-scale-sm ${
                    active
                      ? 'text-white bg-white/[0.07] border-l-[3px] border-[var(--primary)] shadow-[inset_0_0_12px_-8px_var(--primary)] pl-[9px]'
                      : 'text-white/40 hover:text-white/80 hover:bg-white/5 border-l-[3px] border-transparent pl-[9px]'
                  }`}
                >
                  {iconSVG(item.icon)}
                  <span className="truncate">{item.label}</span>
                </Link>
              </div>
            )
          })}
        </nav>
        <div className="px-3 pb-3 space-y-1">
          <InstallAppButton variant="sidebar" />
          {tiendaId && <PushSubscribeButton idTienda={tiendaId} />}
        </div>
    </aside>
  )
}

function BottomSheet({ moreOpen, setMoreOpen, extras, iconSVG }: any) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const startY = useRef(0)
  const currentY = useRef(0)

  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY
    if (sheetRef.current) sheetRef.current.style.transition = 'none'
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    const dy = e.touches[0].clientY - startY.current
    if (dy < 0) return
    currentY.current = dy
    if (sheetRef.current) sheetRef.current.style.transform = `translateY(${dy}px)`
  }

  const handleTouchEnd = () => {
    if (currentY.current > 120) {
      setMoreOpen(false)
    } else {
      if (sheetRef.current) {
        sheetRef.current.style.transition = 'transform .2s ease-out'
        sheetRef.current.style.transform = 'translateY(0)'
      }
    }
    currentY.current = 0
  }

  return (
    <>
      <div className="fixed inset-0 z-50 animate-backdrop-in" onClick={() => setMoreOpen(false)}>
        <div className="absolute inset-0 bg-black/40" />
      </div>
      <div ref={sheetRef}
        className="fixed bottom-0 left-0 right-0 z-50 bg-[#0c0c10] rounded-t-2xl border border-white/[0.06] pb-8 max-h-[70vh] overflow-y-auto animate-slide-up"
      >
        <div className="flex justify-center pt-2 pb-1 cursor-grab active:cursor-grabbing touch-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-10 h-1 rounded-full bg-white/30" />
        </div>
        <div className="px-3 pb-2 space-y-0.5">
          {extras.map((item: any) => (
            <Link key={item.href} href={item.href} onClick={() => setMoreOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/5 transition-all"
            >
              {iconSVG(item.icon)}
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </>
  )
}

const BottomNav = memo(function BottomNav({ moreOpen, setMoreOpen }: any) {
  const { esDueno, nombreColaborador, permisos } = usePermisos()
  const pathname = usePathname()

  // DASHBOARD STRUCTURE PASS
  const todosLosItems = esDueno
    ? [
        { href: '/dashboard', label: 'Inicio', icon: 'home' },
        { href: '/dashboard/pedidos', label: 'Pedidos', icon: 'cart' },
        { href: '/dashboard/inventario', label: 'Productos', icon: 'box' },
        { href: '/dashboard/vitrina', label: 'Vitrina', icon: 'window' },
        { href: '/dashboard/portadas', label: 'Portadas', icon: 'stack' },
        { href: '/dashboard/cupones', label: 'Cupones', icon: 'tag' },
        { href: '/dashboard/regalos', label: 'Regalos', icon: 'gift' },
        { href: '/dashboard/analiticas', label: 'Analíticas', icon: 'chart' },
        { href: '/dashboard/whatsapp', label: 'WhatsApp', icon: 'chat' },
        { href: '/dashboard/configurar', label: 'Configuración', icon: 'settings' },
        { href: '/dashboard/suscripcion', label: 'Suscripción', icon: 'credit' },
      ]
    : permisos?.dashboard
    ? [
        { href: '/dashboard', label: 'Inicio', icon: 'home' },
        { href: '/dashboard/pedidos', label: 'Pedidos', icon: 'cart' },
        { href: '/dashboard/inventario', label: 'Productos', icon: 'box' },
        { href: '/dashboard/vitrina', label: 'Vitrina', icon: 'window' },
        { href: '/dashboard/portadas', label: 'Portadas', icon: 'stack' },
        { href: '/dashboard/cupones', label: 'Cupones', icon: 'tag' },
        { href: '/dashboard/regalos', label: 'Regalos', icon: 'gift' },
        { href: '/dashboard/analiticas', label: 'Analíticas', icon: 'chart' },
        { href: '/dashboard/whatsapp', label: 'WhatsApp', icon: 'chat' },
      ]
    : [
        ...(permisos?.dashboard ? [{ href: '/dashboard', label: 'Inicio', icon: 'home' }] : []),
        ...(permisos?.productos ? [{ href: '/dashboard/inventario', label: 'Productos', icon: 'box' }] : []),
        ...(permisos?.pedidos ? [{ href: '/dashboard/pedidos', label: 'Pedidos', icon: 'cart' }] : []),
      ]

  const inicioItem = todosLosItems.find(i => i.href === '/dashboard')
  const otrosItems = todosLosItems.filter(i => i.href !== '/dashboard')
  let principales: typeof todosLosItems
  if (inicioItem) {
    principales = [
      inicioItem,
      ...otrosItems.slice(0, 3),
    ].filter(Boolean) as typeof todosLosItems
  } else {
    principales = otrosItems.slice(0, 4)
  }
  const extras = todosLosItems.filter(item => !principales.includes(item) && item.href !== '/dashboard/configurar')

  const esActivo = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  const iconSVG = (icon: string) => {
    switch (icon) {
      case 'home': return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
      case 'chart': return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
      case 'box': return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
      case 'cart': return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
      case 'tag': return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
      case 'gift': return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
      // UX EVOLUTION
      case 'window': return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 2v4m8-4v4M4 10h16" /></svg>
      case 'chat': return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
      case 'megaphone': return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
      case 'stack': return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
      case 'settings': return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
      case 'credit': return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
      default: return null
    }
  }

  return (
    <>
      {/* MOBILE EXPERIENCE PASS: Bottom nav with touch-friendly targets, safe areas, active indicator */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0c0c10]/90 backdrop-blur-2xl border-t border-white/[0.06] flex items-center justify-around px-1 pb-1 pt-2 will-change-transform" style={{ paddingBottom: 'calc(0.25rem + env(safe-area-inset-bottom, 0px))' }}>
        {principales.map(item => {
          const active = esActivo(item.href)
          return (
            <Link key={item.href} href={item.href}
              className={`relative flex flex-col items-center gap-1 px-3 py-1.5 min-w-0 rounded-xl transition-all no-tap-delay touch-target press-touch ${
                active
                  ? 'text-white bg-white/[0.07]'
                  : 'text-white/40 hover:text-white/80 hover:bg-white/[0.03]'
              }`}
            >
              {active && <span className="absolute -top-0.5 left-[20%] right-[20%] h-[2px] rounded-full bg-[var(--primary)]" />}
              {iconSVG(item.icon)}
              <span className="text-[10px] font-semibold truncate max-w-full leading-tight">{item.label}</span>
            </Link>
          )
        })}
        <button onClick={() => setMoreOpen(true)}
          className="relative flex flex-col items-center gap-1 px-3 py-1.5 min-w-0 rounded-xl transition-all text-white/40 hover:text-white/80 hover:bg-white/[0.03] no-tap-delay touch-target press-touch"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
          <span className="text-[10px] font-semibold">Más</span>
        </button>
      </nav>

      {moreOpen && <BottomSheet moreOpen={moreOpen} setMoreOpen={setMoreOpen} extras={extras} iconSVG={iconSVG} />}
    </>
  )
})

function DashboardLayoutInner({
  children,
}: {
  children: React.ReactNode
}) {
  const [tiendaId, setTiendaId] = useState<string | null>(null)
  const [nombreTienda, setNombreTienda] = useState('')
  const [loading, setLoading] = useState(true)
  const [pedidosPendientes, setPedidosPendientes] = useState<Pedido[]>([])
  const [giftPendientes, setGiftPendientes] = useState<GiftAlert[]>([])
  const [showGiftModal, setShowGiftModal] = useState(false)
  const [approvedGift, setApprovedGift] = useState<GiftAlert | null>(null)
  const [silenciado, setSilenciado] = useState(false)
  const [plantillas, setPlantillas] = useState<Record<string, string>>({})
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [landingLogoUrl, setLandingLogoUrl] = useState('')
  const [storeLogoUrl, setStoreLogoUrl] = useState<string | null>(null)
  const [anuncios, setAnuncios] = useState<NexusAnuncio[]>([])
  const [anunciosDescartados, setAnunciosDescartados] = useState<Set<string>>(new Set())
  const [bloqueado, setBloqueado] = useState(false)
  const [whatsappSoporte, setWhatsappSoporte] = useState('18299999999')
  const [blockedBankAccounts, setBlockedBankAccounts] = useState<{ banco: string; tipo_cuenta: string; numero_cuenta: string }[]>([])
  const [blockedPlanPrice, setBlockedPlanPrice] = useState(380)
  const [currencyCode, setCurrencyCode] = useState('DOP')
  const [planTipo, setPlanTipo] = useState<PlanTipo>('emprendedor')
  const [planStatus, setPlanStatus] = useState<PlanStatus>('trial')
  const [fechaVencimiento, setFechaVencimiento] = useState<string | null>(null)
  const [isFounder, setIsFounder] = useState(false)
  // VERCEL BUILD FIX: Lazy-init Supabase client on first client-side render only
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)
  const getSupabase = useCallback(() => {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    return supabaseRef.current
  }, [])
  const router = useRouter()
  const pathname = usePathname()
  const { theme, toggleTheme } = useTheme()
  const { toast } = useToast()

  const showAlert = useCallback((pedido: Pedido) => {
    setPedidosPendientes(prev => {
      if (prev.some(p => p.id === pedido.id)) return prev
      return [pedido, ...prev]
    })
    if (!silenciado) {
      try {
        const ctx = new AudioContext()
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.value = 800
        gain.gain.value = 0.3
        osc.start()
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
        osc.stop(ctx.currentTime + 0.3)
      } catch {}
    }
  }, [silenciado])

  const showGiftAlert = useCallback((gift: GiftAlert) => {
    setGiftPendientes(prev => {
      if (prev.some(g => g.id === gift.id)) return prev
      return [gift, ...prev]
    })
    setShowGiftModal(true)
    if (!silenciado) {
      try {
        const ctx = new AudioContext()
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.value = 523.25
        gain.gain.value = 0.25
        osc.start()
        osc.frequency.exponentialRampToValueAtTime(1046.5, ctx.currentTime + 0.15)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
        osc.stop(ctx.currentTime + 0.4)
      } catch {}
    }
  }, [silenciado])

  useEffect(() => {
    async function loadTienda() {
      try {
        let sessionId = document.cookie.replace(/(?:(?:^|.*;\s*)nx_session\s*=\s*([^;]*).*$)|^.*$/, '$1')
        if (!sessionId) {
          try {
            const r = await fetch('/api/auth/session-id')
            const d = await r.json()
            sessionId = d.tiendaId
          } catch {}
        }
        if (!sessionId) return

        const { data: tienda } = await getSupabase()
            .from('tiendas')
            .select('id, nombre_tienda, currency_code, plan_tipo, plan_status, fecha_vencimiento, is_founder')
            .eq('id', sessionId)
            .maybeSingle()

          if (!tienda) {
            window.location.href = '/login'
            return
          }

          setTiendaId(tienda.id)
          setNombreTienda(tienda.nombre_tienda || '')
          if (tienda.currency_code) setCurrencyCode(tienda.currency_code)
          if (tienda.plan_tipo) setPlanTipo(tienda.plan_tipo as PlanTipo)
          if (tienda.plan_status) setPlanStatus(tienda.plan_status as PlanStatus)
          if (tienda.fecha_vencimiento) setFechaVencimiento(tienda.fecha_vencimiento)
          if (tienda.is_founder) setIsFounder(true)

          const check = await checkTiendaActiva(getSupabase(), tienda.id)
          if (!check.ok) {
            setBloqueado(true)
          }

          try {
            const { data: anunciosData, error: anunciosError } = await getSupabase()
              .from('nexus_anuncios')
              .select('*')
              .eq('activo', true)
              .order('created_at', { ascending: false })
            if (!anunciosError && anunciosData) {
              setAnuncios(anunciosData)
            }
          } catch {}

          const { data: pref } = await getSupabase()
            .from('perfil_tienda')
            .select('theme_config, logo_url')
            .eq('id_tienda', tienda.id)
            .maybeSingle()
          if (pref) {
            if (pref.theme_config) {
              const config = pref.theme_config as { palette?: string }
              if (config.palette) applyPalette(getPalette(config.palette))
            }
            if (pref.logo_url) setStoreLogoUrl(pref.logo_url)
          }

          try {
            const { data: cfg } = await getSupabase().from('nexus_config').select('valor').eq('clave', 'whatsapp_soporte').maybeSingle()
            if (cfg?.valor) setWhatsappSoporte(cfg.valor)
          } catch {}

          try {
            const { data: logoCfg } = await getSupabase().from('nexus_config').select('valor').eq('clave', 'landing_logo_url').maybeSingle()
            if (logoCfg?.valor) setLandingLogoUrl(logoCfg.valor)
          } catch {}

          try {
            const { data: bankCfg } = await getSupabase().from('nexus_config').select('valor').eq('clave', 'bank_accounts').maybeSingle()
            if (bankCfg?.valor) { try { setBlockedBankAccounts(JSON.parse(bankCfg.valor).filter((a: any) => a.activo)) } catch {} }
          } catch {}

          try {
            const { data: priceCfg } = await getSupabase().from('nexus_config').select('valor').eq('clave', 'plan_emprendedor_price').maybeSingle()
            if (priceCfg?.valor) setBlockedPlanPrice(Number(priceCfg.valor))
          } catch {}
      } catch {
        console.error('Error al cargar la tienda')
      } finally {
        setLoading(false)
      }
    }

    loadTienda()
  }, [])

  useEffect(() => {
    if (!tiendaId) {
      // No tiendaId aún, saltando suscripción
      return
    }

    const canal = getSupabase()
      .channel(`global-pedidos-${tiendaId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'pedidos', filter: `id_tienda=eq.${tiendaId}` },
        (payload) => {
          const pedido = payload.new as Pedido

          // Dar un pequeño margen para asegurar que las filas relacionales ya existan en Postgres
          setTimeout(async () => {
            const { data: detalles, error: detErr } = await getSupabase()
              .from('detalles_pedido')
              .select('id, producto, cantidad, precio_unitario')
              .eq('id_pedido', pedido.id)

            if (detErr) {
              console.error('[Realtime pedidos] Error consultando detalles relacionales:', detErr)
              return
            }

            // Si existen datos relacionales reales, usarlos. Si no, hacer fallback seguro al JSONB
            if (detalles && detalles.length > 0) {
              pedido.detalles_pedido = detalles
            } else if (pedido.detalles_pedido && typeof pedido.detalles_pedido === 'object') {
              const arr = Array.isArray(pedido.detalles_pedido) ? pedido.detalles_pedido : [pedido.detalles_pedido]
              pedido.detalles_pedido = arr.map((d: any, i: number) => ({
                id: d.id || `realtime-${i}-${Date.now()}`,
                producto: d.producto || d.producto_nombre || d.nombre || 'Producto',
                cantidad: d.cantidad || 1,
                precio_unitario: d.precio_unitario || d.precio || 0,
                impuesto: d.impuesto || 0,
                subtotal: d.subtotal ?? (d.precio_unitario || d.precio || 0) * (d.cantidad || 1),
              }))
            } else {
              pedido.detalles_pedido = []
            }

            // Disparar el modal global con la información sincronizada y tipada
            showAlert(pedido)
          }, 400)
        }
      )
      .subscribe((status, err) => {
        if (status === 'CHANNEL_ERROR') {
          console.error('[Realtime pedidos] Error en canal:', err)
        }
      })

    return () => {
      getSupabase().removeChannel(canal)
    }
  }, [tiendaId, showAlert])

  useEffect(() => {
    if (!tiendaId) return
    getSupabase()
      .from('whatsapp_templates')
      .select('confirmado, preparando, en_camino, entregado')
      .eq('store_id', tiendaId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setPlantillas({
            confirmado: data.confirmado || '',
            preparando: data.preparando || '',
            en_camino: data.en_camino || '',
            entregado: data.entregado || '',
          })
        }
      })
  }, [tiendaId, getSupabase])

  useEffect(() => {
    if (!tiendaId) return

    const canal = getSupabase()
      .channel(`regalos-${tiendaId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'gift_experiences', filter: `store_id=eq.${tiendaId}` },
        (payload) => {
          const gift = payload.new as GiftAlert
          showGiftAlert(gift)
        }
      )
      .subscribe()

    return () => {
      getSupabase().removeChannel(canal)
    }
  }, [tiendaId])

  useEffect(() => {
    const cargarAnuncios = async () => {
      const { data } = await getSupabase().from('nexus_anuncios').select('*').eq('activo', true).order('created_at', { ascending: false })
      if (data) setAnuncios(data)
    }

    const canal = getSupabase()
      .channel('anuncios-global')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'nexus_anuncios' },
        cargarAnuncios
      )
      .subscribe()

    const intervalo = setInterval(cargarAnuncios, 30000)

    return () => { getSupabase().removeChannel(canal); clearInterval(intervalo) }
  }, [])

  // DASHBOARD STRUCTURE PASS
  const sectionTitles: Record<string, string> = {
    '/dashboard': 'Inicio',
    '/dashboard/pedidos': 'Pedidos',
    '/dashboard/inventario': 'Productos',
    '/dashboard/vitrina': 'Vitrina',
    '/dashboard/marketing': 'Marketing',
    '/dashboard/portadas': 'Portadas',
    '/dashboard/cupones': 'Cupones',
    '/dashboard/regalos': 'Regalos',
    '/dashboard/analiticas': 'Analíticas',
    '/dashboard/whatsapp': 'WhatsApp',
    '/dashboard/configurar': 'Configuración',
    '/dashboard/suscripcion': 'Suscripción',
  }
  const pageTitle = sectionTitles[pathname] || 'Dashboard'

  useEffect(() => {
    if (!nombreTienda) return
    document.title = `${pageTitle} | ${nombreTienda}`
  }, [pathname, nombreTienda])

  const handleGiftAction = async (giftId: string, newStatus: 'approved' | 'rejected') => {
    if (newStatus === 'approved') {
      const gift = giftPendientes.find(g => g.id === giftId)
      const { data, error } = await getSupabase().rpc('aprobar_regalo_v2', { p_gift_id: giftId })
      if (error) {
        console.error('[Gift] Error en RPC:', error)
        toast('Error al aprobar el regalo. Intenta de nuevo.', 'error')
        return
      }
      if (!data?.success) {
        console.error('[Gift] aprobar_regalo_v2:', data?.error)
        toast(data?.error || 'No se pudo aprobar el regalo.', 'error')
        return
      }
      setApprovedGift(gift || null)
      setGiftPendientes(prev => {
        const updated = prev.filter(g => g.id !== giftId)
        if (updated.length === 0) setShowGiftModal(false)
        return updated
      })
      return
    }

    await getSupabase().from('gift_experiences').update({ status: newStatus }).eq('id', giftId)
    setGiftPendientes(prev => {
      const updated = prev.filter(g => g.id !== giftId)
      if (updated.length === 0) setShowGiftModal(false)
      return updated
    })
  }

  async function actualizarEstado(pedidoId: string, nuevoEstado: string) {
    const { error } = await getSupabase()
      .from('pedidos')
      .update({ estado: nuevoEstado })
      .eq('id', pedidoId)

    if (!error) {
      const pedido = pedidosPendientes.find(p => p.id === pedidoId)
      if ((pedido?.notas?.includes('🎁 Modo Regalo') || pedido?.is_gift) && nuevoEstado === 'confirmado') {
        setPedidosPendientes(prev =>
          prev.map(p => p.id === pedidoId ? { ...p, estado: 'confirmado' } : p)
        )
      } else if (nuevoEstado === 'rechazado' || nuevoEstado === 'en_camino' || nuevoEstado === 'entregado') {
        setPedidosPendientes(prev => prev.filter(p => p.id !== pedidoId))
      } else if (nuevoEstado === 'en_proceso') {
        setPedidosPendientes(prev => prev.map(p => p.id === pedidoId ? { ...p, estado: 'en_proceso' } : p))
      } else {
        setPedidosPendientes(prev => prev.filter(p => p.id !== pedidoId))
      }
    }
  }

  if (loading) {
    return (
      <DashboardContext.Provider value={{ currencyCode, planTipo, planStatus, fechaVencimiento, isFounder }}>
      <OrderAlertContext.Provider value={{ showAlert }}>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-[#0a0a0d] dark:via-[#0c0c10] dark:to-[#0e0e14]">
        <header className="fixed top-0 left-0 right-0 z-40 bg-[#0c0c10]/80 backdrop-blur-2xl border-b border-white/[0.06] px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {landingLogoUrl ? (
                <img src={landingLogoUrl} alt="" className="w-7 h-7 rounded-lg object-contain" />
              ) : (
                <div className="w-7 h-7 rounded-lg bg-[var(--primary)] flex items-center justify-center">
                  <span className="text-white font-bold text-xs">N</span>
                </div>
              )}
              <span className="text-sm font-bold text-white/90">Dashboard | {nombreTienda || ''}</span>
            </div>
          </header>
          <main className="pt-14 pb-16 md:ml-56 min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-[#0a0a0d] dark:via-[#0c0c10] dark:to-[#0e0e14]">
            <div className="max-w-7xl mx-auto">{children}</div>
          </main>
        </div>
      </OrderAlertContext.Provider>
      </DashboardContext.Provider>
    )
  }

  if (bloqueado) {
    const cuentasTexto = blockedBankAccounts.map(a => `${a.banco} (${a.tipo_cuenta}): ${a.numero_cuenta}`).join('\n')
    const msgWhatsApp = encodeURIComponent(
      `¡Hola Nexus! Mi panel de administración ha sido bloqueado. Quiero reactivar mi cuenta.\n\nPlan: Emprendedor — ${formatCurrency(blockedPlanPrice, currencyCode)}/mes${cuentasTexto ? `\n\n${cuentasTexto}` : ''}`
    )
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl max-w-md w-full p-8 sm:p-10 text-center border border-white/10">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-rose-100 flex items-center justify-center">
            <svg className="w-10 h-10 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-3">Panel Bloqueado</h1>
          <p className="text-sm sm:text-base text-slate-500 leading-relaxed mb-4">
            Tu panel de administración se encuentra suspendido. Para reactivar tu cuenta, realiza el pago y envía tu comprobante por WhatsApp.
          </p>
          <div className="bg-slate-50 rounded-xl p-4 mb-6 text-left space-y-2">
            <p className="text-sm font-bold text-slate-900">Plan: Emprendedor — {formatCurrency(blockedPlanPrice, currencyCode)}/mes</p>
            {blockedBankAccounts.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cuentas bancarias</p>
                {blockedBankAccounts.map((acc, i) => (
                  <p key={i} className="text-sm text-slate-700 font-mono">{acc.banco} ({acc.tipo_cuenta}): {acc.numero_cuenta}</p>
                ))}
              </div>
            )}
          </div>
          <a
            href={`https://wa.me/${whatsappSoporte}?text=${msgWhatsApp}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-3 w-full py-4 px-6 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-base rounded-2xl shadow-lg shadow-emerald-500/25 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Enviar comprobante por WhatsApp
          </a>
        </div>
      </div>
    )
  }

  return (
    <SessionProvider>
    <DashboardContext.Provider value={{ currencyCode, planTipo, planStatus, fechaVencimiento, isFounder }}>
    <OrderAlertContext.Provider value={{ showAlert }}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-[#0a0a0d] dark:via-[#0c0c10] dark:to-[#0e0e14]">
        {/* MOTION SYSTEM PASS: Animations moved to globals.css — no inline style block needed */}
        <SidebarDesktop tiendaId={tiendaId ?? undefined} />
        {/* Top header */}
        <header className="fixed top-0 left-0 right-0 z-40 bg-[#0c0c10]/80 backdrop-blur-2xl border-b border-white/[0.06] px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            {landingLogoUrl ? (
              <img src={landingLogoUrl} alt="" className="w-7 h-7 rounded-lg object-contain shrink-0" />
            ) : (
              <div className="w-7 h-7 rounded-lg bg-[var(--primary)] flex items-center justify-center shrink-0">
                <span className="text-white font-bold text-xs">N</span>
              </div>
            )}
            <span className="text-sm font-bold text-white/90 truncate">Dashboard | {nombreTienda}</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setShowSettingsModal(true)} className="p-2 text-white/40 hover:text-white/80 rounded-xl hover:bg-white/5 transition-all press-scale-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <button onClick={toggleTheme} className="p-2 text-white/40 hover:text-white/80 rounded-xl hover:bg-white/5 transition-all press-scale-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {theme === 'dark' ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                )}
              </svg>
            </button>
            <button onClick={async () => { await fetch('/api/auth/logout', { method: 'POST' }); window.location.href = '/login' }}
              className="p-2 text-white/40 hover:text-rose-400 rounded-xl hover:bg-rose-500/10 transition-all press-scale-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </header>

        <main className="pt-14 pb-20 md:ml-56 min-h-screen scroll-container mobile-scroll">
          {anuncios.filter(a => a.activo && !anunciosDescartados.has(a.id)).map(a => {
            const t = TIPOS.find(t => t.value === a.tipo)
            return (
              <div key={a.id} className={`px-4 py-2.5 flex items-center gap-3 text-sm border-b ${t?.color === 'purple' ? 'bg-purple-50/80 border-purple-200 text-purple-800' : t?.color === 'amber' ? 'bg-amber-50/80 border-amber-200 text-amber-800' : 'bg-rose-50/80 border-rose-200 text-rose-800'}`}>
                <span className="text-base">{t?.icon || '📢'}</span>
                <div className="flex-1 min-w-0">
                  <span className="font-semibold">{a.titulo}</span>
                  {a.contenido && <span className="ml-2 opacity-75">{a.contenido}</span>}
                </div>
                <button onClick={() => setAnunciosDescartados(prev => new Set(prev).add(a.id))}
                  className="shrink-0 p-1 rounded-lg hover:bg-black/5 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )
          })}
          {/* MOTION SYSTEM PASS: Page enter with spring easing */}
          <div key={pathname} className="max-w-7xl mx-auto animate-page-enter content-visibility-auto">
            {children}
          </div>
        </main>

        <div className="md:hidden">
          <BottomNav moreOpen={bottomSheetOpen} setMoreOpen={setBottomSheetOpen} />
        </div>

        {showSettingsModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-backdrop-in" onClick={() => setShowSettingsModal(false)}>
            <div className="bg-white/90 dark:bg-[#121216]/90 backdrop-blur-2xl rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-white/30 dark:border-white/[0.06] animate-scale-in" onClick={e => e.stopPropagation()}>
              <div className="px-5 py-4 border-b border-white/30 dark:border-white/[0.06] flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Ajustes</h3>
                <button onClick={() => setShowSettingsModal(false)} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white/80 rounded-lg hover:bg-white/5 transition-all">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-3 space-y-1">
                <button onClick={toggleTheme} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 text-sm font-medium text-slate-700 dark:text-white/70 hover:text-slate-900 dark:hover:text-white transition-all press-scale-sm">
                  <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {theme === 'dark' ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    )}
                  </svg>
                  {theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}
                </button>
                <button onClick={() => { setSilenciado(!silenciado); setShowSettingsModal(false) }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 text-sm font-medium text-slate-700 dark:text-white/70 hover:text-slate-900 dark:hover:text-white transition-all press-scale-sm">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {silenciado ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    )}
                  </svg>
                  {silenciado ? 'Activar Sonido' : 'Silenciar Sonido'}
                </button>
                <Link href="/dashboard/configurar" onClick={() => setShowSettingsModal(false)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 text-sm font-medium text-slate-700 dark:text-white/70 hover:text-slate-900 dark:hover:text-white transition-all press-scale-sm">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Configuración Avanzada
                </Link>
                <InstallAppButton variant="sidebar" />
                {tiendaId && <PushSubscribeButton idTienda={tiendaId} />}
                <div className="border-t border-white/30 dark:border-white/[0.06] my-1" />
                <button onClick={async () => { await fetch('/api/auth/logout', { method: 'POST' }); window.location.href = '/login' }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-rose-500/10 text-sm font-medium text-rose-600 hover:text-rose-700 transition-all press-scale-sm">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Cerrar Sesión
                </button>
              </div>
            </div>
          </div>
        )}

        {showGiftModal && giftPendientes.length > 0 && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-backdrop-in" onClick={() => setShowGiftModal(false)}>
            <div className="bg-white/90 dark:bg-[#121216]/90 backdrop-blur-2xl rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-white/30 dark:border-white/[0.06] animate-scale-in" onClick={e => e.stopPropagation()}>
              {/* Ticket header */}
              <div className="bg-gradient-to-br from-[var(--primary)] to-[var(--primary)]/80 px-5 py-4 text-center relative">
                <div className="absolute -bottom-2 left-0 right-0 flex justify-between px-2">
                  <div className="w-4 h-4 bg-black/50 rounded-full" />
                  <div className="w-4 h-4 bg-black/50 rounded-full" />
                </div>
                <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12v2H4v-2M20 12V8a2 2 0 00-2-2H6a2 2 0 00-2 2v4m16 0H4m16 0v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4m4-8V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-white">¡Ticket de Regalo Entrante!</h3>
                <p className="text-xs text-white/80 mt-0.5">Código único de regalo</p>
              </div>

              {/* Ticket body */}
              <div className="px-5 py-4 space-y-3">
                {(() => {
                  const g = giftPendientes[0]
                  return (
                    <>
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider">De</p>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">{g.sender_name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider">Para</p>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">{g.receiver_name}</p>
                        </div>
                      </div>

                      <div className="bg-white/50 dark:bg-white/[0.03] rounded-xl px-3 py-2 text-center border border-white/30 dark:border-white/[0.06]">
                        <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">Código</p>
                        <p className="text-lg font-bold font-mono tracking-wider text-[var(--primary)]">{g.gift_code}</p>
                      </div>

                      {g.personal_message && (
                        <div className="border-l-2 border-[var(--primary)]/30 pl-3">
                          <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">Mensaje</p>
                          <p className="text-sm italic text-slate-600 dark:text-slate-300">"{g.personal_message}"</p>
                        </div>
                      )}

                      {g.items_list && g.items_list.length > 0 && (
                        <div>
                          <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Productos</p>
                          <div className="space-y-1.5">
                            {g.items_list.map((item, i) => (
                              <div key={i} className="flex items-center gap-2.5 bg-white/50 dark:bg-white/[0.03] rounded-lg px-2.5 py-1.5 border border-white/30 dark:border-white/[0.06]">
                                <div className="w-7 h-7 rounded-md bg-white/80 dark:bg-white/5 flex-shrink-0 overflow-hidden">
                                  {item.imagen_url ? (
                                    <img src={item.imagen_url} alt={item.nombre} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-600">
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                      </svg>
                                    </div>
                                  )}
                                </div>
                                <span className="text-sm text-slate-700 dark:text-slate-300 truncate flex-1">{item.nombre}</span>
                                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex-shrink-0">{formatCurrency(item.precio, currencyCode)}</span>
                              </div>
                            ))}
                          </div>
                          <div className="flex justify-between items-center pt-2 mt-1 border-t border-white/30 dark:border-white/[0.06]">
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Total cupón</span>
                            <span className="text-base font-bold text-[var(--primary)]">{formatCurrency(g.items_list.reduce((s, i) => s + i.precio, 0), currencyCode)}</span>
                          </div>
                        </div>
                      )}

                      {giftPendientes.length > 1 && (
                        <p className="text-xs text-center text-slate-400 dark:text-slate-500">
                          +{giftPendientes.length - 1} ticket{giftPendientes.length - 1 !== 1 ? 's' : ''} más pendiente{giftPendientes.length - 1 !== 1 ? 's' : ''}
                        </p>
                      )}
                    </>
                  )
                })()}
              </div>

              {/* Actions */}
              <div className="px-5 pb-4 flex gap-2.5">
                <button onClick={() => handleGiftAction(giftPendientes[0].id, 'rejected')}
                  className="flex-1 px-3 py-2.5 bg-rose-500/90 backdrop-blur-sm text-white rounded-xl text-sm font-medium hover:bg-rose-600 transition-all border border-white/10">
                  Rechazar
                </button>
                <button onClick={() => handleGiftAction(giftPendientes[0].id, 'approved')}
                  className="flex-1 px-3 py-2.5 bg-emerald-600/90 backdrop-blur-sm text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-all border border-white/10">
                  Aprobar Ticket
                </button>
              </div>
              <div className="px-5 pb-4">
                <Link href="/dashboard/regalos" className="block text-center text-xs text-[var(--primary)] hover:underline font-medium" onClick={() => setShowGiftModal(false)}>
                  Gestionar Regalo →
                </Link>
              </div>
            </div>
          </div>
        )}

        {approvedGift && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
            <div className="bg-white/90 dark:bg-[#121216]/90 backdrop-blur-2xl rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center border border-white/30 dark:border-white/[0.06]">
              <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-emerald-100/80 dark:bg-emerald-500/10 flex items-center justify-center">
                <svg className="w-7 h-7 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">✅ Ticket aprobado</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Stock reservado. Comparte el enlace con el destinatario.</p>
              {!approvedGift.sender_phone && (
                <div className="mb-3 px-3 py-2 bg-amber-50/80 border border-amber-200/60 rounded-xl text-xs text-amber-700">
                  No se puede enviar: falta el número del comprador
                </div>
              )}
              <button
                onClick={() => {
                  const origin = window.location.origin
                  const link = `${origin}/canje?id=${approvedGift.store_id}&gift=${approvedGift.gift_code}`
                  const phone = (approvedGift.sender_phone || '').replace(/\D/g, '')
                  const target = phone ? `1${phone}` : ''
                  const msg = `¡Hola! Tienes un detalle especial en ${nombreTienda}. Ábrelo aquí: ${link}`
                  const waUrl = `https://wa.me/${target}?text=${encodeURIComponent(msg)}`

                  if (target) {
                    const wa = window.open('', '_blank')
                    if (wa) wa.location.href = waUrl
                    else window.location.href = waUrl
                  } else {
                    navigator.clipboard.writeText(link).catch(() => {})
                    toast('No se puede enviar: falta el número del comprador. Enlace copiado al portapapeles.', 'warning')
                  }
                  setApprovedGift(null)
                }}
                className="w-full px-4 py-3 bg-emerald-600/90 backdrop-blur-sm text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 mb-2 border border-white/10">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c 0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                Enviar Ticket al Comprador
              </button>
              <button onClick={() => setApprovedGift(null)}
                className="w-full px-4 py-2.5 border border-white/30 dark:border-white/[0.06] bg-white/50 dark:bg-white/[0.03] rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-white/[0.06] transition-all">
                Cerrar
              </button>
            </div>
          </div>
        )}

        {pedidosPendientes.length > 0 && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setPedidosPendientes([])}>
            <div className="bg-white/90 dark:bg-[#121216]/90 backdrop-blur-2xl rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col border border-white/30 dark:border-white/[0.06]" onClick={e => e.stopPropagation()}>
              <div className="px-4 py-3.5 border-b border-white/30 dark:border-white/[0.06] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100/80 dark:bg-green-500/10 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Tienes {pedidosPendientes.length} pedido{pedidosPendientes.length !== 1 ? 's' : ''} nuevo{pedidosPendientes.length !== 1 ? 's' : ''}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Pendientes de revisión</p>
                  </div>
                </div>
                <button onClick={() => setPedidosPendientes([])} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="overflow-y-auto p-4 space-y-3 flex-1">
                {pedidosPendientes.map((pedido) => {
                  const codigoReal = pedido.order_id || pedido.id.slice(0, 8).toUpperCase()
                  return (
                  <div key={pedido.id} className="bg-white/50 dark:bg-white/[0.03] rounded-xl p-4 border border-white/30 dark:border-white/[0.06]">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">{pedido.cliente_nombre}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(pedido.creado_at).toLocaleString('es-DO')}</p>
                      </div>
                      <span className="text-xs bg-yellow-100/80 dark:bg-yellow-500/10 text-yellow-800 dark:text-yellow-300 px-2 py-0.5 rounded-full font-medium">Nuevo</span>
                    </div>

                    {pedido.detalles_pedido && pedido.detalles_pedido.length > 0 && (
                      <div className="space-y-1 mb-2">
                        {pedido.detalles_pedido.map((d: DetallePedido) => (
                          <div key={d.id} className="flex justify-between text-sm">
                            <span className="text-slate-600 dark:text-slate-400">{d.producto} x{d.cantidad}</span>
                            <span className="font-medium text-slate-900 dark:text-white">{formatCurrency(d.subtotal ?? d.precio_unitario * d.cantidad, currencyCode)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {pedido.detalles_pedido && pedido.detalles_pedido.some((d: DetallePedido) => Number(d.impuesto) > 0) && (
                      <div className="text-xs text-slate-500 dark:text-slate-400 space-y-0.5 mb-2">
                        <div className="flex justify-between">
                          <span>Subtotal (sin impuesto)</span>
                          <span>{formatCurrency(pedido.detalles_pedido.reduce((s: number, d: DetallePedido) => s + Number(d.subtotal ?? d.precio_unitario * d.cantidad), 0), currencyCode)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Impuesto</span>
                          <span>{formatCurrency(pedido.detalles_pedido.reduce((s: number, d: DetallePedido) => s + Number(d.impuesto || 0), 0), currencyCode)}</span>
                        </div>
                      </div>
                    )}

                    <p className="text-lg font-bold text-green-600 dark:text-green-400 mb-2">Total: {formatCurrency(pedido.total, currencyCode)}</p>

                    {(pedido.notas?.includes('🎁 Modo Regalo') || pedido.is_gift) ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => actualizarEstado(pedido.id, 'rechazado')}
                          className="flex-1 bg-rose-500/90 backdrop-blur-sm text-white py-1.5 px-3 rounded-xl hover:bg-rose-600 transition-all text-sm font-medium border border-white/10"
                        >
                          Rechazar
                        </button>
                        <button
                          onClick={() => actualizarEstado(pedido.id, 'confirmado')}
                          className="flex-1 bg-emerald-600/90 backdrop-blur-sm text-white py-1.5 px-3 rounded-xl hover:bg-emerald-700 transition-all text-sm font-medium border border-white/10"
                        >
                          Aprobar
                        </button>
                      </div>
                    ) : pedido.estado === 'en_proceso' ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            const numeroCliente = pedido.cliente_telefono?.replace(/\D/g, '') || ''
                            const codigoReal = pedido.order_id || pedido.id.slice(0, 8).toUpperCase()
                            const msgEnCamino = `🛍️ *¡Hola, ${pedido.cliente_nombre}!* Tu pedido *#${codigoReal}* ya va en camino. 🛵 El mensajero se pondrá en contacto contigo muy pronto para la entrega. ¡Gracias por elegirnos! 🙌✨`
                            if (numeroCliente) {
                              window.open(`https://wa.me/${numeroCliente}?text=${encodeURIComponent(msgEnCamino)}`, '_blank')
                            }
                            actualizarEstado(pedido.id, 'en_camino')
                          }}
                          className="flex-1 bg-purple-600/90 backdrop-blur-sm text-white py-1.5 px-3 rounded-xl hover:bg-purple-700 transition-all text-sm font-medium flex items-center justify-center gap-1.5 border border-white/10"
                        >
                          🛵 Marcar como En Camino
                        </button>
                        <button
                          onClick={() => setPedidosPendientes(prev => prev.filter(p => p.id !== pedido.id))}
                          className="flex-1 bg-white/50 dark:bg-white/[0.03] text-slate-700 dark:text-slate-300 py-1.5 px-3 rounded-xl hover:bg-white/80 dark:hover:bg-white/[0.06] transition-all text-sm font-medium border border-white/30 dark:border-white/[0.06]"
                        >
                          Cerrar
                        </button>
                      </div>
                    ) : pedido.estado === 'en_camino' ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            const numeroCliente = pedido.cliente_telefono?.replace(/\D/g, '') || ''
                            const codigoReal = pedido.order_id || pedido.id.slice(0, 8).toUpperCase()
                            const msgEntregado = `🛍️ *¡Hola, ${pedido.cliente_nombre}!* Tu pedido *#${codigoReal}* ya fue entregado, esperamos que lo disfrutes mucho.\n\nGracias por tu confianza.`
                            if (numeroCliente) {
                              window.open(`https://wa.me/${numeroCliente}?text=${encodeURIComponent(msgEntregado)}`, '_blank')
                            }
                            actualizarEstado(pedido.id, 'entregado')
                          }}
                          className="flex-1 bg-emerald-600/90 backdrop-blur-sm text-white py-1.5 px-3 rounded-xl hover:bg-emerald-700 transition-all text-sm font-medium flex items-center justify-center gap-1.5 border border-white/10"
                        >
                          ✅ Marcar como Entregado
                        </button>
                        <button
                          onClick={() => setPedidosPendientes(prev => prev.filter(p => p.id !== pedido.id))}
                          className="flex-1 bg-white/50 dark:bg-white/[0.03] text-slate-700 dark:text-slate-300 py-1.5 px-3 rounded-xl hover:bg-white/80 dark:hover:bg-white/[0.06] transition-all text-sm font-medium border border-white/30 dark:border-white/[0.06]"
                        >
                          Cerrar
                        </button>
                      </div>
                    ) : (() => {
                      const detallesStr = Array.isArray(pedido.detalles_pedido)
                        ? pedido.detalles_pedido.map((d: DetallePedido) => `${d.cantidad}x ${d.producto}`).join(', ')
                        : ''
                      const vars: VarsWhatsApp = {
                        cliente: pedido.cliente_nombre,
                        pedido: `#${codigoReal}`,
                        tienda: nombreTienda || 'nuestra tienda',
                        detalles: detallesStr,
                        total: formatCurrency(pedido.total, currencyCode),
                        fecha: new Date(pedido.creado_at).toLocaleDateString('es-DO'),
                      }
                      const mensajeWhatsApp = generarMensaje(plantillas, 'confirmado', FALLBACK_CONFIRMADO, vars)
                      return (
                      <>
                        <div className="bg-white/30 dark:bg-white/[0.02] border border-white/30 dark:border-white/[0.06] rounded-xl p-3 mb-3 text-xs text-gray-900 dark:text-slate-300 leading-relaxed text-left">
                          <p className="font-semibold text-gray-700 dark:text-slate-400 text-[10px] uppercase tracking-wide mb-1">🛍️ Vista previa del mensaje (WhatsApp)</p>
                          <p className="font-mono whitespace-pre-wrap text-gray-900 dark:text-slate-200 bg-white/50 dark:bg-black/20 p-2 rounded-lg border border-white/30 dark:border-white/[0.06]">
                            {mensajeWhatsApp}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => actualizarEstado(pedido.id, 'rechazado')}
                            className="flex-1 bg-rose-500/90 backdrop-blur-sm text-white py-1.5 px-3 rounded-xl hover:bg-rose-600 transition-all text-sm font-medium border border-white/10"
                          >
                            Rechazar
                          </button>
                          <button
                            onClick={() => {
                              actualizarEstado(pedido.id, 'en_proceso')
                              window.open(`https://wa.me/${(pedido.cliente_telefono || '').replace(/\D/g, '')}?text=${encodeURIComponent(mensajeWhatsApp)}`, '_blank')
                            }}
                            className="flex-1 bg-emerald-600/90 backdrop-blur-sm text-white py-1.5 px-3 rounded-xl hover:bg-emerald-700 transition-all text-sm font-medium border border-white/10"
                          >
                            Aprobar
                          </button>
                        </div>
                      </>
                    )})()}
                  </div>
                )
              })}
              </div>
              <div className="px-4 py-3 border-t border-white/30 dark:border-white/[0.06] shrink-0">
                <Link href="/dashboard/pedidos" className="block text-center text-xs text-[var(--primary)] hover:underline font-medium" onClick={() => setPedidosPendientes([])}>
                  Gestionar Pedido →
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
       <PwaRegister swUrl="/dashboard/sw.js" scope="/dashboard/" manifestUrl={tiendaId ? `/api/manifest/dashboard/${tiendaId}` : undefined} logoUrl={storeLogoUrl} />
      <InstallAppButton />
    </OrderAlertContext.Provider>
    </DashboardContext.Provider>
    </SessionProvider>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </ToastProvider>
  )
}