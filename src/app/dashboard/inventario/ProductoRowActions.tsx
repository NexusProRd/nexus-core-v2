'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { eliminarProducto } from './actions'
import ProductoForm from '@/components/inventario/ProductoForm'
import ProductoModal from '@/components/inventario/ProductoModal'
import type { ProductoSnapshot, ProductoVariante } from '@/types/producto'

interface Producto {
  id: string
  nombre: string
  descripcion: string | null
  categoria: string | null
  precio: number
  precio_oferta: number | null
  costo_compra: number
  stock: number
  tipo_articulo?: string | null
  codigo_barra?: string | null
  imagen_url?: string | null
  tallas?: any
}

export default function ProductoRowActions({ producto, categorias = [], tiendaId, tipoNegocio = 'estandar', onDelete }: { producto: Producto; categorias?: string[]; tiendaId: string; tipoNegocio?: string; onDelete?: (id: string) => void }) {
  const [editando, setEditando] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const router = useRouter()

  const snapshot: ProductoSnapshot = {
    id: producto.id,
    nombre: producto.nombre,
    descripcion: producto.descripcion,
    categoria: producto.categoria,
    precio: producto.precio,
    precio_oferta: producto.precio_oferta,
    costo_compra: producto.costo_compra,
    stock: producto.stock,
    codigo_barra: producto.codigo_barra || null,
    imagen_url: producto.imagen_url || null,
    tallas: Array.isArray(producto.tallas)
      ? (producto.tallas.filter(t => typeof t === 'object' && t !== null) as ProductoVariante[])
      : [],
    tipo_articulo: producto.tipo_articulo || null,
  }

  return (
    <>
      <div className="flex gap-1">
        <button onClick={() => setEditando(true)}
          className="p-2 sm:p-1.5 text-slate-400 dark:text-slate-500 hover:text-[var(--primary)] hover:bg-[var(--primary)]/5 rounded-lg transition-all press-scale-sm" title="Editar">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button onClick={() => setConfirmDelete(true)}
          className="p-2 sm:p-1.5 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-all press-scale-sm" title="Eliminar">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      <ProductoModal open={editando} title="Editar Producto" onClose={() => setEditando(false)}>
        <ProductoForm
          mode="edit"
          initialData={snapshot}
          tiendaId={tiendaId}
          tipoNegocio={tipoNegocio}
          categorias={categorias}
          onSuccess={() => { setEditando(false); router.refresh() }}
          onCancel={() => setEditando(false)}
        />
      </ProductoModal>

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setConfirmDelete(false)}>
          <div className="bg-white dark:bg-[#121216] rounded-2xl shadow-xl max-w-sm w-full p-6 text-center" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-rose-100 dark:bg-rose-500/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-rose-600 dark:text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">¿Eliminar producto?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">{producto.nombre} se eliminará permanentemente.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(false)}
                className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-all press-scale-sm">
                Cancelar
              </button>
              <button onClick={async () => {
                await eliminarProducto(producto.id)
                setConfirmDelete(false)
                onDelete?.(producto.id)
                router.refresh()
              }}
                className="w-full px-4 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-700 transition-all press-scale-sm">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
