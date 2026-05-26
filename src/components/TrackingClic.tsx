'use client'

import { createClient } from '@/lib/supabase'

export default function TrackingClic({ 
  idTienda, 
  nombreProducto, 
  precio, 
  children, 
  href,
  style
}: { 
  idTienda: string
  nombreProducto: string
  precio: number
  children: React.ReactNode
  href: string
  style?: React.CSSProperties
}) {
  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    
    const supabase = createClient()
    
    const { data: pedido, error } = await supabase
      .from('pedidos')
      .insert({
        id_tienda: idTienda,
        cliente_nombre: 'Cliente desde catálogo',
        total: precio,
        estado: 'pendiente'
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating order:', error)
      return
    }

    await supabase.from('detalles_pedido').insert({
      id_pedido: pedido.id,
      producto: nombreProducto,
      cantidad: 1,
      precio_unitario: precio
    })

    window.open(href, '_blank')
  }

  return (
    <button 
      onClick={handleClick}
      className="block w-full text-white text-center font-bold py-1.5 sm:py-2 px-2 sm:px-4 rounded-lg text-xs sm:text-sm hover:opacity-90 transition-opacity"
      style={style}
    >
      {children}
    </button>
  )
}