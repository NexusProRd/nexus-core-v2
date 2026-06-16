'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useConfig } from '@/context/ConfigProvider'
import { useCart } from '@/context/CartContext'
import CartDrawer from '@/components/cart/CartDrawer'
import BottomNav, { type TabId } from '@/components/catalog/BottomNav'
import StoreHeader from '@/components/store/StoreHeader'
import SocialToast from '@/components/catalog/SocialToast'
import TabInicio from '@/components/catalog/TabInicio'
import TabMenu from '@/components/catalog/TabMenu'
import TabPedidos from '@/components/catalog/TabPedidos'
import ProductQuickView from '@/components/catalog/ProductQuickView'
import type { Producto } from '@/components/catalog/ProductCard'
import CatalogoModal from '@/components/catalog/CatalogoModal'
import type { CatalogoModalConfig } from '@/components/catalog/CatalogoModal'
import type { Portada } from '@/types/portada'

interface Props {
  id_tienda: string
  productos: Producto[]
  openCart?: boolean
}

const navItems: { id: TabId; label: string; icon: string }[] = [
  { id: 'inicio', label: 'Inicio', icon: '🏠' },
  { id: 'menu', label: 'Productos', icon: '📦' },
  { id: 'pedidos', label: 'Rastrear', icon: '📋' },
]

export default function CatalogContent({ id_tienda, productos, openCart }: Props) {
  const { logoUrl, bannerUrl, slogan, nombreTienda, mensajeBienvenida, whatsappNumber, instagramUrl, facebookUrl, tiktokUrl, mapsUrl, tipoNegocio } = useConfig()
  const { setIsOpen, totalItems } = useCart()

  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<TabId>('inicio')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam && ['inicio', 'menu', 'pedidos'].includes(tabParam)) {
      setActiveTab(tabParam as TabId)
    }
  }, [searchParams])
  const [selectedCategory, setSelectedCategory] = useState('')
  const [giftMode, setGiftMode] = useState(false)
  const [giftSender, setGiftSender] = useState('')
  const [giftReceiver, setGiftReceiver] = useState('')
  const [giftMessage, setGiftMessage] = useState('')
  const [quickViewProduct, setQuickViewProduct] = useState<Producto | null>(null)
  const [showRegalosMsg, setShowRegalosMsg] = useState(false)

  const [portadas, setPortadas] = useState<Portada[]>([])

  useEffect(() => {
    fetch(`/api/portadas?id_tienda=${id_tienda}`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setPortadas(data) })
      .catch(() => {})
  }, [id_tienda])

  const handleOpenProduct = useCallback((productId: string) => {
    const product = productos.find(p => p.id === productId)
    if (product) setQuickViewProduct(product)
  }, [productos])

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

  const nuevos = useMemo(() => {
    return [...productos]
      .sort((a, b) => {
        const dateA = (a as any).creado_at
        const dateB = (b as any).creado_at
        if (!dateA && !dateB) return 0
        if (!dateA) return 1
        if (!dateB) return -1
        return new Date(dateB).getTime() - new Date(dateA).getTime()
      })
      .slice(0, 8)
  }, [productos])

  const ofertas = useMemo(() => {
    return [...productos]
      .filter(p => p.precio_oferta != null && p.precio_oferta > 0 && p.precio_oferta < p.precio)
      .slice(0, 8)
  }, [productos])

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
    <div className="min-h-screen bg-[var(--bg-body)] pb-24" style={{ color: 'var(--text-primary)' }}>

      <StoreHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        dark={dark}
        onToggleTheme={toggleTheme}
        logoUrl={logoUrl}
        nombreTienda={nombreTienda}
        whatsappNumber={whatsappNumber}
        onShowRegalos={() => setShowRegalosMsg(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* MOBILE EXPERIENCE PASS: Theme toggle with better position above nav */}
      <button onClick={toggleTheme}
        className="md:hidden fixed bottom-24 right-4 z-50 w-11 h-11 rounded-full shadow-lg backdrop-blur-xl flex items-center justify-center border active:scale-90 transition-transform touch-target"
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
      <div>
        {activeTab === 'inicio' && (
          <TabInicio
            portadas={portadas}
            productos={productos}
            logoUrl={logoUrl}
            bannerUrl={bannerUrl}
            slogan={slogan}
            nombreTienda={nombreTienda}
            mensajeBienvenida={mensajeBienvenida}
            whatsappNumber={whatsappNumber}
            masVendidos={masVendidos}
            nuevos={nuevos}
            ofertas={ofertas}
            giftMode={giftMode}
            trendingIds={trendingIds}
            onQuickView={setQuickViewProduct}
            instagramUrl={instagramUrl}
            facebookUrl={facebookUrl}
            tiktokUrl={tiktokUrl}
            mapsUrl={mapsUrl}
            onVerProductos={() => setActiveTab('menu')}
            onOpenProduct={handleOpenProduct}
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
            giftMode={giftMode}
            trendingIds={trendingIds}
            onQuickView={setQuickViewProduct}
            tipoNegocio={tipoNegocio}
          />
        )}

        {activeTab === 'pedidos' && <TabPedidos id_tienda={id_tienda} />}

        {/* ===== QUICK VIEW MODAL ===== */}
        {quickViewProduct && (
          <ProductQuickView
            producto={quickViewProduct}
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

      <footer className="text-center py-5 px-4 border-t border-slate-100 mt-4">
        <p className="text-[10px] text-slate-400">
          <a href="/legal/terminos" target="_blank" className="hover:underline">Términos de Uso</a>
          {' · '}
          <a href="/legal/privacidad" target="_blank" className="hover:underline">Política de Privacidad</a>
        </p>
      </footer>

      {showRegalosMsg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/20 backdrop-blur-sm" onClick={() => setShowRegalosMsg(false)}>
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 px-6 py-5 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900">Regalos Corporativos</p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Estamos trabajando para habilitar esta funcionalidad con la mayor brevedad posible.
                </p>
              </div>
              <button onClick={() => setShowRegalosMsg(false)} className="text-slate-400 hover:text-slate-600 -mr-1 -mt-1 p-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
