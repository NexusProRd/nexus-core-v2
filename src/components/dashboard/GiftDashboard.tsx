'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { convertGiftToGiftCard } from '@/lib/gift-cards'

interface Gift {
  id: string
  store_id: string
  sender_name: string
  sender_phone: string | null
  receiver_name: string
  personal_message: string | null
  gift_code: string
  is_redeemed: boolean
  status: 'pending' | 'approved' | 'rejected' | 'expired' | 'RESERVED' | 'CLAIMED' | 'DELIVERED' | 'cancelled'
  created_at: string
  items_list: { product_id: string; nombre: string; precio: number; imagen_url: string | null }[]
  delivery_address: string | null
  delivery_location_link: string | null
  location_requested_at: string | null
  delivered_at: string | null
  converted_to_giftcard_at: string | null
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {})
}

function sendGiftPush(storeId: string, event: string, giftCode: string, senderName?: string, receiverName?: string) {
  fetch('/api/push/gift-notify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idTienda: storeId, event, giftCode, senderName, receiverName }),
  }).catch(() => {})
}

const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
  pending: { label: 'Pendiente', bg: 'bg-yellow-100', text: 'text-yellow-800' },
  approved: { label: 'Aprobado', bg: 'bg-green-100', text: 'text-green-800' },
  rejected: { label: 'Rechazado', bg: 'bg-red-100', text: 'text-red-800' },
  expired: { label: 'Vencido', bg: 'bg-slate-100', text: 'text-slate-500' },
  RESERVED: { label: 'Reservado', bg: 'bg-blue-100', text: 'text-blue-800' },
  CLAIMED: { label: 'Reclamado', bg: 'bg-emerald-100', text: 'text-emerald-800' },
  DELIVERED: { label: 'Entregado', bg: 'bg-slate-100', text: 'text-slate-600' },
  cancelled: { label: 'Cancelado', bg: 'bg-slate-100', text: 'text-slate-500' },
  converted: { label: 'Convertido a Gift Card', bg: 'bg-purple-100', text: 'text-purple-700' },
}

export default function GiftDashboard({ storeId }: { storeId: string }) {
  const [gifts, setGifts] = useState<Gift[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [showConvertConfirm, setShowConvertConfirm] = useState<string | null>(null)
  const [convertingId, setConvertingId] = useState<string | null>(null)
  const [convertResult, setConvertResult] = useState<{ code: string; value: number; expiresAt: string } | null>(null)

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

      if (newStatus === 'rejected') {
        const { error } = await supabase
          .from('gift_experiences')
          .update({ status: 'rejected' })
          .eq('id', gift.id)
        if (error) console.error('[GiftDashboard] Error al rechazar:', error)
        setUpdatingId(null)
        return
      }

      const { data, error } = await supabase.rpc('aprobar_regalo_v2', { p_gift_id: gift.id })
      if (error) {
        console.error('[GiftDashboard] Error al aprobar:', error)
      } else if (!data?.success) {
        console.error('[GiftDashboard] aprobar_regalo_v2:', data?.error)
      } else {
        sendGiftPush(storeId, 'approved', gift.gift_code)
      }
      setUpdatingId(null)
    },
    []
  )

  const requestLocation = useCallback(async (gift: Gift) => {
    setUpdatingId(gift.id)
    const supabase = createClient()
    const { error } = await supabase
      .from('gift_experiences')
      .update({ location_requested_at: new Date().toISOString() })
      .eq('id', gift.id)
    if (error) {
      console.error('[GiftDashboard] Error al solicitar ubicación:', error)
    }
    setUpdatingId(null)
  }, [])

  const markDelivered = useCallback(async (gift: Gift) => {
    setUpdatingId(gift.id)
    const supabase = createClient()
    const { data, error } = await supabase.rpc('entregar_regalo_v2', { p_gift_id: gift.id })
    if (error) {
      console.error('[GiftDashboard] Error al marcar entregado:', error)
    } else if (!data?.success) {
      console.error('[GiftDashboard] entregar_regalo_v2:', data?.error)
    } else {
      sendGiftPush(storeId, 'delivered', gift.gift_code)
    }
    setUpdatingId(null)
  }, [])

  const cancelGift = useCallback(async (gift: Gift) => {
    if (gift.status !== 'RESERVED' && gift.status !== 'CLAIMED') return
    setUpdatingId(gift.id)
    const supabase = createClient()

    const { data, error } = await supabase.rpc('cancelar_regalo_v2', { p_gift_id: gift.id })
    if (error) {
      console.error('[GiftDashboard] Error al cancelar:', error)
    } else if (!data?.success) {
      console.error('[GiftDashboard] cancelar_regalo_v2:', data?.error)
    }
    setUpdatingId(null)
  }, [])

  const handleConvertGift = useCallback(async (giftId: string) => {
    setConvertingId(giftId)
    setShowConvertConfirm(null)
    const result = await convertGiftToGiftCard(giftId)
    if (result.success) {
      const gift = gifts.find(g => g.id === giftId)
      setConvertResult({ code: result.giftCard.code, value: result.value, expiresAt: result.expiresAt })
      setGifts((prev) =>
        prev.map((g) =>
          g.id === giftId ? { ...g, converted_to_giftcard_at: new Date().toISOString() } : g
        )
      )
      sendGiftPush(storeId, 'converted', gift?.gift_code || result.giftCard.code)
    } else {
      console.error('[GiftDashboard] Error al convertir:', result.error)
    }
    setConvertingId(null)
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
                <th className="text-left py-3 px-4 font-medium text-slate-500">Enlace</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500">Entrega</th>
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
                    {(gift.status === 'RESERVED' || gift.status === 'CLAIMED' || gift.status === 'DELIVERED') && (
                      <button
                        onClick={() => copyToClipboard(`${window.location.origin}/canje?gift=${gift.gift_code}&id=${gift.store_id}`)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium rounded-lg transition-colors"
                        title="Copiar enlace"
                      >
                        Copiar
                      </button>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {gift.status === 'CLAIMED' && !gift.delivery_address && (
                      <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 whitespace-nowrap">
                        🔴 Pendiente ubicación
                      </span>
                    )}
                    {gift.status === 'CLAIMED' && gift.delivery_address && (
                      <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 whitespace-nowrap">
                        🟢 Listo para entregar
                      </span>
                    )}
                    {gift.status === 'DELIVERED' && (
                      <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500 whitespace-nowrap">
                        ✅ Entregado
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 space-y-1">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${
                        statusConfig[gift.status]?.bg || 'bg-slate-100'
                      } ${statusConfig[gift.status]?.text || 'text-slate-500'}`}
                    >
                      {statusConfig[gift.status]?.label || gift.status}
                    </span>
                    {gift.converted_to_giftcard_at && (
                      <div className="text-xs font-medium text-purple-700 whitespace-nowrap">
                        🎁 Convertido a Gift Card
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {gift.converted_to_giftcard_at ? (
                      <span className="text-xs font-medium text-purple-700 italic">Procesado</span>
                    ) : gift.status === 'pending' ? (
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
                    ) : gift.status === 'RESERVED' ? (
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => setShowConvertConfirm(gift.id)}
                          disabled={updatingId === gift.id || convertingId === gift.id}
                          className="px-3 py-1.5 bg-purple-600 text-white text-xs font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
                        >
                          🎁 Convertir
                        </button>
                        <button
                          onClick={() => cancelGift(gift)}
                          disabled={updatingId === gift.id || convertingId === gift.id}
                          className="px-3 py-1.5 bg-red-500 text-white text-xs font-medium rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
                        >
                          {updatingId === gift.id ? 'Cancelando...' : 'Cancelar'}
                        </button>
                      </div>
                    ) : gift.status === 'CLAIMED' ? (
                      <div className="flex gap-2 justify-end flex-wrap">
                        {!gift.delivery_address && (
                          <button
                            onClick={() => requestLocation(gift)}
                            disabled={updatingId === gift.id || convertingId === gift.id}
                            className="px-3 py-1.5 bg-amber-500 text-white text-xs font-medium rounded-lg hover:bg-amber-600 disabled:opacity-50 transition-colors"
                          >
                            {updatingId === gift.id ? '...' : '📍 Solicitar ubicación'}
                          </button>
                        )}
                        {gift.delivery_address && (
                          <button
                            onClick={() => markDelivered(gift)}
                            disabled={updatingId === gift.id || convertingId === gift.id}
                            className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                          >
                            {updatingId === gift.id ? '...' : '🚚 Marcar entregado'}
                          </button>
                        )}
                        <button
                          onClick={() => setShowConvertConfirm(gift.id)}
                          disabled={updatingId === gift.id || convertingId === gift.id}
                          className="px-3 py-1.5 bg-purple-600 text-white text-xs font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
                        >
                          🎁 Convertir
                        </button>
                        <button
                          onClick={() => cancelGift(gift)}
                          disabled={updatingId === gift.id || convertingId === gift.id}
                          className="px-3 py-1.5 bg-red-500 text-white text-xs font-medium rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
                        >
                          {updatingId === gift.id ? 'Cancelando...' : 'Cancelar'}
                        </button>
                      </div>
                    ) : gift.status === 'expired' ? (
                      <button
                        onClick={() => setShowConvertConfirm(gift.id)}
                        disabled={updatingId === gift.id || convertingId === gift.id}
                        className="px-3 py-1.5 bg-purple-600 text-white text-xs font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
                      >
                        🎁 Convertir
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400 italic">
                        {gift.status === 'DELIVERED' ? 'Entregado' : gift.status === 'approved' ? 'Aprobado' : gift.status === 'cancelled' ? 'Cancelado' : 'Rechazado'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showConvertConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <div className="text-center mb-4">
              <span className="text-4xl">🎁</span>
              <h3 className="text-lg font-bold text-slate-900 mt-2">Convertir a Gift Card</h3>
              <p className="text-sm text-slate-500 mt-2">
                Esta acción convertirá el regalo en una Gift Card y no podrá revertirse desde la interfaz actual.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConvertConfirm(null)}
                disabled={convertingId !== null}
                className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-200 disabled:opacity-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleConvertGift(showConvertConfirm)}
                disabled={convertingId !== null}
                className="flex-1 px-4 py-2.5 bg-purple-600 text-white text-sm font-medium rounded-xl hover:bg-purple-700 disabled:opacity-50 transition-colors"
              >
                {convertingId !== null ? 'Convirtiendo...' : 'Convertir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {convertResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <div className="text-center mb-5">
              <span className="text-4xl">✅</span>
              <h3 className="text-lg font-bold text-slate-900 mt-2">Gift Card creada</h3>
            </div>
            <div className="space-y-3 bg-slate-50 rounded-xl p-4">
              <div>
                <span className="text-xs text-slate-500 uppercase tracking-wide font-medium">Código</span>
                <div className="mt-1 flex items-center gap-2">
                  <code className="text-lg font-mono font-bold text-slate-900 bg-white px-3 py-1.5 rounded-lg border border-slate-200 flex-1 select-all">
                    {convertResult.code}
                  </code>
                  <button
                    onClick={() => copyToClipboard(convertResult.code)}
                    className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-medium rounded-lg transition-colors"
                    title="Copiar código"
                  >
                    📋 Copiar
                  </button>
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Valor</span>
                <span className="font-semibold text-slate-900">RD$ {convertResult.value.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Expira</span>
                <span className="font-semibold text-slate-900">
                  {new Date(convertResult.expiresAt).toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </span>
              </div>
            </div>
            <button
              onClick={() => setConvertResult(null)}
              className="w-full mt-4 px-4 py-2.5 bg-slate-100 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-200 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
