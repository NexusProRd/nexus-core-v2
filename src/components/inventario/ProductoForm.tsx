'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { optimizarImagen } from '@/lib/image'
import { useToast } from '@/components/Toast'
import { crearProducto, actualizarProducto } from '@/app/dashboard/inventario/actions'
import type { ProductoFormMode, ProductoSnapshot, ProductoVariante } from '@/types/producto'

interface ProductoFormProps {
  mode: ProductoFormMode
  initialData?: ProductoSnapshot
  tiendaId: string
  tipoNegocio: string
  categorias?: string[]
  onSuccess?: () => void
  onCancel?: () => void
  whatsappSoporte?: string
}

function generarCodigoAleatorio(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let r = ''
  for (let i = 0; i < 6; i++) r += chars[Math.floor(Math.random() * chars.length)]
  return `NXS-${r}`
}

function generarSkuVariante(codigoBarra: string, talla: string): string {
  const base = codigoBarra?.trim().toUpperCase().replace(/\s+/g, '-')
  const tallaLimpia = talla.trim().toUpperCase().replace(/\s+/g, '-')
  if (base) return `${base}-${tallaLimpia}`
  return `${generarCodigoAleatorio()}-${tallaLimpia}`
}

const PRENDA_SIZES = ['S', 'M', 'L', 'XL', '2XL', '3XL', '28', '30', '32', '34', '36', '38', '40']
const CALZADO_SIZES = ['6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12', '12.5', '13', '13.5', '14', '15', '16']

export default function ProductoForm({ mode, initialData, tiendaId, tipoNegocio, categorias = [], onSuccess, onCancel, whatsappSoporte }: ProductoFormProps) {
  const { toast } = useToast()

  // Basic fields
  const [nombre, setNombre] = useState(initialData?.nombre || '')
  const [descripcion, setDescripcion] = useState(initialData?.descripcion || '')
  const [codigoBarra, setCodigoBarra] = useState(initialData?.codigo_barra || '')
  const [categoria, setCategoria] = useState(initialData?.categoria || '')
  const [precio, setPrecio] = useState(initialData?.precio?.toString() || '')
  const [costo, setCosto] = useState(initialData?.costo_compra?.toString() || '')
  const [enOferta, setEnOferta] = useState(!!initialData?.precio_oferta)
  const [precioOferta, setPrecioOferta] = useState(initialData?.precio_oferta?.toString() || '')
  const [stock, setStock] = useState(initialData?.stock?.toString() || '0')

  // Image
  const [imagenPreview, setImagenPreview] = useState<string | null>(null)
  const [optimizing, setOptimizing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const optimizedFileRef = useRef<File | null>(null)
  const existingImageUrl = initialData?.imagen_url || null

  // Variants
  const [tipoArticulo, setTipoArticulo] = useState<'prenda' | 'calzado' | ''>(
    (initialData?.tipo_articulo as 'prenda' | 'calzado' | '') || ''
  )
  const initialVariants: ProductoVariante[] = Array.isArray(initialData?.tallas) && initialData!.tallas.length > 0
    ? initialData!.tallas
    : []
  const [usaVariantes, setUsaVariantes] = useState(initialVariants.length > 0)
  const [variantes, setVariantes] = useState<ProductoVariante[]>(initialVariants)
  const [customTalla, setCustomTalla] = useState('')

  // UI
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const precioNum = parseFloat(precio) || 0
  const costoNum = parseFloat(costo) || 0
  const margen = precioNum > 0 ? ((precioNum - costoNum) / precioNum * 100) : 0
  const esRopa = tipoNegocio === 'ropa'

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setOptimizing(true)
    setError(null)
    try {
      const optimizedFile = await optimizarImagen(file)
      optimizedFileRef.current = optimizedFile
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
    setImagenPreview(null)
    optimizedFileRef.current = null
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const agregarTallaQuick = (talla: string) => {
    if (!talla || variantes.some(v => v.talla === talla)) return
    setVariantes(prev => [...prev, { talla, stock: 0, precio: null, costo: null, sku: '' }])
  }

  const agregarTallaCustom = () => {
    const t = customTalla.trim()
    if (!t || variantes.some(v => v.talla === t)) return
    setVariantes(prev => [...prev, { talla: t, stock: 0, precio: null, costo: null, sku: '' }])
    setCustomTalla('')
  }

  const updateVariante = (index: number, field: keyof ProductoVariante, value: string | number) => {
    setVariantes(prev => prev.map((v, i) =>
      i === index
        ? { ...v, [field]: field === 'talla' ? String(value) : value === '' ? null : typeof value === 'string' ? parseFloat(value) || 0 : value }
        : v
    ))
  }

  const eliminarVariante = (index: number) => {
    setVariantes(prev => prev.filter((_, i) => i !== index))
  }

  const precioOfertaNum = parseFloat(precioOferta) || 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!nombre.trim()) {
      setError('El nombre del producto es obligatorio')
      return
    }
    if (!usaVariantes && !precioNum) {
      setError('El precio es obligatorio')
      return
    }
    if (usaVariantes && variantes.length === 0) {
      setError('Agrega al menos una variante')
      return
    }

    setSubmitting(true)

    try {
      let imagenUrl = mode === 'edit' ? existingImageUrl : null

      if (optimizedFileRef.current) {
        const supabase = createClient()
        const uuid = `${Date.now()}-${Math.random().toString(36).substring(7)}`
        const filePath = `${tiendaId}/${uuid}.webp`

        const { error: uploadError } = await supabase.storage
          .from('img_products')
          .upload(filePath, optimizedFileRef.current)

        if (uploadError) {
          setError('Error al subir la imagen: ' + uploadError.message)
          toast('Error al subir la imagen', 'error')
          setSubmitting(false)
          return
        }

        const { data: urlData } = supabase.storage
          .from('img_products')
          .getPublicUrl(filePath)

        imagenUrl = urlData.publicUrl
      }

      const formData = new FormData()
      formData.append('nombre', nombre)
      formData.append('descripcion', descripcion)
      formData.append('codigo_barra', codigoBarra)
      formData.append('categoria', categoria)
      formData.append('en_oferta_checkbox', enOferta ? 'true' : 'false')
      formData.append('precio_oferta', precioOferta)
      if (imagenUrl) formData.append('imagen_url', imagenUrl)
      formData.append('usa_variantes', usaVariantes ? 'true' : 'false')

      if (usaVariantes) {
        const variantesConSkus = variantes.map(v => ({
          ...v,
          sku: v.sku || generarSkuVariante(codigoBarra, v.talla)
        }))
        formData.append('tallas', JSON.stringify(variantesConSkus))
        formData.append('tipo_articulo', tipoArticulo)
      } else {
        formData.append('precio', precio)
        formData.append('costo_compra', costo)
        formData.append('stock', stock)
      }

      let result: { success?: boolean; error?: string }

      if (isEdit) {
        formData.append('id', initialData!.id)
        result = await actualizarProducto(formData)
      } else {
        result = await crearProducto(formData)
      }

      if (result.error) {
        setError(result.error)
        toast(result.error, 'error')
        setSubmitting(false)
        return
      }

      toast(isEdit ? 'Producto actualizado correctamente' : 'Producto creado correctamente', 'success')
      setSubmitting(false)
      onSuccess?.()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al crear producto'
      setError(msg)
      toast(msg, 'error')
      setSubmitting(false)
    }
  }

  const isEdit = mode === 'edit'
  const titulo = isEdit ? 'Editar Producto' : 'Nuevo Producto'

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-sm font-medium space-y-3">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
          {whatsappSoporte && mode === 'create' && (
            <div className="border-t border-red-200 dark:border-red-800/30 pt-3">
              <p className="text-sm font-medium mb-2">¿Necesitas más capacidad?</p>
              <a href={`https://wa.me/${whatsappSoporte}?text=${encodeURIComponent('Hola, he alcanzado el límite de productos de mi tienda y me gustaría conocer las opciones para ampliar mi capacidad o actualizar mi plan.')}`}
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors">
                💬 Contactar a Nexus
              </a>
            </div>
          )}
        </div>
      )}

      {/* Imagen */}
      <div>
        <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">Imagen del Producto</label>
        {imagenPreview ? (
          <div className="relative w-fit mx-auto">
            <img src={imagenPreview} alt="Preview" className="w-32 h-32 object-cover rounded-xl border border-slate-200 dark:border-slate-700" />
            <button type="button" onClick={removeImage}
              className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full text-xs hover:bg-red-600 flex items-center justify-center shadow-sm transition-colors">
              ✕
            </button>
          </div>
        ) : existingImageUrl && !imagenPreview ? (
          <div className="relative w-fit mx-auto">
            <img src={existingImageUrl} alt="Actual" className="w-32 h-32 object-cover rounded-xl border border-slate-200 dark:border-slate-700" />
            <label className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-[10px] font-semibold text-slate-600 dark:text-slate-300 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-600 shadow-sm transition-colors whitespace-nowrap">
              Reemplazar
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} disabled={optimizing} className="hidden" />
            </label>
          </div>
        ) : (
          <label
            onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('border-[var(--primary)]', 'bg-[var(--primary)]/5') }}
            onDragLeave={e => { e.currentTarget.classList.remove('border-[var(--primary)]', 'bg-[var(--primary)]/5') }}
            onDrop={e => { e.preventDefault(); e.currentTarget.classList.remove('border-[var(--primary)]', 'bg-[var(--primary)]/5'); const files = e.dataTransfer.files; if (files.length) { const dt = new DataTransfer(); dt.items.add(files[0]); if (fileInputRef.current) { fileInputRef.current.files = dt.files; fileInputRef.current.dispatchEvent(new Event('change', { bubbles: true })) } } }}
            className="w-full h-32 bg-slate-50 dark:bg-slate-800/40 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/30 hover:border-[var(--primary)] transition-colors"
          >
            <svg className="w-8 h-8 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-xs font-medium">Arrastra o haz clic para subir imagen</span>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} disabled={optimizing} className="hidden" />
          </label>
        )}
        {optimizing && <p className="text-xs text-[var(--primary)] mt-1">Optimizando imagen...</p>}
      </div>

      {/* Nombre */}
      <div>
        <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
          Nombre <span className="text-red-500">*</span>
        </label>
        <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} required
          className="w-full px-3 py-2.5 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-[var(--primary)] outline-none bg-white dark:bg-[#0a0a0d]" />
      </div>

      {/* Descripción */}
      <div>
        <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">Descripción</label>
        <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={3}
          className="w-full px-3 py-2.5 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-[var(--primary)] outline-none resize-none bg-white dark:bg-[#0a0a0d]" />
      </div>

      {/* SKU */}
      <div>
        <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">Código de Barra / SKU</label>
        <div className="flex gap-1">
          <input type="text" value={codigoBarra} onChange={e => setCodigoBarra(e.target.value)} onKeyDown={e => e.key === 'Enter' && e.preventDefault()} placeholder="Escanea o escribe el código"
            className="flex-1 px-3 py-2.5 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-[var(--primary)] outline-none bg-white dark:bg-[#0a0a0d]" />
          <button type="button" onClick={() => setCodigoBarra(generarCodigoAleatorio())}
            className="px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors" title="Generar código aleatorio">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Categoría */}
      {categorias.length > 0 && (
        <div>
          <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">Categoría</label>
          <select value={categoria} onChange={e => setCategoria(e.target.value)}
            className="w-full px-3 py-2.5 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-[var(--primary)] outline-none bg-white dark:bg-[#0a0a0d]">
            <option value="">Sin categoría</option>
            {categorias.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      )}

      {/* Variantes — solo ropa/boutique */}
      {esRopa && (
        <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
          <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Variantes</h4>

          {/* Tipo artículo selector */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {(['prenda', 'calzado'] as const).map(tipo => (
              <label key={tipo}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  tipoArticulo === tipo
                    ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/10'
                    : 'border-slate-200 dark:border-slate-600 hover:border-violet-300 dark:hover:border-violet-600 hover:bg-violet-50/30 dark:hover:bg-violet-500/5'
                }`}
              >
                <input type="radio" name="tipo_articulo" value={tipo}
                  checked={tipoArticulo === tipo}
                  onChange={() => { setTipoArticulo(tipo); setVariantes([]); setUsaVariantes(false) }}
                  className="sr-only" />
                <span className="text-xl">{tipo === 'prenda' ? '👕' : '👟'}</span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200 capitalize">{tipo}</span>
              </label>
            ))}
          </div>

          {tipoArticulo && (
            <>
              {/* Toggle variantes */}
              <div className="flex items-center gap-2 py-2">
                <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">¿Múltiples tallas o variantes?</label>
                <button type="button" role="switch" aria-checked={usaVariantes} onClick={() => setUsaVariantes(!usaVariantes)}
                  className={`relative w-11 h-6 shrink-0 rounded-full transition-colors ${usaVariantes ? 'bg-violet-600' : 'bg-slate-300 dark:bg-slate-600'}`}>
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${usaVariantes ? 'translate-x-5' : ''}`} />
                </button>
              </div>

              {usaVariantes && (
                <div className="space-y-3 mt-3">
                  {/* Quick-add bubbles */}
                  <div className="flex flex-wrap gap-1.5">
                    {(tipoArticulo === 'prenda' ? PRENDA_SIZES : CALZADO_SIZES).map(t => {
                      const active = variantes.some(v => v.talla === t)
                      return (
                        <button key={t} type="button" onClick={() => agregarTallaQuick(t)} disabled={active}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                            active
                              ? 'border-violet-200 dark:border-violet-600 bg-violet-50 dark:bg-violet-500/10 text-violet-400 dark:text-violet-500 cursor-not-allowed'
                              : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-violet-50 dark:hover:bg-violet-500/10 hover:border-violet-300 dark:hover:border-violet-500 active:scale-95'
                          }`}>
                          {t}
                        </button>
                      )
                    })}
                    <div className="flex gap-1 items-center">
                      <input type="text" value={customTalla} onChange={e => setCustomTalla(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), agregarTallaCustom())}
                        placeholder="+ Personalizada"
                        className="w-24 px-2 py-1 text-xs border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-900 dark:text-white bg-white dark:bg-[#0a0a0d]" />
                      <button type="button" onClick={agregarTallaCustom} disabled={!customTalla.trim()}
                        className="px-2 py-1 bg-violet-600 text-white text-xs font-bold rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors">
                        +
                      </button>
                    </div>
                  </div>

                  {/* Inline variant grid */}
                  {variantes.length > 0 && (
                    <div className="overflow-x-auto -mx-1">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            <th className="text-left px-2 py-1.5 w-[72px]">Talla</th>
                            <th className="text-center px-2 py-1.5 w-[52px]">St</th>
                            <th className="text-center px-2 py-1.5 w-[64px]">Pr</th>
                            <th className="text-center px-2 py-1.5 w-[64px]">Co</th>
                            <th className="text-center px-2 py-1.5 w-[28px]"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {variantes.map((v, i) => (
                            <tr key={i} className="border-t border-slate-100 dark:border-slate-700/50">
                              <td className="px-2 py-1.5">
                                <span className="font-bold text-violet-700 dark:text-violet-300">{v.talla}</span>
                              </td>
                              <td className="px-2 py-1.5">
                                <input type="number" value={v.stock ?? ''} onChange={e => updateVariante(i, 'stock', e.target.value)} min={0}
                                  className="w-full px-1.5 py-1 text-center border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 text-slate-900 dark:text-white bg-white dark:bg-[#0a0a0d] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
                              </td>
                              <td className="px-2 py-1.5">
                                <input type="number" value={v.precio ?? ''} onChange={e => updateVariante(i, 'precio', e.target.value)} min={0} step="0.01" placeholder="$"
                                  className="w-full px-1.5 py-1 text-center border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 text-slate-900 dark:text-white bg-white dark:bg-[#0a0a0d] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
                              </td>
                              <td className="px-2 py-1.5">
                                <input type="number" value={v.costo ?? ''} onChange={e => updateVariante(i, 'costo', e.target.value)} min={0} step="0.01" placeholder="$"
                                  className="w-full px-1.5 py-1 text-center border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 text-slate-900 dark:text-white bg-white dark:bg-[#0a0a0d] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
                              </td>
                              <td className="px-2 py-1.5 text-center">
                                <button type="button" onClick={() => eliminarVariante(i)}
                                  className="text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors">
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 px-1">
                        St = Stock · Pr = Precio · Co = Costo
                      </div>
                      <div className="text-right text-[11px] text-slate-500 dark:text-slate-400 mt-1 pr-2">
                        Stock total: {variantes.reduce((sum, v) => sum + (v.stock || 0), 0)} unidades
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Línea divisoria precios */}
      <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
        <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Precios</h4>
        {!usaVariantes && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
                Precio <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                <input type="number" step="0.01" value={precio} onChange={e => setPrecio(e.target.value)}
                  className="w-full pl-7 pr-3 py-2.5 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-[var(--primary)] outline-none bg-white dark:bg-[#0a0a0d]" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">Costo</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                <input type="number" step="0.01" value={costo} onChange={e => setCosto(e.target.value)}
                  className="w-full pl-7 pr-3 py-2.5 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-[var(--primary)] outline-none bg-white dark:bg-[#0a0a0d]" />
              </div>
            </div>
          </div>
        )}
        {precioNum > 0 && (
          <p className={`text-xs font-semibold mt-2 ${margen >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            Margen: {margen.toFixed(1)}%
          </p>
        )}
        <label className="flex items-center gap-2 cursor-pointer mt-3">
          <input type="checkbox" checked={enOferta} onChange={e => setEnOferta(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-rose-600 focus:ring-rose-500" />
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Precio de Oferta</span>
        </label>
        {enOferta && (
          <div className="mt-2">
            <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">Precio Rebajado</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
              <input type="number" step="0.01" value={precioOferta} onChange={e => setPrecioOferta(e.target.value)}
                className="w-full pl-7 pr-3 py-2.5 text-slate-900 dark:text-white border border-rose-200 dark:border-rose-800 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none bg-white dark:bg-[#0a0a0d]" />
            </div>
            {precioOfertaNum > 0 && !usaVariantes && precioOfertaNum >= precioNum && (
              <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">El precio de oferta debe ser menor al precio normal.</p>
            )}
          </div>
        )}
      </div>

      {/* Stock (when no variantes) */}
      {(!esRopa || !tipoArticulo || !usaVariantes) && (
        <div>
          <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">Stock</label>
          <input type="number" value={stock} onChange={e => setStock(e.target.value)} min={0}
            className="w-full px-3 py-2.5 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-[var(--primary)] outline-none bg-white dark:bg-[#0a0a0d]" />
        </div>
      )}

      {/* Hidden fields for edit mode */}
      {isEdit && initialData && (
        <input type="hidden" name="id" value={initialData.id} />
      )}

      {/* Sticky footer */}
      <div className="bg-white dark:bg-[#0a0a0d] border-t border-slate-200 dark:border-slate-700 py-4 mt-6 flex gap-3">
        {onCancel && (
          <button type="button" onClick={onCancel}
            className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-all press-scale-sm">
            Cancelar
          </button>
        )}
        <button type="submit" disabled={submitting || optimizing}
          className={`${onCancel ? 'flex-1' : 'w-full'} px-4 py-2.5 bg-[var(--primary)] text-white rounded-xl text-sm font-medium hover:brightness-110 transition-all disabled:opacity-50 press-scale-sm`}>
          {submitting ? (
            <span className="inline-flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Guardando...
            </span>
          ) : isEdit ? 'Guardar Cambios' : 'Crear Producto'}
        </button>
      </div>
    </form>
  )
}
