'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useConfig } from '@/context/ConfigProvider'
import { useCart } from '@/context/CartContext'
import CartDrawer from '@/components/cart/CartDrawer'
import BottomNav, { type TabId } from '@/components/catalog/BottomNav'
import SocialToast from '@/components/catalog/SocialToast'
import TabInicio from '@/components/catalog/TabInicio'
import TabMenu from '@/components/catalog/TabMenu'
import TabPedidos from '@/components/catalog/TabPedidos'
import TabTickets from '@/components/catalog/TabTickets'
import ProductQuickView from '@/components/catalog/ProductQuickView'
import type { Producto } from '@/components/catalog/ProductCard'
import CatalogoModal from '@/components/catalog/CatalogoModal'
import type { CatalogoModalConfig } from '@/components/catalog/CatalogoModal'

interface Props {
  id_tienda: string
  productos: Producto[]
  openCart?: boolean
}

const navItems: { id: TabId; label: string; icon: string }[] = [
  { id: 'inicio', label: 'Inicio', icon: '🏠' },
  { id: 'menu', label: 'Productos', icon: '📦' },
  { id: 'pedidos', label: 'Rastrear', icon: '📋' },
  { id: 'tickets', label: 'Tickets', icon: '🎟️' },
]

export default function CatalogContent({ id_tienda, productos, openCart }: Props) {
  const { logoUrl, nombreTienda, mensajeBienvenida, whatsappNumber, monedaSimbolo, instagramUrl, facebookUrl, tiktokUrl, mapsUrl, tipoNegocio } = useConfig()
  const { setIsOpen, totalItems } = useCart()

  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<TabId>('inicio')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam && ['inicio', 'menu', 'pedidos', 'tickets'].includes(tabParam)) {
      setActiveTab(tabParam as TabId)
    }
  }, [searchParams])
  const [selectedCategory, setSelectedCategory] = useState('')
  const [giftMode, setGiftMode] = useState(false)
  const [giftSender, setGiftSender] = useState('')
  const [giftReceiver, setGiftReceiver] = useState('')
  const [giftMessage, setGiftMessage] = useState('')
  const [quickViewProduct, setQuickViewProduct] = useState<Producto | null>(null)

  const [dark, setDark] = useState(false)
  const [catalogoModal, setCatalogoModal] = useState<{ modal: CatalogoModalConfig; tienda: { logo_url: string | null; nombre: string } } | null>(null)
  const [modalDismissed, setModalDismissed] = useState(false)

  useEffect(() => {
    const dismissed = sessionStorage.getItem(`modal-dismissed-${id_tienda}`)
    if (dismissed) { setModalDismissed(true); return }
    fetch(`/api/catalogo/modal?id_tienda=${id_tienda}`)
      .then(r => r.json())
      .then(d => { if (d.modal) setCatalogoModal(d) })
      .catch(() => {})
  }, [id_tienda])

  const handleModalClose = useCallback(() => {
    setCatalogoModal(null)
    setModalDismissed(true)
    sessionStorage.setItem(`modal-dismissed-${id_tienda}`, '1')
  }, [id_tienda])

  const handleModalRedirect = useCallback((url: string) => {
    if (url.startsWith('producto:')) {
      const productId = url.replace('producto:', '')
      const product = productos.find(p => p.id === productId)
      if (product) {
        setCatalogoModal(null)
        setQuickViewProduct(product)
      }
    } else {
      window.open(url, '_blank')
    }
  }, [productos])

  useEffect(() => {
    const stored = localStorage.getItem('nexus-theme')
    if (stored === 'dark') {
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

  const numeroLimpio = whatsappNumber?.replace(/\D/g, '') || ''

  useEffect(() => {
    if (openCart) { setIsOpen(true); window.history.replaceState({}, '', `/catalogo/${id_tienda}`) }
  }, [openCart, setIsOpen, id_tienda])

  const categories = useMemo(() => {
    const cats = new Set<string>()
    for (const p of productos) { if (p.categoria) cats.add(p.categoria) }
    return ['', ...Array.from(cats).sort()]
  }, [productos])

  const nuevos = useMemo(() => [...productos].reverse().slice(0, 8), [productos])

  const masVendidos = useMemo(() => {
    return [...productos].filter(p => p.in_stock && p.stock > 0).slice(0, 8)
  }, [productos])

  const trendingIds = useMemo(() => new Set(masVendidos.slice(0, 4).map(p => p.id)), [masVendidos])

  const filtered = useMemo(() => {
    let list = productos
    if (selectedCategory) list = list.filter(p => p.categoria === selectedCategory)
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      list = list.filter(p => p.nombre.toLowerCase().includes(q) || (p.descripcion || '').toLowerCase().includes(q))
    }
    return list
  }, [productos, selectedCategory, searchQuery])

  const allProductNames = useMemo(() => productos.map(p => p.nombre), [productos])

  const giftModeInfo = giftMode && giftSender.trim()
    ? { sender: giftSender.trim(), receiver: giftReceiver.trim(), message: giftMessage.trim() }
    : undefined

  const handleGiftModeActivate = (data: { sender: string; receiver: string; message: string }) => {
    setGiftMode(true)
    setGiftSender(data.sender)
    setGiftReceiver(data.receiver)
    setGiftMessage(data.message)
    setActiveTab('menu')
  }

  return (
    <div className="min-h-screen bg-[var(--bg-body)] pb-24 md:pb-0 md:flex" style={{ color: 'var(--text-primary)' }}>

      {/* ===== DESKTOP SIDEBAR (md+) ===== */}
      <aside className="hidden md:flex md:flex-col md:w-60 md:shrink-0 md:h-screen md:sticky md:top-0 sidebar md:border-r md:border-[var(--border-light)] md:p-5">
        <Link href={`/catalogo/${id_tienda}`} className="flex items-center gap-3 mb-5 hover:opacity-80 transition-opacity">
          {logoUrl ? (
            <img src={logoUrl} alt="" className="w-9 h-9 rounded-lg object-cover ring-1 ring-[var(--border-light)]" />
          ) : (
            <div className="w-9 h-9 rounded-lg bg-[var(--primary)] flex items-center justify-center text-white text-sm font-bold">
              {nombreTienda[0]}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{nombreTienda}</p>
          </div>
        </Link>

        <button onClick={() => setIsOpen(true)}
          className="w-full flex items-center justify-between gap-2 px-4 py-2.5 mb-4 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] text-sm font-bold hover:bg-[var(--primary)]/20 transition-all border border-[var(--primary)]/20">
          <span className="flex items-center gap-2">
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            Carrito
          </span>
          {totalItems > 0 && (
            <span className="bg-[var(--primary)] text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
              {totalItems > 9 ? '9+' : totalItems}
            </span>
          )}
        </button>

        <nav className="flex flex-col gap-1">
          {navItems.map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                activeTab === item.id
                  ? 'bg-[var(--primary)]/10 text-[var(--primary)] font-semibold'
                  : 'hover:bg-[var(--border-light)]'
              }`} style={{ color: activeTab === item.id ? undefined : 'var(--text-secondary)' }}>
              <span className="text-base">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="mt-auto pt-4 border-t border-[var(--border-light)]">
          <button onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium hover:bg-[var(--border-light)] transition-all"
            style={{ color: 'var(--text-secondary)' }}>
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
        style={{ backgroundColor: 'var(--bg-sidebar)', color: 'var(--text-secondary)', borderColor: 'var(--border-light)' }}>
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

      {/* ===== MAIN CONTENT ===== */}
      <div className="flex-1 min-w-0">
        {activeTab === 'inicio' && (
          <TabInicio
            logoUrl={logoUrl}
            nombreTienda={nombreTienda}
            mensajeBienvenida={mensajeBienvenida}
            whatsappNumber={whatsappNumber}
            monedaSimbolo={monedaSimbolo}
            masVendidos={masVendidos}
            nuevos={nuevos}
            giftMode={giftMode}
            trendingIds={trendingIds}
            onQuickView={setQuickViewProduct}
            instagramUrl={instagramUrl}
            facebookUrl={facebookUrl}
            tiktokUrl={tiktokUrl}
            mapsUrl={mapsUrl}
          />
        )}

        {activeTab === 'menu' && (
          <TabMenu
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            categories={categories}
            filtered={filtered}
            monedaSimbolo={monedaSimbolo}
            giftMode={giftMode}
            trendingIds={trendingIds}
            onQuickView={setQuickViewProduct}
            tipoNegocio={tipoNegocio}
          />
        )}

        {activeTab === 'pedidos' && <TabPedidos id_tienda={id_tienda} />}

        {activeTab === 'tickets' && (
          <TabTickets
            id_tienda={id_tienda}
            onGiftModeActivate={handleGiftModeActivate}
            giftMode={giftMode}
          />
        )}

        {/* ===== QUICK VIEW MODAL ===== */}
        {quickViewProduct && (
          <ProductQuickView
            producto={quickViewProduct}
            monedaSimbolo={monedaSimbolo}
            onClose={() => setQuickViewProduct(null)}
          />
        )}
      </div>

      {/* ===== GLOBAL FLOATING COMPONENTS ===== */}
      <CartDrawer idTienda={id_tienda} whatsappNumber={numeroLimpio} giftMode={giftModeInfo} />
      <div className="md:hidden">
        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
      <SocialToast productNames={allProductNames} />

      {catalogoModal && !modalDismissed && (
        <CatalogoModal
          config={catalogoModal.modal}
          tiendaNombre={catalogoModal.tienda.nombre}
          logoUrl={catalogoModal.tienda.logo_url}
          onClose={handleModalClose}
          onRedirect={handleModalRedirect}
        />
      )}
    </div>
  )
}
