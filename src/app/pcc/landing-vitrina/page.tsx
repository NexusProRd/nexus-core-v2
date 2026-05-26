'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { toPng } from 'html-to-image'
import { PlantillaPreview, ICONOS_ANUNCIO } from '@/components/catalog/CatalogoModal'
import type { CatalogoModalConfig, TemplateKey } from '@/components/catalog/CatalogoModal'
import { optimizarImagen } from '@/lib/image'

interface HistorialEntry {
  id: string
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

export default function LandingVitrinaPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const [modo, setModo] = useState<'imagen' | 'landing'>('imagen')
  const [activo, setActivo] = useState(false)
  const [tipo, setTipo] = useState<'personalizado' | 'plantilla'>('plantilla')
  const [imagenUrl, setImagenUrl] = useState('')
  const [contenidoTipo, setContenidoTipo] = useState<'oferta' | 'anuncio'>('oferta')
  const [plantillaId, setPlantillaId] = useState<TemplateKey>('elegante')
  const [urlRedireccion, setUrlRedireccion] = useState('')
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [ctaTexto, setCtaTexto] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [iconoTipo, setIconoTipo] = useState('anuncio')
  const [miniaturaUrl, setMiniaturaUrl] = useState('')

  const [historial, setHistorial] = useState<HistorialEntry[]>([])
  const [cargandoHistorial, setCargandoHistorial] = useState(false)
  const [activandoId, setActivandoId] = useState<string | null>(null)
  const [previewImg, setPreviewImg] = useState<string | null>(null)
  const [vistaPrevia, setVistaPrevia] = useState(false)

  const previewRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    ;(async () => {
      const [vitrinaRes, histRes] = await Promise.all([
        supabase.from('nexus_landing_vitrina').select('*').eq('clave', 'global').maybeSingle(),
        supabase.from('nexus_landing_vitrina_historial').select('*').order('created_at', { ascending: false }),
      ])

      const c = vitrinaRes.data
      if (c) {
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

      if (histRes.data) setHistorial(histRes.data)
      setLoading(false)
    })()
  }, [])

  const previewConfig: CatalogoModalConfig = {
    tipo: tipo,
    imagen_url: imagenUrl || null,
    url_redireccion: urlRedireccion || null,
    contenido: tipo === 'plantilla' ? (contenidoTipo === 'oferta' ? {
      tipo_contenido: 'oferta',
      titulo: titulo || undefined,
      descripcion: descripcion || undefined,
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
      const file = new File([blob], `landing-vitrina-${Date.now()}.png`, { type: 'image/png' })
      const filePath = `landing/vitrina/${Date.now()}-${Math.random().toString(36).substring(7)}.png`
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
      const { data } = await supabase
        .from('nexus_landing_vitrina_historial')
        .insert({ config, imagen_url: imagenUrl || null })
        .select()
        .single()
      if (data) setHistorial(prev => [data, ...prev])
    } catch {}
  }

  const activarHistorial = async (id: string) => {
    setActivandoId(id)
    setError('')
    try {
      const { data: entry, error: fetchError } = await supabase
        .from('nexus_landing_vitrina_historial')
        .select('*')
        .eq('id', id)
        .single()
      if (fetchError || !entry) { setError('No encontrado'); setActivandoId(null); return }

      const config = entry.config
      const { error: upsertError } = await supabase
        .from('nexus_landing_vitrina')
        .upsert({
          clave: 'global',
          activo: true,
          tipo: config.tipo || 'plantilla',
          plantilla_id: config.plantilla_id || 'elegante',
          imagen_url: entry.imagen_url || config.imagen_url || null,
          url_redireccion: config.url_redireccion || null,
          contenido: config.contenido || null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'clave' })
      if (upsertError) { setError(upsertError.message); setActivandoId(null); return }
      setSuccess(true); setTimeout(() => setSuccess(false), 3000)
      setActivo(true)
    } catch { setError('Error al activar') }
    setActivandoId(null)
  }

  const eliminarHistorial = async (id: string) => {
    if (!confirm('¿Eliminar esta vitrina del historial?')) return
    try {
      const { error } = await supabase.from('nexus_landing_vitrina_historial').delete().eq('id', id)
      if (!error) setHistorial(prev => prev.filter(e => e.id !== id))
    } catch {}
  }

  const editarHistorial = (entry: HistorialEntry) => {
    const c = entry.config
    setModo('landing')
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
    }
    setError('')
    setSuccess(false)
  }

  const handleNuevo = () => {
    const snapshot = getSnapshotConfig()
    const hasContent = snapshot.tipo === 'personalizado' ? !!snapshot.imagen_url : !!snapshot.contenido
    if (hasContent) guardarEnHistorial(snapshot)
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
        titulo: titulo || null,
        descripcion: descripcion || null,
        cta_texto: ctaTexto || null,
      } : {
        tipo_contenido: 'anuncio',
        titulo: titulo || null,
        mensaje: mensaje || null,
        icono_tipo: iconoTipo || null,
        miniatura_url: miniaturaUrl || null,
        cta_texto: ctaTexto || null,
      }) : null,
    }
  }, [tipo, imagenUrl, urlRedireccion, plantillaId, contenidoTipo, titulo, descripcion, ctaTexto, mensaje, iconoTipo, miniaturaUrl])

  const handleDownload = async () => {
    if (!previewRef.current) return
    setDownloading(true)
    setError('')
    try {
      const rect = previewRef.current.getBoundingClientRect()
      const ratio = 1080 / rect.width
      const dataUrl = await toPng(previewRef.current, { pixelRatio: ratio, quality: 1 })
      const link = document.createElement('a')
      link.download = `landing-vitrina-${contenidoTipo}-${Date.now()}.png`
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

    if (contenidoTipo === 'anuncio') {
      contenido.mensaje = mensaje.trim()
      contenido.icono_tipo = iconoTipo
      contenido.miniatura_url = miniaturaUrl.trim() || null
    }

    setActivo(true)
    const body: any = {
      clave: 'global',
      activo: true,
      tipo,
      plantilla_id: plantillaId,
      url_redireccion: urlRedireccion.trim() || null,
      contenido,
      updated_at: new Date().toISOString(),
    }
    if (tipo === 'personalizado') {
      body.imagen_url = imagenUrl || null
      body.contenido = null
    }

    const { error: upsertError } = await supabase
      .from('nexus_landing_vitrina')
      .upsert(body, { onConflict: 'clave' })

    if (upsertError) { setError(upsertError.message) }
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

  const handleMiniaturaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const optimized = await optimizarImagen(file)
    const filePath = `landing/${optimized.name}`
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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-5 sm:space-y-8">

      {/* ===== GLASS HEADER ===== */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-white/20 dark:border-slate-700/30 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/30 p-4 sm:p-6">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-gradient-to-br from-[var(--primary)]/10 to-emerald-500/5 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-gradient-to-tr from-amber-400/10 to-rose-400/5 blur-3xl pointer-events-none" />
        <div className="relative flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--primary)] to-emerald-600 flex items-center justify-center text-white text-sm shadow-md">✦</span>
              Vitrina del Landing
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 ml-0.5">Diseña la vitrina promocional que aparecerá en la página principal</p>
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

          {/* Modo selector */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'imagen', icon: '🎨', label: 'Imagen para Estado', desc: 'Descarga para WhatsApp o Instagram', badge: 'GRATIS' },
              { key: 'landing', icon: '🏠', label: 'Publicar en Landing', desc: 'Vitrina visible en la página principal', badge: 'LANDING' },
            ].map(m => (
              <button key={m.key} onClick={() => setModo(m.key as 'imagen' | 'landing')}
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

          {/* Active toggle (landing only) */}
          {modo === 'landing' && (
            <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
              <div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Mostrar en landing</p>
                <p className="text-xs text-slate-400 mt-0.5">La vitrina aparecerá en la página principal</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input type="checkbox" checked={activo} onChange={e => setActivo(e.target.checked)} className="sr-only peer" />
                <div className="w-11 h-6 bg-slate-300 dark:bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--primary)]" />
              </label>
            </div>
          )}

          {/* Tipo selector */}
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
                    const optimized = await optimizarImagen(file)
                    const filePath = `landing/${optimized.name}`
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

              {/* Content type */}
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
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">Título</label>
                    <input type="text" value={titulo || ''} onChange={e => setTitulo(e.target.value)}
                      placeholder="Ej: Oferta Especial de Lanzamiento"
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 placeholder:text-slate-300 dark:placeholder:text-slate-600 transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">Descripción</label>
                    <textarea value={descripcion || ''} onChange={e => setDescripcion(e.target.value)} rows={2}
                      placeholder="Ej: Válido por tiempo limitado"
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
                      placeholder="Ej: ¡Nuevo! Nexus 2.0"
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 placeholder:text-slate-300 dark:placeholder:text-slate-600 transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">Mensaje</label>
                    <textarea value={mensaje || ''} onChange={e => setMensaje(e.target.value)} rows={3}
                      placeholder="Ej: ¡Estamos de estreno! Nexus tiene nueva imagen..."
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
            <div onClick={() => setVistaPrevia(true)}
              className="md:hidden relative w-28 sm:w-32 aspect-[9/16] rounded-xl overflow-hidden shadow-lg border-2 border-slate-800 dark:border-slate-600 bg-slate-900 dark:bg-slate-800 cursor-pointer">
              <PlantillaPreview config={previewConfig} tiendaNombre="Nexus" logoUrl={null} />
            </div>
            <div onClick={() => setVistaPrevia(true)}
              className="hidden md:block relative w-full max-w-[280px] lg:max-w-[320px] cursor-pointer">
              <div className="relative aspect-[9/16] rounded-[2.5rem] overflow-hidden shadow-2xl border-[4px] border-slate-800 dark:border-slate-600 bg-slate-900 dark:bg-slate-800">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-6 bg-slate-800 dark:bg-slate-600 rounded-b-2xl z-10 flex items-center justify-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-600 dark:bg-slate-500" />
                  <div className="w-8 h-1.5 rounded-full bg-slate-900 dark:bg-slate-700" />
                </div>
                <PlantillaPreview config={previewConfig} tiendaNombre="Nexus" logoUrl={null} />
              </div>
              <div className="absolute -inset-2 rounded-[2.5rem] bg-gradient-to-br from-[var(--primary)]/10 to-emerald-500/5 blur-xl -z-10 opacity-60" />
            </div>
            <p className="text-xs text-slate-400 mt-1.5 md:hidden">Toca para ampliar</p>
          </div>
        </div>
      </div>

      {/* ===== ERROR + ACTION BUTTON ===== */}
      {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2.5">{error}</p>}

      {modo === 'imagen' ? (
        <button onClick={handleDownload} disabled={downloading}
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
          {saving ? 'Publicando...' : success ? '¡Publicado!' : 'Publicar en Landing'}
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
                <p className="text-xs text-slate-300 dark:text-slate-500">Diseña una para que aparezca aquí</p>
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
                      <a href={entry.imagen_url} download={`landing-vitrina-${Date.now()}.png`}
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
            <PlantillaPreview config={previewConfig} tiendaNombre="Nexus" logoUrl={null} />
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
  )
}
