'use client'

import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react'

export interface CartItem {
  id: string
  nombre: string
  precio: number
  imagen_url: string | null
  cantidad: number
  isGift?: boolean
  storeId?: string
  variante_seleccionada?: string
  precio_cobrado?: number
  peso_libras?: number
  modo_venta?: 'unidad' | 'libra'
}

interface CartContextType {
  items: CartItem[]
  addToCart: (producto: Omit<CartItem, 'cantidad'>) => boolean
  addMultipleToCart: (productos: Omit<CartItem, 'cantidad'>[]) => void
  removeFromCart: (id: string) => void
  updateQuantity: (id: string, cantidad: number) => void
  clearCart: () => void
  totalItems: number
  totalPrice: number
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  hasGiftInCart: () => boolean
  storeId: string | null
  setStoreId: (id: string | null) => void
}

const CartContext = createContext<CartContextType | null>(null)

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    console.warn('useCart called outside CartProvider - returning fallback')
    return {
      items: [] as CartItem[],
      addToCart: () => true,
      addMultipleToCart: () => {},
      removeFromCart: () => {},
      updateQuantity: () => {},
      clearCart: () => {},
      totalItems: 0,
      totalPrice: 0,
      isOpen: false,
      setIsOpen: () => {},
      hasGiftInCart: () => false,
      storeId: null as string | null,
      setStoreId: () => {},
    }
  }
  return context
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [storeId, setStoreId] = useState<string | null>(null)
  const [isHydrated, setIsHydrated] = useState(false)
  const itemsRef = useRef<CartItem[]>(items)

  useEffect(() => {
    itemsRef.current = items
  }, [items])

  useEffect(() => {
    const key = storeId ? `nexus-cart-${storeId}` : 'nexus-cart'
    const saved = localStorage.getItem(key)
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as CartItem[]
        setItems(parsed.map(item => ({
          ...item,
          cantidad: item.cantidad ?? 1,
          isGift: item.isGift ?? false,
        })))
        setIsHydrated(true)
        return
      } catch {
        console.warn('[CartProvider] parse error, removing key')
        localStorage.removeItem(key)
      }
    }
    if (itemsRef.current.length === 0) {
      setItems([])
    }
    setIsHydrated(true)
  }, [storeId])

  useEffect(() => {
    if (!isHydrated) return
    const key = storeId ? `nexus-cart-${storeId}` : 'nexus-cart'
    localStorage.setItem(key, JSON.stringify(items))
  }, [items, isHydrated, storeId])

  const addToCart = (producto: Omit<CartItem, 'cantidad'>): boolean => {
    const isGift = producto.isGift ?? false

    if (producto.storeId && producto.storeId !== storeId) {
      const oldKey = storeId ? `nexus-cart-${storeId}` : 'nexus-cart'
      if (oldKey && itemsRef.current.length > 0) {
        localStorage.setItem(oldKey, JSON.stringify(itemsRef.current))
      }
      setStoreId(producto.storeId)
    }

    const prev = itemsRef.current
    const key = producto.modo_venta === 'libra' ? `${producto.id}__${producto.peso_libras}` : producto.id
    const existing = prev.find(item => {
      const itemKey = item.modo_venta === 'libra' ? `${item.id}__${item.peso_libras}` : item.id
      return itemKey === key
    })

    if (existing) {
      if (isGift) return false
      const next = prev.map(item => {
        const itemKey = item.modo_venta === 'libra' ? `${item.id}__${item.peso_libras}` : item.id
        return itemKey === key && !item.isGift
          ? { ...item, cantidad: item.cantidad + 1 }
          : item
      })
      setItems(next)
      itemsRef.current = next
      return true
    }

    const next = [...prev, { ...producto, isGift, cantidad: 1 }]
    setItems(next)
    itemsRef.current = next
    return true
  }

  const addMultipleToCart = (nuevosProductos: Omit<CartItem, 'cantidad'>[]): void => {
    const prev = itemsRef.current
    const updated = prev.map(item => ({ ...item }))

    for (const prod of nuevosProductos) {
      const key = prod.modo_venta === 'libra' ? `${prod.id}__${prod.peso_libras}` : prod.id
      const existe = updated.find(item => {
        const itemKey = item.modo_venta === 'libra' ? `${item.id}__${item.peso_libras}` : item.id
        return itemKey === key
      })
      if (existe) {
        existe.cantidad += 1
      } else {
        updated.push({ ...prod, cantidad: 1, isGift: prod.isGift ?? false })
      }
    }

    localStorage.setItem('nexus-cart', JSON.stringify(updated))
    setItems(updated)
    itemsRef.current = updated
  }

  const getItemKey = (item: CartItem) => item.modo_venta === 'libra' ? `${item.id}__${item.peso_libras}` : item.id

  const hasGiftInCart = () => {
    return items.some(item => item.isGift)
  }

  const removeFromCart = (id: string) => {
    const next = itemsRef.current.filter(item => getItemKey(item) !== id)
    setItems(next)
    itemsRef.current = next
  }

  const updateQuantity = (id: string, cantidad: number) => {
    if (cantidad <= 0) {
      removeFromCart(id)
      return
    }
    const item = itemsRef.current.find(i => getItemKey(i) === id)
    if (item?.isGift) return
    const next = itemsRef.current.map(item =>
      getItemKey(item) === id && !item.isGift ? { ...item, cantidad } : item
    )
    setItems(next)
    itemsRef.current = next
  }

  const clearCart = () => {
    setItems([])
    itemsRef.current = []
    setIsOpen(false)
  }

  const totalItems = items.reduce((sum, item) => sum + item.cantidad, 0)
  const totalPrice = items.reduce((sum, item) => {
    if (item.isGift) return sum
    if (item.modo_venta === 'libra' && item.peso_libras) {
      return sum + Number(item.precio) * item.peso_libras * item.cantidad
    }
    return sum + Number(item.precio) * item.cantidad
  }, 0)

  if (!isHydrated) {
    return (
      <CartContext.Provider value={{
        items: [],
        addToCart: () => false,
        addMultipleToCart: () => {},
        removeFromCart: () => {},
        updateQuantity: () => {},
        clearCart: () => {},
        totalItems: 0,
        totalPrice: 0,
        isOpen,
        setIsOpen,
        hasGiftInCart: () => false,
        storeId,
        setStoreId,
      }}>
        {children}
      </CartContext.Provider>
    )
  }

  return (
    <CartContext.Provider value={{
      items,
      addToCart,
      addMultipleToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      totalItems,
      totalPrice,
      isOpen,
      setIsOpen,
      hasGiftInCart,
      storeId,
      setStoreId,
    }}>
      {children}
    </CartContext.Provider>
  )
}
