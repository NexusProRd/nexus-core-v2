'use client'

import { useState } from 'react'
import AgregarProductoForm from '@/app/dashboard/inventario/AgregarProductoForm'

interface QuickAddProductProps {
  tiendaId: string;
  categorias?: string[];
}

export default function QuickAddProduct({ tiendaId, categorias = [] }: QuickAddProductProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button 
        onClick={() => setOpen(true)}
        className="group bg-white rounded-2xl border border-slate-200 dark:border-slate-800 p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 text-left w-full cursor-pointer"
      >
        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mb-3">
          <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
          </svg>
        </div>
        <h3 className="font-semibold text-slate-900 text-sm">Agregar Producto</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Nuevo artículo al inventario</p>
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Nuevo Producto</h3>
              <button onClick={() => setOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <AgregarProductoForm tiendaId={tiendaId} categorias={categorias} onSuccess={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  )
}
