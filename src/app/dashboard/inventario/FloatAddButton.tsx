'use client'

import { useState } from 'react'
import ProductoForm from '@/components/inventario/ProductoForm'
import ProductoModal from '@/components/inventario/ProductoModal'

export default function FloatAddButton({ tiendaId, tipoNegocio = 'estandar', categorias = [] }: { tiendaId: string; tipoNegocio?: string; categorias?: string[] }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Floating + button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-gradient-to-br bg-[var(--primary)] text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center justify-center"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      <ProductoModal open={open} title="Nuevo Producto" onClose={() => setOpen(false)}>
        <ProductoForm
          mode="create"
          tiendaId={tiendaId}
          tipoNegocio={tipoNegocio}
          categorias={categorias}
          onSuccess={() => setOpen(false)}
          onCancel={() => setOpen(false)}
        />
      </ProductoModal>
    </>
  )
}