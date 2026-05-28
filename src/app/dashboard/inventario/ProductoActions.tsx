'use client'

import { useState, useEffect, useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { actualizarProducto, eliminarProducto } from './actions'
import { formatearPrecio } from '@/lib/utils'

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
  tallas?: any
}

export default function ProductoActions({ producto, categorias = [], onDelete }: { producto: Producto; categorias?: string[]; onDelete?: (id: string) => void }) {
  const [editando, setEditando] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [enOfertaEdit, setEnOfertaEdit] = useState(!!producto.precio_oferta)
  const [precioOfertaEdit, setPrecioOfertaEdit] = useState(producto.precio_oferta?.toString() || '')
  const [usaVariantes, setUsaVariantes] = useState(false)
  const [variantes, setVariantes] = useState<{ talla: string; stock: number; precio: number | null; costo: number | null; sku?: string }[]>([])
  const [nuevaVarianteTalla, setNuevaVarianteTalla] = useState('')
  const [customTallaMode, setCustomTallaMode] = useState(false)
  const [nuevaVarianteStock, setNuevaVarianteStock] = useState('')
  const [nuevaVariantePrecio, setNuevaVariantePrecio] = useState('')
  const [nuevaVarianteCosto, setNuevaVarianteCosto] = useState('')
  const [nuevaVarianteSku, setNuevaVarianteSku] = useState('')
  const [editandoIdx, setEditandoIdx] = useState<number | null>(null)
  const [editForm, setEditForm] = useState({ stock: '', precio: '', costo: '', sku: '' })
  const router = useRouter()

  const PRENDA_SIZES = ['S', 'M', 'L', 'XL', '2XL', '3XL', '28', '30', '32', '34', '36', '38', '40']
  const CALZADO_SIZES = ['6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12', '12.5', '13', '13.5', '14', '15', '16']
  const tipoArticulo = producto.tipo_articulo || ''

  useEffect(() => {
    if (editando && Array.isArray(producto.tallas) && producto.tallas.length > 0) {
      const first = producto.tallas[0]
      if (typeof first === 'object' && first !== null && 'talla' in first) {
        setVariantes(producto.tallas)
        setUsaVariantes(true)
      }
    }
  }, [editando, producto.tallas])

  const [updateState, updateFormAction] = useActionState(
    async (_prev: { success?: boolean; error?: string } | null, formData: FormData) => {
      return await actualizarProducto(formData)
    },
    null
  )

  useEffect(() => {
    if (updateState?.success) setEditando(false)
  }, [updateState])

  const agregarVariante = () => {
    const talla = nuevaVarianteTalla.trim()
    if (!talla) return
    if (variantes.some(v => v.talla === talla)) return
    setVariantes(prev => [...prev, { talla, stock: parseInt(nuevaVarianteStock) || 0, precio: parseFloat(nuevaVariantePrecio) || null, costo: parseFloat(nuevaVarianteCosto) || null, sku: nuevaVarianteSku || undefined }])
    setNuevaVarianteTalla('')
    setCustomTallaMode(false)
    setNuevaVarianteStock('')
    setNuevaVariantePrecio('')
    setNuevaVarianteCosto('')
    setNuevaVarianteSku('')
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

      {/* Modal editar */}
      {editando && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#121216] rounded-2xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Editar Producto</h3>
            <form action={updateFormAction} className="space-y-4">
              <input type="hidden" name="id" value={producto.id} />
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre</label>
                <input type="text" name="nombre" defaultValue={producto.nombre} required
                  className="w-full px-3 py-2 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-[var(--primary)] outline-none bg-white dark:bg-[#0a0a0d]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descripción</label>
                <textarea name="descripcion" rows={3} defaultValue={producto.descripcion || ''}
                  className="w-full px-3 py-2 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-[var(--primary)] outline-none resize-none bg-white dark:bg-[#0a0a0d]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Código de Barra / SKU</label>
                <input type="text" name="codigo_barra" defaultValue={producto.codigo_barra || ''} onKeyDown={e => e.key === 'Enter' && e.preventDefault()}
                  className="w-full px-3 py-2 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-[var(--primary)] outline-none bg-white dark:bg-[#0a0a0d]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Categoría</label>
                <select name="categoria" defaultValue={producto.categoria || ''}
                  className="w-full px-3 py-2 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-[var(--primary)] outline-none bg-white dark:bg-slate-800">
                  <option value="" className="dark:bg-slate-800 dark:text-white">Sin categoría</option>
                  {categorias.map(c => <option key={c} value={c} className="dark:bg-slate-800 dark:text-white">{c}</option>)}
                </select>
              </div>
              {!usaVariantes && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Precio</label>
                    <input type="number" name="precio" step="0.01" defaultValue={producto.precio} required
                      className="w-full px-3 py-2 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-[var(--primary)] outline-none bg-white dark:bg-[#0a0a0d]" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Costo</label>
                    <input type="number" name="costo_compra" step="0.01" defaultValue={producto.costo_compra}
                      className="w-full px-3 py-2 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-[var(--primary)] outline-none bg-white dark:bg-[#0a0a0d]" />
                  </div>
                </div>
              )}
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={enOfertaEdit} onChange={e => setEnOfertaEdit(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500" />
                <input type="hidden" name="en_oferta_checkbox" value={enOfertaEdit ? 'true' : 'false'} />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Precio de Oferta</span>
              </label>
              {enOfertaEdit && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Precio Rebajado</label>
                  <input type="number" name="precio_oferta" step="0.01"
                    value={precioOfertaEdit} onChange={e => setPrecioOfertaEdit(e.target.value)}
                    className="w-full px-3 py-2 text-slate-900 dark:text-white border border-rose-200 dark:border-rose-800 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none bg-white dark:bg-[#0a0a0d]" />
                  {parseFloat(precioOfertaEdit) > 0 && parseFloat(precioOfertaEdit) >= producto.precio && (
                    <p className="text-xs text-rose-600 mt-1">El precio de oferta debe ser menor al precio normal.</p>
                  )}
                </div>
              )}
              {(tipoArticulo || usaVariantes) && (
                <>
                  <div className="flex items-center justify-between py-1">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">¿Múltiples tallas o variantes?</label>
                    <button type="button" role="switch" aria-checked={usaVariantes} onClick={() => setUsaVariantes(!usaVariantes)}
                      className={`relative w-10 h-5 rounded-full transition-colors ${usaVariantes ? 'bg-violet-600' : 'bg-slate-300 dark:bg-slate-600'}`}>
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${usaVariantes ? 'translate-x-5' : ''}`} />
                    </button>
                  </div>
                  <input type="hidden" name="usa_variantes" value={usaVariantes ? 'true' : 'false'} />
                  <input type="hidden" name="tallas" value={JSON.stringify(variantes)} />
                  <input type="hidden" name="tipo_articulo" value={tipoArticulo} />

                  {usaVariantes && variantes.length > 0 && (
                    <div className="space-y-1.5">
                      {variantes.map((v, i) => (
                        <div key={i}>
                          {editandoIdx === i ? (
                            <div className="bg-violet-50 dark:bg-violet-500/5 rounded-lg p-2 border border-violet-200 dark:border-violet-500/20 text-xs space-y-1.5">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-violet-700 dark:text-violet-300 min-w-[32px]">{v.talla}</span>
                                <div className="flex gap-1.5 items-center flex-1">
                                  <label className="text-slate-400 dark:text-slate-500">S</label>
                                  <input type="number" value={editForm.stock} onChange={e => setEditForm(f => ({ ...f, stock: e.target.value }))} min={0}
                                    className="w-14 px-1.5 py-1 border border-violet-200 dark:border-violet-800 rounded text-xs text-slate-900 dark:text-white bg-white dark:bg-[#0a0a0d] focus:outline-none focus:ring-1 focus:ring-violet-500" />
                                  <label className="text-slate-400 dark:text-slate-500">P</label>
                                  <input type="number" value={editForm.precio} onChange={e => setEditForm(f => ({ ...f, precio: e.target.value }))} min={0} step="0.01"
                                    className="w-16 px-1.5 py-1 border border-violet-200 dark:border-violet-800 rounded text-xs text-slate-900 dark:text-white bg-white dark:bg-[#0a0a0d] focus:outline-none focus:ring-1 focus:ring-violet-500" />
                                  <label className="text-slate-400 dark:text-slate-500">C</label>
                                  <input type="number" value={editForm.costo} onChange={e => setEditForm(f => ({ ...f, costo: e.target.value }))} min={0} step="0.01"
                                    className="w-16 px-1.5 py-1 border border-violet-200 dark:border-violet-800 rounded text-xs text-slate-900 dark:text-white bg-white dark:bg-[#0a0a0d] focus:outline-none focus:ring-1 focus:ring-violet-500" />
                                  <label className="text-slate-400 dark:text-slate-500">SKU</label>
                                  <input type="text" value={editForm.sku} onChange={e => setEditForm(f => ({ ...f, sku: e.target.value }))}
                                    className="w-16 px-1.5 py-1 border border-violet-200 dark:border-violet-800 rounded text-xs text-slate-900 dark:text-white bg-white dark:bg-[#0a0a0d] focus:outline-none focus:ring-1 focus:ring-violet-500" />
                                </div>
                              </div>
                              <div className="flex gap-1.5 justify-end">
                                <button type="button" onClick={() => setEditandoIdx(null)}
                                  className="px-2 py-1 text-[10px] font-medium text-slate-500 hover:text-slate-700 transition-colors">
                                  Cancelar
                                </button>
                                <button type="button" onClick={() => {
                                  setVariantes(prev => prev.map((x, j) => j === i ? {
                                    ...x,
                                    stock: parseInt(editForm.stock) || 0,
                                    precio: parseFloat(editForm.precio) || null,
                                    costo: parseFloat(editForm.costo) || null,
                                    sku: editForm.sku || undefined,
                                  } : x))
                                  setEditandoIdx(null)
                                }}
                                  className="px-2.5 py-1 text-[10px] font-bold bg-violet-600 text-white rounded-md hover:bg-violet-700 transition-colors">
                                  Guardar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-[#0a0a0d] rounded-lg p-2 border border-slate-200 dark:border-[#1e1e26] text-xs cursor-pointer hover:bg-violet-50 dark:hover:bg-violet-500/5 hover:border-violet-200 dark:hover:border-violet-500/20 transition-colors"
                              onClick={() => {
                                setEditForm({ stock: String(v.stock), precio: v.precio?.toString() || '', costo: v.costo?.toString() || '', sku: v.sku || '' })
                                setEditandoIdx(i)
                              }}>
                              <span className="font-bold text-violet-700 dark:text-violet-300 min-w-[32px]">{v.talla}</span>
                              <span className="text-slate-500 dark:text-slate-400">S:<strong className="text-slate-800 dark:text-white">{v.stock}</strong></span>
                              {v.precio !== null && <span className="text-slate-500 dark:text-slate-400">P:<strong className="text-slate-800 dark:text-white">${v.precio}</strong></span>}
                              {v.costo !== null && <span className="text-slate-500 dark:text-slate-400">C:<strong className="text-slate-800 dark:text-white">${v.costo}</strong></span>}
                              {v.sku && <span className="text-slate-400 dark:text-slate-500 max-w-[60px] truncate" title={v.sku}>SKU:{v.sku}</span>}
                              <button type="button" onClick={e => { e.stopPropagation(); setVariantes(prev => prev.filter((_, j) => j !== i)) }}
                                className="ml-auto text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {usaVariantes && (
                    <div className="grid grid-cols-12 gap-1.5 items-end">
                      <div className="col-span-3">
                        <label className="block text-[9px] font-semibold text-slate-500 dark:text-slate-400 mb-0.5">Talla</label>
                        {customTallaMode ? (
                          <input type="text" value={nuevaVarianteTalla} onChange={e => setNuevaVarianteTalla(e.target.value)} placeholder="Ej: 4XL"
                            className="w-full px-1.5 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-900 dark:text-white bg-white dark:bg-[#0a0a0d]" />
                        ) : (
                          <select value={nuevaVarianteTalla} onChange={e => {
                            if (e.target.value === '__custom__') { setCustomTallaMode(true); setNuevaVarianteTalla('') }
                            else { setNuevaVarianteTalla(e.target.value) }
                          }}
                            className="w-full px-1.5 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-900 dark:text-white bg-white dark:bg-[#0a0a0d]">
                            <option value="">Selec</option>
                            {(tipoArticulo === 'prenda' ? PRENDA_SIZES : CALZADO_SIZES).map(t => (
                              <option key={t} value={t} className="dark:bg-[#0a0a0d] dark:text-white">{t}</option>
                            ))}
                            <option value="__custom__" className="dark:bg-[#0a0a0d] dark:text-white">+ Personalizada</option>
                          </select>
                        )}
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[9px] font-semibold text-slate-500 dark:text-slate-400 mb-0.5">S</label>
                        <input type="number" value={nuevaVarianteStock} onChange={e => setNuevaVarianteStock(e.target.value)} min={0}
                          className="w-full px-1.5 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-900 dark:text-white bg-white dark:bg-[#0a0a0d]" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[9px] font-semibold text-slate-500 dark:text-slate-400 mb-0.5">P</label>
                        <input type="number" value={nuevaVariantePrecio} onChange={e => setNuevaVariantePrecio(e.target.value)} min={0} step="0.01"
                          className="w-full px-1.5 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-900 dark:text-white bg-white dark:bg-[#0a0a0d]" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[9px] font-semibold text-slate-500 dark:text-slate-400 mb-0.5">C</label>
                        <input type="number" value={nuevaVarianteCosto} onChange={e => setNuevaVarianteCosto(e.target.value)} min={0} step="0.01"
                          className="w-full px-1.5 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-900 dark:text-white bg-white dark:bg-[#0a0a0d]" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[9px] font-semibold text-slate-500 dark:text-slate-400 mb-0.5">SKU</label>
                        <input type="text" value={nuevaVarianteSku} onChange={e => setNuevaVarianteSku(e.target.value)} onKeyDown={e => e.key === 'Enter' && e.preventDefault()}
                          className="w-full px-1.5 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-900 dark:text-white bg-white dark:bg-[#0a0a0d]" />
                      </div>
                      <div className="col-span-1">
                        <button type="button" onClick={agregarVariante} disabled={!nuevaVarianteTalla.trim()}
                          className="w-full py-1.5 bg-violet-600 text-white text-xs font-bold rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors">
                          +
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {!usaVariantes && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Stock</label>
                  <input type="number" name="stock" defaultValue={producto.stock}
                    className="w-full px-3 py-2 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-[var(--primary)] outline-none bg-white dark:bg-[#0a0a0d]" />
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditando(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-all press-scale-sm">
                  Cancelar
                </button>
                <button type="submit"
                  className="flex-1 px-4 py-2.5 bg-[var(--primary)] text-white rounded-xl text-sm font-medium hover:brightness-110 transition-all press-scale-sm">
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal confirmar eliminación */}
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