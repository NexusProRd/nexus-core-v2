'use client'

import type { PortadaDashboard } from '@/types/portada'

interface Props {
  portadas: PortadaDashboard[]
  onEdit: (p: PortadaDashboard) => void
  onDelete: (id: string) => void
  onToggleActive: (id: string, active: boolean) => void
  onCreate: () => void
}

const tipoLabels: Record<string, string> = {
  institucional: 'Institucional',
  producto: 'Producto',
  oferta: 'Oferta',
}

const tipoColors: Record<string, string> = {
  institucional: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  producto: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  oferta: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
}

export default function PortadasLista({ portadas, onEdit, onDelete, onToggleActive, onCreate }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Portadas</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {portadas.filter(p => p.activo).length}/5 activas &middot; {portadas.length} total
          </p>
        </div>
        <button onClick={onCreate}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[var(--primary)] text-white text-xs font-bold rounded-xl hover:opacity-90 transition-all active:scale-95 shadow-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nueva Portada
        </button>
      </div>

      {portadas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-8 text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">No hay portadas aún. Crea la primera para personalizar tu Hero.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {portadas.map(p => (
            <div key={p.id}
              className="rounded-2xl bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-md transition-shadow group">
              <div className="relative h-28 bg-slate-100 dark:bg-slate-800">
                {p.imagen_url ? (
                  <img src={p.imagen_url} alt={p.titulo || ''} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-300 dark:text-slate-600">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                <span className={`absolute top-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-full ${tipoColors[p.tipo]}`}>
                  {tipoLabels[p.tipo]}
                </span>
              </div>
              <div className="p-3 space-y-2">
                <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                  {p.titulo || 'Sin título'}
                </p>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <div className="relative">
                      <input type="checkbox" checked={p.activo}
                        onChange={() => onToggleActive(p.id, !p.activo)}
                        className="sr-only peer" />
                      <div className="w-9 h-5 rounded-full bg-slate-200 dark:bg-slate-600 peer-checked:bg-emerald-500 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-4 after:h-4 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-4" />
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      {p.activo ? 'Activa' : 'Inactiva'}
                    </span>
                  </label>
                  <div className="flex items-center gap-1">
                    <button onClick={() => onEdit(p)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button onClick={() => onDelete(p.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
