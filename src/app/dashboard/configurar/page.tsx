'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import PaletteSelector from '@/components/PaletteSelector'
import { getPalette, applyPalette } from '@/lib/palettes'
import { getTiendaIdFromCookie } from '@/lib/cookie-utils'
import { usePermisos } from '@/context/PermisosContext'
import { optimizarImagen } from '@/lib/image'

async function apiPerfil(method: 'GET' | 'POST', body?: any) {
  const res = await fetch('/api/perfil', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  return res.json()
}

async function apiTiendas(method: 'GET' | 'PATCH' | 'DELETE', body?: any) {
  const res = await fetch('/api/tiendas', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const errData = await res.json()
    throw new Error(errData.error || 'Error de red')
  }
  return res.json()
}

interface Perfil {
  id: string
  nombre_comercial: string | null
  slogan: string | null
  sobre_nosotros: string | null
  logo_url: string | null
  banner_url: string | null
  whatsapp_numero: string | null
  instagram: string | null
  facebook: string | null
  tiktok: string | null
  google_maps: string | null
  horario: string | null
  color_primario: string | null
  mensaje_bienvenida: string | null
  categorias: string | null
}

export default function ConfigurarPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [optimizing, setOptimizing] = useState(false)
  const [sobreNosotros, setSobreNosotros] = useState('')
  const [direccion, setDireccion] = useState('')
  const [rnc, setRnc] = useState('')
  const [slug, setSlug] = useState('')
  const [slugDisponible, setSlugDisponible] = useState<boolean | null>(null)
  const [slugSugerencias, setSlugSugerencias] = useState<string[]>([])
  const [slugVerificando, setSlugVerificando] = useState(false)
  const [paletteName, setPaletteName] = useState('elegante')
  const logoFileRef = useRef<File | null>(null)
  const slugTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Colaboradores
  const [colaboradores, setColaboradores] = useState<any[]>([])
  const [colNombre, setColNombre] = useState('')
  const [colWhatsapp, setColWhatsapp] = useState('')
  const [colPassword, setColPassword] = useState('')
  const [colPermisos, setColPermisos] = useState({ productos: true, pedidos: true, dashboard: true })
  const [colAgregando, setColAgregando] = useState(false)
  const [colError, setColError] = useState('')

  const router = useRouter()
  const supabase = createClient()
  const { esDueno } = usePermisos()

  useEffect(() => {
    cargarPerfil()
    cargarColaboradores()
  }, [])

  const cargarColaboradores = async () => {
    const sessionId = await getTiendaIdFromCookie()
    if (!sessionId) return
    try {
      const res = await fetch(`/api/colaboradores?id_tienda=${sessionId}`)
      if (res.ok) {
        const data = await res.json()
        setColaboradores(data)
      }
    } catch {}
  }

  const agregarColaborador = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!colNombre.trim() || !colWhatsapp.trim() || !colPassword.trim()) return
    setColAgregando(true)
    setColError('')

    const res = await fetch('/api/auth/register-colaborador', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_tienda: await getTiendaIdFromCookie(),
        nombre: colNombre.trim(),
        whatsapp: colWhatsapp.trim(),
        password: colPassword,
        permisos: colPermisos,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      setColError(data.error || 'Error al agregar')
    } else {
      setColNombre('')
      setColWhatsapp('')
      setColPassword('')
      setColPermisos({ productos: true, pedidos: true, dashboard: true })
      cargarColaboradores()
    }
    setColAgregando(false)
  }

  const toggleColaborador = async (id: string, activo: boolean) => {
    await fetch('/api/colaboradores', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, activo }),
    })
    cargarColaboradores()
  }

  const eliminarColaborador = async (id: string) => {
    await fetch(`/api/colaboradores?id=${id}`, { method: 'DELETE' })
    cargarColaboradores()
  }

  const cargarPerfil = async () => {
    setLoading(true)
    const sessionId = await getTiendaIdFromCookie()

    if (!sessionId) {
      router.push('/login')
      return
    }

    try {
      const { data: tienda } = await apiTiendas('GET')
      if (!tienda) {
        router.push('/onboarding')
        return
      }
      setDireccion(tienda.direccion || '')
      setRnc(tienda.rnc || '')
      setSlug(tienda.slug || '')
    } catch {
      router.push('/onboarding')
      return
    }

    const { perfil: perfilData } = await apiPerfil('GET')

    if (perfilData) {
      setPerfil(perfilData)
      if (perfilData.logo_url) setLogoPreview(perfilData.logo_url)
      if (perfilData.sobre_nosotros) setSobreNosotros(perfilData.sobre_nosotros)
      const config = perfilData.theme_config as { palette?: string } | null
      const loaded = config?.palette || 'elegante'
      setPaletteName(loaded)
      applyPalette(getPalette(loaded))
    }

    setLoading(false)
  }

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setOptimizing(true)
      try {
        const optimizedFile = await optimizarImagen(file, 300, 0.9)
        logoFileRef.current = optimizedFile
        const reader = new FileReader()
        reader.onloadend = () => {
          setLogoPreview(reader.result as string)
          setOptimizing(false)
        }
        reader.readAsDataURL(optimizedFile)
      } catch {
        setError('Error al optimizar el logo')
        setOptimizing(false)
      }
    }
  }

  const verificarSlug = (valor: string) => {
    if (slugTimeoutRef.current) clearTimeout(slugTimeoutRef.current)
    if (!valor.trim()) { setSlugDisponible(null); setSlugSugerencias([]); return }
    slugTimeoutRef.current = setTimeout(async () => {
      setSlugVerificando(true)
      try {
        const sessionId = await getTiendaIdFromCookie()
        const res = await fetch(`/api/slug?q=${encodeURIComponent(valor)}&excluir=${sessionId || ''}`)
        const data = await res.json()
        setSlugDisponible(data.disponible)
        setSlugSugerencias(data.sugerencias || [])
      } catch { setSlugDisponible(null) }
      setSlugVerificando(false)
    }, 400)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    const formData = new FormData(e.currentTarget)
    const sessionId = await getTiendaIdFromCookie()

    if (!sessionId) {
      router.push('/login')
      return
    }

    let logoUrl = perfil?.logo_url || null

    // Use refs for reliable file handling
    if (logoFileRef.current) {
      const storageClient = createClient()
      const fileName = `logos/${sessionId}/logo_${Date.now()}.webp`
      const { error: uploadError } = await storageClient.storage
        .from('img_products')
        .upload(fileName, logoFileRef.current)
      if (!uploadError) {
        const { data: urlData } = storageClient.storage.from('img_products').getPublicUrl(fileName)
        logoUrl = urlData.publicUrl
      }
    }

    const perfilRes = await apiPerfil('POST', {
      nombre_comercial: formData.get('nombre_comercial') as string,
      slogan: formData.get('slogan') as string || null,
      sobre_nosotros: sobreNosotros || null,
      whatsapp_numero: formData.get('whatsapp_numero') as string,
      instagram: formData.get('instagram') as string || null,
      facebook: formData.get('facebook') as string || null,
      tiktok: formData.get('tiktok') as string || null,
      google_maps: formData.get('google_maps') as string || null,
      horario: (formData.get('horario') as string) || null,
      color_primario: formData.get('color_primario') as string,
      mensaje_bienvenida: formData.get('mensaje_bienvenida') as string,
      logo_url: logoUrl,
      categorias: ((formData.get('categorias') as string) || '').split(',').map(c => c.trim()).filter(Boolean).join(', '),
      theme_config: { palette: paletteName },
    })
    if (perfilRes.error) {
      setError('Error al guardar: ' + perfilRes.error)
      setSaving(false)
      return
    }

    try {
      await apiTiendas('PATCH', { direccion, rnc, slug: slug || null })
      setSuccess('¡Configuración guardada correctamente!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (e: any) {
      setError('Error al guardar datos fiscales: ' + (e.message || 'Error desconocido'))
    }

    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                Configuración
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Ajustes de tienda, cuenta y configuraciones técnicas</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto py-4 sm:py-6 px-4 overflow-x-hidden">
        {error && (
          <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 px-4 py-3 rounded-xl text-sm mb-4">{error}</div>
        )}
        {success && (
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 px-4 py-3 rounded-xl text-sm mb-4">{success}</div>
        )}

        <div className="bg-white dark:bg-slate-800/40 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* ===== AJUSTES DE TIENDA ===== */}
            <div className="flex items-center gap-2 pb-1">
              <div className="w-1.5 h-6 rounded-full bg-[var(--primary)]/60" />
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest">Ajustes de Tienda</h3>
            </div>

            {/* ===== PERFIL DE MARCA ===== */}
            <div className="border-b border-slate-200 pb-1">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">Perfil de Marca</h3>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">Logo de la Tienda</label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-xl border border-slate-200 dark:border-slate-700 shrink-0" />
                ) : (
                  <div                 className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center shrink-0">
                    <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--primary)]/5 text-[var(--primary)] rounded-xl hover:bg-violet-100 transition-colors text-sm font-medium">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {logoPreview ? 'Cambiar logo' : 'Subir logo'}
                  <input type="file" name="logo" accept="image/*" onChange={handleLogoChange} disabled={optimizing} className="hidden" />
                </label>
                {optimizing && <p className="text-xs text-[var(--primary)]">Optimizando...</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">Nombre Comercial</label>
              <input type="text" name="nombre_comercial" defaultValue={perfil?.nombre_comercial || ''}
                className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800/60 text-sm" />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">Link Personalizado</label>
              <div className="flex items-center gap-1.5 sm:gap-2 px-3 py-2.5 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-500">
                <span className="shrink-0 hidden sm:inline">{typeof window !== 'undefined' ? window.location.origin : ''}/c/</span>
                <span className="shrink-0 sm:hidden">/c/</span>
                <input type="text" value={slug} onChange={e => { setSlug(e.target.value); verificarSlug(e.target.value) }}
                  className="flex-1 bg-transparent outline-none text-slate-900 font-medium min-w-0" placeholder="mi-tienda" />
                {slugVerificando && <svg className="w-4 h-4 animate-spin text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>}
                {!slugVerificando && slug && slugDisponible === true && <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                {!slugVerificando && slug && slugDisponible === false && <svg className="w-4 h-4 text-rose-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>}
              </div>
              {slug && slugDisponible === false && slugSugerencias.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-rose-600 mb-1">No disponible. Sugerencias:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {slugSugerencias.map(s => (
                      <button key={s} type="button" onClick={() => { setSlug(s); verificarSlug(s) }}
                        className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-[var(--primary)]/10 hover:text-[var(--primary)] rounded-lg transition-colors font-medium text-slate-600">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-xs text-slate-400 mt-1">Ej: tu-tienda → /c/tu-tienda</p>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">Slogan</label>
              <input type="text" name="slogan" defaultValue={perfil?.slogan || ''} maxLength={60}
                className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800/60 text-sm" placeholder="Tu lema aquí..." />
              <p className="text-xs text-slate-400 mt-1">Máximo 60 caracteres</p>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">Categorías de la Tienda (Separadas por comas)</label>
              <input type="text" name="categorias" defaultValue={perfil?.categorias || ''} className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800/60 text-sm" placeholder="Ej: Ramos, Cajas, Cumpleaños, Globos" />
              <p className="text-xs text-slate-400 mt-1">Escribe las categorías de tu negocio separadas por comas (,)</p>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">Sobre Nosotros</label>
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-[var(--primary)]">
                <div className="flex gap-1 px-3 py-2 bg-white dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
                  <button type="button" onClick={() => setSobreNosotros(prev => prev + '<strong></strong>')}
                    className="px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded transition-colors">B</button>
                  <button type="button" onClick={() => setSobreNosotros(prev => prev + '<em></em>')}
                    className="px-2 py-1 text-xs italic text-slate-600 hover:bg-slate-200 rounded transition-colors">I</button>
                  <button type="button" onClick={() => {
                    const ta = document.getElementById('sobre-nosotros') as HTMLTextAreaElement
                    const s = ta?.selectionStart || 0; const e = ta?.selectionEnd || 0
                    const sel = sobreNosotros.substring(s, e)
                    if (sel) setSobreNosotros(`${sobreNosotros.substring(0, s)}<strong>${sel}</strong>${sobreNosotros.substring(e)}`)
                  }}
                    className="px-2 py-1 text-xs text-slate-600 hover:bg-slate-200 rounded transition-colors"><strong>B</strong> (sel)</button>
                </div>
                <textarea id="sobre-nosotros" value={sobreNosotros} onChange={e => setSobreNosotros(e.target.value)} rows={5}
                  className="w-full px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 outline-none resize-none" placeholder="Cuenta tu historia..." />
              </div>
              <p className="text-xs text-slate-400 mt-1">Usa &lt;strong&gt;, &lt;em&gt; para formato</p>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">WhatsApp</label>
              <input type="tel" name="whatsapp_numero" defaultValue={perfil?.whatsapp_numero || ''}
                className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800/60 text-sm" />
              <p className="text-xs text-slate-400 mt-1">Incluye código de país. Tus clientes te contactarán aquí.</p>
            </div>

            {/* ===== CONFIGURACIONES TÉCNICAS ===== */}
            <div className="flex items-center gap-2 pb-1 pt-4">
              <div className="w-1.5 h-6 rounded-full bg-slate-400/40" />
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest">Configuraciones Técnicas</h3>
            </div>

            {/* ===== APARIENCIA ===== */}
            <div className="border-b border-slate-200 pb-1 pt-2">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">Apariencia</h3>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-3">Paleta de Colores</label>
              <PaletteSelector value={paletteName} onChange={(name) => {
                setPaletteName(name)
                applyPalette(getPalette(name))
              }} />
            </div>

            <details className="group">
              <summary className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer font-medium transition-colors list-none">
                <span className="group-open:hidden">▼ Color personalizado (avanzado)</span>
                <span className="hidden group-open:inline">▲ Ocultar</span>
              </summary>
              <div className="mt-3">
                <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">Color Principal (manual)</label>
                <div className="flex items-center gap-3">
                  <input type="color" name="color_primario" defaultValue={perfil?.color_primario || '#3B82F6'}
                    className="w-12 h-12 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer shrink-0"
                    onChange={e => { const inp = document.querySelector<HTMLInputElement>('input[name="color_primario_hex"]'); if (inp) inp.value = e.target.value }} />
                  <input type="text" name="color_primario_hex" defaultValue={perfil?.color_primario || '#3B82F6'}
                    className="flex-1 px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800/60 text-sm"
                    onChange={e => { const inp = document.querySelector<HTMLInputElement>('input[type="color"][name="color_primario"]'); if (inp) inp.value = e.target.value }} />
                </div>
              </div>
            </details>

            <div>
              <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">Mensaje de Bienvenida</label>
              <textarea name="mensaje_bienvenida" defaultValue={perfil?.mensaje_bienvenida || '¡Bienvenido a nuestra tienda!'} rows={3}
                className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800/60 text-sm" />
            </div>

            {/* ===== REDES SOCIALES ===== */}
            <div className="border-b border-slate-200 pb-1 pt-2">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">Redes Sociales</h3>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">Instagram</label>
                <input type="url" name="instagram" defaultValue={perfil?.instagram || ''}
                  className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800/60 text-sm" placeholder="https://instagram.com/tutienda" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">Facebook</label>
                <input type="url" name="facebook" defaultValue={perfil?.facebook || ''}
                  className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800/60 text-sm" placeholder="https://facebook.com/tutienda" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">TikTok</label>
                <input type="url" name="tiktok" defaultValue={perfil?.tiktok || ''}
                  className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800/60 text-sm" placeholder="https://tiktok.com/@tutienda" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">Ubicación (Google Maps)</label>
                <input type="url" name="google_maps" defaultValue={perfil?.google_maps || ''}
                  className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800/60 text-sm" placeholder="https://maps.google.com/?q=..." />
              </div>
            </div>

            {/* ===== DATOS FISCALES ===== */}
            <div className="border-b border-slate-200 pb-1 pt-2">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">Datos Fiscales</h3>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">Dirección de la Tienda</label>
              <input type="text" value={direccion} onChange={e => setDireccion(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800/60 text-sm"
                placeholder="Calle Principal #123, Ciudad" />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">RNC (Opcional)</label>
              <input type="text" value={rnc} onChange={e => setRnc(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800/60 text-sm"
                placeholder="000-00000-0" />
            </div>

            {/* ===== HORARIOS ===== */}
            <div className="border-b border-slate-200 pb-1 pt-2">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">Horarios</h3>
            </div>

            <div>
              <textarea name="horario" defaultValue={perfil?.horario || ''} rows={4}
                className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800/60 text-sm resize-none"
                placeholder={`Lunes a Viernes: 9:00 AM - 6:00 PM\nSábado: 9:00 AM - 2:00 PM\nDomingo: Cerrado`} />
            </div>

            <button type="submit" disabled={saving || optimizing}
              className="w-full bg-[var(--primary)] text-white font-semibold py-2.5 px-4 rounded-xl hover:brightness-110 transition-colors disabled:opacity-50 text-sm">
              {saving ? 'Guardando...' : 'Guardar Configuración'}
            </button>
          </form>
        </div>

        {/* ===== CUENTA ===== */}
        <div className="flex items-center gap-2 pb-1 pt-6">
          <div className="w-1.5 h-6 rounded-full bg-blue-500/50" />
          <h3 className="text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest">Cuenta</h3>
        </div>

        {esDueno && <div className="mt-3 bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">Colaboradores</h3>
          </div>

          <div className="space-y-3">
            {colaboradores.length === 0 ? (
              <p className="text-sm text-slate-400">Sin colaboradores aún</p>
            ) : (
              colaboradores.map(c => (
                <div key={c.id} className="flex items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{c.nombre}</p>
                    <p className="text-xs text-slate-400">{c.whatsapp_num}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {Object.entries(c.permisos || {}).filter(([,v]) => v).map(([k]) => k).join(', ')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => toggleColaborador(c.id, !c.activo)}
                      className={`text-[11px] font-bold px-2.5 py-1.5 rounded-lg border transition-colors ${
                        c.activo
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                      }`}>
                      {c.activo ? 'Activo' : 'Inactivo'}
                    </button>
                    <button onClick={() => eliminarColaborador(c.id)}
                      className="text-[11px] font-bold px-2.5 py-1.5 bg-rose-50 text-rose-600 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors">
                      Eliminar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <details className="group">
            <summary className="text-sm font-semibold text-blue-600 dark:text-blue-400 cursor-pointer hover:text-blue-700 list-none flex items-center gap-1">
              <span className="group-open:hidden">+</span>
              <span className="hidden group-open:inline">−</span>
              Agregar Colaborador
            </summary>
            <form onSubmit={agregarColaborador} className="mt-3 space-y-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <input type="text" value={colNombre} onChange={e => setColNombre(e.target.value)}
                placeholder="Nombre del colaborador" required
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 outline-none" />
              <input type="tel" value={colWhatsapp} onChange={e => setColWhatsapp(e.target.value)}
                placeholder="WhatsApp" required
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 outline-none" />
              <input type="password" value={colPassword} onChange={e => setColPassword(e.target.value)}
                placeholder="Contraseña" required minLength={6}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 outline-none" />
              <div>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Permisos:</p>
                <div className="flex flex-wrap gap-3">
                  {[
                    { key: 'productos', label: 'Productos' },
                    { key: 'pedidos', label: 'Pedidos' },
                    { key: 'dashboard', label: 'Dashboard' },
                  ].map(p => (
                    <label key={p.key} className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input type="checkbox" checked={colPermisos[p.key as keyof typeof colPermisos]}
                        onChange={e => setColPermisos(prev => ({ ...prev, [p.key]: e.target.checked }))}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
                      {p.label}
                    </label>
                  ))}
                </div>
              </div>
              {colError && <p className="text-xs text-rose-600">{colError}</p>}
              <button type="submit" disabled={colAgregando}
                className="w-full py-2 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {colAgregando ? 'Agregando...' : 'Agregar Colaborador'}
              </button>
            </form>
          </details>
        </div>}

        <div className="mt-8 bg-white dark:bg-slate-900 rounded-2xl border-2 border-rose-200 dark:border-rose-900/50 p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <h3 className="text-sm font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wide">Zona de Peligro</h3>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Cerrar Sesión</p>
              <p className="text-xs text-slate-500">Sal de tu cuenta de forma segura.</p>
            </div>
            <button onClick={() => { document.cookie = 'nx_session=; path=/; max-age=0'; router.push('/login') }}
              className="px-5 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-bold hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors shrink-0">
              Cerrar Sesión
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-rose-50 dark:bg-rose-900/10 rounded-xl border border-rose-100 dark:border-rose-900/30">
            <div>
              <p className="text-sm font-bold text-rose-700 dark:text-rose-300">Eliminar mi Tienda</p>
              <p className="text-xs text-rose-500">Destruye permanentemente tu tienda y todos sus datos.</p>
            </div>
            <button onClick={() => {
              const modal = document.getElementById('modal-eliminar-tienda') as HTMLDialogElement
              if (modal) { modal.showModal ? modal.showModal() : modal.setAttribute('open', '') }
            }}
              className="px-5 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-bold hover:bg-rose-700 transition-colors shrink-0">
              Eliminar mi Tienda
            </button>
          </div>
        </div>

        <dialog id="modal-eliminar-tienda" className="bg-transparent backdrop:bg-black/60 p-0 rounded-2xl max-w-md w-full open:flex">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 w-full space-y-4">
            <div className="text-center">
              <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center">
                <span className="text-2xl">⚠️</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">¿Eliminar tu tienda para siempre?</h3>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                ¡Atención! Esta acción es completamente irreversible. Borrar tu tienda eliminará de forma permanente todos tus productos, configuraciones, imágenes y tickets asociados en la base de datos de Nexus Core.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => {
                const modal = document.getElementById('modal-eliminar-tienda') as HTMLDialogElement
                if (modal) { modal.close ? modal.close() : modal.removeAttribute('open') }
              }}
                className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                Cancelar
              </button>
              <button onClick={async () => {
                const sessionId = await getTiendaIdFromCookie()
                if (!sessionId) return
                try {
                  await apiTiendas('DELETE')
                  const modal = document.getElementById('modal-eliminar-tienda') as HTMLDialogElement
                  if (modal) { modal.close ? modal.close() : modal.removeAttribute('open') }
                  router.push('/onboarding')
                } catch {}
              }}
                className="flex-1 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-bold hover:bg-rose-700 transition-colors shadow-sm">
                Sí, eliminar todo
              </button>
            </div>
          </div>
        </dialog>

      </main>
    </div>
  )
}