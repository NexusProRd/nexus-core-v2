'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { optimizarImagen } from '@/lib/image'
import { createClient } from '@/lib/supabase'
import type { PortadaDashboard, TipoPortada } from '@/types/portada'

interface ProductoSimple {
  id: string
  nombre: string
  imagen_url: string | null
  descripcion: string | null
  precio: number
  precio_oferta: number | null
}

interface Props {
  portada?: PortadaDashboard | null
  idTienda: string
  onClose: () => void
  onSaved: () => void
}

const tipoOptions: { value: TipoPortada; label: string; desc: string }[] = [
  { value: 'institucional', label: 'Institucional', desc: 'Imagen + título + descripción personalizados' },
  { value: 'producto', label: 'Producto', desc: 'Destaca un producto existente' },
  { value: 'oferta', label: 'Oferta', desc: 'Muestra un producto con descuento' },
]

export default function PortadaForm({ portada, idTienda, onClose, onSaved }: Props) {
  const isEdit = !!portada

  const [tipo, setTipo] = useState<TipoPortada>(portada?.tipo || 'institucional')
  const [imagenFile, setImagenFile] = useState<File | null>(null)
  const [imagenPreview, setImagenPreview] = useState<string | null>(portada?.imagen_url || null)
  const [titulo, setTitulo] = useState(portada?.titulo || '')
  const [descripcion, setDescripcion] = useState(portada?.descripcion || '')
  const [productoSearch, setProductoSearch] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<ProductoSimple | null>(null)
  const [products, setProducts] = useState<ProductoSimple[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [optimizing, setOptimizing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEdit && portada?.id_producto) {
      fetchProducts().then(() => {
        setProductoSearch('loading')
      })
    } else {
      fetchProducts()
    }
  }, [])

  const fetchProducts = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('productos')
      .select('id, nombre, imagen_url, descripcion, precio, precio_oferta')
      .eq('id_tienda', idTienda)
      .order('nombre', { ascending: true })
    if (data) setProducts(data)
  }, [idTienda])

  const filteredProducts = useMemo(() => {
    if (!productoSearch || productoSearch === 'loading') return []
    const q = productoSearch.toLowerCase()
    return products.filter(p => p.nombre.toLowerCase().includes(q))
  }, [products, productoSearch])

  const isOfertaValida = useCallback((p: ProductoSimple) => {
    return p.precio_oferta != null && p.precio_oferta > 0 && p.precio_oferta < p.precio
  }, [])

  const handleTipoChange = (newTipo: TipoPortada) => {
    setTipo(newTipo)
    if (newTipo === 'institucional') {
      setSelectedProduct(null)
      setProductoSearch('')
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setOptimizing(true)
    setError(null)
    try {
      const optimizedFile = await optimizarImagen(file, 1920, 0.8)
      setImagenFile(optimizedFile)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagenPreview(reader.result as string)
        setOptimizing(false)
      }
      reader.readAsDataURL(optimizedFile)
    } catch {
      setError('Error al optimizar la imagen')
      setOptimizing(false)
    }
  }

  const removeImage = () => {
    setImagenFile(null)
    setImagenPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const selectProduct = (p: ProductoSimple) => {
    if (tipo === 'oferta' && !isOfertaValida(p)) {
      setError('Este producto no tiene oferta activa. Selecciona otro o cambia el tipo.')
      return
    }
    setSelectedProduct(p)
    setProductoSearch(p.nombre)
    setImagenPreview(p.imagen_url)
    if (!isEdit || !portada?.titulo) setTitulo(p.nombre)
    if (!isEdit || !portada?.descripcion) setDescripcion(p.descripcion || '')
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!titulo.trim() && tipo !== 'institucional') {
      setError('El título es obligatorio')
      return
    }

    if (tipo !== 'institucional' && !selectedProduct) {
      setError('Selecciona un producto')
      return
    }

    setSubmitting(true)

    try {
      let imagenUrl = portada?.imagen_url || null

      if (imagenFile) {
        const supabase = createClient()
        const uuid = `${Date.now()}-${Math.random().toString(36).substring(7)}`
        const filePath = `${idTienda}/portadas/${uuid}.webp`

        const { error: uploadError } = await supabase.storage
          .from('img_products')
          .upload(filePath, imagenFile)

        if (uploadError) {
          setError('Error al subir la imagen: ' + uploadError.message)
          setSubmitting(false)
          return
        }

        const { data: urlData } = supabase.storage
          .from('img_products')
          .getPublicUrl(filePath)

        imagenUrl = urlData.publicUrl
      } else if (tipo !== 'institucional' && selectedProduct?.imagen_url) {
        imagenUrl = selectedProduct.imagen_url
      }

      const payload: Record<string, unknown> = {
        tipo,
        imagen_url: imagenUrl,
        titulo: titulo.trim() || null,
        descripcion: descripcion.trim() || null,
        id_producto: selectedProduct?.id || portada?.id_producto || null,
        cta_accion: tipo === 'institucional' ? 'ver_productos' : 'ver_producto',
        duracion_ms: 5000,
      }

      const url = isEdit ? `/api/portadas/${portada!.id}` : '/api/portadas'
      const method = isEdit ? 'PUT' : 'POST'

      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Error al guardar')
        setSubmitting(false)
        return
      }

      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
      setSubmitting(false)
    }
  }

  const previewProduct = selectedProduct || (portada?.id_producto && products.find(p => p.id === portada.id_producto))

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <button onClick={onClose} type="button"
          className="p-1.5 -ml-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 12H5m7-7l-7 7 7 7" />
          </svg>
        </button>
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          {isEdit ? 'Editar Portada' : 'Nueva Portada'}
        </h3>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400 font-medium">
          {error}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        <div className="w-full lg:w-[65%]">
          <form onSubmit={handleSubmit} className="space-y-5">
            {!isEdit && (
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 block">Tipo de portada</label>
                <div className="grid grid-cols-3 gap-2">
                  {tipoOptions.map(opt => (
                    <button key={opt.value} type="button" onClick={() => handleTipoChange(opt.value)}
                      className={`p-3 rounded-xl border text-left transition-all ${tipo === opt.value
                        ? 'border-[var(--primary)] bg-[var(--primary)]/5 ring-1 ring-[var(--primary)]'
                        : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'}`}>
                      <p className="text-xs font-bold text-slate-900 dark:text-white capitalize">{opt.label}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {(tipo === 'institucional' || isEdit) && (
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 block">Imagen</label>
                {imagenPreview ? (
                  <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-600">
                    <img src={imagenPreview} alt="Preview" className="w-full h-36 object-cover" />
                    <button type="button" onClick={removeImage}
                      className="absolute top-2 right-2 p-1 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-28 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-600 cursor-pointer hover:border-[var(--primary)] transition-colors">
                    {optimizing ? (
                      <span className="text-xs text-slate-400">Optimizando...</span>
                    ) : (
                      <>
                        <svg className="w-6 h-6 text-slate-300 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-[11px] text-slate-400 font-medium">1920px recomendado · WebP</span>
                      </>
                    )}
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                  </label>
                )}
              </div>
            )}

            {tipo !== 'institucional' && (
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
                  {tipo === 'oferta' ? 'Producto con oferta' : 'Producto'}
                </label>
                <div className="relative">
                  <input type="text" value={productoSearch === 'loading' ? (portada?.titulo || 'Cargando...') : productoSearch}
                    onChange={e => { setProductoSearch(e.target.value); setSelectedProduct(null) }}
                    placeholder="Buscar producto..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)]" />
                  {productoSearch && productoSearch !== 'loading' && !selectedProduct && filteredProducts.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-lg max-h-48 overflow-y-auto z-10">
                      {filteredProducts.map(p => (
                        <button key={p.id} type="button" onClick={() => selectProduct(p)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                          {p.imagen_url ? (
                            <img src={p.imagen_url} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 shrink-0" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-slate-900 dark:text-white truncate">{p.nombre}</p>
                            <p className="text-[10px] text-slate-400">
                              ${p.precio_oferta ? `${p.precio_oferta}` : p.precio}
                              {p.precio_oferta && <span className="line-through ml-1">${p.precio}</span>}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {productoSearch !== 'loading' && !selectedProduct && productoSearch && filteredProducts.length === 0 && (
                    <p className="text-[11px] text-slate-400 mt-1">No se encontraron productos</p>
                  )}
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 block">Título</label>
              <input type="text" value={titulo}
                onChange={e => setTitulo(e.target.value)}
                placeholder={tipo === 'institucional' ? 'Ej: Bienvenidos a nuestra tienda' : 'Nombre del producto'}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)]" />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 block">Descripción</label>
              <textarea value={descripcion}
                onChange={e => setDescripcion(e.target.value)}
                rows={3}
                placeholder="Breve descripción de la portada"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] resize-none" />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button type="button" onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={submitting}
                className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--primary)] text-white text-sm font-bold hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
                {submitting ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear portada'}
              </button>
            </div>
          </form>
        </div>

        <div className="w-full lg:w-[35%]">
          <div className="lg:sticky lg:top-24 space-y-3">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Vista previa</p>
            <div className="flex justify-center">
              <div className="relative w-full max-w-[220px] aspect-[9/16] rounded-[2rem] border-[3px] border-slate-700 dark:border-slate-500 overflow-hidden bg-slate-100 dark:bg-slate-800 shadow-xl shadow-slate-300/30 dark:shadow-slate-900/50">
                {imagenPreview ? (
                  <img src={imagenPreview} alt="" className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-300 dark:text-slate-600">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-[10px] font-medium">Vista previa</span>
                  </div>
                )}
                <div className="absolute inset-x-0 top-3 flex justify-center">
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${tipo === 'institucional' ? 'bg-blue-500/80 text-white' : tipo === 'producto' ? 'bg-purple-500/80 text-white' : 'bg-emerald-500/80 text-white'}`}>
                    {tipoOptions.find(t => t.value === tipo)?.label || tipo}
                  </span>
                </div>
                <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/70 via-black/30 to-transparent pt-12">
                  {titulo && (
                    <p className="text-white font-bold text-xs leading-tight line-clamp-2">{titulo}</p>
                  )}
                  {descripcion && (
                    <p className="text-white/70 text-[10px] mt-1 leading-tight line-clamp-2">{descripcion}</p>
                  )}
                  {previewProduct && (
                    <div className="mt-1.5 flex items-center gap-1.5">
                      {previewProduct.precio_oferta ? (
                        <>
                          <span className="text-white font-bold text-xs">${previewProduct.precio_oferta}</span>
                          <span className="text-white/50 text-[10px] line-through">${previewProduct.precio}</span>
                        </>
                      ) : (
                        <span className="text-white font-bold text-xs">${previewProduct.precio}</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-black/30 dark:bg-white/30" />
                <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-slate-500/50" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
