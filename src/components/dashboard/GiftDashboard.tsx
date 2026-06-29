'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { convertGiftToGiftCard } from '@/lib/gift-cards'
import { useToast } from '@/components/Toast'
import GiftTimeline from '@/components/dashboard/GiftTimeline'

interface Gift {
  id: string
  store_id: string
  sender_name: string
  sender_phone: string | null
  receiver_name: string
  receiver_phone: string | null
  personal_message: string | null
  gift_code: string
  is_redeemed: boolean
  status: 'pending' | 'approved' | 'rejected' | 'expired' | 'RESERVED' | 'CLAIMED' | 'DELIVERED' | 'cancelled'
  delivery_step: string | null
  created_at: string
  items_list: { product_id: string; nombre: string; precio: number; imagen_url: string | null }[]
  delivery_address: string | null
  delivery_location_link: string | null
  claimed_at: string | null
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
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [showConvertConfirm, setShowConvertConfirm] = useState<string | null>(null)
  const [convertingId, setConvertingId] = useState<string | null>(null)
  const [convertResult, setConvertResult] = useState<{ code: string; value: number; expiresAt: string } | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editAddress, setEditAddress] = useState('')
  const [deliveringId, setDeliveringId] = useState<string | null>(null)
  const [storeName, setStoreName] = useState('')
  const [configSettings, setConfigSettings] = useState<{reserved_expires_days: number; gift_card_expires_days: number} | null>(null)
  const [configLoading, setConfigLoading] = useState(false)
  const [configSaving, setConfigSaving] = useState(false)
  const [configSaved, setConfigSaved] = useState(false)
  const [cobroStep, setCobroStep] = useState<Record<string, 'gestionar' | 'confirmar' | 'aprobado'>>({})
  const { toast } = useToast()

  const fetchConfig = useCallback(async () => {
    setConfigLoading(true)
    try {
      const res = await fetch('/api/gift-rules')
      if (res.ok) {
        const data = await res.json()
        setConfigSettings({ reserved_expires_days: data.reserved_expires_days, gift_card_expires_days: data.gift_card_expires_days })
      }
    } catch {
      // ignore
    } finally {
      setConfigLoading(false)
    }
  }, [])

  const saveConfig = useCallback(async () => {
    if (!configSettings) return
    setConfigSaving(true)
    setConfigSaved(false)
    try {
      const res = await fetch('/api/gift-rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configSettings),
      })
      if (res.ok) {
        setConfigSaved(true)
        setTimeout(() => setConfigSaved(false), 3000)
      }
    } catch {
      // ignore
    } finally {
      setConfigSaving(false)
    }
  }, [configSettings])

  useEffect(() => { fetchConfig() }, [fetchConfig])

  useEffect(() => {
    const supabase = createClient()
    supabase.from('perfil_tienda').select('nombre_comercial').eq('id_tienda', storeId).maybeSingle().then(({ data }) => {
      if (data) setStoreName(data.nombre_comercial || 'Mi Tienda')
    })
  }, [storeId])

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
    async (gift: Gift, newStatus: 'approved' | 'rejected'): Promise<boolean> => {
      setUpdatingId(gift.id)
      const supabase = createClient()

      if (newStatus === 'rejected') {
        const { error } = await supabase
          .from('gift_experiences')
          .update({ status: 'rejected' })
          .eq('id', gift.id)
          .eq('status', 'pending')
        if (error) console.error('[GiftDashboard] Error al rechazar:', error)
        setUpdatingId(null)
        return !error
      }

      const { data, error } = await supabase.rpc('aprobar_regalo_v2', { p_gift_id: gift.id })
      let success = false
      if (error) {
        console.error('[GiftDashboard] Error al aprobar:', error)
      } else if (!data?.success) {
        console.error('[GiftDashboard] aprobar_regalo_v2:', data?.error)
      } else {
        success = true
        sendGiftPush(storeId, 'approved', gift.gift_code)
        if (gift.sender_phone) {
          const giftUrl = `${window.location.origin}/canje?gift=${gift.gift_code}&id=${gift.store_id}`
          const waUrl = `https://wa.me/${gift.sender_phone.replace(/\D/g, '')}?text=${encodeURIComponent(
            `Hola ${gift.sender_name} 👋\n\n¡Tu regalo ha sido aprobado! 🎉\n\nYa puedes compartir este enlace con ${gift.receiver_name} para que pueda reclamar y disfrutar el detalle que le preparaste con mucho cariño.\n\n🎁 Enlace del regalo:\n${giftUrl}\n\nCuando ${gift.receiver_name} abra el enlace podrá reclamar su regalo y nosotros nos encargaremos de coordinar la entrega.\n\nGracias por confiar en ${storeName}.`
          )}`
          window.open(waUrl, '_blank')
        }
      }
      setUpdatingId(null)
      return success
    },
    [storeName]
  )

  const handleGestionarCobro = useCallback((gift: Gift) => {
    if (!gift.sender_phone) {
      toast('El comprador no tiene número de WhatsApp registrado.', 'warning')
      return
    }
    const waUrl = `https://wa.me/${gift.sender_phone.replace(/\D/g, '')}?text=${encodeURIComponent(
      `Hola ${gift.sender_name}. Soy ${storeName}. Estoy gestionando el cobro de tu regalo. Una vez confirme el pago aprobaré el regalo y recibirás automáticamente el enlace para compartirlo con el destinatario. Gracias.`
    )}`
    window.open(waUrl, '_blank')
  }, [storeName])

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
      if (gift.receiver_phone) {
        const waUrl = `https://wa.me/${gift.receiver_phone.replace(/\D/g, '')}?text=${encodeURIComponent(
          `Hola ${gift.receiver_name} 👋\n\nEsperamos que estés disfrutando del regalo que te envió ${gift.sender_name}. 🎁\n\nGracias por recibirnos.\n\nRecuerda que puedes visitar nuevamente ${storeName}:\n${window.location.origin}/catalogo/${gift.store_id}`
        )}`
        window.open(waUrl, '_blank')
      }
    }
    setUpdatingId(null)
  }, [storeName])

  const handleDeliverWithAddress = useCallback(async () => {
    if (!editingId || !editAddress.trim()) return
    setDeliveringId(editingId)
    setEditingId(null)
    const supabase = createClient()
    await supabase.from('gift_experiences').update({ delivery_address: editAddress.trim() }).eq('id', editingId)
    const { data, error } = await supabase.rpc('entregar_regalo_v2', { p_gift_id: editingId })
    if (error) {
      console.error('[GiftDashboard] Error al marcar entregado:', error)
    } else if (!data?.success) {
      console.error('[GiftDashboard] entregar_regalo_v2:', data?.error)
    } else {
      sendGiftPush(storeId, 'delivered', editingId)
    }
    setDeliveringId(null)
    setEditAddress('')
  }, [editingId, editAddress])

  const handleContact = useCallback(async (gift: Gift) => {
    if (!gift.receiver_phone) return
    setUpdatingId(gift.id)
    const supabase = createClient()
    await supabase.from('gift_experiences').update({ delivery_step: 'CONTACTED' }).eq('id', gift.id)
    const waUrl = `https://wa.me/${gift.receiver_phone.replace(/\D/g, '')}?text=${encodeURIComponent(
      `Hola ${gift.receiver_name} 👋\n\nTe escribimos de ${storeName}.\nTenemos listo el regalo que te envió ${gift.sender_name}.\n\nEstamos preparando el envío y pronto nos pondremos en contacto contigo para coordinar la entrega.\n\n🎁 Productos:\n${(gift.items_list || []).map(i => `- ${i.nombre}`).join('\n')}`
    )}`
    window.open(waUrl, '_blank')
    setUpdatingId(null)
  }, [storeName])

  const handleNotifyShipped = useCallback(async (gift: Gift) => {
    if (!gift.receiver_phone) return
    setUpdatingId(gift.id)
    const supabase = createClient()
    await supabase.from('gift_experiences').update({ delivery_step: 'SHIPPED' }).eq('id', gift.id)
    const waUrl = `https://wa.me/${gift.receiver_phone.replace(/\D/g, '')}?text=${encodeURIComponent(
      `Hola ${gift.receiver_name} 👋\n\nTu regalo ya fue despachado y va en camino.\n\nNuestro mensajero se pondrá en contacto contigo cuando esté próximo a llegar.\n\n🚚 ¡Nos vemos pronto!`
    )}`
    window.open(waUrl, '_blank')
    setUpdatingId(null)
  }, [])

  const startEditing = useCallback((gift: Gift) => {
    setEditingId(gift.id)
    setEditAddress(gift.delivery_address || '')
  }, [])

  const cancelEdit = useCallback(() => {
    setEditingId(null)
    setEditAddress('')
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

  const filtered = useMemo(() => {
    let result = gifts

    if (statusFilter === 'converted') {
      result = result.filter((g) => g.converted_to_giftcard_at)
    } else if (statusFilter) {
      result = result.filter((g) => g.status === statusFilter)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (g) =>
          g.gift_code.toLowerCase().includes(q) ||
          g.sender_name.toLowerCase().includes(q) ||
          g.receiver_name.toLowerCase().includes(q) ||
          (g.sender_phone || '').toLowerCase().includes(q) ||
          (g.receiver_phone || '').toLowerCase().includes(q)
      )
    }

    return result
  }, [gifts, search, statusFilter])

  const kpiStats = useMemo(() => {
    const pending = gifts.filter((g) => g.status === 'pending').length
    const reserved = gifts.filter((g) => g.status === 'RESERVED').length
    const claimed = gifts.filter((g) => g.status === 'CLAIMED').length
    const delivered = gifts.filter((g) => g.status === 'DELIVERED').length
    return { pending, reserved, claimed, delivered }
  }, [gifts])

  const giftReports = useMemo(() => {
    const total = gifts.length
    const cancelled = gifts.filter((g) => g.status === 'cancelled').length
    const rejected = gifts.filter((g) => g.status === 'rejected').length
    const expired = gifts.filter((g) => g.status === 'expired').length
    const converted = gifts.filter((g) => g.converted_to_giftcard_at).length

    const deliveredWithDates = gifts.filter(
      (g) => g.status === 'DELIVERED' && g.claimed_at && g.delivered_at
    )
    let avgClaimToDeliver = 0
    if (deliveredWithDates.length > 0) {
      const totalMs = deliveredWithDates.reduce((sum, g) => {
        return sum + (new Date(g.delivered_at!).getTime() - new Date(g.claimed_at!).getTime())
      }, 0)
      avgClaimToDeliver = Math.round(totalMs / deliveredWithDates.length / (1000 * 60 * 60))
    }

    const finalized = deliveredWithDates.length + cancelled + rejected + expired
    const deliveryRate = finalized > 0 ? Math.round((deliveredWithDates.length / finalized) * 100) : 0

    return { cancelled, rejected, expired, converted, avgClaimToDeliver, deliveryRate }
  }, [gifts])

  const alerts = useMemo(() => {
    const now = Date.now()
    const day = 24 * 60 * 60 * 1000

    const pendingAntiguos = gifts.filter(
      (g) => g.status === 'pending' && new Date(g.created_at).getTime() < now - day
    ).length

    const claimedSinEntrega = gifts.filter(
      (g) =>
        g.status === 'CLAIMED' &&
        g.delivery_address &&
        !g.delivered_at &&
        g.claimed_at &&
        new Date(g.claimed_at).getTime() < now - 3 * day
    ).length

    const total = pendingAntiguos + claimedSinEntrega

    return { pendingAntiguos, claimedSinEntrega, total }
  }, [gifts])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-slate-900">Regalos Únicos</h2>
        <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
          {gifts.length} regalo{gifts.length !== 1 ? 's' : ''}
        </span>
      </div>

      {alerts.total > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 sm:p-4 mb-5">
          <div className="flex items-start gap-2">
            <span className="text-lg flex-shrink-0 mt-0.5">⚠️</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-amber-800 mb-2">Atención requerida</p>
              <ul className="space-y-1">
                {alerts.pendingAntiguos > 0 && (
                  <li className="text-sm text-amber-700 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                    {alerts.pendingAntiguos} regalo{alerts.pendingAntiguos !== 1 ? 's' : ''} pendiente{alerts.pendingAntiguos !== 1 ? 's' : ''} de revisión
                  </li>
                )}
                {alerts.claimedSinEntrega > 0 && (
                  <li className="text-sm text-amber-700 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                    {alerts.claimedSinEntrega} regalo{alerts.claimedSinEntrega !== 1 ? 's' : ''} pendiente{alerts.claimedSinEntrega !== 1 ? 's' : ''} de entrega
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="bg-white rounded-xl border border-slate-200 p-3">
          <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">Pendientes</p>
          <p className="text-xl font-bold text-yellow-600 mt-0.5">{kpiStats.pending}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-3">
          <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">Reservados</p>
          <p className="text-xl font-bold text-blue-600 mt-0.5">{kpiStats.reserved}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-3">
          <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">Reclamados</p>
          <p className="text-xl font-bold text-emerald-600 mt-0.5">{kpiStats.claimed}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-3">
          <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">Entregados</p>
          <p className="text-xl font-bold text-slate-600 mt-0.5">{kpiStats.delivered}</p>
        </div>
      </div>

      <details className="mb-4 group">
        <summary className="text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-600 transition-colors select-none">
          Reportes {gifts.length > 0 && <span className="text-slate-300">· {gifts.length} regalos</span>}
        </summary>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="bg-slate-50 rounded-lg p-2.5">
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Cancelados</p>
            <p className="text-sm font-bold text-slate-600 mt-0.5">{giftReports.cancelled}</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-2.5">
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Rechazados</p>
            <p className="text-sm font-bold text-slate-600 mt-0.5">{giftReports.rejected}</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-2.5">
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Vencidos</p>
            <p className="text-sm font-bold text-slate-600 mt-0.5">{giftReports.expired}</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-2.5">
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Convertidos a GC</p>
            <p className="text-sm font-bold text-purple-600 mt-0.5">{giftReports.converted}</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-2.5">
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Tasa entrega</p>
            <p className="text-sm font-bold text-slate-600 mt-0.5">{giftReports.deliveryRate}%</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-2.5">
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Tiempo canje→entrega</p>
            <p className="text-sm font-bold text-slate-600 mt-0.5">
              {giftReports.avgClaimToDeliver > 0 ? `${giftReports.avgClaimToDeliver}h` : '—'}
            </p>
          </div>
        </div>
      </details>

      <details className="mb-4 group">
        <summary className="text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-600 transition-colors select-none">
          ⚙️ Configuración
        </summary>
        <div className="mt-3 p-4 bg-white rounded-xl border border-slate-200 space-y-4">
          {configLoading ? (
            <p className="text-xs text-slate-400">Cargando configuración...</p>
          ) : configSettings ? (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Días para expiración de reserva</label>
                <input type="number" min={1} max={90} value={configSettings.reserved_expires_days}
                  onChange={e => setConfigSettings(prev => prev ? { ...prev, reserved_expires_days: Math.max(1, Math.min(90, Number(e.target.value) || 1)) } : prev)}
                  className="w-24 px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-[var(--primary)] outline-none" />
                <p className="text-[10px] text-slate-400 mt-0.5">Un regalo reservado se convierte a Gift Card si no se reclama en este plazo.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Días de vigencia de Gift Card</label>
                <input type="number" min={1} max={1825} value={configSettings.gift_card_expires_days}
                  onChange={e => setConfigSettings(prev => prev ? { ...prev, gift_card_expires_days: Math.max(1, Math.min(1825, Number(e.target.value) || 1)) } : prev)}
                  className="w-24 px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-[var(--primary)] outline-none" />
                <p className="text-[10px] text-slate-400 mt-0.5">Tiempo máximo para canjear una Gift Card antes de que expire.</p>
              </div>
              <button onClick={saveConfig} disabled={configSaving}
                className="px-4 py-2 bg-[var(--primary)] text-white text-xs font-medium rounded-xl hover:brightness-110 transition-colors disabled:opacity-50">
                {configSaving ? 'Guardando...' : configSaved ? '✓ Guardado' : 'Guardar'}
              </button>
            </>
          ) : (
            <p className="text-xs text-slate-400">No se pudo cargar la configuración.</p>
          )}
        </div>
      </details>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          placeholder="Buscar por código, comprador, destinatario o teléfono..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition-colors"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition-colors"
        >
          <option value="">Todos</option>
          <option value="pending">Pendientes</option>
          <option value="RESERVED">Reservados</option>
          <option value="CLAIMED">Reclamados</option>
          <option value="DELIVERED">Entregados</option>
          <option value="cancelled">Cancelados</option>
          <option value="expired">Vencidos</option>
          <option value="converted">Convertidos a Gift Card</option>
        </select>
      </div>

      {gifts.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 rounded-2xl">
          <span className="text-5xl">🎁</span>
          <p className="mt-3 text-slate-500 text-sm">No hay regalos aún</p>
          <p className="text-xs text-slate-400 mt-1">Los regalos que reciban tus clientes aparecerán aquí.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 rounded-2xl">
          <span className="text-4xl">🔍</span>
          <p className="mt-3 text-slate-500 text-sm">Sin resultados</p>
          <p className="text-xs text-slate-400 mt-1">Intenta con otros términos o filtros.</p>
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
                <th className="text-left py-3 px-4 font-medium text-slate-500">Productos</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500">Entrega</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500">Estado</th>
                <th className="text-right py-3 px-4 font-medium text-slate-500">Acción</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((gift) => (
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
                  <td className="py-3 px-4 max-w-[200px]" title={gift.items_list?.map(i => i.nombre).join('\n') || ''}>
                    {gift.items_list && gift.items_list.length > 0 ? (
                      <span className="text-xs text-slate-700 line-clamp-2">
                        {gift.items_list.slice(0, 2).map(i => i.nombre).join(', ')}
                        {gift.items_list.length > 2 && (
                          <span className="text-slate-400"> y {gift.items_list.length - 2} más</span>
                        )}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 min-w-[160px]">
                    {gift.status === 'CLAIMED' && !gift.delivery_address && editingId !== gift.id && (
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
                    {editingId === gift.id ? (
                      <div className="flex flex-col gap-1.5 mt-2">
                        <textarea
                          value={editAddress}
                          onChange={(e) => setEditAddress(e.target.value)}
                          rows={2}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-violet-500/30 outline-none resize-none"
                          placeholder="Calle, número, sector, ciudad..."
                        />
                        <div className="flex gap-1.5">
                          <button
                            onClick={handleDeliverWithAddress}
                            disabled={deliveringId === gift.id || !editAddress.trim()}
                            className="flex-1 px-2 py-1.5 bg-emerald-600 text-white text-[11px] font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                          >
                            {deliveringId === gift.id ? '...' : '✅ Entregar'}
                          </button>
                          <button
                            onClick={cancelEdit}
                            disabled={deliveringId === gift.id}
                            className="px-2 py-1.5 bg-slate-100 text-slate-600 text-[11px] font-medium rounded-lg hover:bg-slate-200 disabled:opacity-50 transition-colors"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : gift.delivery_address ? (
                      <div className="flex items-center gap-1 mt-1.5 group">
                        <span className="text-[11px] text-slate-600 truncate max-w-[140px] leading-tight" title={gift.delivery_address}>
                          {gift.delivery_address}
                        </span>
                        {gift.status === 'CLAIMED' && (
                          <button
                            onClick={() => startEditing(gift)}
                            className="text-slate-400 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                            title="Editar dirección"
                          >
                            ✏️
                          </button>
                        )}
                      </div>
                    ) : gift.status === 'CLAIMED' ? (
                      <button
                        onClick={() => startEditing(gift)}
                        className="text-[11px] text-violet-600 hover:text-violet-800 mt-1.5 font-medium"
                      >
                        + Agregar dirección
                      </button>
                    ) : null}
                  </td>
                  <td className="py-3 px-4">
                    <GiftTimeline
                      status={gift.status}
                      delivery_step={gift.delivery_step}
                      converted_to_giftcard_at={gift.converted_to_giftcard_at}
                    />
                  </td>
                  <td className="py-3 px-4 text-right">
                    {gift.converted_to_giftcard_at ? (
                      <span className="text-xs font-medium text-purple-700 italic">Procesado</span>
                    ) : gift.status === 'pending' ? (
                      (() => {
                        const step = cobroStep[gift.id] || 'gestionar'
                        if (step === 'aprobado') return (
                          <div className="flex flex-col items-end gap-2">
                            <span className="text-xs font-semibold text-emerald-700">🎉 Regalo aprobado correctamente.</span>
                            <Link
                              href="/dashboard/regalos"
                              className="px-3 py-1.5 bg-violet-600 text-white text-xs font-medium rounded-lg hover:bg-violet-700 transition-colors"
                            >
                              ➡ Continuar gestión del regalo →
                            </Link>
                          </div>
                        )
                        if (step === 'confirmar') return (
                          <div className="flex flex-col items-end gap-1.5">
                            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Paso 2 — Confirmar pago</span>
                            <button
                              onClick={async () => {
                                const ok = await updateStatus(gift, 'approved')
                                if (ok) setCobroStep(prev => ({ ...prev, [gift.id]: 'aprobado' }))
                              }}
                              disabled={updatingId === gift.id}
                              className="w-full px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                            >
                              ✅ Confirmar pago y aprobar
                            </button>
                            <button
                              onClick={() => setCobroStep(prev => ({ ...prev, [gift.id]: 'gestionar' }))}
                              className="text-[11px] text-slate-500 hover:text-slate-700 font-medium"
                            >
                              ⬅ Volver al paso anterior
                            </button>
                          </div>
                        )
                        return (
                          <div className="flex flex-col items-end gap-1.5">
                            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Paso 1 — Pendiente de cobro</span>
                            <button
                              onClick={() => {
                                handleGestionarCobro(gift)
                                setCobroStep(prev => ({ ...prev, [gift.id]: 'confirmar' }))
                              }}
                              disabled={updatingId === gift.id}
                              className="w-full px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                            >
                              📲 Gestionar cobro
                            </button>
                            <button
                              onClick={() => updateStatus(gift, 'rejected')}
                              disabled={updatingId === gift.id}
                              className="px-3 py-1.5 bg-red-500 text-white text-xs font-medium rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
                            >
                              ❌ Rechazar
                            </button>
                          </div>
                        )
                      })()
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
                      <div className="flex flex-col items-end gap-1.5">
                        {!gift.delivery_step && gift.receiver_phone && (
                          <button onClick={() => handleContact(gift)} disabled={updatingId === gift.id}
                            className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors inline-flex items-center gap-1"
                          >
                            {updatingId === gift.id ? '...' : '📱 Contactar destinatario'}
                          </button>
                        )}
                        {gift.delivery_step === 'CONTACTED' && gift.receiver_phone && (
                          <button onClick={() => handleNotifyShipped(gift)} disabled={updatingId === gift.id}
                            className="px-3 py-1.5 bg-sky-600 text-white text-xs font-medium rounded-lg hover:bg-sky-700 disabled:opacity-50 transition-colors inline-flex items-center gap-1"
                          >
                            {updatingId === gift.id ? '...' : '🚚 Avisar que va en camino'}
                          </button>
                        )}
                        {gift.delivery_step === 'SHIPPED' && (
                          <button onClick={() => markDelivered(gift)} disabled={updatingId === gift.id || editingId === gift.id}
                            className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                          >
                            {updatingId === gift.id ? '...' : '✅ Marcar entregado'}
                          </button>
                        )}
                        <div className="flex gap-2 pt-1.5 mt-1 border-t border-slate-200 w-full justify-end">
                          <button onClick={() => setShowConvertConfirm(gift.id)}
                            disabled={updatingId === gift.id || convertingId === gift.id}
                            className="px-2 py-1 text-xs font-medium text-purple-600 hover:text-purple-800 transition-colors"
                          >
                            🎁 Convertir
                          </button>
                          <button onClick={() => cancelGift(gift)}
                            disabled={updatingId === gift.id || convertingId === gift.id}
                            className="px-2 py-1 text-xs font-medium text-red-500 hover:text-red-700 transition-colors"
                          >
                            Cancelar
                          </button>
                        </div>
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
