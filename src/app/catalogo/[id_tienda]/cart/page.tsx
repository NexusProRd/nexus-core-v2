'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function CartRedirect() {
  const params = useParams()
  const router = useRouter()
  const idTienda = params?.id_tienda as string

  useEffect(() => {
    router.replace(`/catalogo/${idTienda}?openCart=1`)
  }, [idTienda, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
      <div className="animate-pulse text-slate-400 text-sm">Redirigiendo al carrito...</div>
    </div>
  )
}
