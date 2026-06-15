'use client'

import { useState, useEffect, useCallback } from 'react'
import { getTiendaIdFromCookie } from '@/lib/cookie-utils'
import type { PortadaDashboard } from '@/types/portada'
import PortadasLista from '@/components/dashboard/portadas/PortadasLista'
import PortadaForm from '@/components/dashboard/portadas/PortadaForm'

export const dynamic = 'force-dynamic'

export default function PortadasPage() {
  const [portadas, setPortadas] = useState<PortadaDashboard[]>([])
  const [idTienda, setIdTienda] = useState('')
  const [editingPortada, setEditingPortada] = useState<PortadaDashboard | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchPortadas = useCallback(async () => {
    try {
      const res = await fetch('/api/portadas/dashboard')
      const data = await res.json()
      if (Array.isArray(data)) setPortadas(data)
    } catch {
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    getTiendaIdFromCookie().then((id) => {
      if (id) setIdTienda(id)
    })
    fetchPortadas()
  }, [fetchPortadas])

  const handleToggleActive = useCallback(async (id: string, active: boolean) => {
    const res = await fetch(`/api/portadas/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo: active }),
    })
    if (res.ok) fetchPortadas()
    else {
      const data = await res.json()
      alert(data.error || 'Error al cambiar estado')
    }
  }, [fetchPortadas])

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('¿Eliminar esta portada?')) return
    const res = await fetch(`/api/portadas/${id}`, { method: 'DELETE' })
    if (res.ok) fetchPortadas()
  }, [fetchPortadas])

  const handleEdit = useCallback((p: PortadaDashboard) => {
    setEditingPortada(p)
    setShowForm(true)
  }, [])

  const handleCreate = useCallback(() => {
    setEditingPortada(null)
    setShowForm(true)
  }, [])

  const handleSaved = useCallback(() => {
    setShowForm(false)
    setEditingPortada(null)
    fetchPortadas()
  }, [fetchPortadas])

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-white/20 dark:border-slate-700/30 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/30 p-5 sm:p-7">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-cyan-400/5 blur-3xl pointer-events-none" />
        <div className="relative flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white shadow-md shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Portadas</h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">Gestiona las portadas que aparecen en la pantalla de inicio de tu catálogo</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 p-5 sm:p-6">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : showForm && idTienda ? (
          <PortadaForm
            portada={editingPortada}
            idTienda={idTienda}
            onClose={() => { setShowForm(false); setEditingPortada(null) }}
            onSaved={handleSaved}
          />
        ) : (
          <PortadasLista
            portadas={portadas}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onToggleActive={handleToggleActive}
            onCreate={handleCreate}
          />
        )}
      </div>
    </div>
  )
}
