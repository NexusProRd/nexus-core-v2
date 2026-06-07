'use client'

import { useState, useEffect, useCallback, type CSSProperties } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCart } from '@/context/CartContext'
import { useConfig } from '@/context/ConfigProvider'
import { createClient } from '@/lib/supabase'
import { formatearPrecio } from '@/lib/utils'
import { gestionarStock } from '@/lib/stock'
import ModalCompartirProducto from '@/components/catalog/ModalCompartirProducto'
import ModalSeleccionarTalla from '@/components/catalog/ModalSeleccionarTalla'
import BottomNav, { type TabId } from '@/components/catalog/BottomNav'
import CartDrawer from '@/components/cart/CartDrawer'
import SocialToast from '@/components/catalog/SocialToast'

interface Producto {
  id: string
  nombre: string
  descripcion: string | null
  precio: number
  precio_oferta: number | null
  stock: number
  in_stock: boolean
  imagen_url: string | null
  tallas?: any
  tipo_articulo?: string | null
  slug?: string | null
}

interface ProductoSugerido {
  id: string
  nombre: string
  precio: number
  precio_oferta: number | null
  imagen_url: string | null
  slug?: string | null
}

interface Tienda {
  id: string
  nombre_tienda: string
  moneda_simbolo: string
  tipo_negocio: string
  whatsapp_num: string
}

interface PerfilTienda {
  nombre_comercial: string | null
  logo_url: string | null
  [key: string]: unknown
}

export default function ProductDetailClient({ producto, tienda, perfil, tiendaSlug, sugeridos = [] }: { producto: Producto; tienda: Tienda; perfil: PerfilTienda | null; tiendaSlug: string; sugeridos?: ProductoSugerido[] }) {
  const { addToCart, totalItems, setIsOpen } = useCart()
  const { whatsappNumber, nombreTienda, logoUrl: configLogoUrl } = useConfig()
  const router = useRouter()

  const [dark, setDark] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('nexus-theme')
    if (stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.setAttribute('data-theme', 'dark')
      setDark(true)
    }
  }, [])

  const toggleTheme = useCallback(() => {
    const next = !dark
    setDark(next)
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light')
    localStorage.setItem('nexus-theme', next ? 'dark' : 'light')
  }, [dark])
  const [activeNavTab, setActiveNavTab] = useState<TabId>('inicio')
  const [quantity, setQuantity] = useState(1)

  const handleNavChange = (tab: TabId) => {
    setActiveNavTab(tab)
    router.push(`/catalogo/${tiendaSlug}`)
  }
  const [feedback, setFeedback] = useState<'idle' | 'cart' | 'buy'>('idle')
  const [selectedTalla, setSelectedTalla] = useState<string | undefined>(undefined)
  const [selectedPrecioVariant, setSelectedPrecioVariant] = useState<number | null | undefined>(undefined)
  const [showBuyForm, setShowBuyForm] = useState(false)
  const [buyName, setBuyName] = useState('')
  const [buyPhone, setBuyPhone] = useState('')
  const [buying, setBuying] = useState(false)
  const [showSizeModal, setShowSizeModal] = useState(false)
  const [pendingBuy, setPendingBuy] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)

  const moneda = tienda.moneda_simbolo
  const precioBase = producto.precio_oferta ?? producto.precio
  const precioActivo = selectedPrecioVariant ?? precioBase
  const precioMinimoVariantes = Array.isArray(producto.tallas)
    ? producto.tallas.reduce((min: number, t: any) => t.precio != null && t.precio < min ? t.precio : min, producto.precio)
    : producto.precio
  const desdeMenor = !selectedPrecioVariant && precioMinimoVariantes < producto.precio
  const necesitaTalla = tienda.tipo_negocio === 'ropa' && Array.isArray(producto.tallas) && producto.tallas.length > 0

  const doAddToCart = (variante?: string, precioVariant?: number | null) => {
    if (necesitaTalla && !variante) {
      setPendingBuy(false)
      setShowSizeModal(true)
      return
    }
    const precioFinal = precioVariant ?? precioActivo
    for (let i = 0; i < quantity; i++) {
      addToCart({
        id: variante ? `${producto.id}-${variante}` : producto.id,
        nombre: variante ? `${producto.nombre} (Talla: ${variante})` : producto.nombre,
        precio: precioFinal,
        imagen_url: producto.imagen_url,
        variante_seleccionada: variante,
        precio_cobrado: variante ? precioFinal : undefined,
      })
    }
    setFeedback('cart')
    setTimeout(() => setFeedback('idle'), 1200)
  }

  const handleSizeConfirm = (talla: string, precioVariant: number | null) => {
    setSelectedTalla(talla)
    setSelectedPrecioVariant(precioVariant)
    setShowSizeModal(false)
    if (pendingBuy) {
      setPendingBuy(false)
      handleBuy(talla, precioVariant)
    } else {
      doAddToCart(talla, precioVariant)
    }
  }

  const handleBuy = (tallaParam?: string, precioParam?: number | null) => {
    if (!numeroLimpio || buying) return
    if (necesitaTalla && !tallaParam && !selectedTalla) {
      setPendingBuy(true)
      setShowSizeModal(true)
      return
    }
    setShowBuyForm(true)
  }

  const confirmBuy = async () => {
    if (!buyName.trim() || !buyPhone.trim() || buying) return
    setBuying(true)
    setShowBuyForm(false)
    const supabase = createClient()
    const precioFinal = selectedPrecioVariant ?? precioActivo
    const nombreConVariante = selectedTalla ? `${producto.nombre} (Talla: ${selectedTalla})` : producto.nombre

    const orderId = crypto.randomUUID().slice(0, 8).toUpperCase()
    const total = precioFinal * quantity

    const { data: pedido, error } = await supabase.from('pedidos').insert({
      id_tienda: tienda.id,
      cliente_nombre: buyName.trim(),
      cliente_telefono: buyPhone.trim(),
      is_gift: false,
      notas: `Compra rápida directa: ${nombreConVariante} x${quantity}`,
      order_id: orderId,
      total,
      estado: 'pendiente',
      detalles_pedido: [{ id_producto: producto.id, producto: nombreConVariante, cantidad: quantity, precio_unitario: precioFinal, precio_cobrado: precioFinal, variante_seleccionada: selectedTalla || null }],
    }).select().single()

    if (error || !pedido) {
      setBuying(false)
      alert('Error al procesar el pedido. Inténtalo de nuevo.')
      return
    }

    await supabase.from('detalles_pedido').insert({
      id_pedido: pedido.id,
      id_producto: producto.id,
      producto: nombreConVariante,
      cantidad: quantity,
      precio_unitario: precioFinal,
    })

    const stockResult = await gestionarStock(
      supabase,
      [{ id_producto: producto.id, nombre: producto.nombre, cantidad: quantity, variante_seleccionada: selectedTalla || null }],
      'deduct'
    )
    if (!stockResult.ok) {
      console.error('[ProductDetail] stock decrement errors:', stockResult.errors)
    }

    setFeedback('buy')
    setBuying(false)
    setBuyName('')
    setBuyPhone('')

    fetch('/api/push/quickbuy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_tienda: tienda.id, cliente_nombre: buyName.trim(), total, id_pedido: pedido.id }),
    }).catch((e) => console.error('[ProductDetail] push error', e))

    const mensaje = `Hola! Quiero hacer el siguiente pedido:\n*Pedido #${orderId}*\n\n- ${nombreConVariante} x${quantity} = RD$${formatearPrecio(total)}\n\n*💰 Total General: RD$${formatearPrecio(total)}*\n\n👤 *Cliente:* ${buyName.trim()}${buyPhone.trim() ? `\n📞 *Teléfono:* ${buyPhone.trim()}` : ''}`
    const whatsappUrl = `https://wa.me/${numeroLimpio}?text=${encodeURIComponent(mensaje)}`
    window.open(whatsappUrl, '_blank')

    setTimeout(() => setFeedback('idle'), 2000)
  }

  const productoSlug = producto.slug || producto.id
  const logoUrl = perfil?.logo_url as string | null | undefined

  const numeroLimpio = tienda.whatsapp_num?.replace(/\D/g, '') || ''

  const vars = {
    textPrimary: 'var(--text-primary)',
    textSecondary: 'var(--text-secondary)',
    textMuted: 'var(--text-muted)',
    bgBody: 'var(--bg-body)',
    bgSidebar: 'var(--bg-sidebar)',
    bgCard: 'var(--bg-card)',
    bgElevated: 'var(--bg-elevated)',
    bgHeader: 'var(--bg-header)',
    bgSurfaceHover: 'var(--bg-surface-hover)',
    bgInput: 'var(--bg-input)',
    borderLight: 'var(--border-light)',
    borderMedium: 'var(--border-medium)',
    primary: 'var(--primary)',
  }

  return (
    <div className="min-h-screen pb-24 md:pb-0 md:flex"
      style={{ backgroundColor: vars.bgBody, color: vars.textPrimary }}>

      {/* ===== DESKTOP SIDEBAR (md+) ===== */}
      <aside className="hidden md:flex md:flex-col md:w-60 md:shrink-0 md:h-screen md:sticky md:top-0 sidebar md:border-r md:p-5"
        style={{ borderRightColor: vars.borderLight }}>
        <Link href={`/catalogo/${tiendaSlug}`} className="flex items-center gap-3 mb-5 hover:opacity-80 transition-opacity">
          {logoUrl ? (
            <Image src={logoUrl} alt={tienda.nombre_tienda} width={36} height={36} className="rounded-lg object-cover"
              style={{ boxShadow: `0 0 0 1px ${vars.borderLight}` }} />
          ) : (
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-sm font-bold"
              style={{ backgroundColor: vars.primary }}>
              {tienda.nombre_tienda[0]}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-bold" style={{ color: vars.textPrimary }}>{nombreTienda}</p>
          </div>
        </Link>

        <button onClick={() => setIsOpen(true)}
          className="w-full flex items-center justify-between gap-2 px-4 py-2.5 mb-4 rounded-xl text-sm font-bold transition-all border"
          style={{ backgroundColor: `color-mix(in srgb, ${vars.primary} 10%, transparent)`, color: vars.primary, borderColor: `color-mix(in srgb, ${vars.primary} 20%, transparent)` }}>
          <span className="flex items-center gap-2">
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            Carrito
          </span>
          {totalItems > 0 && (
            <span className="text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center"
              style={{ backgroundColor: vars.primary }}>
              {totalItems > 9 ? '9+' : totalItems}
            </span>
          )}
        </button>

        <nav className="flex flex-col gap-1">
          {([['🏠', 'Inicio', ''], ['📦', 'Productos', '?tab=menu'], ['📋', 'Rastrear', '?tab=pedidos'], ['🎟️', 'Tickets', '?tab=tickets']] as const).map(([icon, label, qs]) => (
            <Link key={label} href={`/catalogo/${tiendaSlug}${qs}`}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{ color: vars.textSecondary }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = vars.borderLight }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}>
              <span className="text-base">{icon}</span>
              {label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto pt-4 border-t" style={{ borderColor: vars.borderLight }}>
          <button onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{ color: vars.textSecondary }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = vars.borderLight }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}>
            {dark ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
            {dark ? 'Modo Claro' : 'Modo Oscuro'}
          </button>
        </div>
      </aside>

      {/* ===== MOBILE THEME TOGGLE (floating) ===== */}
      <button onClick={toggleTheme}
        className="md:hidden fixed bottom-20 right-4 z-50 w-10 h-10 rounded-full shadow-lg backdrop-blur-md flex items-center justify-center border"
        style={{ backgroundColor: vars.bgSidebar, color: vars.textSecondary, borderColor: vars.borderLight }}>
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

      {/* ===== MOBILE HEADER ===== */}
      <header className="md:hidden sticky top-0 z-30 backdrop-blur-md border-b"
        style={{ backgroundColor: vars.bgHeader, borderColor: vars.borderLight }}>
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href={`/catalogo/${tiendaSlug}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            {logoUrl ? (
              <Image src={logoUrl} alt={tienda.nombre_tienda} width={28} height={28} className="rounded-full object-cover" />
            ) : (
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: vars.primary }}>
                {tienda.nombre_tienda[0]}
              </div>
            )}
            <span className="text-sm font-bold" style={{ color: vars.textPrimary }}>{tienda.nombre_tienda}</span>
          </Link>
          <button onClick={() => setIsOpen(true)}
            className="relative w-9 h-9 rounded-full flex items-center justify-center transition-all"
            style={{ backgroundColor: vars.bgInput, color: vars.textSecondary }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = vars.bgSurfaceHover }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = vars.bgInput }}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center shadow-md"
                style={{ backgroundColor: vars.primary }}>
                {totalItems > 9 ? '9+' : totalItems}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* ===== PRODUCT CONTENT ===== */}
      <div className="flex-1 min-w-0 max-w-5xl mx-auto w-full px-4 py-6">
        <Link href={`/catalogo/${tiendaSlug}`} className="text-sm hover:underline inline-block"
          style={{ color: vars.textSecondary }}>
          ← Volver al catálogo
        </Link>
        <div className="grid md:grid-cols-2 gap-8 items-start mt-4">
          <div className="w-full aspect-square rounded-2xl overflow-hidden"
            style={{ backgroundColor: vars.bgElevated }}>
            {producto.imagen_url ? (
              <Image src={producto.imagen_url} alt={producto.nombre} width={600} height={600} className="w-full h-full object-cover" />
            ) : (
              <div className="flex items-center justify-center h-full">
                <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  style={{ color: vars.textMuted }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-4">
            <h1 className="text-3xl font-bold" style={{ color: vars.textPrimary }}>{producto.nombre}</h1>

            <div className="flex items-center gap-2">
              {selectedPrecioVariant != null ? (
                <span className="text-xl" style={{ color: vars.textSecondary }}>{moneda} {formatearPrecio(selectedPrecioVariant)}</span>
              ) : producto.precio_oferta ? (
                <>
                  <span className="text-lg line-through" style={{ color: vars.textMuted }}>{moneda} {formatearPrecio(producto.precio)}</span>
                  <span className="text-xl font-bold" style={{ color: vars.primary }}>{moneda} {formatearPrecio(producto.precio_oferta)}</span>
                </>
              ) : desdeMenor ? (
                <span className="text-xl" style={{ color: vars.textSecondary }}>Desde {moneda} {formatearPrecio(precioMinimoVariantes)}</span>
              ) : (
                <span className="text-xl" style={{ color: vars.textSecondary }}>{moneda} {formatearPrecio(producto.precio)}</span>
              )}
            </div>

            {necesitaTalla && (
              <div className="flex flex-wrap gap-1.5">
                {producto.tallas.map((t: any) => {
                  const tallaStr = typeof t === 'string' ? t : t.talla
                  const agotado = (typeof t !== 'string' ? t.stock : 999) <= 0
                  const seleccion = selectedTalla === tallaStr
                  const chipStyle: CSSProperties = {
                    borderRadius: '9999px',
                    padding: '2px 10px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    border: '1px solid',
                    cursor: agotado ? 'not-allowed' : 'pointer',
                    textDecoration: agotado ? 'line-through' : 'none',
                    transition: 'all 0.15s',
                  }
                  if (seleccion) {
                    chipStyle.backgroundColor = vars.textPrimary
                    chipStyle.color = vars.bgBody
                    chipStyle.borderColor = vars.textPrimary
                  } else if (agotado) {
                    chipStyle.backgroundColor = 'transparent'
                    chipStyle.color = vars.textMuted
                    chipStyle.borderColor = vars.borderLight
                  } else {
                    chipStyle.backgroundColor = 'transparent'
                    chipStyle.color = vars.textSecondary
                    chipStyle.borderColor = vars.borderLight
                  }
                  return (
                    <span key={tallaStr}
                      style={chipStyle}
                      onClick={() => { if (!agotado) { setSelectedTalla(tallaStr); setSelectedPrecioVariant(typeof t !== 'string' ? t.precio : null) } }}
                      onMouseEnter={e => { if (!agotado && !seleccion) { e.currentTarget.style.borderColor = vars.textPrimary; e.currentTarget.style.color = vars.textPrimary } }}
                      onMouseLeave={e => { if (!agotado && !seleccion) { e.currentTarget.style.borderColor = vars.borderLight; e.currentTarget.style.color = vars.textSecondary } }}>
                      {tallaStr}
                    </span>
                  )
                })}
              </div>
            )}

            {producto.descripcion && (
              <p className="leading-relaxed" style={{ color: vars.textSecondary }}>{producto.descripcion}</p>
            )}

            <div className="flex items-center gap-3 pt-2">
              <span className="text-sm font-semibold" style={{ color: vars.textPrimary }}>Cantidad</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-lg transition-all"
                  style={{ backgroundColor: vars.bgInput, color: vars.textSecondary }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = vars.bgSurfaceHover }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = vars.bgInput }}>−</button>
                <span className="w-8 text-center text-base font-bold" style={{ color: vars.textPrimary }}>{quantity}</span>
                <button onClick={() => setQuantity(quantity + 1)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-lg transition-all"
                  style={{ backgroundColor: vars.bgInput, color: vars.textSecondary }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = vars.bgSurfaceHover }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = vars.bgInput }}>+</button>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => doAddToCart(selectedTalla, selectedPrecioVariant)}
                className="flex-1 py-3 rounded-full border-2 font-bold text-sm transition-all"
                style={{ borderColor: vars.textPrimary, color: vars.textPrimary }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = vars.bgSurfaceHover }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}>
                {feedback === 'cart' ? '✓ Agregado' : '🛒 Carrito'}
              </button>
              <button onClick={() => handleBuy()} disabled={buying}
                className="flex-1 py-3 rounded-full font-bold text-sm disabled:opacity-50 transition-all shadow-sm"
                style={{ backgroundColor: vars.textPrimary, color: vars.bgBody }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '0.9' }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}>
                {feedback === 'buy' ? '✓ Listo' : buying ? '...' : 'Comprar ahora'}
              </button>
            </div>

            {showBuyForm && (
              <div className="space-y-3 pt-2 border-t" style={{ borderColor: vars.borderLight }}>
                <p className="text-sm font-semibold" style={{ color: vars.textPrimary }}>Tus datos</p>
                <input type="text" value={buyName} onChange={e => setBuyName(e.target.value)}
                  placeholder="Tu nombre"
                  className="w-full text-sm rounded-xl px-3 py-2.5 outline-none transition-all"
                  style={{
                    color: vars.textPrimary,
                    backgroundColor: vars.bgInput,
                    border: `1px solid ${vars.borderLight}`,
                    boxShadow: `0 0 0 0 ${vars.textPrimary}`,
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = vars.textPrimary; e.currentTarget.style.boxShadow = `0 0 0 2px ${vars.borderMedium}` }}
                  onBlur={e => { e.currentTarget.style.borderColor = vars.borderLight; e.currentTarget.style.boxShadow = 'none' }} />
                <input type="tel" value={buyPhone} onChange={e => setBuyPhone(e.target.value)}
                  placeholder="Tu WhatsApp (829-123-4567)"
                  className="w-full text-sm rounded-xl px-3 py-2.5 outline-none transition-all"
                  style={{
                    color: vars.textPrimary,
                    backgroundColor: vars.bgInput,
                    border: `1px solid ${vars.borderLight}`,
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = vars.textPrimary; e.currentTarget.style.boxShadow = `0 0 0 2px ${vars.borderMedium}` }}
                  onBlur={e => { e.currentTarget.style.borderColor = vars.borderLight; e.currentTarget.style.boxShadow = 'none' }} />
                <div className="flex gap-2">
                  <button onClick={() => { setShowBuyForm(false); setBuyName(''); setBuyPhone('') }}
                    className="flex-1 py-2.5 rounded-full font-semibold text-sm transition-all"
                    style={{ border: `1px solid ${vars.borderMedium}`, color: vars.textSecondary }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = vars.bgSurfaceHover }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}>Cancelar</button>
                  <button onClick={confirmBuy} disabled={!buyName.trim() || !buyPhone.trim()}
                    className="flex-1 py-2.5 rounded-full font-bold text-sm disabled:opacity-40 transition-all shadow-sm"
                    style={{ backgroundColor: vars.textPrimary, color: vars.bgBody }}
                    onMouseEnter={e => { e.currentTarget.style.opacity = '0.9' }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}>Confirmar compra</button>
                </div>
              </div>
            )}

            <button onClick={() => setShowShareModal(true)}
              className="w-full py-3 rounded-full text-sm font-semibold transition-all border"
              style={{ borderColor: vars.borderLight, color: vars.textPrimary }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = vars.bgSurfaceHover }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}>
              Compartir
            </button>
          </div>
        </div>

      {/* ===== SUGERIDOS ===== */}
      <div className="px-4 pb-8">
        <h2 className="text-lg font-bold mb-4" style={{ color: vars.textPrimary }}>
          {sugeridos.length > 0 ? 'También te puede interesar' : 'Descubre más productos'}
        </h2>
        {sugeridos.length > 0 ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {sugeridos.map((s) => {
                const precioFinal = s.precio_oferta ?? s.precio
                return (
                  <Link
                    key={s.id}
                    href={`/catalogo/${tiendaSlug}/producto/${s.slug || s.id}`}
                    className="group rounded-xl overflow-hidden border transition-all hover:shadow-lg"
                    style={{ backgroundColor: vars.bgCard, borderColor: vars.borderLight }}
                  >
                    <div className="aspect-square overflow-hidden" style={{ backgroundColor: vars.bgBody }}>
                      {s.imagen_url ? (
                        <Image src={s.imagen_url} alt={s.nombre} width={300} height={300} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                            style={{ color: vars.textMuted }}>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="p-2.5">
                      <p className="text-xs font-semibold line-clamp-2 leading-snug" style={{ color: vars.textPrimary }}>{s.nombre}</p>
                      <p className="text-sm font-bold mt-1" style={{ color: vars.primary }}>{tienda.moneda_simbolo}{formatearPrecio(precioFinal)}</p>
                    </div>
                  </Link>
                )
              })}
            </div>
            <div className="mt-6 text-center">
              <Link href={`/catalogo/${tiendaSlug}`}
                className="inline-flex items-center gap-2 text-sm font-semibold px-6 py-2.5 rounded-full border transition-all"
                style={{ borderColor: vars.borderLight, color: vars.textPrimary }}>
                Ver catálogo completo →
              </Link>
            </div>
          </>
        ) : (
          <div className="text-center py-10" style={{ color: vars.textSecondary }}>
            <p className="text-sm mb-4">No hay sugerencias disponibles en este momento.</p>
            <Link href={`/catalogo/${tiendaSlug}`}
              className="inline-flex items-center gap-2 text-sm font-semibold px-6 py-2.5 rounded-full border transition-all"
              style={{ borderColor: vars.borderLight, color: vars.textPrimary }}>
              Explorar catálogo →
            </Link>
          </div>
        )}
      </div>
      </div>

      {/* ===== GLOBAL FLOATING COMPONENTS ===== */}
      <CartDrawer idTienda={tiendaSlug} whatsappNumber={numeroLimpio} hideCheckout />
      <SocialToast productNames={[producto.nombre]} />
      <div className="md:hidden">
        <BottomNav activeTab={activeNavTab} onTabChange={handleNavChange} />
      </div>

      {showSizeModal && (
        <ModalSeleccionarTalla
          producto={producto}
          monedaSimbolo={moneda}
          onConfirm={handleSizeConfirm}
          onClose={() => { setShowSizeModal(false); setPendingBuy(false) }}
        />
      )}

      {showShareModal && (
        <ModalCompartirProducto
          productoNombre={producto.nombre}
          tiendaSlug={tiendaSlug}
          productoSlug={productoSlug}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  )
}
