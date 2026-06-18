'use client'

import { useState, useEffect } from 'react'
import GiftDashboard from '@/components/dashboard/GiftDashboard'

export const dynamic = 'force-dynamic'

export default function RegalosPage() {
  const [storeId, setStoreId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadStoreId() {
      try {
        const r = await fetch('/api/auth/session-id')
        const d = await r.json()
        if (d.tiendaId) setStoreId(d.tiendaId)
      } catch {}
      setLoading(false)
    }
    loadStoreId()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!storeId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">No se pudo cargar la sesión.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <header className="bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 border-b border-white/[0.08]">
        <div className="max-w-7xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">Regalos</h1>
              <p className="text-sm text-white/70 mt-0.5">Gestión de regalos V2</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-4 sm:py-6 px-3 sm:px-6 lg:px-8">
        <GiftDashboard storeId={storeId} />
      </main>
    </div>
  )
}
