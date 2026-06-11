'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { PlantillaPreview } from '@/components/catalog/CatalogoModal'
import type { CatalogoModalConfig, TemplateKey } from '@/components/catalog/CatalogoModal'
import { toPng } from 'html-to-image'
import { createClient } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { useDashboard } from '../DashboardContext'

type BannerObjetivo = 'oferta' | 'nuevo_producto' | 'evento' | 'delivery_gratis' | 'destacado'
type BannerEstilo = 'premium' | 'minimalista' | 'moderno' | 'energetico'

interface ProductoSimple {
  id: string
  nombre: string
  precio: number
  precio_oferta: number
  imagen_url: string | null
}

interface VarianteGenerada {
  id: number
  templateKey: TemplateKey
  label: string
  config: CatalogoModalConfig
}

const OBJETIVOS: { key: BannerObjetivo; icon: string; label: string; desc: string; requiereProducto: boolean }[] = [
  { key: 'oferta', icon: '🏷️', label: 'Oferta', desc: 'Producto con descuento', requiereProducto: true },
  { key: 'nuevo_producto', icon: '🆕', label: 'Nuevo Producto', desc: 'Lanzamiento o novedad', requiereProducto: true },
  { key: 'evento', icon: '🎉', label: 'Evento', desc: 'Promoción por tiempo limitado', requiereProducto: false },
  { key: 'delivery_gratis', icon: '🚚', label: 'Delivery Gratis', desc: 'Envío sin costo', requiereProducto: false },
  { key: 'destacado', icon: '⭐', label: 'Destacado', desc: 'Producto estelar', requiereProducto: true },
]

const ESTILOS: { key: BannerEstilo; icon: string; label: string; desc: string; gradient: string }[] = [
  { key: 'premium', icon: '✨', label: 'Premium', desc: 'Elegante y exclusivo', gradient: 'from-amber-500/20 via-rose-500/10 to-purple-500/20' },
  { key: 'minimalista', icon: '◻️', label: 'Minimalista', desc: 'Limpio y directo', gradient: 'from-slate-400/20 via-stone-300/10 to-slate-500/20' },
  { key: 'moderno', icon: '💠', label: 'Moderno', desc: 'Fresco y actual', gradient: 'from-cyan-500/20 via-blue-500/10 to-indigo-500/20' },
  { key: 'energetico', icon: '⚡', label: 'Energético', desc: 'Vibrante y audaz', gradient: 'from-red-500/20 via-orange-500/10 to-amber-500/20' },
]

const TEMPLATES_POR_ESTILO: Record<BannerEstilo, { key: TemplateKey; label: string; desc: string }[]> = {
  premium: [
    { key: 'premium', label: 'Premium Dorado', desc: 'Clásico y exclusivo' },
    { key: 'elegante', label: 'Elegante Oscuro', desc: 'Lujo y sofisticación' },
    { key: 'pastel', label: 'Pastel Dulce', desc: 'Suave y tierno' },
    { key: 'noir', label: 'Noir Plateado', desc: 'Sobrio y metálico' },
  ],
  minimalista: [
    { key: 'clean', label: 'Clean Minimal', desc: 'Simple y directo' },
    { key: 'noir', label: 'Noir Plateado', desc: 'Sobrio y metálico' },
    { key: 'rustico', label: 'Rústico Natural', desc: 'Tierra y naturaleza' },
    { key: 'tech', label: 'Tech Futuro', desc: 'Geométrico y moderno' },
  ],
  moderno: [
    { key: 'neon', label: 'Moderno Neón', desc: 'Vibrante y juvenil' },
    { key: 'tech', label: 'Tech Futuro', desc: 'Geométrico y moderno' },
    { key: 'bold', label: 'Bold Rojo', desc: 'Audaz y potente' },
    { key: 'clean', label: 'Clean Minimal', desc: 'Simple y directo' },
  ],
  energetico: [
    { key: 'bold', label: 'Bold Rojo', desc: 'Audaz y potente' },
    { key: 'tropical', label: 'Tropical Verano', desc: 'Cálido y alegre' },
    { key: 'neon', label: 'Moderno Neón', desc: 'Vibrante y juvenil' },
    { key: 'premium', label: 'Premium Dorado', desc: 'Clásico y exclusivo' },
  ],
}

function sectionTitle(label: string) {
  return (
    <div className="flex items-center gap-3 mb-5 sm:mb-6">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-700 to-transparent" />
      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">{label}</span>
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-700 to-transparent" />
    </div>
  )
}

export default function BannerWizard({
  tiendaNombre,
  logoUrl,
  productos,
}: {
  tiendaNombre: string
  logoUrl: string | null
  productos: ProductoSimple[]
}) {
  const [objetivo, setObjetivo] = useState<BannerObjetivo | null>(null)
  const [estilo, setEstilo] = useState<BannerEstilo | null>(null)
  const [productoId, setProductoId] = useState('')
  const [variantes, setVariantes] = useState<VarianteGenerada[]>([])
  const [generated, setGenerated] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<string | null>(null)
  const { currencyCode } = useDashboard()

  const previewRefs = useRef<Record<number, HTMLDivElement | null>>({})
  useEffect(() => { return () => { previewRefs.current = {} } }, [])
  const setPreviewRef = useCallback((el: HTMLDivElement | null) => {
    if (!el) return
    const id = Number(el.dataset.refId)
    if (!isNaN(id)) previewRefs.current[id] = el
  }, [])

  const productoSeleccionado = productos.find(p => p.id === productoId)

  const buildContent = useCallback((obj: BannerObjetivo, producto?: ProductoSimple): CatalogoModalConfig['contenido'] => {
    switch (obj) {
      case 'oferta':
        return {
          tipo_contenido: 'oferta',
          titulo: producto?.nombre || '¡Oferta Especial!',
          descripcion: producto ? 'Por tiempo limitado' : 'Aprovecha esta oportunidad',
          precio: producto?.precio,
          precio_oferta: producto?.precio_oferta,
          producto_nombre: producto?.nombre,
          producto_imagen_url: producto?.imagen_url || undefined,
          cta_texto: 'Aprovechar Oferta',
        }
      case 'nuevo_producto':
        return {
          tipo_contenido: 'anuncio',
          titulo: '¡Nuevo!',
          mensaje: producto?.nombre || 'Conoce nuestra nueva llegada',
          icono_tipo: 'nuevo',
          cta_texto: 'Ver producto',
        }
      case 'evento':
        return {
          tipo_contenido: 'anuncio',
          titulo: '🎉 Evento Especial',
          mensaje: producto ? `No te pierdas ${producto.nombre}` : 'No te lo pierdas',
          icono_tipo: 'evento',
          cta_texto: 'Saber más',
        }
      case 'delivery_gratis':
        return {
          tipo_contenido: 'anuncio',
          titulo: '🚚 Delivery Gratis',
          mensaje: producto ? `Envío gratis en ${producto.nombre}` : 'Envío sin costo en tu próxima compra',
          icono_tipo: 'anuncio',
          cta_texto: 'Ordenar ahora',
        }
      case 'destacado':
        return {
          tipo_contenido: 'anuncio',
          titulo: producto?.nombre || '⭐ Producto Destacado',
          mensaje: 'Lo más vendido de la semana',
          icono_tipo: 'importante',
          cta_texto: 'Ver detalle',
        }
    }
  }, [])

  const generarVariantes = () => {
    if (!objetivo || !estilo || generating) return
    setGenerating(true)
    setError('')
    setSuccess(null)
    setVariantes([])
    setTimeout(() => {
      const templates = TEMPLATES_POR_ESTILO[estilo]
      const nuevas: VarianteGenerada[] = templates.map((t, i) => ({
        id: i,
        templateKey: t.key,
        label: t.label,
        config: {
          tipo: 'plantilla',
          plantilla_id: t.key,
          contenido: buildContent(objetivo, productoSeleccionado),
        },
      }))
      setVariantes(nuevas)
      setGenerated(true)
      setGenerating(false)
    }, 80)
  }

  const capturarPng = async (id: number): Promise<string | null> => {
    const el = previewRefs.current[id]
    if (!el) return null
    try {
      const rect = el.getBoundingClientRect()
      const ratio = 1080 / rect.width
      return await toPng(el, { pixelRatio: ratio, quality: 1 })
    } catch { return null }
  }

  const handleDownload = async (id: number) => {
    setDownloading(String(id))
    const dataUrl = await capturarPng(id)
    if (dataUrl) {
      const link = document.createElement('a')
      link.download = `banner-${objetivo}-${variantes[id]?.templateKey || id}-${Date.now()}.png`
      link.href = dataUrl
      link.click()
    }
    setDownloading(null)
  }

  const handleSave = async (id: number) => {
    setSaving(String(id))
    setError('')
    try {
      const dataUrl = await capturarPng(id)
      let previewUrl: string | null = null
      if (dataUrl) {
        const res = await fetch(dataUrl)
        const blob = await res.blob()
        const file = new File([blob], `banner-${Date.now()}.png`, { type: 'image/png' })
        const supabase = createClient()
        const filePath = `disenos/${Date.now()}-${Math.random().toString(36).substring(7)}.png`
        const { error: uploadError } = await supabase.storage.from('img_products').upload(filePath, file)
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('img_products').getPublicUrl(filePath)
          previewUrl = urlData.publicUrl
        }
      }
      const v = variantes[id]
      if (!v) { setError('Variante ya no disponible'); setSaving(null); return }
      const res = await fetch('/api/dashboard/vitrina/disenos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: `${v.label} — ${objetivo}`,
          tipo: 'banner',
          config: v.config,
          preview_url: previewUrl,
        }),
      })
      const data = await res.json()
      if (data.diseno) {
        setSuccess(String(id))
        setTimeout(() => setSuccess(null), 2000)
      } else {
        setError('Error al guardar')
      }
    } catch { setError('Error al guardar') }
    setSaving(null)
  }

  const puedeGenerar = !!objetivo && !!estilo

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* PASO 1: Objetivo */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <span className="w-7 h-7 rounded-full bg-[var(--primary)] text-white text-xs font-bold flex items-center justify-center">1</span>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">¿Qué quieres promocionar?</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {OBJETIVOS.map(o => {
            const active = objetivo === o.key
            return (
              <button key={o.key} onClick={() => { setObjetivo(o.key); setVariantes([]); setGenerated(false) }}
                className={`relative overflow-hidden rounded-xl p-4 text-left transition-all duration-200 border-2 ${
                  active
                    ? 'border-[var(--primary)] bg-[var(--primary)]/[0.07] shadow-sm'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-600'
                }`}>
                <span className="text-2xl block mb-1.5">{o.icon}</span>
                <p className={`text-sm font-bold ${active ? 'text-[var(--primary)]' : 'text-slate-700 dark:text-slate-200'}`}>{o.label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{o.desc}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* PASO 2: Estilo */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <span className="w-7 h-7 rounded-full bg-[var(--primary)] text-white text-xs font-bold flex items-center justify-center">2</span>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Elige un estilo visual</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {ESTILOS.map(e => {
            const active = estilo === e.key
            return (
              <button key={e.key} onClick={() => { setEstilo(e.key); setVariantes([]); setGenerated(false) }}
                className={`relative overflow-hidden rounded-xl p-4 text-left transition-all duration-200 border-2 ${
                  active
                    ? 'border-[var(--primary)] shadow-sm'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-600'
                }`}>
                <div className={`absolute inset-0 bg-gradient-to-br ${e.gradient} opacity-50`} />
                <div className="relative">
                  <span className="text-2xl block mb-1.5">{e.icon}</span>
                  <p className={`text-sm font-bold ${active ? 'text-[var(--primary)]' : 'text-slate-700 dark:text-slate-200'}`}>{e.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{e.desc}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* PASO 3: Producto */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <span className="w-7 h-7 rounded-full bg-[var(--primary)] text-white text-xs font-bold flex items-center justify-center">3</span>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Selecciona un producto</h3>
          {objetivo && !OBJETIVOS.find(o => o.key === objetivo)?.requiereProducto && (
            <span className="text-xs text-slate-400 font-medium">(opcional)</span>
          )}
        </div>
        <div className="p-4 rounded-xl bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
          {productos.length > 0 ? (
            <select value={productoId} onChange={e => { setProductoId(e.target.value); setVariantes([]); setGenerated(false) }}
              className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 transition-all">
              <option value="">{objetivo && !OBJETIVOS.find(o => o.key === objetivo)?.requiereProducto ? 'Sin producto (mensaje genérico)' : 'Seleccionar producto...'}</option>
              {productos.map(p => (
                <option key={p.id} value={p.id}>
                  {p.nombre}{p.precio_oferta > 0 ? ` — ${formatCurrency(p.precio_oferta, currencyCode)}` : ` — ${formatCurrency(p.precio, currencyCode)}`}
                </option>
              ))}
            </select>
          ) : (
            <div className="text-center py-6 text-sm text-slate-400">
              <p>No hay productos disponibles.</p>
              <a href="/dashboard/inventario" className="text-[var(--primary)] font-bold underline mt-1 inline-block">Ir a Inventario</a>
            </div>
          )}
        </div>
      </div>

      {/* PASO 4: Generar */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <span className="w-7 h-7 rounded-full bg-[var(--primary)] text-white text-xs font-bold flex items-center justify-center">4</span>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Genera tus banners</h3>
        </div>
        <button onClick={generarVariantes} disabled={!puedeGenerar || generating}
          className="w-full py-3.5 bg-gradient-to-r from-[var(--primary)] to-emerald-600 text-white font-bold rounded-xl hover:brightness-110 transition-all disabled:opacity-40 text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-[var(--primary)]/20 active:scale-[0.98]">
          {generating ? (
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          )}
          {generating ? 'Generando...' : (puedeGenerar ? '✨ Generar Variaciones' : 'Selecciona objetivo y estilo primero')}
        </button>
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2.5">{error}</p>
      )}

      {/* Resultados */}
      {generated && variantes.length > 0 && (
        <div>
          {sectionTitle('Tus 4 variaciones')}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {variantes.map(v => (
              <div key={v.templateKey} className="rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 overflow-hidden shadow-sm">
                <div className="p-2 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate text-center">{v.label}</p>
                </div>
                {/* Preview */}
                <div className="flex justify-center p-3 bg-slate-900/5 dark:bg-black/20">
                  <div ref={setPreviewRef} data-ref-id={v.id} className="w-full max-w-[200px] aspect-[9/16] rounded-lg overflow-hidden shadow-md border border-slate-700/50">
                    <PlantillaPreview config={v.config} tiendaNombre={tiendaNombre} logoUrl={logoUrl} />
                  </div>
                </div>
                {/* Actions */}
                <div className="grid grid-cols-2 gap-1 p-2">
                  <button onClick={() => handleDownload(v.id)} disabled={downloading === String(v.id)}
                    className="px-2 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all disabled:opacity-50 flex items-center justify-center gap-1">
                    {downloading === String(v.id) ? (
                      <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    )}
                    <span className="hidden sm:inline">Descargar</span>
                  </button>
                  <button onClick={() => handleSave(v.id)} disabled={saving === String(v.id)}
                    className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                      success === String(v.id)
                        ? 'bg-emerald-500 text-white'
                        : 'bg-[var(--primary)]/10 text-[var(--primary)] hover:bg-[var(--primary)]/20'
                    } disabled:opacity-50`}>
                    {saving === String(v.id) ? (
                      <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                    ) : success === String(v.id) ? (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                    )}
                    <span className="hidden sm:inline">{success === String(v.id) ? 'Guardado' : 'Guardar'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-slate-400 mt-4">
            Los banners se guardan en tu biblioteca de diseños con la etiqueta "Banner"
          </p>
        </div>
      )}

      {/* Empty state */}
      {!generated && (
        <div className="text-center py-12 sm:py-16 text-sm text-slate-400 bg-white dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
          <svg className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          <p className="font-semibold text-slate-500 dark:text-slate-400">Completa los pasos 1–3</p>
          <p className="text-xs text-slate-300 dark:text-slate-500 mt-1">y genera 4 variaciones profesionales al instante</p>
        </div>
      )}
    </div>
  )
}
