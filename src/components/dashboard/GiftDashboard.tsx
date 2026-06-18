'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { gestionarStock } from '@/lib/stock'

interface Gift {
  id: string
  store_id: string
  sender_name: string
  receiver_name: string
  personal_message: string | null
  gift_code: string
  is_redeemed: boolean
  status: 'pending' | 'approved' | 'rejected' | 'expired' | 'RESERVED' | 'CLAIMED' | 'cancelled'
  created_at: string
  items_list: { product_id: string; nombre: string; precio: number; imagen_url: string | null }[]
}

const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
  pending: { label: 'Pendiente', bg: 'bg-yellow-100', text: 'text-yellow-800' },
  approved: { label: 'Aprobado', bg: 'bg-green-100', text: 'text-green-800' },
  rejected: { label: 'Rechazado', bg: 'bg-red-100', text: 'text-red-800' },
  expired: { label: 'Vencido', bg: 'bg-slate-100', text: 'text-slate-500' },
  RESERVED: { label: 'Reservado', bg: 'bg-blue-100', text: 'text-blue-800' },
  CLAIMED: { label: 'Reclamado', bg: 'bg-emerald-100', text: 'text-emerald-800' },
  cancelled: { label: 'Cancelado', bg: 'bg-slate-100', text: 'text-slate-500' },
}

export default function GiftDashboard({ storeId }: { storeId: string }) {
  const [gifts, setGifts] = useState<Gift[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()

    const fetchGifts = async () => {
      const { data, error } = await supabase
        .from('gift_experiences')
        .select('*')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching gifts:', error)
        return
      }
      if (data) setGifts(data as Gift[])
      setLoading(false)
    }

    fetchGifts()

    const channel = supabase
      .channel('gift_dashboard')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'gift_experiences',
          filter: `store_id=eq.${storeId}`,
        },
        (payload) => {
          const newGift = payload.new as Gift
          setGifts((prev) => [newGift, ...prev])
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'gift_experiences',
          filter: `store_id=eq.${storeId}`,
        },
        (payload) => {
          const updatedGift = payload.new as Gift
          setGifts((prev) =>
            prev.map((g) => (g.id === updatedGift.id ? updatedGift : g))
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [storeId])

  const updateStatus = useCallback(
    async (gift: Gift, newStatus: 'approved' | 'rejected') => {
      setUpdatingId(gift.id)
      const supabase = createClient()

      if (newStatus === 'approved' && gift.items_list?.length > 0) {
        const productIds = gift.items_list.map(i => i.product_id)
        const { data: products } = await supabase
          .from('productos')
          .select('id, stock, in_stock')
          .in('id', productIds)

        const insufficient: string[] = []
        for (const item of gift.items_list) {
          const prod = products?.find(p => p.id === item.product_id)
          if (!prod || !prod.in_stock || prod.stock <= 0) {
            insufficient.push(item.nombre)
          }
        }

        if (insufficient.length > 0) {
          console.error('[GiftDashboard] Stock insuficiente para:', insufficient.join(', '))
          setUpdatingId(null)
          return
        }

        const stockResult = await gestionarStock(
          supabase,
          gift.items_list.map(i => ({
            id_producto: i.product_id,
            nombre: i.nombre,
            cantidad: 1,
            variante_seleccionada: null,
          })),
          'deduct'
        )
        if (!stockResult.ok) {
          console.error('[GiftDashboard] stock decrement errors:', stockResult.errors)
          setUpdatingId(null)
          return
        }
      }

      const updates: any = { status: newStatus }
      if (newStatus === 'approved') updates.approved_at = new Date().toISOString()
      const { error } = await supabase
        .from('gift_experiences')
        .update(updates)
        .eq('id', gift.id)

      if (error) {
        console.error('Error updating gift status:', error)
      }
      setUpdatingId(null)
    },
    []
  )

  const cancelGift = useCallback(async (gift: Gift) => {
    if (gift.status !== 'RESERVED' && gift.status !== 'CLAIMED') return
    setUpdatingId(gift.id)
    const supabase = createClient()

    const hasItems = gift.items_list?.length > 0

    if (hasItems) {
      const stockResult = await gestionarStock(
        supabase,
        gift.items_list.map(i => ({
          id_producto: i.product_id,
          nombre: i.nombre,
          cantidad: 1,
          variante_seleccionada: null,
        })),
        'unreserve'
      )
      if (!stockResult.ok) {
        console.error('[GiftDashboard] Error al liberar stock:', stockResult.errors)
        setUpdatingId(null)
        return
      }
    }

    const { error } = await supabase
      .from('gift_experiences')
      .update({ status: 'cancelled' })
      .eq('id', gift.id)

    if (error) {
      console.error('[GiftDashboard] Error al cancelar regalo:', error)
    }
    setUpdatingId(null)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-900">Regalos Únicos</h2>
        <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
          {gifts.length} regalo{gifts.length !== 1 ? 's' : ''}
        </span>
      </div>

      {gifts.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 rounded-2xl">
          <span className="text-5xl">🎁</span>
          <p className="mt-3 text-slate-500 text-sm">No hay regalos aún</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 font-medium text-slate-500">De</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500">Para</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500">Código</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500">Estado</th>
                <th className="text-right py-3 px-4 font-medium text-slate-500">Acción</th>
              </tr>
            </thead>
            <tbody>
              {gifts.map((gift) => (
                <tr key={gift.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 text-slate-900 font-medium">{gift.sender_name}</td>
                  <td className="py-3 px-4 text-slate-700">{gift.receiver_name}</td>
                  <td className="py-3 px-4">
                    <code className="bg-slate-100 px-2 py-1 rounded text-xs font-mono text-slate-700">
                      {gift.gift_code}
                    </code>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${
                        statusConfig[gift.status].bg
                      } ${statusConfig[gift.status].text}`}
                    >
                      {statusConfig[gift.status].label}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {gift.status === 'pending' ? (
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => updateStatus(gift, 'approved')}
                          disabled={updatingId === gift.id}
                          className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                        >
                          Aprobar
                        </button>
                        <button
                          onClick={() => updateStatus(gift, 'rejected')}
                          disabled={updatingId === gift.id}
                          className="px-3 py-1.5 bg-red-500 text-white text-xs font-medium rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
                        >
                          Rechazar
                        </button>
                      </div>
                    ) : gift.status === 'RESERVED' || gift.status === 'CLAIMED' ? (
                      <button
                        onClick={() => cancelGift(gift)}
                        disabled={updatingId === gift.id}
                        className="px-3 py-1.5 bg-red-500 text-white text-xs font-medium rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
                      >
                        {updatingId === gift.id ? 'Cancelando...' : 'Cancelar'}
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400 italic">
                        {gift.status === 'approved' ? 'Aprobado' : gift.status === 'expired' ? 'Vencido' : gift.status === 'cancelled' ? 'Cancelado' : 'Rechazado'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
