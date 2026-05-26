'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function StoreToggle({ tiendaId, abierta }: { tiendaId: string; abierta: boolean }) {
  const [isOpen, setIsOpen] = useState(abierta)
  const router = useRouter()

  const toggle = async () => {
    const supabase = createClient()
    await supabase.from('tiendas').update({ tienda_abierta: !isOpen }).eq('id', tiendaId)
    setIsOpen(!isOpen)
    router.refresh()
  }

  return (
    <button onClick={toggle} className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-semibold transition-all border ${
      isOpen ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
    }`}>
      <span className={`w-2 h-2 rounded-full ${isOpen ? 'bg-emerald-500' : 'bg-rose-500'}`} />
      {isOpen ? 'Tienda abierta' : 'Tienda cerrada'}
    </button>
  )
}