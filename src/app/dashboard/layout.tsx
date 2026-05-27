'use client'

import { useEffect, useState, useCallback, createContext, useContext } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { formatearPrecio } from '@/lib/utils'
import { useTheme } from '@/context/ThemeContext'
import { getPalette, applyPalette } from '@/lib/palettes'
import type { NexusAnuncio, NexusAnuncioTipo } from '@/types/database'

const TIPOS: { value: NexusAnuncioTipo; label: string; icon: string; color: string }[] = [
  { value: 'actualizacion', label: 'Actualización', icon: '🚀', color: 'purple' },
  { value: 'mantenimiento', label: 'Mantenimiento', icon: '🔧', color: 'amber' },
  { value: 'aviso_pago', label: 'Aviso de Pago', icon: '⚠️', color: 'rose' },
]

import PwaRegister from '@/components/PwaRegister'
import PwaInstallPrompt from '@/components/PwaInstallPrompt'
import { SessionProvider, usePermisos } from '@/context/PermisosContext'

interface DetallePedido {
  id: string
  producto: string
  cantidad: number
  precio_unitario: number
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

function SidebarContent({ mobileMenuOpen, setMobileMenuOpen, tiendaId, silenciado, setSilenciado, theme, toggleTheme }: any) {
  const { esDueno, nombreColaborador, permisos } = usePermisos()

  const navItems = esDueno
    ? [
        { href: '/dashboard', label: 'Inicio', icon: 'home' },
        { href: '/dashboard/analiticas', label: 'Analíticas', icon: 'chart' },
        { href: '/dashboard/inventario', label: 'Inventario', icon: 'box' },
        { href: '/dashboard/pedidos', label: 'Pedidos', icon: 'cart' },
        { href: '/dashboard/cupones', label: 'Cupones', icon: 'tag' },
        { href: '/dashboard/regalos', label: 'Regalos', icon: 'gift' },
        { href: '/dashboard/vitrina', label: 'Vitrina', icon: 'window' },
        { href: '/dashboard/configurar', label: 'Ajustes', icon: 'settings' },
      ]
    : permisos?.dashboard
    ? [
        { href: '/dashboard', label: 'Inicio', icon: 'home' },
        { href: '/dashboard/analiticas', label: 'Analíticas', icon: 'chart' },
        { href: '/dashboard/inventario', label: 'Inventario', icon: 'box' },
        { href: '/dashboard/pedidos', label: 'Pedidos', icon: 'cart' },
        { href: '/dashboard/cupones', label: 'Cupones', icon: 'tag' },
        { href: '/dashboard/regalos', label: 'Regalos', icon: 'gift' },
      ]
    : [
        ...(permisos?.dashboard ? [{ href: '/dashboard', label: 'Inicio', icon: 'home' }] : []),
        ...(permisos?.productos ? [{ href: '/dashboard/inventario', label: 'Inventario', icon: 'box' }] : []),
        ...(permisos?.pedidos ? [{ href: '/dashboard/pedidos', label: 'Pedidos', icon: 'cart' }] : []),
      ]

  return (
    <aside className={`${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-200 ease-in-out w-56 sidebar backdrop-blur-2xl border-r border-slate-800/60 dark:border-slate-800/60 border-slate-200 fixed h-full z-40 flex flex-col`}>
      <div className="p-4 border-b border-slate-800/40 dark:border-slate-800/40 border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[var(--primary)] flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-xs">N</span>
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 dark:text-white">Nexus</h1>
            <p className="text-[10px] text-slate-400 font-medium">
              {esDueno ? 'Panel Socio' : (
                <span className="inline-flex items-center gap-1">
                  Colaborador
                  <span className="inline-block px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-[8px] font-bold rounded-md">{nombreColaborador}</span>
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-2 space-y-0.5">
        {navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3 px-3 py-2 text-slate-500 dark:text-slate-400 hover:text-[var(--primary)] hover:bg-[var(--primary)]/5 dark:hover:bg-[var(--primary)]/10 rounded-xl transition-all text-sm font-medium group"
          >
            {item.icon === 'home' && (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            )}
            {item.icon === 'chart' && (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            )}
            {item.icon === 'box' && (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
            )}
            {item.icon === 'cart' && (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
            )}
            {item.icon === 'tag' && (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
            )}
            {item.icon === 'gift' && (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
            )}
            {item.icon === 'window' && (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 2v4m8-4v4M4 10h16" /></svg>
            )}
            {item.icon === 'settings' && (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            )}
            <span className="truncate">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="p-2 border-t border-slate-200 dark:border-slate-800/60 space-y-0.5">
        <button onClick={toggleTheme}
          className="flex items-center gap-3 px-3 py-2 w-full text-slate-500 dark:text-slate-400 hover:text-[var(--primary)] hover:bg-[var(--primary)]/5 dark:hover:bg-[var(--primary)]/10 rounded-xl transition-all text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {theme === 'dark' ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            )}
          </svg>
          {theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
        </button>
        <button onClick={() => setSilenciado(!silenciado)}
          className="flex items-center gap-3 px-3 py-2 w-full text-slate-500 dark:text-slate-400 hover:text-[var(--primary)] hover:bg-[var(--primary)]/5 dark:hover:bg-[var(--primary)]/10 rounded-xl transition-all text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {silenciado ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.536 8.464a5 5 0 010 7.072M17.95 6.05a8 8 0 010 11.9M13 5l-4.707 4.707A1 1 0 017.586 10H4a1 1 0 00-1 1v2a1 1 0 001 1h3.586a1 1 0 01.707.293L13 19V5z" />
            )}
          </svg>
          {silenciado ? 'Sonido' : 'Silenciar'}
        </button>
        <button onClick={() => { document.cookie = 'nx_session=; path=/; max-age=0'; document.cookie = 'nx_colaborador=; path=/; max-age=0'; window.location.href = '/login' }}
          className="flex items-center gap-3 px-3 py-2 w-full text-slate-500 dark:text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/10 rounded-xl transition-all text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Cerrar Sesión
        </button>
      </div>
    </aside>
  )
}

export default function DashboardLayout({
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
  const [sendingMagicLink, setSendingMagicLink] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [anuncios, setAnuncios] = useState<NexusAnuncio[]>([])
  const [anunciosDescartados, setAnunciosDescartados] = useState<Set<string>>(new Set())
  const [bloqueado, setBloqueado] = useState(false)
  const [whatsappSoporte, setWhatsappSoporte] = useState('18299999999')
  const supabase = createClient()
  const router = useRouter()
  const pathname = usePathname()
  const { theme, toggleTheme } = useTheme()

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

        const { data: tienda } = await supabase
            .from('tiendas')
            .select('id, nombre_tienda, esta_activa, fecha_bloqueo_panel')
            .eq('id', sessionId)
            .maybeSingle()

          if (!tienda) {
            window.location.href = '/login'
            return
          }

          setTiendaId(tienda.id)
          setNombreTienda(tienda.nombre_tienda || '')
          const ahora = new Date()
          const bloqueadoPorEstado = !tienda.esta_activa
          const bloqueadoPorFecha = tienda.fecha_bloqueo_panel && new Date(tienda.fecha_bloqueo_panel) <= ahora
          if (bloqueadoPorEstado || bloqueadoPorFecha) {
            setBloqueado(true)
          }

          try {
            const { data: anunciosData, error: anunciosError } = await supabase
              .from('nexus_anuncios')
              .select('*')
              .eq('activo', true)
              .order('created_at', { ascending: false })
            if (!anunciosError && anunciosData) {
              setAnuncios(anunciosData)
            }
          } catch {}

          const { data: pref } = await supabase
            .from('perfil_tienda')
            .select('theme_config')
            .eq('id_tienda', tienda.id)
            .maybeSingle()
          if (pref) {
            if (pref.theme_config) {
              const config = pref.theme_config as { palette?: string }
              if (config.palette) applyPalette(getPalette(config.palette))
            }
          }

          try {
            const { data: cfg } = await supabase.from('nexus_config').select('valor').eq('clave', 'whatsapp_soporte').maybeSingle()
            if (cfg?.valor) setWhatsappSoporte(cfg.valor)
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

    console.log('[Realtime pedidos] Suscribiendo a pedidos INSERT para tienda:', tiendaId)

    const canal = supabase
      .channel(`global-pedidos-${tiendaId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'pedidos', filter: `id_tienda=eq.${tiendaId}` },
        (payload) => {
          console.log('[Realtime pedidos] Evento INSERT recibido:', payload)
          const pedido = payload.new as Pedido

          // Dar un pequeño margen para asegurar que las filas relacionales ya existan en Postgres
          setTimeout(async () => {
            const { data: detalles, error: detErr } = await supabase
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
                precio_unitario: d.precio_unitario || d.precio || 0
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
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime pedidos] Subscripción exitosa')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Realtime pedidos] Error en canal:', err)
        }
      })

    return () => {
      console.log('[Realtime pedidos] Limpiando suscripción')
      supabase.removeChannel(canal)
    }
  }, [tiendaId, showAlert])

  useEffect(() => {
    if (!tiendaId) return

    const canal = supabase
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
      supabase.removeChannel(canal)
    }
  }, [tiendaId])

  useEffect(() => {
    const cargarAnuncios = async () => {
      const { data } = await supabase.from('nexus_anuncios').select('*').eq('activo', true).order('created_at', { ascending: false })
      if (data) setAnuncios(data)
    }

    const canal = supabase
      .channel('anuncios-global')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'nexus_anuncios' },
        cargarAnuncios
      )
      .subscribe()

    const intervalo = setInterval(cargarAnuncios, 30000)

    return () => { supabase.removeChannel(canal); clearInterval(intervalo) }
  }, [])

  useEffect(() => {
    if (!nombreTienda) return
    const sectionTitles: Record<string, string> = {
      '/dashboard': 'Panel de Control',
      '/dashboard/inventario': 'Inventario',
      '/dashboard/pedidos': 'Pedidos',
      '/dashboard/analiticas': 'Analíticas',
      '/dashboard/cupones': 'Cupones',
      '/dashboard/regalos': 'Regalos',
      '/dashboard/configurar': 'Ajustes',
    }
    const section = sectionTitles[pathname] || 'Dashboard'
    document.title = `${section} | ${nombreTienda}`
  }, [pathname, nombreTienda])

  const handleGiftAction = async (giftId: string, newStatus: 'approved' | 'rejected') => {
    const updates: any = { status: newStatus }
    if (newStatus === 'approved') updates.approved_at = new Date().toISOString()
    await supabase.from('gift_experiences').update(updates).eq('id', giftId)

    if (newStatus === 'approved') {
      const gift = giftPendientes.find(g => g.id === giftId)
      if (gift?.items_list) {
        for (const item of gift.items_list) {
          await supabase
            .rpc('decrement_stock', { pid: item.product_id })
            .maybeSingle()
        }
      }
      setApprovedGift(gift || null)
      return
    }

    setGiftPendientes(prev => {
      const updated = prev.filter(g => g.id !== giftId)
      if (updated.length === 0) setShowGiftModal(false)
      return updated
    })
  }

  async function actualizarEstado(pedidoId: string, nuevoEstado: string) {
    const { error } = await supabase
      .from('pedidos')
      .update({ estado: nuevoEstado })
      .eq('id', pedidoId)

    if (!error) {
      const pedido = pedidosPendientes.find(p => p.id === pedidoId)
      if (pedido?.is_gift && nuevoEstado === 'confirmado') {
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

  async function handleSendMagicLink(pedido: Pedido) {
    if (!pedido.id_tienda) { alert('Falta el ID de la tienda'); return }
    setSendingMagicLink(true)
    const { data: existing } = await supabase
      .from('tickets')
      .select('code')
      .eq('order_id', pedido.id)
      .maybeSingle()

    let code = existing?.code
    if (!code) {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
      code = ''
      for (let i = 0; i < 10; i++) code += chars[Math.floor(Math.random() * chars.length)]

      const senderMatch = pedido.notas?.match(/De:\s*(.+?),/)
      const receiverMatch = pedido.notas?.match(/Para:\s*(.+?)(?:,|$)/)
      const msgMatch = pedido.notas?.match(/Msj:\s*"(.+?)"/)

      const { error } = await supabase.from('tickets').insert({
        order_id: pedido.id,
        store_id: pedido.id_tienda,
        code,
        gift_details: {
          sender_name: senderMatch ? senderMatch[1].trim() : '',
          recipient_name: receiverMatch ? receiverMatch[1].trim() : '',
          dedication: msgMatch ? msgMatch[1].trim() : '',
        },
      })
      if (error) { alert('Error al generar ticket: ' + error.message); setSendingMagicLink(false); return }
    }

    const recipient = (pedido.notas?.match(/Para:\s*(.+?)(?:,|$)/) || [])[1]?.trim() || ''
    const magicUrl = `${window.location.origin}/catalogo/${pedido.id_tienda}/tickets?code=${code}`
    const phone = (pedido.cliente_telefono || '').replace(/\D/g, '')
    if (!phone) { alert('Este pedido no tiene número de teléfono.'); setSendingMagicLink(false); return }
    const msg = encodeURIComponent(`¡Hola! Tu pedido de regalo para ${recipient} ha sido confirmado. 🎉 Aquí tienes el enlace mágico para que se lo envíes cuando quieras darle la sorpresa: ${magicUrl}`)
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank')
    setSendingMagicLink(false)
  }

  if (loading) {
    return (
      <OrderAlertContext.Provider value={{ showAlert }}>
        <div className="min-h-screen flex bg-gray-50">
          <aside className="w-56 sidebar backdrop-blur-2xl border-r border-slate-200 h-screen flex flex-col">
            <div className="p-4 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[var(--primary)] flex items-center justify-center shadow-sm">
                  <span className="text-white font-bold text-xs">N</span>
                </div>
                <div>
                  <h1 className="text-sm font-bold text-slate-900">Nexus</h1>
                  <p className="text-[10px] text-slate-400 font-medium">Panel Socio</p>
                </div>
              </div>
            </div>
          </aside>
          <main className="flex-1 min-h-screen" style={{ background: 'var(--bg-body)' }}>
            <div className="max-w-7xl mx-auto">{children}</div>
          </main>
        </div>
      </OrderAlertContext.Provider>
    )
  }

  if (bloqueado) {
    const msgWhatsApp = encodeURIComponent(
      '¡Hola Nexus! Mi panel de administración ha sido bloqueado. Quiero reactivar mi cuenta.'
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
          <p className="text-sm sm:text-base text-slate-500 leading-relaxed mb-8">
            Tu panel de administración se encuentra suspendido. Si deseas reactivar tu cuenta, ponte en contacto con el equipo de Nexus.
          </p>
          <a
            href={`https://wa.me/${whatsappSoporte}?text=${msgWhatsApp}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-3 w-full py-4 px-6 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-base rounded-2xl shadow-lg shadow-emerald-500/25 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Contactar a Nexus por WhatsApp
          </a>
        </div>
      </div>
    )
  }

  return (
    <SessionProvider>
    <OrderAlertContext.Provider value={{ showAlert }}>
      <div className="min-h-screen flex md:overflow-x-hidden">
        {/* Mobile header */}
        <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-xl border-b border-slate-800/60 px-4 h-14 flex items-center gap-3">
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 -ml-2 text-slate-300 hover:text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[var(--primary)] flex items-center justify-center">
              <span className="text-white font-bold text-xs">N</span>
            </div>
            <span className="text-sm font-bold text-white">Nexus Core</span>
          </div>
        </div>

        {/* Mobile sidebar overlay */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-30" onClick={() => setMobileMenuOpen(false)}>
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
          </div>
        )}

        <SidebarContent mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} tiendaId={tiendaId} silenciado={silenciado} setSilenciado={setSilenciado} theme={theme} toggleTheme={toggleTheme} />

        <main className="flex-1 md:ml-56 pt-14 md:pt-0 min-h-screen" style={{ background: 'var(--bg-body)' }}>
          {anuncios.filter(a => a.activo && !anunciosDescartados.has(a.id)).map(a => {
            const t = TIPOS.find(t => t.value === a.tipo)
            return (
              <div key={a.id} className={`px-4 py-2.5 flex items-center gap-3 text-sm border-b ${t?.color === 'purple' ? 'bg-purple-50 border-purple-200 text-purple-800' : t?.color === 'amber' ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
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
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>

        {showGiftModal && giftPendientes.length > 0 && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={() => setShowGiftModal(false)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden" onClick={e => e.stopPropagation()}>
              {/* Ticket header */}
              <div className="bg-[var(--primary)] px-5 py-4 text-center relative">
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
                          <p className="text-xs text-slate-400 uppercase tracking-wider">De</p>
                          <p className="text-sm font-bold text-slate-900">{g.sender_name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-400 uppercase tracking-wider">Para</p>
                          <p className="text-sm font-bold text-slate-900">{g.receiver_name}</p>
                        </div>
                      </div>

                      <div className="bg-slate-50 rounded-xl px-3 py-2 text-center">
                        <p className="text-xs text-slate-400 uppercase tracking-wider mb-0.5">Código</p>
                        <p className="text-lg font-bold font-mono tracking-wider text-[var(--primary)]">{g.gift_code}</p>
                      </div>

                      {g.personal_message && (
                        <div className="border-l-2 border-[var(--primary)]/30 pl-3">
                          <p className="text-xs text-slate-400 uppercase tracking-wider mb-0.5">Mensaje</p>
                          <p className="text-sm italic text-slate-600">"{g.personal_message}"</p>
                        </div>
                      )}

                      {g.items_list && g.items_list.length > 0 && (
                        <div>
                          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1.5">Productos</p>
                          <div className="space-y-1.5">
                            {g.items_list.map((item, i) => (
                              <div key={i} className="flex items-center gap-2.5 bg-slate-50 rounded-lg px-2.5 py-1.5">
                                <div className="w-7 h-7 rounded-md bg-white flex-shrink-0 overflow-hidden">
                                  {item.imagen_url ? (
                                    <img src={item.imagen_url} alt={item.nombre} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                      </svg>
                                    </div>
                                  )}
                                </div>
                                <span className="text-sm text-slate-700 truncate flex-1">{item.nombre}</span>
                                <span className="text-xs font-medium text-slate-500 flex-shrink-0">RD${item.precio.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                          <div className="flex justify-between items-center pt-2 mt-1 border-t border-slate-200">
                            <span className="text-xs font-semibold text-slate-500 uppercase">Total cupón</span>
                            <span className="text-base font-bold text-[var(--primary)]">RD${g.items_list.reduce((s, i) => s + i.precio, 0).toFixed(2)}</span>
                          </div>
                        </div>
                      )}

                      {giftPendientes.length > 1 && (
                        <p className="text-xs text-center text-slate-400">
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
                  className="flex-1 px-3 py-2.5 bg-rose-500 text-white rounded-xl text-sm font-medium hover:bg-rose-600 transition-colors">
                  Rechazar
                </button>
                <button onClick={() => handleGiftAction(giftPendientes[0].id, 'approved')}
                  className="flex-1 px-3 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors">
                  Aprobar Ticket
                </button>
              </div>
            </div>
          </div>
        )}

        {approvedGift && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center">
              <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-emerald-100 flex items-center justify-center">
                <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">✅ Ticket aprobado</h3>
              <p className="text-xs text-slate-500 mb-4">Stock reservado. Comparte el enlace con el destinatario.</p>
              {!approvedGift.sender_phone && (
                <div className="mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
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
                    alert('No se puede enviar: falta el número del comprador.\n\nEnlace copiado al portapapeles:\n' + link)
                  }
                  setApprovedGift(null)
                }}
                className="w-full px-4 py-3 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2 mb-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c 0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                Enviar Ticket al Comprador
              </button>
              <button onClick={() => setApprovedGift(null)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                Cerrar
              </button>
            </div>
          </div>
        )}

        {pedidosPendientes.length > 0 && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setPedidosPendientes([])}>
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="p-4 border-b flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      Tienes {pedidosPendientes.length} pedido{pedidosPendientes.length !== 1 ? 's' : ''} nuevo{pedidosPendientes.length !== 1 ? 's' : ''}
                    </h3>
                    <p className="text-sm text-slate-500">Pendientes de revisión</p>
                  </div>
                </div>
                <button onClick={() => setPedidosPendientes([])} className="text-slate-400 hover:text-slate-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="overflow-y-auto p-4 space-y-3 flex-1">
                {pedidosPendientes.map((pedido) => {
                  const codigoReal = pedido.order_id || pedido.id.slice(0, 8).toUpperCase()
                  return (
                  <div key={pedido.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-slate-900">{pedido.cliente_nombre}</p>
                        <p className="text-xs text-slate-500">{new Date(pedido.creado_at).toLocaleString('es-DO')}</p>
                      </div>
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full font-medium">Nuevo</span>
                    </div>

                    {pedido.detalles_pedido && pedido.detalles_pedido.length > 0 && (
                      <div className="space-y-1 mb-2">
                        {pedido.detalles_pedido.map((d: DetallePedido) => (
                          <div key={d.id} className="flex justify-between text-sm">
                            <span className="text-slate-600">{d.producto} x{d.cantidad}</span>
                            <span className="font-medium text-slate-900">RD${formatearPrecio(d.precio_unitario * d.cantidad)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <p className="text-lg font-bold text-green-600 mb-2">Total: RD${formatearPrecio(pedido.total)}</p>

                    {pedido.is_gift && pedido.estado === 'confirmado' ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSendMagicLink(pedido)}
                          disabled={sendingMagicLink}
                          className="flex-1 bg-purple-600 text-white py-1.5 px-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors text-sm font-medium"
                        >
                          🪄 {sendingMagicLink ? 'Enviando...' : 'Enviar Enlace Mágico'}
                        </button>
                        <button
                          onClick={() => setPedidosPendientes(prev => prev.filter(p => p.id !== pedido.id))}
                          className="flex-1 bg-slate-200 text-slate-700 py-1.5 px-3 rounded-lg hover:bg-slate-300 transition-colors text-sm font-medium"
                        >
                          Cerrar
                        </button>
                      </div>
                    ) : pedido.is_gift ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => actualizarEstado(pedido.id, 'rechazado')}
                          className="flex-1 bg-red-600 text-white py-1.5 px-3 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                        >
                          Rechazar
                        </button>
                        <button
                          onClick={() => actualizarEstado(pedido.id, 'confirmado')}
                          className="flex-1 bg-green-600 text-white py-1.5 px-3 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
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
                          className="flex-1 bg-purple-600 text-white py-1.5 px-3 rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium flex items-center justify-center gap-1.5"
                        >
                          🛵 Marcar como En Camino
                        </button>
                        <button
                          onClick={() => setPedidosPendientes(prev => prev.filter(p => p.id !== pedido.id))}
                          className="flex-1 bg-slate-200 text-slate-700 py-1.5 px-3 rounded-lg hover:bg-slate-300 transition-colors text-sm font-medium"
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
                              window.open(`https://api.whatsapp.com/send?phone=${numeroCliente}&text=${encodeURIComponent(msgEntregado)}`, '_blank')
                            }
                            actualizarEstado(pedido.id, 'entregado')
                          }}
                          className="flex-1 bg-emerald-600 text-white py-1.5 px-3 rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium flex items-center justify-center gap-1.5"
                        >
                          ✅ Marcar como Entregado
                        </button>
                        <button
                          onClick={() => setPedidosPendientes(prev => prev.filter(p => p.id !== pedido.id))}
                          className="flex-1 bg-slate-200 text-slate-700 py-1.5 px-3 rounded-lg hover:bg-slate-300 transition-colors text-sm font-medium"
                        >
                          Cerrar
                        </button>
                      </div>
                    ) : (
                      <>
                        {/* Cuadro verde de previsualización de mensaje universal para cualquier pedido entrante */}
                        <div className="bg-white border border-gray-200 rounded-lg p-3 mb-3 text-xs text-gray-900 leading-relaxed text-left shadow-sm">
                          <p className="font-semibold text-gray-700 text-[10px] uppercase tracking-wide mb-1">🛍️ Vista previa del mensaje (WhatsApp)</p>
                          <p className="font-mono whitespace-pre-wrap text-gray-900 bg-gray-50 p-2 rounded-lg border border-gray-200">
                            🛍️ *¡Hola, {pedido.cliente_nombre}!* Tu pedido *#{pedido.order_id || pedido.id.slice(0, 8).toUpperCase()}* ya fue recibido y lo estamos preparando en *{nombreTienda || 'nuestra tienda'}*. 🚀 En breve te avisaremos cuando vaya de camino. ¡Muchas gracias por tu confianza! 🙏✨
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => actualizarEstado(pedido.id, 'rechazado')}
                            className="flex-1 bg-red-600 text-white py-1.5 px-3 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                          >
                            Rechazar
                          </button>
                          <button
                            onClick={() => {
                              actualizarEstado(pedido.id, 'en_proceso')
                              const msg = `🛍️ *¡Hola, ${pedido.cliente_nombre}!* Tu pedido *#${codigoReal}* ya fue recibido y lo estamos preparando. 🚀 En breve te avisaremos cuando vaya de camino. ¡Muchas gracias por tu confianza! 🙏✨`
                              window.open(`https://api.whatsapp.com/send?phone=${(pedido.cliente_telefono || '').replace(/\D/g, '')}&text=${encodeURIComponent(msg)}`, '_blank')
                            }}
                            className="flex-1 bg-green-600 text-white py-1.5 px-3 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                          >
                            Aprobar
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
              </div>
            </div>
          </div>
        )}
      </div>
      <PwaRegister swUrl="/sw-dashboard.js" manifestUrl={tiendaId ? `/api/manifest/dashboard/${tiendaId}` : undefined} />
      <PwaInstallPrompt />
    </OrderAlertContext.Provider>
    </SessionProvider>
  )
}