// VITRINA STUDIO — experiencia visual premium
// UX EVOLUTION — vitrina como diferenciador creativo de Nexus
'use client'

// DYNAMIC DASHBOARD FIX: Prevent static prerender — requires runtime Supabase session
export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { toPng } from 'html-to-image'
import { PlantillaPreview, ICONOS_ANUNCIO } from '@/components/catalog/CatalogoModal'
import type { CatalogoModalConfig, TemplateKey } from '@/components/catalog/CatalogoModal'
import { optimizarImagen } from '@/lib/image'
import DisenosLibrary from './DisenosLibrary'

interface HistorialEntry {
  id: string
  id_tienda: string
  config: any
  imagen_url: string | null
  created_at: string
}

const templates: { key: TemplateKey; label: string; desc: string }[] = [
  { key: 'elegante', label: 'Elegante Oscuro', desc: 'Lujo y sofisticación' },
  { key: 'premium', label: 'Premium Dorado', desc: 'Clásico y exclusivo' },
  { key: 'neon', label: 'Moderno Neón', desc: 'Vibrante y juvenil' },
  { key: 'clean', label: 'Clean Minimal', desc: 'Simple y directo' },
  { key: 'tropical', label: 'Tropical Verano', desc: 'Cálido y alegre' },
  { key: 'tech', label: 'Tech Futuro', desc: 'Geométrico y moderno' },
  { key: 'rustico', label: 'Rústico Natural', desc: 'Tierra y naturaleza' },
  { key: 'pastel', label: 'Pastel Dulce', desc: 'Suave y tierno' },
  { key: 'bold', label: 'Bold Rojo', desc: 'Audaz y potente' },
  { key: 'noir', label: 'Noir Plateado', desc: 'Sobrio y metálico' },
]

interface ProductoOferta {
  id: string
  nombre: string
  precio: number
  precio_oferta: number
  imagen_url: string | null
}

// VITRINA STUDIO: business-type templates for showcase
const BUSINESS_TEMPLATES = [
  {
    id: 'reposteria',
    nombre: 'Repostería',
    desc: 'Dulce, cálido y acogedor. Ideal para pastelerías y postres.',
    templateKey: 'pastel' as TemplateKey,
    gradient: 'from-amber-200 via-orange-100 to-rose-200',
    darkGradient: 'from-amber-900/30 via-orange-900/20 to-rose-900/30',
    icon: '🧁',
    color: '#f97316',
  },
  {
    id: 'regalos',
    nombre: 'Regalos',
    desc: 'Elegante y exclusivo. Perfecto para tiendas de regalos y experiencias.',
    templateKey: 'premium' as TemplateKey,
    gradient: 'from-purple-200 via-pink-100 to-amber-100',
    darkGradient: 'from-purple-900/30 via-pink-900/20 to-amber-900/20',
    icon: '🎁',
    color: '#a855f7',
  },
  {
    id: 'flores',
    nombre: 'Flores',
    desc: 'Fresco, natural y romántico. Para floristerías y detalles verdes.',
    templateKey: 'tropical' as TemplateKey,
    gradient: 'from-green-200 via-emerald-100 to-teal-200',
    darkGradient: 'from-green-900/30 via-emerald-900/20 to-teal-900/30',
    icon: '🌸',
    color: '#22c55e',
  },
  {
    id: 'tecnologia',
    nombre: 'Tecnología',
    desc: 'Moderno, limpio y futurista. Para electrónica e innovación.',
    templateKey: 'tech' as TemplateKey,
    gradient: 'from-slate-200 via-blue-100 to-cyan-200',
    darkGradient: 'from-slate-800 via-blue-900/20 to-cyan-900/30',
    icon: '💻',
    color: '#06b6d4',
  },
  {
    id: 'minimal',
    nombre: 'Minimal',
    desc: 'Simple, sofisticado y atemporal. Para marcas con estilo depurado.',
    templateKey: 'clean' as TemplateKey,
    gradient: 'from-stone-200 via-white to-slate-100',
    darkGradient: 'from-stone-800 via-slate-800 to-slate-900',
    icon: '◻️',
    color: '#64748b',
  },
]

// VITRINA STUDIO: upcoming features
const UPCOMING_FEATURES = [
  {
    icon: '🎨',
    title: 'IA Visual',
    desc: 'Generación automática de vitrinas con inteligencia artificial. Describe tu negocio y Nexus crea el diseño.',
    color: 'from-purple-500 to-pink-500',
  },
  {
    icon: '🖼️',
    title: 'Banners Automáticos',
    desc: 'Banners promocionales que se actualizan solos basados en tus productos y ofertas activas.',
    color: 'from-emerald-500 to-teal-500',
  },
  {
    icon: '✨',
    title: 'Vitrinas Inteligentes',
    desc: 'Vitrinas que se adaptan al comportamiento de tus clientes. Productos destacados basados en tendencias.',
    color: 'from-amber-500 to-orange-500',
  },
  {
    icon: '🎯',
    title: 'Diseño Automático',
    desc: 'Nexos diseña por ti. Solo elige tu rubro y colores, nosotros creamos la vitrina completa.',
    color: 'from-blue-500 to-cyan-500',
  },
]

// VITRINA STUDIO: WhatsApp story-like examples
const WHATSAPP_STORIES = [
  { emoji: '🎉', label: 'Nueva Oferta', bg: 'from-emerald-500 to-emerald-700', templateKey: 'neon' as TemplateKey },
  { emoji: '🚚', label: 'En Camino', bg: 'from-blue-500 to-blue-700', templateKey: 'bold' as TemplateKey },
  { emoji: '💝', label: 'Regalo', bg: 'from-rose-500 to-rose-700', templateKey: 'premium' as TemplateKey },
  { emoji: '🌟', label: 'Destacado', bg: 'from-amber-500 to-amber-700', templateKey: 'elegante' as TemplateKey },
]

// VITRINA STATUS GENERATOR: visual styles for WhatsApp story generator
const STATUS_STYLES = [
  { id: 'elegante', label: 'Elegante', gradient: 'from-violet-500 to-purple-700', icon: '✨' },
  { id: 'minimal', label: 'Minimal', gradient: 'from-stone-400 to-slate-500', icon: '◻️' },
  { id: 'oscuro', label: 'Oscuro', gradient: 'from-slate-800 to-gray-900', icon: '🌙' },
  { id: 'celebracion', label: 'Celebración', gradient: 'from-amber-400 to-rose-500', icon: '🎉' },
]

function sectionTitle(label: string) {
  return (
    <div className="flex items-center gap-3 mb-5 sm:mb-6">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-700 to-transparent" />
      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">{label}</span>
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-700 to-transparent" />
    </div>
  )
}

export default function CatalogoModalPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [tiendaId, setTiendaId] = useState('')
  const [tiendaNombre, setTiendaNombre] = useState('')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const [modo, setModo] = useState<'imagen' | 'catalogo'>('imagen')
  const [activo, setActivo] = useState(false)
  const [tipo, setTipo] = useState<'personalizado' | 'plantilla'>('plantilla')
  const [imagenUrl, setImagenUrl] = useState('')
  const [contenidoTipo, setContenidoTipo] = useState<'oferta' | 'anuncio'>('oferta')
  const [plantillaId, setPlantillaId] = useState<TemplateKey>('elegante')
  const [urlRedireccion, setUrlRedireccion] = useState('')
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [ctaTexto, setCtaTexto] = useState('')

  const [productosOferta, setProductosOferta] = useState<ProductoOferta[]>([])
  const [productoId, setProductoId] = useState('')

  // VITRINA STATUS GENERATOR
  const [todosProductos, setTodosProductos] = useState<ProductoOferta[]>([])
  const [statusProductId, setStatusProductId] = useState('')
  const [statusStyle, setStatusStyle] = useState('elegante')
  const [generated, setGenerated] = useState(false)

  const [mensaje, setMensaje] = useState('')
  const [iconoTipo, setIconoTipo] = useState('anuncio')
  const [miniaturaUrl, setMiniaturaUrl] = useState('')

  const [historial, setHistorial] = useState<HistorialEntry[]>([])
  const [cargandoHistorial, setCargandoHistorial] = useState(false)
  const [activandoId, setActivandoId] = useState<string | null>(null)
  const [previewImg, setPreviewImg] = useState<string | null>(null)
  const [vistaPrevia, setVistaPrevia] = useState(false)

  // DisenosLibrary state
  const [statusConfigActual, setStatusConfigActual] = useState<any>(null)
  const statusPreviewRef = useRef<HTMLDivElement>(null)

  const previewRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    ;(async () => {
      const supabase = createClient()

      const sesRes = await fetch('/api/auth/session-id')
      const sesData = await sesRes.json()
      if (!sesData.tiendaId) return
      setTiendaId(sesData.tiendaId)

      const [configRes, perfilRes, prodsRes] = await Promise.all([
        fetch('/api/dashboard/modal'),
        supabase.from('perfil_tienda').select('logo_url, nombre_comercial').eq('id_tienda', sesData.tiendaId).maybeSingle(),
        supabase
          .from('productos')
          .select('id, nombre, precio, precio_oferta, imagen_url')
          .eq('id_tienda', sesData.tiendaId)
          .not('precio_oferta', 'is', null)
          .gt('precio_oferta', 0),
      ])

      if (perfilRes.data) {
        setTiendaNombre(perfilRes.data.nombre_comercial || '')
        setLogoUrl(perfilRes.data.logo_url)
      }

      if (prodsRes.data) {
        const ofertas = (prodsRes.data as ProductoOferta[]).filter(p => p.precio_oferta < p.precio)
        setProductosOferta(ofertas)
      }

      // VITRINA STATUS GENERATOR: load all products
      const { data: allProds } = await supabase
        .from('productos')
        .select('id, nombre, precio, precio_oferta, imagen_url')
        .eq('id_tienda', sesData.tiendaId)
      if (allProds) setTodosProductos(allProds as ProductoOferta[])

      const configData = await configRes.json()
      if (configData.config && !configData.error) {
        const c = configData.config
        setActivo(c.activo || false)
        setTipo(c.tipo || 'plantilla')
        setImagenUrl(c.imagen_url || '')
        setPlantillaId(c.plantilla_id || 'elegante')
        setUrlRedireccion(c.url_redireccion || '')
        if (c.contenido) {
          setContenidoTipo(c.contenido.tipo_contenido || 'oferta')
          setTitulo(c.contenido.titulo || '')
          setDescripcion(c.contenido.descripcion || '')
          setCtaTexto(c.contenido.cta_texto || '')
          setMensaje(c.contenido.mensaje || '')
          setIconoTipo(c.contenido.icono_tipo || 'anuncio')
          setMiniaturaUrl(c.contenido.miniatura_url || '')
        }
      }

      setLoading(false)

      setCargandoHistorial(true)
      const histRes = await fetch('/api/dashboard/modal/historial')
      const histData = await histRes.json()
      if (histData.historial) setHistorial(histData.historial)
      setCargandoHistorial(false)
    })()
  }, [])

  // Keep DisenosLibrary config in sync with current generator state
  useEffect(() => {
    if (!generated || !statusProductId) {
      setStatusConfigActual(null)
      return
    }
    const prod = todosProductos.find(p => p.id === statusProductId)
    setStatusConfigActual({
      productId: statusProductId,
      style: statusStyle,
      productName: prod?.nombre || '',
      productPrice: prod?.precio || 0,
      productOfferPrice: prod?.precio_oferta || 0,
      productImage: prod?.imagen_url || null,
    })
  }, [generated, statusProductId, statusStyle, todosProductos])

  const productoSeleccionado = productosOferta.find(p => p.id === productoId)

  const previewConfig: CatalogoModalConfig = {
    tipo: tipo,
    imagen_url: imagenUrl || null,
    url_redireccion: urlRedireccion || null,
    contenido: tipo === 'plantilla' ? (contenidoTipo === 'oferta' ? {
      tipo_contenido: 'oferta',
      titulo: titulo || productoSeleccionado?.nombre || undefined,
      descripcion: descripcion || undefined,
      precio: productoSeleccionado?.precio || undefined,
      precio_oferta: productoSeleccionado?.precio_oferta || undefined,
      producto_nombre: productoSeleccionado?.nombre || undefined,
      producto_imagen_url: productoSeleccionado?.imagen_url || undefined,
      cta_texto: ctaTexto || undefined,
    } : {
      tipo_contenido: 'anuncio',
      titulo: titulo || undefined,
      mensaje: mensaje || undefined,
      icono_tipo: iconoTipo || undefined,
      miniatura_url: miniaturaUrl || undefined,
      cta_texto: ctaTexto || undefined,
    }) : undefined,
    plantilla_id: plantillaId,
  }

  const subirImagenStorage = async (dataUrl: string): Promise<string | null> => {
    try {
      const res = await fetch(dataUrl)
      const blob = await res.blob()
      const file = new File([blob], `vitrina-${Date.now()}.png`, { type: 'image/png' })
      const supabase = createClient()
      const filePath = `modal/historial/${Date.now()}-${Math.random().toString(36).substring(7)}.png`
      const { error: uploadError } = await supabase.storage.from('img_products').upload(filePath, file)
      if (uploadError) throw uploadError
      const { data: urlData } = supabase.storage.from('img_products').getPublicUrl(filePath)
      return urlData.publicUrl
    } catch {
      return null
    }
  }

  const guardarEnHistorial = async (config: any, imagenUrl?: string | null) => {
    try {
      const res = await fetch('/api/dashboard/modal/historial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config, imagen_url: imagenUrl || null }),
      })
      const data = await res.json()
      if (data.historial) {
        setHistorial(prev => [data.historial, ...prev])
      }
    } catch {}
  }

  const activarHistorial = async (id: string) => {
    setActivandoId(id)
    setError('')
    try {
      const res = await fetch(`/api/dashboard/modal/historial/${id}/activar`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Error al activar') }
      else {
        setSuccess(true); setTimeout(() => setSuccess(false), 3000)
        setActivo(true)
      }
    } catch { setError('Error al activar') }
    setActivandoId(null)
  }

  const eliminarHistorial = async (id: string) => {
    if (!confirm('¿Eliminar esta vitrina del historial?')) return
    try {
      const res = await fetch(`/api/dashboard/modal/historial?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        setHistorial(prev => prev.filter(e => e.id !== id))
      }
    } catch {}
  }

  const editarHistorial = (entry: HistorialEntry) => {
    const c = entry.config
    setModo('catalogo')
    setActivo(true)
    setTipo(c.tipo || 'plantilla')
    setImagenUrl(c.imagen_url || '')
    setPlantillaId(c.plantilla_id || 'elegante')
    setUrlRedireccion(c.url_redireccion || '')
    if (c.contenido) {
      setContenidoTipo(c.contenido.tipo_contenido || 'oferta')
      setTitulo(c.contenido.titulo || '')
      setDescripcion(c.contenido.descripcion || '')
      setCtaTexto(c.contenido.cta_texto || '')
      setMensaje(c.contenido.mensaje || '')
      setIconoTipo(c.contenido.icono_tipo || 'anuncio')
      setMiniaturaUrl(c.contenido.miniatura_url || '')
      setProductoId(c.contenido.producto_id || '')
    }
    setError('')
    setSuccess(false)
  }

  const handleNuevo = () => {
    const snapshot = getSnapshotConfig()
    const hasContent = snapshot.tipo === 'personalizado' ? !!snapshot.imagen_url : !!snapshot.contenido
    if (hasContent) {
      guardarEnHistorial(snapshot)
    }
    setModo('imagen')
    setActivo(false)
    setTipo('plantilla')
    setImagenUrl('')
    setContenidoTipo('oferta')
    setPlantillaId('elegante')
    setUrlRedireccion('')
    setTitulo('')
    setDescripcion('')
    setCtaTexto('')
    setProductoId('')
    setMensaje('')
    setIconoTipo('anuncio')
    setMiniaturaUrl('')
    setError('')
    setSuccess(false)
  }

  const getSnapshotConfig = useCallback((): any => {
    return {
      tipo,
      imagen_url: imagenUrl || null,
      url_redireccion: urlRedireccion || null,
      plantilla_id: plantillaId,
      contenido: tipo === 'plantilla' ? (contenidoTipo === 'oferta' ? {
        tipo_contenido: 'oferta',
        titulo: titulo || productoSeleccionado?.nombre || null,
        descripcion: descripcion || null,
        cta_texto: ctaTexto || null,
        producto_id: productoId || null,
      } : {
        tipo_contenido: 'anuncio',
        titulo: titulo || null,
        mensaje: mensaje || null,
        icono_tipo: iconoTipo || null,
        miniatura_url: miniaturaUrl || null,
        cta_texto: ctaTexto || null,
      }) : null,
    }
  }, [tipo, imagenUrl, urlRedireccion, plantillaId, contenidoTipo, titulo, descripcion, ctaTexto, productoId, mensaje, iconoTipo, miniaturaUrl, productoSeleccionado])

  const handleDownload = async () => {
    if (!previewRef.current) return
    setDownloading(true)
    setError('')
    try {
      const rect = previewRef.current.getBoundingClientRect()
      const ratio = 1080 / rect.width
      const dataUrl = await toPng(previewRef.current, { pixelRatio: ratio, quality: 1 })
      const link = document.createElement('a')
      link.download = `vitrina-${contenidoTipo}-${Date.now()}.png`
      link.href = dataUrl
      link.click()

      const imagenUrl = await subirImagenStorage(dataUrl)
      await guardarEnHistorial(getSnapshotConfig(), imagenUrl)
    } catch (e) {
      console.error('Error al descargar:', e)
      setError('Error al generar la imagen')
    }
    setDownloading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSuccess(false)

    const contenido: any = {
      tipo_contenido: contenidoTipo,
      titulo: titulo.trim(),
      descripcion: descripcion.trim(),
      cta_texto: ctaTexto.trim(),
    }

    if (contenidoTipo === 'oferta') {
      if (productoSeleccionado) {
        contenido.precio = productoSeleccionado.precio
        contenido.precio_oferta = productoSeleccionado.precio_oferta
        contenido.producto_nombre = productoSeleccionado.nombre
        contenido.producto_imagen_url = productoSeleccionado.imagen_url
      }
      contenido.producto_id = productoId
    } else {
      contenido.mensaje = mensaje.trim()
      contenido.icono_tipo = iconoTipo
      contenido.miniatura_url = miniaturaUrl.trim() || null
    }

    setActivo(true)
    const body: any = {
      activo: true,
      tipo,
      plantilla_id: plantillaId,
      url_redireccion: urlRedireccion.trim() || null,
      contenido,
    }
    if (tipo === 'personalizado') {
      body.imagen_url = imagenUrl || null
      body.contenido = null
    }

    const res = await fetch('/api/dashboard/modal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Error al guardar') }
    else {
      setSuccess(true); setTimeout(() => setSuccess(false), 3000)

      let histImgUrl: string | null = null
      if (previewRef.current) {
        try {
          const rect = previewRef.current.getBoundingClientRect()
          const ratio = 1080 / rect.width
          const dataUrl = await toPng(previewRef.current, { pixelRatio: ratio, quality: 1 })
          histImgUrl = await subirImagenStorage(dataUrl)
        } catch {}
      }
      guardarEnHistorial(body, histImgUrl)
    }
    setSaving(false)
  }

  const handleReuseDiseno = (config: any) => {
    if (config.productId) setStatusProductId(config.productId)
    if (config.style) setStatusStyle(config.style)
    setGenerated(true)
    // Scroll to generator section
    document.getElementById('status-generator')?.scrollIntoView({ behavior: 'smooth' })
  }

  const capturarStatusPreview = async (): Promise<string | null> => {
    if (!statusPreviewRef.current || !generated) return null
    try {
      const dataUrl = await toPng(statusPreviewRef.current, { pixelRatio: 2, quality: 0.8 })
      // Upload to storage for persistence
      const res = await fetch(dataUrl)
      const blob = await res.blob()
      const file = new File([blob], `diseno-${Date.now()}.png`, { type: 'image/png' })
      const supabase = createClient()
      const filePath = `disenos/${Date.now()}-${Math.random().toString(36).substring(7)}.png`
      const { error: uploadError } = await supabase.storage.from('img_products').upload(filePath, file)
      if (uploadError) return null
      const { data: urlData } = supabase.storage.from('img_products').getPublicUrl(filePath)
      return urlData.publicUrl
    } catch { return null }
  }

  const handleMiniaturaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const supabase = createClient()
    const optimized = await optimizarImagen(file)
    const filePath = `modal/${optimized.name}`
    const { error: uploadError } = await supabase.storage.from('img_products').upload(filePath, optimized)
    if (uploadError) { setError('Error al subir: ' + uploadError.message); return }
    const { data: urlData } = supabase.storage.from('img_products').getPublicUrl(filePath)
    setMiniaturaUrl(urlData.publicUrl)
    setError('')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-12 sm:space-y-16 sm:py-6 sm:py-10">

      {/* ======================================================================= */}
      {/* VITRINA STUDIO: Hero principal                                                   */}
      {/* ======================================================================= */}
      <div className="relative overflow-hidden rounded-3xl sm:rounded-[2rem] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:from-[#0a0a0f] dark:via-[#0c0c14] dark:to-[#0e0e16] border border-white/[0.06] shadow-2xl shadow-slate-900/30">
        <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-gradient-to-br from-[var(--primary)]/20 to-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-60 h-60 rounded-full bg-gradient-to-tr from-amber-500/10 to-rose-500/5 blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-40 pointer-events-none" />
        <div className="relative px-6 sm:px-10 py-10 sm:py-14">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-semibold text-white/60 mb-4 sm:mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Vitrina Studio
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight tracking-tight">
              Crea la vitrina<br />de tu negocio
            </h1>
            <p className="text-base sm:text-lg text-white/50 mt-3 sm:mt-4 leading-relaxed max-w-lg">
              Tu marca merece una presencia visual única. Diseña, previsualiza y publica vitrinas que cautiven a tus clientes.
            </p>
            <div className="flex items-center gap-3 mt-6 sm:mt-8">
              <a href="#vitrina-workspace"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--primary)] hover:brightness-110 text-white text-sm font-bold shadow-lg shadow-[var(--primary)]/20 transition-all active:scale-95"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                Crear vitrina
              </a>
              <a href="#vitrina-templates"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-sm font-bold border border-white/10 transition-all"
              >
                Ver plantillas
              </a>
            </div>
          </div>
        </div>
        {/* VITRINA STUDIO: decorative gradient line */}
        <div className="h-1 w-full bg-gradient-to-r from-[var(--primary)] via-emerald-500 to-amber-500" />
      </div>

      {/* ======================================================================= */}
      {/* VITRINA STUDIO: Templates - business-type showcase                                  */}
      {/* ======================================================================= */}
      <div id="vitrina-templates">
        {sectionTitle('Templates por Rubro')}
        <p className="text-center text-sm text-slate-500 dark:text-slate-400 -mt-3 mb-6 sm:mb-8">Elige el estilo visual que mejor representa tu negocio</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {BUSINESS_TEMPLATES.map(bt => (
            <div key={bt.id}
              className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-slate-900/30 transition-all duration-300 hover:-translate-y-0.5"
            >
              {/* Preview visual */}
              <div className="aspect-[4/3] overflow-hidden relative">
                <div className={`absolute inset-0 bg-gradient-to-br ${bt.gradient} dark:${bt.darkGradient} transition-opacity`} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/80 dark:bg-white/10 backdrop-blur-sm flex items-center justify-center shadow-lg shadow-black/5">
                    <span className="text-3xl sm:text-4xl">{bt.icon}</span>
                  </div>
                </div>
                {/* Template preview overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[10px] font-semibold text-white/80">Vista previa →</span>
                </div>
              </div>
              <div className="p-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{bt.nombre}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{bt.desc}</p>
                <button onClick={() => {
                  setPlantillaId(bt.templateKey)
                  setTipo('plantilla')
                  document.getElementById('vitrina-workspace')?.scrollIntoView({ behavior: 'smooth' })
                }}
                  className="mt-3 text-[11px] font-bold text-[var(--primary)] hover:text-[var(--primary)]/80 transition-colors flex items-center gap-1"
                  style={{ color: bt.color }}
                >
                  Usar este estilo
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ======================================================================= */}
      {/* VITRINA STUDIO: Vista previa móvil - mockup elegante                                */}
      {/* ======================================================================= */}
      <div>
        {sectionTitle('Vista Previa Móvil')}
        <p className="text-center text-sm text-slate-500 dark:text-slate-400 -mt-3 mb-6 sm:mb-8">Así se verá tu vitrina en dispositivos móviles</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Catálogo mockup */}
          <div className="flex flex-col items-center">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">Catálogo</div>
            <div className="relative w-44 aspect-[9/16] rounded-[1.5rem] overflow-hidden shadow-xl border-[3px] border-slate-800 dark:border-slate-600 bg-slate-900">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-5 bg-slate-800 dark:bg-slate-600 rounded-b-xl z-10" />
              <PlantillaPreview config={{
                tipo: 'plantilla',
                plantilla_id: 'elegante',
                contenido: {
                  tipo_contenido: 'oferta',
                  titulo: '¡Oferta Especial!',
                  descripcion: 'Válido por tiempo limitado',
                  precio: 2500,
                  precio_oferta: 1799,
                  producto_nombre: 'Producto Destacado',
                  cta_texto: 'Ver oferta',
                },
              }} tiendaNombre="Mi Tienda" logoUrl={logoUrl} />
            </div>
          </div>

          {/* Banner mockup */}
          <div className="flex flex-col items-center">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">Banner</div>
            <div className="relative w-44 aspect-[9/16] rounded-[1.5rem] overflow-hidden shadow-xl border-[3px] border-slate-800 dark:border-slate-600 bg-slate-900">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-5 bg-slate-800 dark:bg-slate-600 rounded-b-xl z-10" />
              <PlantillaPreview config={{
                tipo: 'plantilla',
                plantilla_id: 'neon',
                contenido: {
                  tipo_contenido: 'anuncio',
                  titulo: '¡Nuevo Horario!',
                  mensaje: 'Ahora abierto de 8am a 10pm',
                  icono_tipo: 'anuncio',
                  cta_texto: 'Saber más',
                },
              }} tiendaNombre="Mi Tienda" logoUrl={logoUrl} />
            </div>
          </div>

          {/* WhatsApp mockup */}
          <div className="flex flex-col items-center">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">WhatsApp</div>
            <div className="relative w-44 aspect-[9/16] rounded-[1.5rem] overflow-hidden shadow-xl border-[3px] border-slate-800 dark:border-slate-600 bg-slate-900">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-5 bg-slate-800 dark:bg-slate-600 rounded-b-xl z-10" />
              <div className="w-full h-full bg-[#e5ddd6] dark:bg-[#0b141a] flex flex-col">
                <div className="bg-[#075e54] dark:bg-[#1f2c33] px-3 py-2.5 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-400 flex items-center justify-center text-white">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-white truncate">Mi Tienda</p>
                    <p className="text-[7px] text-white/50">en línea</p>
                  </div>
                </div>
                <div className="flex-1 p-2 flex flex-col justify-end gap-1.5">
                  <div className="max-w-[85%] bg-white dark:bg-[#005c4b] rounded-lg rounded-tl-sm px-2.5 py-1.5 shadow-sm">
                    <p className="text-[9px] text-slate-700 dark:text-slate-100 leading-relaxed">¡Hola! 🎉 Tu pedido #1024 ha sido confirmado.</p>
                    <p className="text-[6px] text-slate-400 mt-0.5 text-right">10:30</p>
                  </div>
                  <div className="max-w-[85%] ml-auto bg-[#d9fdd3] dark:bg-[#005c4b] rounded-lg rounded-tr-sm px-2.5 py-1.5 shadow-sm">
                    <p className="text-[9px] text-slate-700 dark:text-slate-100">¡Gracias! 👍</p>
                    <p className="text-[6px] text-slate-400 mt-0.5 text-right">10:31</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================================= */}
      {/* VITRINA STATUS GENERATOR — Estados para WhatsApp                          */}
      {/* VITRINA UX EVOLUTION                                                     */}
      {/* ======================================================================= */}
      <div>
        {sectionTitle('Estados para WhatsApp')}
        <p className="text-center text-sm text-slate-500 dark:text-slate-400 -mt-3 mb-6 sm:mb-8">Genera vistas previas de estilo story para compartir en WhatsApp</p>

        {(() => {
          const prodSel = todosProductos.find(p => p.id === statusProductId)
          const styleDef = STATUS_STYLES.find(s => s.id === statusStyle) || STATUS_STYLES[0]
          const now = new Date()

          return (
            <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
              {/* Controls */}
              <div className="flex-1 w-full lg:max-w-sm space-y-5">
                {/* Product selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-2">Producto</label>
                  <select
                    value={statusProductId}
                    onChange={e => { setStatusProductId(e.target.value); setGenerated(false) }}
                    className="w-full px-3 py-2.5 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[var(--primary)] focus:outline-none appearance-none"
                  >
                    <option value="">Seleccionar producto</option>
                    {todosProductos.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                  {todosProductos.length === 0 && (
                    <p className="text-xs text-slate-400 mt-1">No hay productos disponibles. Crea productos desde Inventario.</p>
                  )}
                </div>

                {/* Style selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-2">Estilo Visual</label>
                  <div className="grid grid-cols-2 gap-2">
                    {STATUS_STYLES.map(s => {
                      const active = statusStyle === s.id
                      return (
                        <button key={s.id} onClick={() => setStatusStyle(s.id)}
                          className={`relative overflow-hidden rounded-xl p-3 text-left transition-all duration-200 ${
                            active
                              ? 'ring-2 ring-[var(--primary)] ring-offset-2 dark:ring-offset-slate-900 scale-[1.02]'
                              : 'hover:scale-[1.01]'
                          }`}
                        >
                          <div className={`absolute inset-0 bg-gradient-to-br ${s.gradient} opacity-20 dark:opacity-30`} />
                          <div className="relative flex items-center gap-2.5">
                            <span className="text-lg">{s.icon}</span>
                            <span className={`text-sm font-semibold ${active ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                              {s.label}
                            </span>
                          </div>
                          {active && (
                            <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[var(--primary)] shadow-[0_0_6px_var(--primary)]" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Generate button */}
                <button onClick={() => { if (statusProductId) setGenerated(true) }}
                  disabled={!statusProductId}
                  className="w-full py-3 bg-[var(--primary)] text-white font-bold text-sm rounded-xl hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-[var(--primary)]/10"
                >
                  {generated ? 'Regenerar Vista' : 'Generar Vista'}
                </button>

                {!statusProductId && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 text-center -mt-3">Selecciona un producto para generar la vista</p>
                )}
              </div>

              {/* Preview */}
              <div className="w-full lg:w-72 shrink-0 mx-auto">
                <div ref={statusPreviewRef} className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-gradient-to-b shadow-xl mx-auto max-w-[280px]"
                  style={generated && prodSel ? {} : undefined}
                >
                  {generated && prodSel ? (
                    <>
                      {/* Background gradient */}
                      <div className={`absolute inset-0 bg-gradient-to-b ${styleDef.gradient}`} />

                      {/* Decorative circles */}
                      <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />
                      <div className="absolute -bottom-16 -left-16 w-40 h-40 rounded-full bg-black/10 pointer-events-none" />

                      {/* Top bar */}
                      <div className="absolute top-3 left-3 right-3 flex items-center gap-1.5 z-10">
                        <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white text-[10px] font-bold backdrop-blur-sm">N</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-bold text-white/90 truncate">{tiendaNombre || 'Mi Tienda'}</p>
                          <p className="text-[8px] text-white/50">justo ahora</p>
                        </div>
                        <svg className="w-3.5 h-3.5 text-white/40" fill="currentColor" viewBox="0 0 24 24"><path d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
                      </div>

                      {/* Product content */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center z-10">
                        {prodSel.imagen_url ? (
                          <img src={prodSel.imagen_url} alt={prodSel.nombre}
                            className="w-28 h-28 sm:w-32 sm:h-32 object-cover rounded-2xl shadow-lg mb-4 ring-2 ring-white/10" />
                        ) : (
                          <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-white/10 flex items-center justify-center mb-4 border border-white/10">
                            <svg className="w-10 h-10 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          </div>
                        )}
                        <p className="text-base sm:text-lg font-bold text-white leading-tight">{prodSel.nombre}</p>
                        <p className="text-xl sm:text-2xl font-bold text-white/90 mt-1.5">
                          RD$ {Number(prodSel.precio || 0).toLocaleString('es-DO')}
                        </p>
                        {prodSel.precio_oferta > 0 && prodSel.precio_oferta < prodSel.precio && (
                          <p className="text-xs text-emerald-300 mt-1 font-medium line-through decoration-1">
                            RD$ {Number(prodSel.precio_oferta).toLocaleString('es-DO')}
                          </p>
                        )}
                      </div>

                      {/* Bottom bar */}
                      <div className="absolute bottom-3 left-3 right-3 z-10">
                        <div className="h-0.5 rounded-full bg-white/20 overflow-hidden">
                          <div className="h-full w-3/4 bg-white/60 rounded-full" />
                        </div>
                        <div className="flex justify-between mt-1.5">
                          <p className="text-[8px] text-white/40">{tiendaNombre || 'Mi Tienda'}</p>
                          <p className="text-[8px] text-white/40">
                            {now.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-b from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 flex flex-col items-center justify-center px-6 text-center">
                      <div className="w-14 h-14 rounded-2xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center mb-3">
                        <svg className="w-7 h-7 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      </div>
                      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Selecciona un producto</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">y un estilo para ver la vista previa</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })()}
      </div>

      {/* ======================================================================= */}
      {/* VITRINA DESIGN LIBRARY — Biblioteca de diseños guardados                            */}
      {/* ======================================================================= */}
      <div id="disenos-library" className="pt-3 sm:pt-6">
        <DisenosLibrary
          onReuse={handleReuseDiseno}
          currentConfig={statusConfigActual}
          capturarPreview={capturarStatusPreview}
          saveLabel="Guardar estado actual"
        />
      </div>

      {/* ======================================================================= */}
      {/* VITRINA STUDIO: Próximamente - próximas capacidades creativas                         */}
      {/* ======================================================================= */}
      <div>
        {sectionTitle('Próximamente')}
        <p className="text-center text-sm text-slate-500 dark:text-slate-400 -mt-3 mb-6 sm:mb-8">Capacidades creativas que estamos preparando para ti</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {UPCOMING_FEATURES.map((f, idx) => (
            <div key={idx}
              className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 p-5 sm:p-6 hover:shadow-md transition-all"
            >
              <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full bg-gradient-to-br ${f.color} opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none`} />
              <div className="relative flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center text-white shadow-sm shrink-0`}>
                  <span className="text-lg">{f.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">{f.title}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{f.desc}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className="inline-block text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">Próximamente</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ======================================================================= */}
      {/* VITRINA STUDIO: Separator hacia el workspace                                        */}
      {/* ======================================================================= */}
      <div className="relative py-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200 dark:border-slate-700" />
        </div>
        <div className="relative flex justify-center">
          <div className="px-4 bg-gradient-to-b from-slate-50 to-white dark:from-[#0a0a0d] dark:to-[#0c0c10]">
            <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-sm">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================================= */}
      {/* VITRINA STUDIO: Tools workspace — contenido existente intacto                       */}
      {/* ======================================================================= */}
      <div id="vitrina-workspace">
        {/* ===== GLASS HEADER ===== */}
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-white/20 dark:border-slate-700/30 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/30 p-4 sm:p-6">
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-gradient-to-br from-[var(--primary)]/10 to-emerald-500/5 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-gradient-to-tr from-amber-400/10 to-rose-400/5 blur-3xl pointer-events-none" />
          <div className="relative flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--primary)] to-emerald-600 flex items-center justify-center text-white text-sm shadow-md">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                </span>
                Vitrina de Catálogo
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 ml-0.5">Diseña, previsualiza y publica tu modal promocional</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {historial.length > 0 && (
                <button onClick={() => document.getElementById('historial-section')?.scrollIntoView({ behavior: 'smooth' })}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-all">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Historial
                </button>
              )}
              <button onClick={handleNuevo}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-[var(--primary)] to-emerald-600 hover:brightness-110 shadow-md shadow-[var(--primary)]/20 transition-all active:scale-95">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Nuevo
              </button>
            </div>
          </div>
        </div>

        {/* ===== MAIN CONTENT ===== */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 min-w-0">

          {/* ===== LEFT: MODE + FORMS ===== */}
          <div className="lg:col-span-2 space-y-5 sm:space-y-6 min-w-0">

            {/* Modo selector — visual cards */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'imagen', icon: '🎨', label: 'Imagen para Estado', desc: 'Descarga para WhatsApp o Instagram', badge: 'GRATIS' },
                { key: 'catalogo', icon: '🛍️', label: 'Publicar en Catálogo', desc: 'Modal emergente al entrar tus clientes', badge: 'MODAL' },
              ].map(m => (
                <button key={m.key} onClick={() => setModo(m.key as 'imagen' | 'catalogo')}
                  className={`group relative overflow-hidden rounded-2xl p-4 sm:p-5 text-left transition-all duration-300 border-2 min-h-[120px] sm:min-h-[140px] ${
                    modo === m.key
                      ? 'border-[var(--primary)] bg-gradient-to-br from-[var(--primary)]/[0.07] to-emerald-500/[0.04] shadow-lg shadow-[var(--primary)]/10'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-md'
                  }`}>
                  <div className={`absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase ${
                    modo === m.key ? 'bg-[var(--primary)] text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500'
                  }`}>{m.badge}</div>
                  <span className="text-2xl sm:text-3xl mb-2 block">{m.icon}</span>
                      <p className={`text-sm sm:text-base font-bold break-words ${modo === m.key ? 'text-[var(--primary)]' : 'text-slate-700 dark:text-slate-200'}`}>
                    {m.label}
                  </p>
                  <p className="text-xs sm:text-sm text-slate-400 dark:text-slate-500 mt-1 leading-tight break-words">{m.desc}</p>
                </button>
              ))}
            </div>

            {/* Active toggle (catalogo only) */}
            {modo === 'catalogo' && (
              <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                <div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Mostrar en catálogo</p>
                  <p className="text-xs text-slate-400 mt-0.5">La vitrina aparecerá al entrar tus clientes</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input type="checkbox" checked={activo} onChange={e => setActivo(e.target.checked)} className="sr-only peer" />
                  <div className="w-11 h-6 bg-slate-300 dark:bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--primary)]" />
                </label>
              </div>
            )}

            {/* Tipo: personalizado vs plantilla — pill selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5">Tipo de vitrina</label>
              <div className="flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                {[
                  { key: 'personalizado', label: 'Imagen personalizada', sub: 'Sube tu propio diseño' },
                  { key: 'plantilla', label: 'Diseñar con Nexus', sub: 'Usa nuestras plantillas' },
                ].map(t => (
                  <button key={t.key} onClick={() => setTipo(t.key as 'personalizado' | 'plantilla')}
                    className={`flex-1 min-w-0 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 text-left ${
                      tipo === t.key
                        ? 'bg-white dark:bg-slate-700 text-[var(--primary)] dark:text-white shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                    }`}>
                    <span className="block break-words">{t.label}</span>
                    <span className={`text-xs font-normal mt-0.5 block break-words ${
                      tipo === t.key ? 'text-[var(--primary)]/70 dark:text-slate-400' : 'text-slate-400 dark:text-slate-500'
                    }`}>{t.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* ===== PERSONALIZADO ===== */}
            {tipo === 'personalizado' ? (
              <div className="space-y-4">
                <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Subir imagen</label>
                  <div className="relative">
                    <input type="file" accept="image/*" onChange={async (e) => {
                      const file = e.target.files?.[0]; if (!file) return
                      const supabase = createClient()
                      const optimized = await optimizarImagen(file)
                      const filePath = `modal/${optimized.name}`
                      const { error: uploadError } = await supabase.storage.from('img_products').upload(filePath, optimized)
                      if (uploadError) { setError('Error al subir: ' + uploadError.message); return }
                      const { data: urlData } = supabase.storage.from('img_products').getPublicUrl(filePath)
                      setImagenUrl(urlData.publicUrl); setError('')
                    }}
                      className="w-full text-sm text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[var(--primary)]/10 file:text-[var(--primary)] hover:file:bg-[var(--primary)]/20 cursor-pointer transition-all" />
                    {imagenUrl && (
                      <img src={imagenUrl} alt="" className="mt-3 w-full h-36 object-cover rounded-xl border border-slate-200 dark:border-slate-700" />
                    )}
                  </div>
                </div>
                <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">URL de redirección</label>
                  <input type="url" value={urlRedireccion || ''} onChange={e => setUrlRedireccion(e.target.value)}
                    placeholder="https://..." className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 placeholder:text-slate-300 dark:placeholder:text-slate-600 transition-all" />
                  <p className="text-xs text-slate-400 mt-1.5">Al hacer clic en la vitrina, redirige a esta URL</p>
                </div>
              </div>
            ) : (
              /* ===== PLANTILLA ===== */
              <div className="space-y-4">

                {/* Content type — pill */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5">Tipo de contenido</label>
                  <div className="flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    {[
                      { key: 'oferta', icon: '🏷️', label: 'Oferta', sub: 'Producto con descuento' },
                      { key: 'anuncio', icon: '📢', label: 'Anuncio', sub: 'Comunicado o promoción' },
                    ].map(c => (
                      <button key={c.key} onClick={() => setContenidoTipo(c.key as 'oferta' | 'anuncio')}
                        className={`flex-1 min-w-0 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 text-left ${
                          contenidoTipo === c.key
                            ? 'bg-white dark:bg-slate-700 text-[var(--primary)] dark:text-white shadow-sm'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                        }`}>
                        <span className="block break-words">{c.icon} {c.label}</span>
                        <span className={`text-xs font-normal mt-0.5 block break-words ${
                          contenidoTipo === c.key ? 'text-[var(--primary)]/70 dark:text-slate-400' : 'text-slate-400 dark:text-slate-500'
                        }`}>{c.sub}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* oferta fields */}
                {contenidoTipo === 'oferta' ? (
                  <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">Producto en oferta</label>
                      {productosOferta.length > 0 ? (
                        <select value={productoId || ''} onChange={e => { setProductoId(e.target.value); const p = productosOferta.find(x => x.id === e.target.value); if (p) setTitulo(p.nombre) }}
                          className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 transition-all">
                          <option value="">Seleccionar producto...</option>
                          {productosOferta.map(p => (
                            <option key={p.id} value={p.id}>{p.nombre} — RD$ {p.precio_oferta.toLocaleString('es-DO')}</option>
                          ))}
                        </select>
                      ) : (
                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3.5 text-xs sm:text-sm text-amber-700 dark:text-amber-300">
                          No hay productos con oferta.{' '}
                          <a href="/dashboard/inventario" className="font-bold underline">Ir a Inventario</a>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">Título</label>
                      <input type="text" value={titulo || ''} onChange={e => setTitulo(e.target.value)}
                        placeholder={productoSeleccionado?.nombre || 'Ej: Oferta Especial'}
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 placeholder:text-slate-300 dark:placeholder:text-slate-600 transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">Descripción</label>
                      <textarea value={descripcion || ''} onChange={e => setDescripcion(e.target.value)} rows={2}
                        placeholder="Ej: Válido hasta agotar stock"
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 placeholder:text-slate-300 dark:placeholder:text-slate-600 transition-all resize-none" />
                    </div>
                  </div>
                ) : (
                  /* anuncio fields */
                  <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">Ícono</label>
                      <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
                        {Object.entries(ICONOS_ANUNCIO).map(([key, emoji]) => (
                          <button key={key} onClick={() => setIconoTipo(key)}
                            className={`w-full aspect-square rounded-lg flex items-center justify-center text-xl sm:text-2xl border-2 transition-all ${
                              iconoTipo === key ? 'border-[var(--primary)] bg-[var(--primary)]/5 shadow-sm' : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
                            }`} title={key}>{emoji}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">Miniatura</label>
                      <div className="flex items-center gap-3">
                        <input type="file" accept="image/*" onChange={handleMiniaturaUpload}
                          className="flex-1 text-sm text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[var(--primary)]/10 file:text-[var(--primary)] hover:file:bg-[var(--primary)]/20 cursor-pointer transition-all" />
                        {miniaturaUrl && <img src={miniaturaUrl} alt="" className="w-10 h-10 rounded-lg object-cover border border-slate-200 dark:border-slate-600 shrink-0" />}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">Título</label>
                      <input type="text" value={titulo || ''} onChange={e => setTitulo(e.target.value)}
                        placeholder="Ej: ¡Nuevo Horario!"
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 placeholder:text-slate-300 dark:placeholder:text-slate-600 transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">Mensaje</label>
                      <textarea value={mensaje || ''} onChange={e => setMensaje(e.target.value)} rows={3}
                        placeholder="Ej: ¡Estamos de estreno! Visítanos..."
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 placeholder:text-slate-300 dark:placeholder:text-slate-600 transition-all resize-none" />
                    </div>
                  </div>
                )}

                {/* CTA text */}
                <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">Texto del botón</label>
                  <input type="text" value={ctaTexto || ''} onChange={e => setCtaTexto(e.target.value)}
                    placeholder="Ej: Ver oferta / Saber más"
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 placeholder:text-slate-300 dark:placeholder:text-slate-600 transition-all" />
                </div>

                {/* Plantillas */}
                <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Plantilla</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {templates.map(t => (
                      <button key={t.key} onClick={() => setPlantillaId(t.key)}
                        className={`px-3 py-3 rounded-xl text-left transition-all border-2 text-sm min-h-[72px] ${
                          plantillaId === t.key
                            ? 'border-[var(--primary)] bg-[var(--primary)]/5 shadow-sm'
                            : 'border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-500 hover:shadow-sm'
                        }`}>
                        <p className={`font-bold text-xs sm:text-sm truncate ${plantillaId === t.key ? 'text-[var(--primary)]' : 'text-slate-800 dark:text-slate-200'}`}>{t.label}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{t.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* URL redirect */}
                <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">URL de redirección</label>
                  <input type="url" value={urlRedireccion || ''} onChange={e => setUrlRedireccion(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 placeholder:text-slate-300 dark:placeholder:text-slate-600 transition-all" />
                  <p className="text-xs text-slate-400 mt-1.5">Al hacer clic en la vitrina, redirige a esta URL</p>
                </div>
              </div>
            )}

          </div>

          {/* ===== RIGHT: PREVIEW ===== */}
          <div className="lg:col-span-1 min-w-0">
            <div ref={previewRef}
              className="md:sticky md:top-4 flex flex-col items-center">
              {/* Mobile: medium preview */}
              <div onClick={() => setVistaPrevia(true)}
                className="md:hidden relative w-28 sm:w-32 aspect-[9/16] rounded-xl overflow-hidden shadow-lg border-2 border-slate-800 dark:border-slate-600 bg-slate-900 dark:bg-slate-800 cursor-pointer">
                <PlantillaPreview config={previewConfig} tiendaNombre={tiendaNombre} logoUrl={logoUrl} />
              </div>
              {/* Desktop: full device frame */}
              <div onClick={() => setVistaPrevia(true)}
                className="hidden md:block relative w-full max-w-[280px] lg:max-w-[320px] cursor-pointer">
                <div className="relative aspect-[9/16] rounded-[2.5rem] overflow-hidden shadow-2xl border-[4px] border-slate-800 dark:border-slate-600 bg-slate-900 dark:bg-slate-800">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-6 bg-slate-800 dark:bg-slate-600 rounded-b-2xl z-10 flex items-center justify-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-600 dark:bg-slate-500" />
                    <div className="w-8 h-1.5 rounded-full bg-slate-900 dark:bg-slate-700" />
                  </div>
                  <PlantillaPreview config={previewConfig} tiendaNombre={tiendaNombre} logoUrl={logoUrl} />
                </div>
                <div className="absolute -inset-2 rounded-[2.5rem] bg-gradient-to-br from-[var(--primary)]/10 to-emerald-500/5 blur-xl -z-10 opacity-60" />
              </div>
              <p className="text-xs text-slate-400 mt-1.5 md:hidden">Toca para ampliar</p>
            </div>
          </div>
        </div>

        {/* ===== ERROR + ACTION BUTTON (below grid on all screens) ===== */}
        {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2.5">{error}</p>}

        {modo === 'imagen' ? (
          <button onClick={handleDownload} disabled={downloading || (contenidoTipo === 'oferta' && !productoSeleccionado)}
            className="group w-full py-3.5 bg-gradient-to-r from-[var(--primary)] to-emerald-600 text-white font-bold rounded-xl hover:brightness-110 transition-all duration-200 disabled:opacity-40 text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-[var(--primary)]/20 active:scale-[0.98]">
            {downloading ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
            ) : (
              <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            )}
            {downloading ? 'Generando imagen...' : 'Descargar Imagen 1080×1920'}
          </button>
        ) : (
          <button onClick={handleSave} disabled={saving}
            className="group w-full py-3.5 bg-gradient-to-r from-[var(--primary)] to-emerald-600 text-white font-bold rounded-xl hover:brightness-110 transition-all duration-200 disabled:opacity-40 text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-[var(--primary)]/20 active:scale-[0.98]">
            {saving ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
            ) : (
              <svg className={`w-5 h-5 ${success ? '' : 'group-hover:scale-110 transition-transform'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {success ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                )}
              </svg>
            )}
            {saving ? 'Publicando...' : success ? '¡Publicado!' : 'Publicar en Catálogo'}
          </button>
        )}

        {/* ===== HISTORIAL ===== */}
        <div id="historial-section" className="pt-3 sm:pt-6">
          <div className="flex items-center justify-between mb-3 sm:mb-5">
            <h2 className="text-sm sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Historial
              {historial.length > 0 && (
                <span className="text-xs font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">{historial.length}</span>
              )}
            </h2>
            {historial.length > 0 && !cargandoHistorial && (
              <button onClick={handleNuevo}
                className="flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2 rounded-lg text-xs sm:text-sm font-bold text-[var(--primary)] bg-[var(--primary)]/10 hover:bg-[var(--primary)]/20 transition-all">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Nuevo diseño
              </button>
            )}
          </div>
          {historial.length === 0 ? (
            <div className="text-center py-12 sm:py-16 text-sm text-slate-400 bg-white dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
              {cargandoHistorial ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-6 h-6 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
                  <p>Cargando historial...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <svg className="w-10 h-10 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                  <p>Aún no hay vitrinas guardadas</p>
                  <p className="text-xs text-slate-300 dark:text-slate-500">Descarga o publica una para que aparezca aquí</p>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {historial.map(entry => (
                <div key={entry.id} className="rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  <div className="relative group">
                    {entry.imagen_url ? (
                      <img src={entry.imagen_url} alt="" className="w-full aspect-[4/3] object-cover cursor-pointer transition-transform duration-300 group-hover:scale-105"
                        onClick={() => setPreviewImg(entry.imagen_url)} />
                    ) : (
                      <div className="w-full aspect-[4/3] flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm bg-slate-50 dark:bg-slate-800/50">
                        Sin imagen
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                  </div>
                  <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
                    <p className="text-xs sm:text-sm text-slate-400 font-medium truncate">
                      {new Date(entry.created_at).toLocaleDateString('es-DO', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                    <div className="grid grid-cols-4 gap-1">
                      <button onClick={() => activarHistorial(entry.id)} disabled={activandoId === entry.id}
                        className="px-1 sm:px-3 py-1.5 sm:py-2 rounded-md sm:rounded-lg text-xs sm:text-sm font-bold bg-[var(--primary)] text-white hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center">
                        <svg className="w-3.5 sm:w-4 h-3.5 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                        <span className="hidden sm:inline sm:ml-1">{activandoId === entry.id ? '...' : 'Activar'}</span>
                      </button>
                      {entry.imagen_url ? (
                        <a href={entry.imagen_url} download={`vitrina-${Date.now()}.png`}
                          className="px-1 sm:px-3 py-1.5 sm:py-2 rounded-md sm:rounded-lg text-xs sm:text-sm font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all flex items-center justify-center">
                          <svg className="w-3.5 sm:w-4 h-3.5 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        </a>
                      ) : (
                        <div />
                      )}
                      <button onClick={() => editarHistorial(entry)}
                        className="px-1 sm:px-3 py-1.5 sm:py-2 rounded-md sm:rounded-lg text-xs sm:text-sm font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all flex items-center justify-center">
                        <svg className="w-3.5 sm:w-4 h-3.5 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button onClick={() => eliminarHistorial(entry.id)}
                        className="px-1 sm:px-3 py-1.5 sm:py-2 rounded-md sm:rounded-lg text-xs sm:text-sm font-bold bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all flex items-center justify-center">
                        <svg className="w-3.5 sm:w-4 h-3.5 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ===== MOBILE FULL PREVIEW ===== */}
        {vistaPrevia && (
          <div className="lg:hidden fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-6"
            onClick={() => setVistaPrevia(false)}>
            <div className="w-full max-w-[300px] aspect-[9/16] rounded-[2.5rem] overflow-hidden shadow-2xl border-[4px] border-slate-700"
              onClick={e => e.stopPropagation()}>
              <PlantillaPreview config={previewConfig} tiendaNombre={tiendaNombre} logoUrl={logoUrl} />
            </div>
            <button onClick={() => setVistaPrevia(false)}
              className="absolute top-6 right-6 w-10 h-10 rounded-full flex items-center justify-center bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        )}

        {/* ===== FULL IMAGE PREVIEW ===== */}
        {previewImg && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setPreviewImg(null)}>
            <img src={previewImg} alt="" className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()} />
            <button onClick={() => setPreviewImg(null)}
              className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center bg-black/50 text-white hover:bg-black/70 transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        )}

      </div>
      {/* VITRINA STUDIO: end workspace */}

    </div>
  )
}
