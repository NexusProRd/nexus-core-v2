'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { toPng } from 'html-to-image'
import QRCode from 'qrcode'

interface Producto {
  id: string
  nombre: string
  imagen_url: string | null
  precio: number
  precio_oferta: number | null
  slug?: string | null
}

interface VitrinaGeneratorProps {
  tiendaId: string
  nombreTienda: string
  catalogoUrl: string
  slugUrl?: string
  onClose: () => void
}

type TemplateKey = 'elegante' | 'premium' | 'neon' | 'clean' | 'tropical' | 'tech' | 'rustico' | 'pastel' | 'bold' | 'noir'

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

function formatearPrecio(precio: number): string {
  return precio.toLocaleString('es-DO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export default function VitrinaGenerator({ tiendaId, nombreTienda, catalogoUrl, slugUrl, onClose }: VitrinaGeneratorProps) {
  const [productos, setProductos] = useState<Producto[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [template, setTemplate] = useState<TemplateKey>('elegante')
  const [qrWhite, setQrWhite] = useState('')
  const [qrDark, setQrDark] = useState('')
  const [downloading, setDownloading] = useState(false)
  const previewRef = useRef<HTMLDivElement>(null)

  const producto = productos.find(p => p.id === selectedId) || null
  const isDark = template !== 'premium' && template !== 'clean' && template !== 'tropical' && template !== 'rustico' && template !== 'pastel'

  useEffect(() => {
    const supabase = createClient()
    ;(async () => {
      const [prodRes, perfilRes] = await Promise.all([
        supabase.from('productos').select('id, nombre, imagen_url, precio, precio_oferta, slug').eq('id_tienda', tiendaId).order('creado_at', { ascending: false }),
        supabase.from('perfil_tienda').select('logo_url').eq('id_tienda', tiendaId).maybeSingle(),
      ])
      if (prodRes.data) {
        setProductos(prodRes.data as Producto[])
        if (prodRes.data.length > 0) setSelectedId(prodRes.data[0].id)
      }
      if (perfilRes.data?.logo_url) setLogoUrl(perfilRes.data.logo_url)
    })()
  }, [tiendaId])

  const baseUrl = slugUrl || catalogoUrl
  const qrUrl = producto?.slug ? `${baseUrl}/producto/${producto.slug}` : baseUrl

  useEffect(() => {
    QRCode.toDataURL(qrUrl, { width: 200, margin: 1, color: { dark: '#ffffff', light: '#00000000' } }).then(setQrWhite).catch(() => {})
    QRCode.toDataURL(qrUrl, { width: 200, margin: 1, color: { dark: '#0f172a', light: '#00000000' } }).then(setQrDark).catch(() => {})
  }, [qrUrl])

  const bgGradient = useCallback(() => {
    switch (template) {
      case 'elegante': return 'bg-gradient-to-br from-[#0a0a0f] via-[#12121f] to-[#1a1a30]'
      case 'premium':  return 'bg-gradient-to-br from-[#faf6f0] via-[#f5edd8] to-[#efe2be]'
      case 'neon':     return 'bg-gradient-to-br from-[#0a0015] via-[#1a0030] to-[#0d0030]'
      case 'clean':    return 'bg-[#ffffff]'
      case 'tropical': return 'bg-gradient-to-br from-[#ff6b35] via-[#f7c59f] to-[#fce4c8]'
      case 'tech':     return 'bg-gradient-to-br from-[#0a1628] via-[#0f1f3d] to-[#162d50]'
      case 'rustico':  return 'bg-gradient-to-br from-[#f5ede0] via-[#e8d5b5] to-[#d4b896]'
      case 'pastel':   return 'bg-gradient-to-br from-[#fce4ec] via-[#e8d5f5] to-[#d5f5e3]'
      case 'bold':     return 'bg-gradient-to-br from-[#1a0000] via-[#3a0000] to-[#5c0000]'
      case 'noir':     return 'bg-gradient-to-br from-[#0f0f0f] via-[#1a1a1a] to-[#2a2a2a]'
    }
  }, [template])

  const textPrimary = useCallback(() => {
    switch (template) {
      case 'elegante': return 'text-[#d4a853]'
      case 'premium':  return 'text-[#8b6914]'
      case 'neon':     return 'text-[#ff2d95]'
      case 'clean':    return 'text-[#0f172a]'
      case 'tropical': return 'text-[#7a2e00]'
      case 'tech':     return 'text-[#00e5ff]'
      case 'rustico':  return 'text-[#5c3d2e]'
      case 'pastel':   return 'text-[#8b4a6b]'
      case 'bold':     return 'text-[#ff4444]'
      case 'noir':     return 'text-[#c0c0c0]'
    }
  }, [template])

  const textSecondary = useCallback(() => {
    switch (template) {
      case 'elegante': return 'text-[#a0a0b0]'
      case 'premium':  return 'text-[#6b5a3e]'
      case 'neon':     return 'text-[#a0a0c0]'
      case 'clean':    return 'text-[#64748b]'
      case 'tropical': return 'text-[#5a3a20]'
      case 'tech':     return 'text-[#6ba0c0]'
      case 'rustico':  return 'text-[#8b7355]'
      case 'pastel':   return 'text-[#b07a9a]'
      case 'bold':     return 'text-[#cc8888]'
      case 'noir':     return 'text-[#808080]'
    }
  }, [template])

  const precioBg = useCallback(() => {
    switch (template) {
      case 'elegante': return 'bg-[#d4a853]/15 text-[#d4a853] border border-[#d4a853]/30'
      case 'premium':  return 'bg-[#8b6914]/10 text-[#8b6914] border border-[#8b6914]/20'
      case 'neon':     return 'bg-[#ff2d95]/15 text-[#ff2d95] border border-[#ff2d95]/30'
      case 'clean':    return 'bg-[#0f172a]/5 text-[#0f172a] border border-[#0f172a]/10'
      case 'tropical': return 'bg-white/40 text-[#7a2e00] border border-white/60'
      case 'tech':     return 'bg-[#00e5ff]/10 text-[#00e5ff] border border-[#00e5ff]/25'
      case 'rustico':  return 'bg-[#5c3d2e]/10 text-[#5c3d2e] border border-[#5c3d2e]/20'
      case 'pastel':   return 'bg-[#8b4a6b]/10 text-[#8b4a6b] border border-[#8b4a6b]/20'
      case 'bold':     return 'bg-[#ff4444]/15 text-[#ff4444] border border-[#ff4444]/30'
      case 'noir':     return 'bg-[#c0c0c0]/10 text-[#c0c0c0] border border-[#c0c0c0]/20'
    }
  }, [template])

  const downloadImage = async () => {
    if (!previewRef.current || !producto) return
    setDownloading(true)
    try {
      const dataUrl = await toPng(previewRef.current, { pixelRatio: 4, quality: 1 })
      const link = document.createElement('a')
      link.download = `vitrina-${producto.nombre.toLowerCase().replace(/\s+/g, '-')}.png`
      link.href = dataUrl
      link.click()
    } catch (e) {
      console.error('Error al descargar:', e)
    }
    setDownloading(false)
  }

  const shareWhatsApp = () => {
    if (!producto) return
    const url = producto?.slug ? `${baseUrl}/producto/${producto.slug}` : baseUrl
    const msg = `✨ *${nombreTienda}* ✨\n\n🔥 *${producto.nombre}*\n💰 RD$${formatearPrecio(producto.precio_oferta || producto.precio)}\n\n🛍️ ${url}`
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
  }

  const badgeOferta = producto?.precio_oferta && producto.precio_oferta < producto.precio

  if (productos.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-8 text-center max-w-sm w-full" onClick={e => e.stopPropagation()}>
          <p className="text-slate-500">Agrega productos primero para usar la Vitrina.</p>
          <button onClick={onClose} className="mt-4 text-sm text-[var(--primary)] font-medium">Cerrar</button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-lg z-50 flex items-center justify-center p-2 sm:p-6" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">✨ Nexus Vitrina</h2>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="flex flex-col lg:flex-row gap-6">
            {/* Preview */}
            <div className="flex-shrink-0 mx-auto lg:mx-0">
              <div className="relative" style={{ width: 270, height: 480 }}>
                <div
                  ref={previewRef}
                  className={`w-full h-full rounded-2xl overflow-hidden relative flex flex-col items-center justify-between p-6 ${bgGradient()}`}
                  style={{ boxShadow: 'inset 0 0 60px rgba(0,0,0,0.3)' }}
                >
                  {/* Glow */}
                  {template !== 'clean' && (
                    <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-60 h-60 rounded-full opacity-20"
                      style={{
                        background: template === 'elegante' ? '#d4a853' : template === 'premium' ? '#8b6914' : template === 'neon' ? '#ff2d95' : template === 'tropical' ? '#ff6b35' : template === 'tech' ? '#00e5ff' : template === 'rustico' ? '#c4a87c' : template === 'pastel' ? '#e8a0c0' : template === 'bold' ? '#ff2222' : '#888888',
                        filter: 'blur(60px)',
                      }} />
                  )}

                  {/* Top: Logo + Name */}
                  <div className="flex flex-col items-center gap-2 relative z-10 mt-2">
                    {logoUrl ? (
                      <img src={logoUrl} alt={nombreTienda} className="w-12 h-12 rounded-full object-cover border-2"
                        style={{ borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.08)' }} />
                    ) : (
                      <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold border-2"
                        style={{
                          background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                          borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
                          color: isDark ? '#ffffff' : '#0f172a',
                        }}>
                        {nombreTienda.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <p className={`text-[10px] font-semibold tracking-wider uppercase ${textSecondary()}`}>{nombreTienda}</p>
                  </div>

                  {/* Center: Product */}
                  <div className="relative z-10 flex-1 flex items-center justify-center w-full px-2">
                    {producto?.imagen_url ? (
                      <div className="relative w-full max-w-[180px]">
                        <img src={producto.imagen_url} alt={producto.nombre}
                          className="w-full aspect-square object-cover rounded-2xl shadow-2xl"
                          style={{ boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }} />
                        {badgeOferta && (
                          <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[8px] font-bold px-2 py-1 rounded-full shadow-lg">OFERTA</div>
                        )}
                      </div>
                    ) : (
                      <div className={`w-full max-w-[160px] aspect-square rounded-2xl flex items-center justify-center border-2 border-dashed ${textSecondary()}`} style={{ opacity: 0.3 }}>
                        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      </div>
                    )}
                  </div>

                  {/* Bottom: Name + Price + QR */}
                  <div className="relative z-10 w-full text-center space-y-2 pb-2">
                    <p className={`text-sm font-bold leading-tight px-2 ${isDark ? 'text-white' : 'text-[#0f172a]'}`}
                      style={{ textShadow: isDark ? '0 1px 3px rgba(0,0,0,0.3)' : 'none' }}>
                      {producto?.nombre || 'Selecciona un producto'}
                    </p>

                    {producto && (
                      <div className="flex items-center justify-center gap-2">
                        {badgeOferta ? (
                          <>
                            <span className={`text-xs line-through ${textSecondary()}`}>RD$ {formatearPrecio(producto.precio)}</span>
                            <span className={`text-lg font-extrabold px-3 py-0.5 rounded-xl ${precioBg()}`}>RD$ {formatearPrecio(producto.precio_oferta!)}</span>
                          </>
                        ) : (
                          <span className={`text-lg font-extrabold px-3 py-0.5 rounded-xl ${precioBg()}`}>RD$ {formatearPrecio(producto.precio)}</span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-center gap-3 pt-1">
                      {qrWhite && (
                        <img src={isDark ? qrWhite : qrDark} alt="QR" className="w-10 h-10 rounded-lg"
                          style={{ filter: isDark ? 'none' : 'none' }} />
                      )}
                      <p className={`text-[8px] uppercase tracking-widest font-medium ${textSecondary()}`}>
                        Escanéame<br />para pedir
                      </p>
                    </div>
                  </div>

                  {/* Template-specific decorations */}
                  {template === 'elegante' && (
                    <>
                      <div className="absolute top-3 left-3 w-6 h-6 border-l-2 border-t-2 border-[#d4a853]/40 rounded-tl" />
                      <div className="absolute top-3 right-3 w-6 h-6 border-r-2 border-t-2 border-[#d4a853]/40 rounded-tr" />
                      <div className="absolute bottom-3 left-3 w-6 h-6 border-l-2 border-b-2 border-[#d4a853]/40 rounded-bl" />
                      <div className="absolute bottom-3 right-3 w-6 h-6 border-r-2 border-b-2 border-[#d4a853]/40 rounded-br" />
                    </>
                  )}

                  {template === 'neon' && (
                    <div className="absolute inset-0 rounded-2xl opacity-10" style={{
                      background: 'linear-gradient(135deg, transparent 0%, transparent 40%, #ff2d95 50%, transparent 60%, #00d4ff 70%, transparent 100%)',
                      backgroundSize: '200% 200%',
                    }} />
                  )}

                  {template === 'tropical' && (
                    <>
                      <div className="absolute top-4 left-4 text-xl opacity-30">🌴</div>
                      <div className="absolute top-4 right-4 text-xl opacity-30">🌺</div>
                      <div className="absolute bottom-20 left-3 text-lg opacity-25">🌊</div>
                      <div className="absolute bottom-20 right-3 text-lg opacity-25">☀️</div>
                    </>
                  )}

                  {template === 'tech' && (
                    <>
                      <div className="absolute top-6 left-6 w-16 h-0.5 bg-[#00e5ff]/20 rotate-45 rounded-full" />
                      <div className="absolute top-6 right-6 w-16 h-0.5 bg-[#00e5ff]/20 -rotate-45 rounded-full" />
                      <div className="absolute bottom-16 left-4 w-8 h-8 rounded-full border border-[#00e5ff]/15" />
                      <div className="absolute bottom-20 right-6 w-5 h-5 rounded-full bg-[#00e5ff]/10" />
                    </>
                  )}

                  {template === 'rustico' && (
                    <>
                      <div className="absolute top-5 left-5 text-lg opacity-25">🌿</div>
                      <div className="absolute top-5 right-5 text-lg opacity-25">🍂</div>
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-[#5c3d2e]/15 rounded-full" />
                    </>
                  )}

                  {template === 'pastel' && (
                    <>
                      {[0,1,2,3,4].map(i => (
                        <div key={i} className="absolute rounded-full opacity-15"
                          style={{
                            width: 6 + i * 4, height: 6 + i * 4,
                            background: ['#f48fb1','#ce93d8','#80cbc4','#f06292','#ba68c8'][i],
                            top: 10 + i * 20, right: 8 + i * 15,
                          }} />
                      ))}
                    </>
                  )}

                  {template === 'bold' && (
                    <>
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600/40 via-red-500/60 to-red-600/40" />
                      <div className="absolute top-4 left-4 text-2xl font-black text-white/5">●</div>
                      <div className="absolute bottom-4 right-4 text-2xl font-black text-white/5">◆</div>
                    </>
                  )}

                  {template === 'noir' && (
                    <>
                      <div className="absolute top-3 left-3 w-10 h-10 rounded-full border border-white/5" />
                      <div className="absolute top-8 right-8 w-0.5 h-12 bg-white/5" />
                      <div className="absolute bottom-12 left-6 w-8 h-8 border border-white/5 rotate-45" />
                      <div className="absolute bottom-8 right-4 w-0.5 h-8 bg-white/5" />
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex-1 min-w-0 space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Producto</label>
                <select value={selectedId} onChange={e => setSelectedId(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--primary)]">
                  {productos.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre} — RD$ {formatearPrecio(p.precio_oferta || p.precio)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Plantilla</label>
                <div className="grid grid-cols-2 gap-2">
                  {templates.map(t => (
                    <button key={t.key} onClick={() => setTemplate(t.key)}
                      className={`px-3 py-3 rounded-xl text-left transition-all duration-200 border-2 ${
                        template === t.key
                          ? 'border-[var(--primary)] bg-[var(--primary)]/5 shadow-sm'
                          : 'border-transparent bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{t.label}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{t.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <button onClick={downloadImage} disabled={!producto || downloading}
                  className="w-full py-3.5 bg-[var(--primary)] text-white font-bold rounded-xl hover:brightness-110 transition-all duration-200 shadow-lg shadow-[var(--primary)]/25 disabled:opacity-50 text-sm flex items-center justify-center gap-2">
                  {downloading ? (
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  )}
                  {downloading ? 'Generando...' : 'Descargar Imagen 1080×1920'}
                </button>

                <button onClick={shareWhatsApp} disabled={!producto}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-emerald-500/25 disabled:opacity-50 text-sm flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                  Compartir en WhatsApp
                </button>
              </div>

              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
                <p className="text-[11px] text-amber-800 dark:text-amber-200 leading-relaxed">
                  💡 La imagen se descarga en formato 9:16 (1080×1920px), ideal para Historias de Instagram y Estados de WhatsApp.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
