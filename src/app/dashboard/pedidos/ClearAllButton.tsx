'use client'

import { useState } from 'react'
import { eliminarTodosLosPedidos } from './actions'

export default function ClearAllButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-rose-500 hover:text-rose-600 font-medium transition-colors"
      >
        Vaciar historial
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-rose-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">¿Eliminar todos los pedidos?</h3>
            <p className="text-sm text-slate-500 mb-6">Esta acción no se puede deshacer. Se eliminarán todos los pedidos y sus detalles.</p>
            <div className="flex gap-3">
              <button onClick={() => setOpen(false)}
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
              <form action={eliminarTodosLosPedidos} className="flex-1" onSubmit={() => setOpen(false)}>
                <button type="submit"
                  className="w-full px-4 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-700 transition-colors">
                  Eliminar todo
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  )
}