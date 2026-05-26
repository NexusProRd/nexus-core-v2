'use client'

import { useEffect, useState, useCallback } from 'react'

export interface CatalogoModalConfig {
  tipo: 'personalizado' | 'plantilla'
  imagen_url?: string | null
  url_redireccion?: string | null
  contenido?: {
    tipo_contenido?: 'oferta' | 'anuncio'
    titulo?: string
    descripcion?: string
    precio?: number
    precio_oferta?: number
    producto_nombre?: string
    producto_imagen_url?: string
    producto_id?: string
    mensaje?: string
    cta_texto?: string
    cta_url?: string
    icono_tipo?: string
    miniatura_url?: string
  }
  plantilla_id?: string
}

const ICONOS_ANUNCIO: Record<string, string> = {
  anuncio: '📢',
  advertencia: '⚠️',
  info: 'ℹ️',
  nuevo: '🆕',
  oferta: '🏷️',
  importante: '❗',
  evento: '🎉',
  megafono: '📣',
  campana: '🔔',
  estrella: '⭐',
}

export type TemplateKey = 'elegante' | 'premium' | 'neon' | 'clean' | 'tropical' | 'tech' | 'rustico' | 'pastel' | 'bold' | 'noir'

interface Props {
  config: CatalogoModalConfig
  tiendaNombre: string
  logoUrl: string | null
  onClose: () => void
  onRedirect?: (url: string) => void
}

const FONT_BASE = 'system-ui, -apple-system, sans-serif'

function fontFamily(template: string): string {
  switch (template) {
    case 'elegante': return 'var(--font-playfair), "Georgia", serif'
    case 'premium':  return 'var(--font-playfair), "Georgia", serif'
    case 'neon':     return 'var(--font-orbitron), "Poppins", sans-serif'
    case 'clean':    return FONT_BASE
    case 'tropical': return 'var(--font-pacifico), "Brush Script MT", cursive'
    case 'tech':     return 'var(--font-orbitron), "Courier New", monospace'
    case 'rustico':  return 'var(--font-playfair), "Georgia", serif'
    case 'pastel':   return 'var(--font-quicksand), "Poppins", sans-serif'
    case 'bold':     return 'var(--font-bebas), "Impact", sans-serif'
    case 'noir':     return 'var(--font-playfair), "Georgia", serif'
    default: return FONT_BASE
  }
}

function formatearPrecio(precio: number): string {
  return precio.toLocaleString('es-DO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function bgGradient(template: string) {
  switch (template) {
    case 'elegante': return 'from-[#07070d] via-[#0f0f1f] to-[#1a1a2e]'
    case 'premium':  return 'from-[#faf6f0] via-[#f5edd8] to-[#efe2be]'
    case 'neon':     return 'from-[#050010] via-[#1a0030] to-[#0a0020]'
    case 'clean':    return 'from-[#ffffff] via-[#ffffff] to-[#ffffff]'
    case 'tropical': return 'from-[#ff6b35] via-[#f7c59f] to-[#fce4c8]'
    case 'tech':     return 'from-[#030b1a] via-[#0a1a35] to-[#0f2645]'
    case 'rustico':  return 'from-[#f5ede0] via-[#e8d5b5] to-[#d4b896]'
    case 'pastel':   return 'from-[#fce4ec] via-[#e8d5f5] to-[#d5f5e3]'
    case 'bold':     return 'from-[#1a0000] via-[#3a0000] to-[#5c0000]'
    case 'noir':     return 'from-[#0f0f0f] via-[#1a1a1a] to-[#2a2a2a]'
  }
}

function textPrimary(template: string) {
  switch (template) {
    case 'elegante': return '#d4a853'
    case 'premium':  return '#8b6914'
    case 'neon':     return '#ff2d95'
    case 'clean':    return '#0f172a'
    case 'tropical': return '#7a2e00'
    case 'tech':     return '#00e5ff'
    case 'rustico':  return '#5c3d2e'
    case 'pastel':   return '#8b4a6b'
    case 'bold':     return '#ff4444'
    case 'noir':     return '#c0c0c0'
  }
}

function textSecondary(template: string) {
  switch (template) {
    case 'elegante': return '#8888a0'
    case 'premium':  return '#6b5a3e'
    case 'neon':     return '#9080b0'
    case 'clean':    return '#64748b'
    case 'tropical': return '#5a3a20'
    case 'tech':     return '#5a80a8'
    case 'rustico':  return '#8b7355'
    case 'pastel':   return '#b07a9a'
    case 'bold':     return '#cc8888'
    case 'noir':     return '#707070'
  }
}

function isDark(template: string) {
  return template !== 'premium' && template !== 'clean' && template !== 'tropical' && template !== 'rustico' && template !== 'pastel'
}

function PlantillaPreview({ config, tiendaNombre, logoUrl, onCtaClick }: {
  config: CatalogoModalConfig
  tiendaNombre: string
  logoUrl: string | null
  onCtaClick?: () => void
}) {
  const tmpl = config.plantilla_id || 'elegante'
  const dark = isDark(tmpl)
  const contenido = config.contenido || {}
  const isOferta = contenido.tipo_contenido === 'oferta'
  const isAnuncio = contenido.tipo_contenido === 'anuncio'
  const hasOferta = isOferta && contenido.precio_oferta && contenido.precio && contenido.precio_oferta < contenido.precio
  const font = fontFamily(tmpl)
  const prim = textPrimary(tmpl)
  const sec = textSecondary(tmpl)

  const esPersonalizado = config.tipo === 'personalizado'

  if (esPersonalizado) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-white">
        {config.imagen_url ? (
          <img src={config.imagen_url} alt="Banner" className="w-full h-full object-contain p-2" />
        ) : (
          <p className="text-sm text-slate-400">Sin imagen</p>
        )}
      </div>
    )
  }

  const titleStyle: React.CSSProperties = {
    fontFamily: font,
    color: dark ? '#ffffff' : '#0f172a',
    textShadow: dark ? '0 2px 6px rgba(0,0,0,0.4)' : 'none',
    letterSpacing: tmpl === 'bold' ? '0.04em' : tmpl === 'neon' || tmpl === 'tech' ? '0.08em' : 'normal',
    fontSize: tmpl === 'bold' ? '1.6rem' : tmpl === 'noir' ? '1.15rem' : '1.1rem',
    lineHeight: 1.3,
  }

  return (
    <div className={`w-full h-full flex flex-col bg-gradient-to-br ${bgGradient(tmpl)}`}
      style={{ boxShadow: 'inset 0 0 80px rgba(0,0,0,0.35)' }}>
      {/* Ambient glow */}
      {tmpl !== 'clean' && (
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full opacity-15"
          style={{
            background: prim,
            filter: 'blur(80px)',
          }} />
      )}

      {/* Elegante corner ornaments + side accent */}
      {tmpl === 'elegante' && (
        <>
          <div className="absolute top-0 left-0 w-1/3 h-[1px]" style={{ background: `linear-gradient(90deg, ${prim}80, transparent)` }} />
          <div className="absolute top-0 right-0 w-1/3 h-[1px]" style={{ background: `linear-gradient(270deg, ${prim}80, transparent)` }} />
          <div className="absolute top-3 left-3 w-7 h-7 border-l-2 border-t-2 rounded-tl" style={{ borderColor: `${prim}50` }} />
          <div className="absolute top-3 right-3 w-7 h-7 border-r-2 border-t-2 rounded-tr" style={{ borderColor: `${prim}50` }} />
          <div className="absolute bottom-3 left-3 w-7 h-7 border-l-2 border-b-2 rounded-bl" style={{ borderColor: `${prim}50` }} />
          <div className="absolute bottom-3 right-3 w-7 h-7 border-r-2 border-b-2 rounded-br" style={{ borderColor: `${prim}50` }} />
          <div className="absolute top-1/2 left-0 w-[1px] h-16 -translate-y-1/2" style={{ background: `linear-gradient(180deg, transparent, ${prim}40, transparent)` }} />
          <div className="absolute top-1/2 right-0 w-[1px] h-16 -translate-y-1/2" style={{ background: `linear-gradient(180deg, transparent, ${prim}40, transparent)` }} />
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-8 h-[1px]" style={{ background: `linear-gradient(90deg, transparent, ${prim}30, transparent)` }} />
        </>
      )}

      {/* Premium diamond + gold line */}
      {tmpl === 'premium' && (
        <>
          <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: `linear-gradient(90deg, transparent, ${prim}60, transparent)` }} />
          <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: `linear-gradient(90deg, transparent, ${prim}60, transparent)` }} />
          <div className="absolute top-5 left-1/2 -translate-x-1/2 text-lg opacity-25">✦</div>
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-lg opacity-20">◇</div>
          <div className="absolute top-1/3 -left-8 w-16 h-16 border rotate-45 opacity-10" style={{ borderColor: prim }} />
          <div className="absolute bottom-1/3 -right-8 w-16 h-16 border rotate-45 opacity-10" style={{ borderColor: prim }} />
        </>
      )}

      {/* Neon glow rings + scanning line */}
      {tmpl === 'neon' && (
        <>
          <div className="absolute inset-0 opacity-8" style={{
            background: `radial-gradient(ellipse at 50% 30%, ${prim}40 0%, transparent 60%)`,
          }} />
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full border opacity-15 animate-pulse" style={{ borderColor: `${prim}50` }} />
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-32 h-32 rounded-full border opacity-10" style={{ borderColor: '#00d4ff40' }} />
          <div className="absolute top-6 left-6 w-12 h-0.5 opacity-25" style={{ background: `linear-gradient(90deg, ${prim}, transparent)`, transform: 'rotate(-45deg)' }} />
          <div className="absolute top-6 right-6 w-12 h-0.5 opacity-25" style={{ background: `linear-gradient(270deg, ${prim}, transparent)`, transform: 'rotate(45deg)' }} />
        </>
      )}

      {/* Clean subtle shadow */}
      {tmpl === 'clean' && (
        <>
          <div className="absolute top-0 left-0 right-0 h-[1px]" style={{ background: 'linear-gradient(90deg, transparent, rgba(0,0,0,0.06), transparent)' }} />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-12 h-[2px] rounded-full" style={{ background: 'rgba(0,0,0,0.08)' }} />
        </>
      )}

      {/* Tropical sun burst + leaves */}
      {tmpl === 'tropical' && (
        <>
          <div className="absolute -top-10 -right-10 w-40 h-40 opacity-15"
            style={{ background: `radial-gradient(circle, #ffdd00 0%, transparent 70%)` }} />
          <div className="absolute top-3 left-3 text-xl opacity-40">🌴</div>
          <div className="absolute top-3 right-3 text-xl opacity-40">🌺</div>
          <div className="absolute bottom-16 left-2 text-lg opacity-30">🌊</div>
          <div className="absolute bottom-16 right-2 text-lg opacity-30">☀️</div>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-16 h-0.5 rounded-full" style={{ background: `${prim}30` }} />
        </>
      )}

      {/* Tech digital grid + circuit dots */}
      {tmpl === 'tech' && (
        <>
          <div className="absolute inset-0 opacity-5"
            style={{ backgroundImage: `linear-gradient(${prim}20 1px, transparent 1px), linear-gradient(90deg, ${prim}20 1px, transparent 1px)`, backgroundSize: '24px 24px' }} />
          <div className="absolute top-5 left-6 w-16 h-0.5 opacity-20" style={{ background: prim, transform: 'rotate(35deg)' }} />
          <div className="absolute top-5 right-6 w-16 h-0.5 opacity-20" style={{ background: prim, transform: 'rotate(-35deg)' }} />
          <div className="absolute bottom-16 left-4 w-3 h-3 rounded-full border" style={{ borderColor: `${prim}30` }} />
          <div className="absolute bottom-20 right-5 w-2 h-2 rounded-full" style={{ background: `${prim}25` }} />
          <div className="absolute bottom-24 left-7 w-1 h-1 rounded-full" style={{ background: `${prim}20` }} />
        </>
      )}

      {/* Rustico twig + grain */}
      {tmpl === 'rustico' && (
        <>
          <div className="absolute inset-0 opacity-5"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='4' height='4' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1h1v1H1z' fill='%235c3d2e' fill-opacity='0.08'/%3E%3C/svg%3E")` }} />
          <div className="absolute top-4 left-5 text-lg opacity-30">🌿</div>
          <div className="absolute top-4 right-5 text-lg opacity-30">🍂</div>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-14 h-[1px]" style={{ background: `${prim}20` }} />
        </>
      )}

      {/* Pastel floating bubbles */}
      {tmpl === 'pastel' && (
        <>
          <div className="absolute top-4 right-4 w-6 h-6 rounded-full opacity-25" style={{ background: '#f48fb1' }} />
          <div className="absolute top-10 right-10 w-4 h-4 rounded-full opacity-20" style={{ background: '#ce93d8' }} />
          <div className="absolute top-6 left-8 w-5 h-5 rounded-full opacity-20" style={{ background: '#80cbc4' }} />
          <div className="absolute bottom-16 left-5 w-7 h-7 rounded-full opacity-15" style={{ background: '#f06292' }} />
          <div className="absolute bottom-20 right-6 w-3 h-3 rounded-full opacity-20" style={{ background: '#ba68c8' }} />
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-10 h-[2px] rounded-full" style={{ background: `${prim}20` }} />
        </>
      )}

      {/* Bold diagonal slash + heavy marks */}
      {tmpl === 'bold' && (
        <>
          <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: `linear-gradient(90deg, transparent, ${prim}70, transparent)` }} />
          <div className="absolute -top-8 -right-8 w-24 h-24 opacity-8 rotate-45" style={{ background: prim }} />
          <div className="absolute -bottom-8 -left-8 w-24 h-24 opacity-8 rotate-45" style={{ background: prim }} />
          <div className="absolute top-4 left-4 text-2xl font-black opacity-10">◆</div>
          <div className="absolute bottom-4 right-4 text-2xl font-black opacity-10">◆</div>
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-16 h-[2px]" style={{ background: `${prim}50` }} />
        </>
      )}

      {/* Noir venetian blinds + film grain */}
      {tmpl === 'noir' && (
        <>
          <div className="absolute inset-0 opacity-4"
            style={{ backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.03) 3px, rgba(255,255,255,0.03) 6px)` }} />
          <div className="absolute top-4 left-4 w-8 h-8 rounded-full border" style={{ borderColor: `${prim}15` }} />
          <div className="absolute top-8 right-6 w-0.5 h-10" style={{ background: `${prim}10` }} />
          <div className="absolute bottom-10 left-5 w-6 h-6 rotate-45 border" style={{ borderColor: `${prim}12` }} />
          <div className="absolute bottom-6 right-4 w-0.5 h-8" style={{ background: `${prim}10` }} />
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-10 h-[1px]" style={{ background: `${prim}15` }} />
        </>
      )}

      <div className="flex-1 flex flex-col items-center justify-center p-5 relative z-10">
        <div className="flex flex-col items-center gap-2 mb-3">
          {logoUrl ? (
            <img src={logoUrl} alt={tiendaNombre} className="w-14 h-14 rounded-full object-cover"
              style={{
                border: `2px solid ${dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.06)'}`,
                boxShadow: dark ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.06)',
              }} />
          ) : (
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold"
              style={{
                background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                color: dark ? '#ffffff' : '#0f172a',
                fontFamily: font,
                borderWidth: '2px',
                borderStyle: 'solid',
                borderColor: dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)',
              }}>
              {tiendaNombre.charAt(0).toUpperCase()}
            </div>
          )}
          <p className="text-[10px] font-semibold tracking-[0.15em] uppercase"
            style={{ color: sec, fontFamily: FONT_BASE, letterSpacing: '0.15em' }}>
            {tiendaNombre}
          </p>
        </div>

        {isOferta ? (
          <div className="w-full text-center space-y-3">
            {contenido.producto_imagen_url && (
              <div className="mx-auto max-w-[170px]">
                <img src={contenido.producto_imagen_url} alt={contenido.producto_nombre || ''}
                  className="w-full aspect-square object-cover rounded-2xl"
                  style={{ boxShadow: dark ? '0 8px 30px rgba(0,0,0,0.4)' : '0 8px 20px rgba(0,0,0,0.08)' }} />
              </div>
            )}
            <div>
              <h2 style={titleStyle}>
                {contenido.titulo || contenido.producto_nombre || 'Oferta Especial'}
              </h2>
              {contenido.descripcion && (
                <p className="text-xs mt-1 max-w-[260px] mx-auto leading-relaxed" style={{ color: sec, fontFamily: FONT_BASE }}>
                  {contenido.descripcion}
                </p>
              )}
            </div>
            {contenido.precio && (
              <div className="flex items-center justify-center gap-2">
                {hasOferta ? (
                  <>
                    <span className="text-sm line-through" style={{ color: sec, fontFamily: font }}>
                      RD$ {formatearPrecio(contenido.precio!)}
                    </span>
                    <span className="text-xl font-extrabold px-4 py-1 rounded-xl"
                      style={{
                        background: `${prim}18`,
                        color: prim,
                        border: `1px solid ${prim}35`,
                        fontFamily: font,
                      }}>
                      RD$ {formatearPrecio(contenido.precio_oferta!)}
                    </span>
                  </>
                ) : (
                  <span className="text-xl font-extrabold px-4 py-1 rounded-xl"
                    style={{
                      background: `${prim}15`,
                      color: prim,
                      border: `1px solid ${prim}30`,
                      fontFamily: font,
                    }}>
                    RD$ {formatearPrecio(contenido.precio)}
                  </span>
                )}
              </div>
            )}
            {contenido.cta_texto && (
              <button onClick={onCtaClick}
                className="px-7 py-2.5 rounded-xl font-bold text-xs transition-all"
                style={{
                  background: prim,
                  color: dark ? '#0a0a0f' : '#ffffff',
                  fontFamily: tmpl === 'bold' || tmpl === 'tech' ? font : FONT_BASE,
                  letterSpacing: tmpl === 'bold' ? '0.06em' : 'normal',
                  boxShadow: dark ? `0 4px 15px ${prim}40` : 'none',
                }}>
                {contenido.cta_texto}
              </button>
            )}
          </div>
        ) : (
          <div className="w-full text-center space-y-3">
            {contenido.icono_tipo && ICONOS_ANUNCIO[contenido.icono_tipo] && (
              <div className="text-4xl drop-shadow-lg">{ICONOS_ANUNCIO[contenido.icono_tipo]}</div>
            )}
            {contenido.miniatura_url && (
              <div className="mx-auto max-w-[100px]">
                <img src={contenido.miniatura_url} alt=""
                  className="w-full aspect-square object-cover rounded-2xl"
                  style={{ boxShadow: dark ? '0 8px 25px rgba(0,0,0,0.3)' : '0 4px 15px rgba(0,0,0,0.06)' }} />
              </div>
            )}
            <h2 style={titleStyle}>
              {contenido.titulo || 'Anuncio'}
            </h2>
            {contenido.mensaje && (
              <p className="text-xs leading-relaxed max-w-[260px] mx-auto" style={{ color: sec, fontFamily: FONT_BASE }}>
                {contenido.mensaje}
              </p>
            )}
            {contenido.cta_texto && (
              <button onClick={onCtaClick}
                className="px-7 py-2.5 rounded-xl font-bold text-xs transition-all"
                style={{
                  background: prim,
                  color: dark ? '#0a0a0f' : '#ffffff',
                  fontFamily: tmpl === 'bold' || tmpl === 'tech' ? font : FONT_BASE,
                  letterSpacing: tmpl === 'bold' ? '0.06em' : 'normal',
                  boxShadow: dark ? `0 4px 15px ${prim}40` : 'none',
                }}>
                {contenido.cta_texto}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export { ICONOS_ANUNCIO }

export default function CatalogoModal({ config, tiendaNombre, logoUrl, onClose, onRedirect }: Props) {
  const redirectUrl = config.url_redireccion
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  const handleClick = () => {
    if (redirectUrl) {
      onRedirect ? onRedirect(redirectUrl) : window.open(redirectUrl, '_blank')
    }
  }

  const handleCtaClick = () => {
    const contenido = config.contenido
    if (contenido?.tipo_contenido === 'oferta' && contenido.producto_id) {
      if (onRedirect) {
        onRedirect(`producto:${contenido.producto_id}`)
      }
    } else if (redirectUrl) {
      onRedirect ? onRedirect(redirectUrl) : window.open(redirectUrl, '_blank')
    }
  }

  return (
    <div className="fixed inset-0 z-50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className={`absolute inset-0 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
      <div className={`absolute bottom-0 left-0 right-0 h-[55vh] rounded-t-3xl overflow-hidden shadow-2xl transition-transform duration-500 ease-out ${visible ? 'translate-y-0' : 'translate-y-full'}`}
        onClick={redirectUrl ? handleClick : undefined}
        style={{ cursor: redirectUrl ? 'pointer' : 'default' }}>
        <PlantillaPreview config={config} tiendaNombre={tiendaNombre} logoUrl={logoUrl} onCtaClick={handleCtaClick} />
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full z-20"
          style={{ background: 'rgba(255,255,255,0.3)' }} />
        <button onClick={(e) => { e.stopPropagation(); onClose() }}
          className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center z-20"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}>
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export { PlantillaPreview }
