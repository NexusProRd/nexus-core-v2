'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { generarSlug } from '@/lib/slug'
import { optimizarImagen } from '@/lib/image'

function generarCodigoAleatorio(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let r = ''
  for (let i = 0; i < 6; i++) r += chars[Math.floor(Math.random() * chars.length)]
  return `NXS-${r}`
}

export default function AgregarProductoForm({ tiendaId, tipoNegocio = 'estandar', categorias = [], onSuccess }: { tiendaId: string; tipoNegocio?: string; categorias?: string[]; onSuccess?: () => void }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [imagenPreview, setImagenPreview] = useState<string | null>(null)
  const [optimizing, setOptimizing] = useState(false)
  const [precioInput, setPrecioInput] = useState('')
  const [costoInput, setCostoInput] = useState('')
  const [enOferta, setEnOferta] = useState(false)
  const [precioOfertaInput, setPrecioOfertaInput] = useState('')
  const [unidadMedida, setUnidadMedida] = useState<'libra' | 'unidad' | ''>('')
  const [tipoArticulo, setTipoArticulo] = useState<'prenda' | 'calzado' | ''>('')
  const [usaVariantes, setUsaVariantes] = useState(false)
  const [variantes, setVariantes] = useState<{ talla: string; stock: number; precio: number | null; costo: number | null; sku?: string }[]>([])
  const [customQuickTalla, setCustomQuickTalla] = useState('')
  const [varianteExpandida, setVarianteExpandida] = useState<number | null>(null)
  const [codigoBarra, setCodigoBarra] = useState('')

  const PRENDA_SIZES = ['S', 'M', 'L', 'XL', '2XL', '3XL', '28', '30', '32', '34', '36', '38', '40']
  const CALZADO_SIZES = ['6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12', '12.5', '13', '13.5', '14', '15', '16']

  const fileInputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const optimizedFileRef = useRef<File | null>(null)
  const router = useRouter()

  const precio = parseFloat(precioInput) || 0
  const costo = parseFloat(costoInput) || 0
  const precioOferta = parseFloat(precioOfertaInput) || 0
  const margen = precio > 0 ? ((precio - costo) / precio * 100) : 0

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setOptimizing(true)
      setError('')
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
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    const supabase = createClient()

    let imagenUrl = null

    // Use stored optimized file instead of formData
    if (optimizedFileRef.current) {
      const uuid = `${Date.now()}-${Math.random().toString(36).substring(7)}`
      const filePath = `${tiendaId}/${uuid}.webp`

      const { error: uploadError } = await supabase.storage
        .from('img_products')
        .upload(filePath, optimizedFileRef.current)

      if (uploadError) {
        setError('Error al subir la imagen: ' + uploadError.message)
        setLoading(false)
        return
      }

      const { data: urlData } = supabase.storage
        .from('img_products')
        .getPublicUrl(filePath)

      imagenUrl = urlData.publicUrl
    }

    if (!tiendaId) {
      setError('Error de sesión: no se encontró el ID de la tienda.')
      setLoading(false)
      return
    }

    const nombre = formData.get('nombre') as string
    let descripcion = formData.get('descripcion') as string
    const stock = parseInt(formData.get('stock') as string)

    if (tipoNegocio === 'ropa' && formData.get('duracion_input')) {
      descripcion = descripcion ? `⏱ ${formData.get('duracion_input')} | ${descripcion}` : `⏱ ${formData.get('duracion_input')}`
    }

    // Salvaguarda: si usa variantes, tomar precio/costo de la primera variante
    const precioFinal = usaVariantes
      ? (variantes[0]?.precio ?? 0)
      : parseFloat(formData.get('precio') as string)
    const costoFinal = usaVariantes
      ? (variantes[0]?.costo ?? 0)
      : costo

    console.log('Enviando id_tienda a Supabase:', tiendaId)

    const slug = await generarSlug(nombre, codigoBarra, supabase, tiendaId)

    const { error: insertError } = await supabase.from('productos').insert({
      id_tienda: tiendaId,
      nombre,
      slug,
      descripcion,
      categoria: formData.get('categoria') as string || null,
      precio: precioFinal,
      costo_compra: costoFinal,
      precio_oferta: enOferta && precioOferta > 0 ? precioOferta : null,
      stock: usaVariantes ? variantes.reduce((sum, v) => sum + (v.stock || 0), 0) : stock,
      in_stock: true,
      imagen_url: imagenUrl,
      unidad_medida: null,
      tallas: tipoNegocio === 'ropa' ? (usaVariantes ? variantes : []) : [],
      tipo_articulo: tipoNegocio === 'ropa' ? (tipoArticulo || null) : null,
    })

    if (insertError) {
      setError('Error al guardar el producto: ' + insertError.message)
      setLoading(false)
      return
    }

    setImagenPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    formRef.current?.reset()
    router.refresh()
    setLoading(false)
    onSuccess?.()
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {tipoNegocio === 'estandar' ? (<>
      <div className="flex flex-col gap-4">
        {/* Image first */}
        <div>
          <label className="block text-sm font-bold text-slate-800 mb-2">Imagen del Producto</label>
          {imagenPreview ? (
            <div className="relative w-fit mx-auto">
              <img src={imagenPreview} alt="Preview" className="w-32 h-32 object-cover rounded-xl border border-slate-200" />
              <button type="button" onClick={() => { setImagenPreview(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full text-xs hover:bg-red-600 flex items-center justify-center shadow-sm">✕</button>
            </div>
          ) : (
            <label
              onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('border-[var(--primary)]', 'bg-[var(--primary)]/5') }}
              onDragLeave={e => { e.currentTarget.classList.remove('border-[var(--primary)]', 'bg-[var(--primary)]/5') }}
              onDrop={e => { e.preventDefault(); e.currentTarget.classList.remove('border-[var(--primary)]', 'bg-[var(--primary)]/5'); const files = e.dataTransfer.files; if (files.length) { const dt = new DataTransfer(); dt.items.add(files[0]); if (fileInputRef.current) { fileInputRef.current.files = dt.files; fileInputRef.current.dispatchEvent(new Event('change', { bubbles: true })) } } }}
              className="w-full h-32 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:bg-slate-100 hover:border-[var(--primary)] transition-colors"
            >
              <svg className="w-8 h-8 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-xs font-medium">Arrastra o haz clic para subir imagen</span>
              <input ref={fileInputRef} type="file" name="imagen" accept="image/*" onChange={handleFileChange} disabled={optimizing} className="hidden" />
            </label>
          )}
          {optimizing && <p className="text-xs text-[var(--primary)] mt-1">Optimizando imagen...</p>}
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-800 mb-1">Nombre</label>
          <input type="text" name="nombre" required
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-slate-900 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-800 mb-1">Descripción</label>
          <textarea name="descripcion" rows={3}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-slate-900 text-sm resize-none" />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-800 mb-1">Código de Barra / SKU</label>
          <div className="flex gap-1">
            <input type="text" name="codigo_barra" value={codigoBarra} onChange={e => setCodigoBarra(e.target.value)} onKeyDown={e => e.key === 'Enter' && e.preventDefault()} placeholder="Escanea o escribe el código"
              className="flex-1 px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-slate-900 text-sm" />
            <button type="button" onClick={() => setCodigoBarra(generarCodigoAleatorio())}
              className="px-3 py-2.5 border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 transition-colors" title="Generar código aleatorio">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </button>
          </div>
        </div>
        {categorias.length > 0 && (
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">Categoría</label>
            <select name="categoria" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-slate-900 text-sm dark:text-white dark:bg-slate-800">
              <option value="" className="dark:bg-slate-800 dark:text-white">Sin categoría</option>
              {categorias.map(c => <option key={c} value={c} className="dark:bg-slate-800 dark:text-white">{c}</option>)}
            </select>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">Costo</label>
            <input type="number" name="costo_compra" step="0.01"
              value={costoInput} onChange={e => setCostoInput(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-slate-900 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">Precio</label>
            <input type="number" name="precio" step="0.01" required
              value={precioInput} onChange={e => setPrecioInput(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-slate-900 text-sm" />
          </div>
        </div>
        {precio > 0 && (
          <p className={`text-xs font-semibold ${margen >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>Margen: {margen.toFixed(1)}%</p>
        )}
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={enOferta} onChange={e => setEnOferta(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500" />
          <input type="hidden" name="en_oferta_checkbox" value={enOferta ? 'true' : 'false'} />
          <span className="text-sm font-bold text-slate-800">Precio de Oferta</span>
        </label>
        {enOferta && (
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">Precio Rebajado</label>
            <input type="number" name="precio_oferta" step="0.01"
              value={precioOfertaInput} onChange={e => setPrecioOfertaInput(e.target.value)}
              className="w-full px-3 py-2.5 border border-rose-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-900 text-sm" />
            {precioOferta > 0 && precioOferta >= precio && (
              <p className="text-xs text-rose-600 mt-1">El precio de oferta debe ser menor al precio normal.</p>
            )}
          </div>
        )}
        <div>
          <label className="block text-sm font-bold text-slate-800 mb-1">Stock</label>
          <input type="number" name="stock" required
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-slate-900 text-sm" />
        </div>
      </div>
      <button type="submit" disabled={loading || optimizing}
        className="w-full py-2.5 bg-[var(--primary)] text-white font-semibold rounded-xl hover:brightness-110 transition-colors disabled:opacity-50 text-sm mt-2">
        {loading ? 'Guardando...' : 'Agregar Producto'}
      </button>
      </>) : tipoNegocio === 'ropa' ? (
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-2">Imagen del Producto</label>
            {imagenPreview ? (
              <div className="relative w-fit mx-auto">
                <img src={imagenPreview} alt="Preview" className="w-32 h-32 object-cover rounded-xl border border-slate-200" />
                <button type="button" onClick={() => { setImagenPreview(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                  className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full text-xs hover:bg-red-600 flex items-center justify-center shadow-sm">✕</button>
              </div>
            ) : (
              <label
                onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('border-[var(--primary)]', 'bg-[var(--primary)]/5') }}
                onDragLeave={e => { e.currentTarget.classList.remove('border-[var(--primary)]', 'bg-[var(--primary)]/5') }}
                onDrop={e => { e.preventDefault(); e.currentTarget.classList.remove('border-[var(--primary)]', 'bg-[var(--primary)]/5'); const files = e.dataTransfer.files; if (files.length) { const dt = new DataTransfer(); dt.items.add(files[0]); if (fileInputRef.current) { fileInputRef.current.files = dt.files; fileInputRef.current.dispatchEvent(new Event('change', { bubbles: true })) } } }}
                className="w-full h-32 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:bg-slate-100 hover:border-[var(--primary)] transition-colors"
              >
                <svg className="w-8 h-8 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-xs font-medium">Arrastra o haz clic para subir imagen</span>
                <input ref={fileInputRef} type="file" name="imagen" accept="image/*" onChange={handleFileChange} disabled={optimizing} className="hidden" />
              </label>
            )}
            {optimizing && <p className="text-xs text-[var(--primary)] mt-1">Optimizando imagen...</p>}
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">Nombre del Producto</label>
            <input type="text" name="nombre" required
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-slate-900 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">Descripción</label>
            <textarea name="descripcion" rows={3}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-slate-900 text-sm resize-none" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">Código de Barra / SKU</label>
            <div className="flex gap-1">
              <input type="text" name="codigo_barra" value={codigoBarra} onChange={e => setCodigoBarra(e.target.value)} onKeyDown={e => e.key === 'Enter' && e.preventDefault()} placeholder="Escanea o escribe el código"
                className="flex-1 px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-slate-900 text-sm" />
              <button type="button" onClick={() => setCodigoBarra(generarCodigoAleatorio())}
                className="px-3 py-2.5 border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 transition-colors" title="Generar código aleatorio">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              </button>
            </div>
          </div>
          {categorias.length > 0 && (
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1">Categoría</label>
              <select name="categoria" className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-slate-900 dark:text-white text-sm bg-white dark:bg-slate-800">
                <option value="" className="dark:bg-slate-800 dark:text-white">Sin categoría</option>
                {categorias.map(c => <option key={c} value={c} className="dark:bg-slate-800 dark:text-white">{c}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">Tipo de Artículo</label>
            <div className="grid grid-cols-2 gap-2">
              <label className={`flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 cursor-pointer transition-all ${tipoArticulo === 'prenda' ? 'border-violet-500 bg-violet-50' : 'border-slate-200 hover:border-violet-300 hover:bg-violet-50/30'}`}>
                <input type="radio" name="tipo_articulo" value="prenda" checked={tipoArticulo === 'prenda'} onChange={() => { setTipoArticulo('prenda'); setVariantes([]); setUsaVariantes(false) }} className="sr-only" />
                <span className="text-2xl">👕</span>
                <span className="text-sm font-bold text-slate-800">Prenda / Ropa</span>
                <span className="text-[11px] text-slate-400 text-center">Camisetas, Pantalones, Chaquetas</span>
              </label>
              <label className={`flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 cursor-pointer transition-all ${tipoArticulo === 'calzado' ? 'border-violet-500 bg-violet-50' : 'border-slate-200 hover:border-violet-300 hover:bg-violet-50/30'}`}>
                <input type="radio" name="tipo_articulo" value="calzado" checked={tipoArticulo === 'calzado'} onChange={() => { setTipoArticulo('calzado'); setVariantes([]); setUsaVariantes(false) }} className="sr-only" />
                <span className="text-2xl">👟</span>
                <span className="text-sm font-bold text-slate-800">Calzado</span>
                <span className="text-[11px] text-slate-400 text-center">Zapatos, Tenis, Sandalias</span>
              </label>
            </div>
          </div>
          {tipoArticulo && (
            <>
              <div className="flex items-center justify-between py-2">
                <label className="text-sm font-bold text-slate-800">¿Múltiples tallas o variantes?</label>
                <button type="button" role="switch" aria-checked={usaVariantes} onClick={() => setUsaVariantes(!usaVariantes)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${usaVariantes ? 'bg-violet-600' : 'bg-slate-300'}`}>
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${usaVariantes ? 'translate-x-5' : ''}`} />
                </button>
              </div>

              {!usaVariantes ? null : (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Variantes</p>

                  {/* Burbujas rápidas de tallas */}
                  <div className="flex flex-wrap gap-1.5">
                    {(tipoArticulo === 'prenda' ? PRENDA_SIZES : CALZADO_SIZES).map(t => (
                      <button key={t} type="button" onClick={() => { if (!variantes.some(v => v.talla === t)) setVariantes(prev => [...prev, { talla: t, stock: 0, precio: null, costo: null, sku: '' }]) }}
                        disabled={variantes.some(v => v.talla === t)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${variantes.some(v => v.talla === t) ? 'border-violet-200 bg-violet-50 text-violet-400 cursor-not-allowed' : 'border-slate-200 text-slate-600 hover:bg-violet-50 hover:border-violet-300 active:scale-95'}`}>
                        {t}
                      </button>
                    ))}
                    <div className="flex gap-1 items-center">
                      <input type="text" value={customQuickTalla} onChange={e => setCustomQuickTalla(e.target.value)} placeholder="+ Personalizada"
                        className="w-24 px-2 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-900" />
                      <button type="button" onClick={() => { const t = customQuickTalla.trim(); if (t && !variantes.some(v => v.talla === t)) { setVariantes(prev => [...prev, { talla: t, stock: 0, precio: null, costo: null, sku: '' }]); setCustomQuickTalla('') } }}
                        disabled={!customQuickTalla.trim()}
                        className="px-2 py-1 bg-violet-600 text-white text-xs font-bold rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors">+</button>
                    </div>
                  </div>

                  {/* Grid de tarjetas expandibles */}
                  {variantes.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-4">
                      {variantes.map((v, i) => {
                        const expandida = varianteExpandida === i
                        return (
                          <div key={i} className="relative flex flex-col bg-violet-50/50 border border-violet-200/60 rounded-xl transition-all text-center group">
                            {/* Cabecera siempre visible */}
                            <div onClick={() => setVarianteExpandida(expandida ? null : i)}
                              className="flex flex-col items-center justify-center p-4 cursor-pointer select-none">
                              <span className="text-base font-bold text-slate-800">{v.talla}</span>
                              <span className="text-xs text-slate-500 mt-1">Stock: {v.stock}{v.precio !== null ? ` · $${v.precio}` : ''}</span>
                            </div>
                            {/* Cuerpo expandible */}
                            {expandida && (
                              <div className="px-3 pb-4 pt-0 space-y-2.5 border-t border-violet-200/40">
                                <div className="pt-2.5">
                                  <label className="block text-[10px] font-semibold text-slate-500 mb-0.5 text-left">Stock</label>
                                  <input type="number" value={v.stock} onChange={e => setVariantes(prev => prev.map((x, j) => j === i ? { ...x, stock: parseInt(e.target.value) || 0 } : x))} min={0}
                                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-900" />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-semibold text-slate-500 mb-0.5 text-left">Precio</label>
                                  <input type="number" value={v.precio ?? ''} onChange={e => setVariantes(prev => prev.map((x, j) => j === i ? { ...x, precio: e.target.value === '' ? null : parseFloat(e.target.value) || null } : x))} min={0} step="0.01" placeholder="Heredado"
                                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-900" />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-semibold text-slate-500 mb-0.5 text-left">Costo</label>
                                  <input type="number" value={v.costo ?? ''} onChange={e => setVariantes(prev => prev.map((x, j) => j === i ? { ...x, costo: e.target.value === '' ? null : parseFloat(e.target.value) || null } : x))} min={0} step="0.01" placeholder="Heredado"
                                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-900" />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-semibold text-slate-500 mb-0.5 text-left">SKU</label>
                                  <div className="flex gap-1">
                                    <input type="text" value={v.sku ?? ''} onChange={e => setVariantes(prev => prev.map((x, j) => j === i ? { ...x, sku: e.target.value } : x))} onKeyDown={e => e.key === 'Enter' && e.preventDefault()} placeholder="Código"
                                      className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-900" />
                                    <button type="button" onClick={() => setVariantes(prev => prev.map((x, j) => j === i ? { ...x, sku: generarCodigoAleatorio() } : x))}
                                      className="px-2 py-1.5 border border-slate-200 rounded-lg text-slate-400 hover:text-violet-600 hover:border-violet-200 transition-colors" title="Generar SKU">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                            {/* Botón eliminar */}
                            <button type="button" onClick={() => setVariantes(prev => prev.filter((_, j) => j !== i))}
                              className="absolute -top-2 -right-2 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-rose-50 hover:border-rose-300 hover:text-rose-600 text-slate-400">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}

                </div>
              )}
            </>
          )}
          {(!tipoArticulo || !usaVariantes) && (
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1">Stock</label>
              <input type="number" name="stock" required defaultValue={0}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-slate-900 text-sm" />
            </div>
          )}
          {!usaVariantes && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1">Costo</label>
                <input type="number" name="costo_compra" step="0.01"
                  value={costoInput} onChange={e => setCostoInput(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-slate-900 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1">Precio</label>
                <input type="number" name="precio" step="0.01" required
                  value={precioInput} onChange={e => setPrecioInput(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-slate-900 text-sm" />
              </div>
            </div>
          )}
          {!usaVariantes && precio > 0 && (
            <p className={`text-xs font-semibold ${margen >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>Margen: {margen.toFixed(1)}%</p>
          )}
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={enOferta} onChange={e => setEnOferta(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500" />
            <input type="hidden" name="en_oferta_checkbox" value={enOferta ? 'true' : 'false'} />
            <span className="text-sm font-bold text-slate-800">Precio de Oferta</span>
          </label>
          {enOferta && (
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1">Precio Rebajado</label>
              <input type="number" name="precio_oferta" step="0.01"
                value={precioOfertaInput} onChange={e => setPrecioOfertaInput(e.target.value)}
                className="w-full px-3 py-2.5 border border-rose-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-900 text-sm" />
              {precioOferta > 0 && precioOferta >= precio && (
                <p className="text-xs text-rose-600 mt-1">El precio de oferta debe ser menor al precio normal.</p>
              )}
            </div>
          )}
          <button type="submit" disabled={loading || optimizing}
            className="w-full py-2.5 bg-[var(--primary)] text-white font-semibold rounded-xl hover:brightness-110 transition-colors disabled:opacity-50 text-sm mt-2">
            {loading ? 'Guardando...' : 'Agregar Producto'}
          </button>
        </div>
      ) : null}
    </form>
  )
}