'use client'

import { useState } from 'react'
import ProductoForm from '@/components/inventario/ProductoForm'
import ProductoModal from '@/components/inventario/ProductoModal'

export default function FloatAddButton({ tiendaId, tipoNegocio = 'estandar', categorias = [], tokenProductosLimite, isFounder, productosLength, whatsappSoporte }: { tiendaId: string; tipoNegocio?: string; categorias?: string[]; tokenProductosLimite: number | null; isFounder: boolean; productosLength: number; whatsappSoporte?: string }) {
  const [open, setOpen] = useState(false)

  const limiteAlcanzado = !isFounder && tokenProductosLimite !== null && tokenProductosLimite > 0 && productosLength >= tokenProductosLimite

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={limiteAlcanzado}
        className={`fixed bottom-6 right-6 z-40 w-14 h-14 bg-gradient-to-br bg-[var(--primary)] text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center justify-center ${limiteAlcanzado ? 'opacity-50 cursor-not-allowed hover:scale-100' : ''}`}
        title={limiteAlcanzado ? `Límite alcanzado (${productosLength})` : 'Agregar producto'}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {limiteAlcanzado && whatsappSoporte && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg px-4 py-3 text-center max-w-xs">
          <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-2">
            Límite de {tokenProductosLimite} productos alcanzado ({productosLength} / {tokenProductosLimite})
          </p>
          <a href={`https://wa.me/${whatsappSoporte}?text=${encodeURIComponent('Hola, he alcanzado el límite de productos de mi tienda y me gustaría conocer las opciones para ampliar mi capacidad o actualizar mi plan.')}`}
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition-colors">
            💬 Contactar a Nexus
          </a>
        </div>
      )}

      <ProductoModal open={!limiteAlcanzado && open} title="Nuevo Producto" onClose={() => setOpen(false)}>
        <ProductoForm
          mode="create"
          tiendaId={tiendaId}
          tipoNegocio={tipoNegocio}
          categorias={categorias}
          onSuccess={() => setOpen(false)}
          onCancel={() => setOpen(false)}
          whatsappSoporte={whatsappSoporte}
        />
      </ProductoModal>
    </>
  )
}
