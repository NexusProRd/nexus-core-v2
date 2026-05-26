'use client'

import { useCart } from '@/context/CartContext'

interface AddToCartButtonProps {
  id: string
  nombre: string
  precio: number
  imagen_url: string | null
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

export default function AddToCartButton({ id, nombre, precio, imagen_url, children, className = '', style }: AddToCartButtonProps) {
  const { addToCart } = useCart()

  return (
    <button
      onClick={() => addToCart({ id, nombre, precio, imagen_url })}
      className={className}
      style={style}
    >
      {children}
    </button>
  )
}