'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function AutoRefresh({ tiendaId }: { tiendaId: string | null }) {
  const router = useRouter()

  useEffect(() => {
    if (!tiendaId) return
    const supabase = createClient()
    const canal = supabase
      .channel('analiticas-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pedidos', filter: `id_tienda=eq.${tiendaId}` }, () => {
        router.refresh()
      })
      .subscribe()
    return () => { supabase.removeChannel(canal) }
  }, [tiendaId, router])

  return null
}
