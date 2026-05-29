'use client'

import { useState, useEffect } from 'react'

interface DisenoEntry {
  id: string
  id_tienda: string
  nombre: string
  tipo: string
  config: any
  preview_url: string | null
  created_at: string
  updated_at: string
}

interface GuardarModalProps {
  open: boolean
  onClose: () => void
  onSave: (nombre: string) => Promise<void>
  saving: boolean
}

function GuardarModal({ open, onClose, onSave, saving }: GuardarModalProps) {
  const [nombre, setNombre] = useState('')

  useEffect(() => {
    if (open) setNombre('')
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}>
      <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6"
        onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Guardar diseño</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Asigna un nombre para identificar este diseño en tu biblioteca.</p>
        <input type="text" value={nombre} onChange={e => setNombre(e.target.value)}
          placeholder="Ej: Oferta de verano"
          autoFocus
          className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 placeholder:text-slate-300 dark:placeholder:text-slate-500 mb-4 transition-all" />
        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all">
            Cancelar
          </button>
          <button onClick={() => { if (nombre.trim()) onSave(nombre.trim()) }} disabled={!nombre.trim() || saving}
            className="flex-1 py-2.5 rounded-lg text-sm font-bold text-white bg-[var(--primary)] hover:brightness-110 transition-all disabled:opacity-40">
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

interface DisenosLibraryProps {
  /** Called when user clicks "Usar" on a saved design — loads its config */
  onReuse: (config: any) => void
  /** Current generator config (for saving the current design state) */
  currentConfig?: any
  /** Optional function that captures the current preview and returns a public URL */
  capturarPreview?: () => Promise<string | null>
  /** Text label for the save button */
  saveLabel?: string
}

export default function DisenosLibrary({ onReuse, currentConfig, capturarPreview, saveLabel }: DisenosLibraryProps) {
  const [disenos, setDisenos] = useState<DisenoEntry[]>([])
  const [cargando, setCargando] = useState(true)
  const [saving, setSaving] = useState(false)
  const [guardarModal, setGuardarModal] = useState(false)
  const [renombrando, setRenombrando] = useState<string | null>(null)
  const [renombreValor, setRenombreValor] = useState('')

  const cargarDisenos = async () => {
    setCargando(true)
    try {
      const res = await fetch('/api/dashboard/vitrina/disenos')
      const data = await res.json()
      if (data.disenos) setDisenos(data.disenos)
    } catch {}
    setCargando(false)
  }

  useEffect(() => { cargarDisenos() }, [])

  const handleGuardar = async (nombre: string) => {
    if (!currentConfig) return
    setSaving(true)
    try {
      let previewUrl: string | null = null
      if (capturarPreview) {
        previewUrl = await capturarPreview()
      }
      const res = await fetch('/api/dashboard/vitrina/disenos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, tipo: 'whatsapp_story', config: currentConfig, preview_url: previewUrl }),
      })
      const data = await res.json()
      if (data.diseno) {
        setDisenos(prev => [data.diseno, ...prev])
        setGuardarModal(false)
      }
    } catch {}
    setSaving(false)
  }

  const handleEliminar = async (id: string) => {
    if (!confirm('¿Eliminar este diseño de la biblioteca?')) return
    try {
      const res = await fetch(`/api/dashboard/vitrina/disenos?id=${id}`, { method: 'DELETE' })
      if (res.ok) setDisenos(prev => prev.filter(d => d.id !== id))
    } catch {}
  }

  const iniciarRenombrar = (entry: DisenoEntry) => {
    setRenombrando(entry.id)
    setRenombreValor(entry.nombre)
  }

  const confirmarRenombrar = async (id: string) => {
    if (!renombreValor.trim()) return
    try {
      const res = await fetch('/api/dashboard/vitrina/disenos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, nombre: renombreValor.trim() }),
      })
      const data = await res.json()
      if (data.diseno) {
        setDisenos(prev => prev.map(d => d.id === id ? { ...d, nombre: data.diseno.nombre } : d))
        setRenombrando(null)
      }
    } catch {}
  }

  const TIPO_INFO: Record<string, { label: string; color: string }> = {
    whatsapp_story: { label: 'WhatsApp', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
    banner: { label: 'Banner', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
    oferta: { label: 'Oferta', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  }

  return (
    <div>
      {/* Save current design button + header */}
      <div className="flex items-center justify-between mb-3 sm:mb-5">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h2 className="text-sm sm:text-lg font-bold text-slate-900 dark:text-white">
            Biblioteca de Diseños
            {disenos.length > 0 && (
              <span className="text-xs font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full ml-2">{disenos.length}</span>
            )}
          </h2>
        </div>
        {currentConfig && (
          <button onClick={() => setGuardarModal(true)}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2 rounded-lg text-xs sm:text-sm font-bold text-[var(--primary)] bg-[var(--primary)]/10 hover:bg-[var(--primary)]/20 transition-all">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {saveLabel || 'Guardar diseño actual'}
          </button>
        )}
      </div>

      {/* Loading */}
      {cargando && (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!cargando && disenos.length === 0 && (
        <div className="text-center py-12 sm:py-16 text-sm text-slate-400 bg-white dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
          <div className="flex flex-col items-center gap-2">
            <svg className="w-10 h-10 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p>No hay diseños guardados</p>
            <p className="text-xs text-slate-300 dark:text-slate-500">Genera un estado y guárdalo para reutilizarlo después</p>
          </div>
        </div>
      )}

      {/* Grid */}
      {!cargando && disenos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {disenos.map(entry => {
            const tipoInfo = TIPO_INFO[entry.tipo] || { label: entry.tipo, color: 'bg-slate-500/10 text-slate-600 dark:text-slate-400' }
            const esRenombrando = renombrando === entry.id
            return (
              <div key={entry.id} className="rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                {/* Preview area — color block as fallback */}
                <div className="relative group aspect-[4/3] bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center">
                  {entry.preview_url ? (
                    <img src={entry.preview_url} alt="" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  ) : (
                    <svg className="w-10 h-10 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  )}
                  <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold ${tipoInfo.color}`}>
                    {tipoInfo.label}
                  </span>
                </div>

                {/* Info + actions */}
                <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
                  {esRenombrando ? (
                    <div className="flex items-center gap-1">
                      <input type="text" value={renombreValor} onChange={e => setRenombreValor(e.target.value)}
                        autoFocus
                        onKeyDown={e => { if (e.key === 'Enter') confirmarRenombrar(entry.id); if (e.key === 'Escape') setRenombrando(null) }}
                        className="flex-1 min-w-0 px-2 py-1 text-xs sm:text-sm bg-white dark:bg-slate-700 border border-[var(--primary)] rounded-md focus:outline-none" />
                      <button onClick={() => confirmarRenombrar(entry.id)}
                        className="p-1 rounded text-[var(--primary)] hover:bg-[var(--primary)]/10">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{entry.nombre}</p>
                  )}

                  <p className="text-xs text-slate-400 font-medium">
                    {new Date(entry.created_at).toLocaleDateString('es-DO', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>

                  <div className="grid grid-cols-4 gap-1">
                    <button onClick={() => onReuse(entry.config)}
                      className="px-1 sm:px-3 py-1.5 sm:py-2 rounded-md sm:rounded-lg text-xs sm:text-sm font-bold bg-[var(--primary)] text-white hover:brightness-110 transition-all flex items-center justify-center col-span-2">
                      <svg className="w-3.5 sm:w-4 h-3.5 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span className="hidden sm:inline sm:ml-1">Usar</span>
                    </button>
                    <button onClick={() => iniciarRenombrar(entry)}
                      className="px-1 sm:px-3 py-1.5 sm:py-2 rounded-md sm:rounded-lg text-xs sm:text-sm font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all flex items-center justify-center">
                      <svg className="w-3.5 sm:w-4 h-3.5 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button onClick={() => handleEliminar(entry.id)}
                      className="px-1 sm:px-3 py-1.5 sm:py-2 rounded-md sm:rounded-lg text-xs sm:text-sm font-bold bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all flex items-center justify-center">
                      <svg className="w-3.5 sm:w-4 h-3.5 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Guardar modal */}
      <GuardarModal open={guardarModal} onClose={() => setGuardarModal(false)} onSave={handleGuardar} saving={saving} />
    </div>
  )
}
