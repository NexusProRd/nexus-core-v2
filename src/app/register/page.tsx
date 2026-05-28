'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

const WHATSAPP_FALLBACK = '18299999999'

function generarSlug(texto: string): string {
  return texto
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    || ''
}

export default function RegisterPage() {
  const [nombreSocio, setNombreSocio] = useState('')
  const [nombreTienda, setNombreTienda] = useState('')
  const [slug, setSlug] = useState('')
  const [slugManual, setSlugManual] = useState(false)
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')
  const [slugSuggestion, setSlugSuggestion] = useState('')
  const [telefono, setTelefono] = useState('')
  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [preguntas, setPreguntas] = useState([
    { pregunta: '', respuesta: '' },
    { pregunta: '', respuesta: '' },
    { pregunta: '', respuesta: '' },
  ])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState(false)
  const [codigo, setCodigo] = useState('')
  const [whatsappAdmin, setWhatsappAdmin] = useState(WHATSAPP_FALLBACK)
  const supabase = createClient()
  const checkRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase
        .from('nexus_config')
        .select('valor')
        .eq('clave', 'whatsapp_soporte')
        .maybeSingle()
      if (data?.valor) setWhatsappAdmin(data.valor)
    })()
  }, [])

  useEffect(() => {
    if (slugManual) return
    const nuevo = generarSlug(nombreTienda)
    setSlug(nuevo)
    if (nuevo) revisarSlug(nuevo)
  }, [nombreTienda, slugManual])

  const revisarSlug = useCallback(async (s: string) => {
    if (!s || s.length < 2) { setSlugStatus('idle'); return }
    setSlugStatus('checking')
    clearTimeout(checkRef.current)
    checkRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from('tiendas')
        .select('id')
        .eq('slug', s)
        .maybeSingle()
      if (data) {
        setSlugStatus('taken')
        const base = s.replace(/-\d+$/, '')
        let candidate = base
        let i = 1
        while (i < 20) {
          const { data: dup } = await supabase
            .from('tiendas')
            .select('id')
            .eq('slug', candidate)
            .maybeSingle()
          if (!dup) break
          i++
          candidate = `${base}-${i}`
        }
        setSlugSuggestion(candidate)
      } else {
        setSlugStatus('available')
      }
    }, 400)
  }, [supabase])

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = generarSlug(e.target.value)
    setSlug(val)
    setSlugManual(true)
    revisarSlug(val)
  }

  const aceptarSugerencia = () => {
    setSlug(slugSuggestion)
    setSlugStatus('available')
    setSlugSuggestion('')
  }

  const actualizarPregunta = (idx: number, campo: 'pregunta' | 'respuesta', valor: string) => {
    setPreguntas(prev => prev.map((p, i) => i === idx ? { ...p, [campo]: valor } : p))
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!slug.trim()) {
      setError('El slug de la tienda es obligatorio.')
      setLoading(false)
      return
    }

    if (slugStatus === 'taken') {
      setError('Ese slug ya está ocupado. Elige otro.')
      setLoading(false)
      return
    }

    if (password !== confirmar) {
      setError('Las contraseñas no coinciden.')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      setLoading(false)
      return
    }

    for (let i = 0; i < preguntas.length; i++) {
      if (!preguntas[i].pregunta.trim() || !preguntas[i].respuesta.trim()) {
        setError(`La pregunta ${i + 1} y su respuesta son obligatorias.`)
        setLoading(false)
        return
      }
    }

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre_socio: nombreSocio.trim(),
        nombre_tienda: nombreTienda.trim(),
        slug: slug.trim(),
        whatsapp: telefono.trim(),
        password,
        preguntas: preguntas.map(p => ({ pregunta: p.pregunta.trim(), respuesta: p.respuesta.trim() })),
      }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Error al registrar.')
      setLoading(false)
      return
    }

    setCodigo(data.codigo_verificacion)
    setExito(true)
    setLoading(false)
  }

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://nexus.app'

  if (exito) {
    const catalogoUrl = `${baseUrl}/c/${slug}`

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-blue-50 px-4 py-8">
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 max-w-lg w-full p-8 sm:p-10 text-center">
          <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-emerald-50 flex items-center justify-center">
            <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 mb-3">
            ¡Tu tienda está lista!
          </h1>

          <p className="text-slate-500 leading-relaxed mb-6">
            Ya puedes iniciar sesión y comenzar a configurar tu negocio.
            Tienes <strong className="text-slate-700">7 días de prueba gratuita</strong> para probar todas las funciones.
          </p>

          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 w-full px-6 py-3.5 bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-bold text-base rounded-2xl transition-all shadow-lg shadow-teal-500/25 hover:brightness-110 mb-6"
          >
            Iniciar Sesión
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-left space-y-2">
            <p className="text-xs text-amber-600 font-bold uppercase tracking-wide">⚠️ IMPORTANTE: GUARDA ESTE CÓDIGO</p>
            <p className="text-3xl font-bold text-amber-800 text-center tracking-widest py-2">{codigo}</p>
            <p className="text-sm text-amber-700">Este código es tu llave de recuperación. Sin él no podrás restablecer tu contraseña en el futuro. No lo compartas con nadie.</p>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 mb-6 text-left space-y-1.5 border border-slate-200">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Datos de tu tienda</p>
            <p className="text-sm text-slate-700"><span className="font-semibold">Socio:</span> {nombreSocio}</p>
            <p className="text-sm text-slate-700"><span className="font-semibold">Tienda:</span> {nombreTienda}</p>
            <p className="text-sm text-slate-700"><span className="font-semibold">Código de recuperación:</span> {codigo}</p>
            <p className="text-sm text-slate-700"><span className="font-semibold">WhatsApp:</span> {telefono}</p>
            <p className="text-sm text-slate-700"><span className="font-semibold">Tu catálogo:</span> {catalogoUrl}</p>
          </div>

          <p className="text-xs text-slate-400 mt-4">
            ¿Tienes dudas?{' '}
            <a href={`https://wa.me/${whatsappAdmin}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 font-semibold hover:underline">Contacta a soporte</a>
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* MOBILE EXPERIENCE PASS: Touch-friendly register form */}
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-blue-50 px-4 py-8">
      <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 max-w-md w-full p-6 sm:p-8">
        <div className="text-center mb-6 sm:mb-8">
          <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-lg">N</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Crear tu Tienda</h1>
          <p className="text-sm text-slate-500 mt-1">Regístrate para comenzar tu prueba gratis</p>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-5">
          <div>
            <label className="block text-slate-800 text-sm font-bold mb-1.5">Tu Nombre</label>
            <input
              type="text"
              value={nombreSocio}
              onChange={(e) => setNombreSocio(e.target.value)}
              className="w-full px-4 py-3 text-[16px] text-slate-900 bg-white placeholder:text-slate-400 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
              placeholder="Ej: Juan Pérez"
              required
              autoComplete="name"
            />
          </div>

          <div>
            <label className="block text-slate-800 text-sm font-bold mb-1.5">Nombre de tu Tienda</label>
            <input
              type="text"
              value={nombreTienda}
              onChange={(e) => setNombreTienda(e.target.value)}
              className="w-full px-4 py-3 text-[16px] text-slate-900 bg-white placeholder:text-slate-400 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
              placeholder="Ej: Mi Farmacia"
              required
            />
          </div>

          <div>
            <label className="block text-slate-800 text-sm font-bold mb-1.5">
              Enlace de tu tienda
              <span className="font-normal text-slate-400 ml-1">(tudominio.com/c/ tu-enlace)</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-sm text-slate-400 pointer-events-none">
                /c/
              </span>
              <input
                type="text"
                value={slug}
                onChange={handleSlugChange}
                onFocus={() => setSlugManual(true)}
                className="w-full pl-10 pr-10 py-3 text-[16px] text-slate-900 bg-white placeholder:text-slate-400 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                placeholder="mi-tienda"
                required
              />
              <span className="absolute inset-y-0 right-0 flex items-center pr-4">
                {slugStatus === 'checking' && <span className="text-xs text-slate-400 animate-pulse">...</span>}
                {slugStatus === 'available' && <span className="text-xs text-emerald-500">✓</span>}
                {slugStatus === 'taken' && <span className="text-xs text-rose-500">✕</span>}
              </span>
            </div>
            {slugStatus === 'taken' && slugSuggestion && (
              <p className="text-xs text-rose-500 mt-1">
                Slug no disponible. Sugerencia:{' '}
                <button type="button" onClick={aceptarSugerencia} className="font-bold underline hover:text-rose-700 py-1">
                  /c/{slugSuggestion}
                </button>
              </p>
            )}
            {slugStatus === 'available' && (
              <p className="text-xs text-emerald-500 mt-1">✓ Disponible</p>
            )}
          </div>

          <div>
            <label className="block text-slate-800 text-sm font-bold mb-1.5">Número de WhatsApp</label>
            <input
              type="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="w-full px-4 py-3 text-[16px] text-slate-900 bg-white placeholder:text-slate-400 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
              placeholder="+1 809 123 4567"
              required
              autoComplete="tel"
              inputMode="tel"
            />
          </div>

          <div className="border-t border-slate-200 pt-5">
            <p className="text-sm font-bold text-slate-800 mb-3">🔐 Preguntas de Seguridad</p>
            <p className="text-xs text-slate-500 mb-4">Estas preguntas permitirán verificar tu identidad si necesitas ayuda de soporte.</p>

            {[0, 1, 2].map(idx => (
              <div key={idx} className="mb-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Pregunta {idx + 1}</label>
                <input
                  type="text"
                  value={preguntas[idx].pregunta}
                  onChange={e => actualizarPregunta(idx, 'pregunta', e.target.value)}
                  className="w-full px-4 py-3 text-[16px] text-slate-900 bg-white placeholder:text-slate-400 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3 transition-shadow"
                  placeholder="Ej: ¿Cuál fue mi primera mascota?"
                  required
                />
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Respuesta</label>
                <input
                  type="text"
                  value={preguntas[idx].respuesta}
                  onChange={e => actualizarPregunta(idx, 'respuesta', e.target.value)}
                  className="w-full px-4 py-3 text-[16px] text-slate-900 bg-white placeholder:text-slate-400 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                  placeholder="Tu respuesta"
                  required
                />
              </div>
            ))}
          </div>

          <div>
            <label className="block text-slate-800 text-sm font-bold mb-1.5">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 text-[16px] text-slate-900 bg-white placeholder:text-slate-400 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
              placeholder="Mínimo 6 caracteres"
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>

          <div>
            <label className="block text-slate-800 text-sm font-bold mb-1.5">Confirmar Contraseña</label>
            <input
              type="password"
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              className="w-full px-4 py-3 text-[16px] text-slate-900 bg-white placeholder:text-slate-400 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
              placeholder="Repite la contraseña"
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-bold py-3.5 px-4 rounded-xl hover:brightness-110 disabled:opacity-50 transition-all shadow-lg shadow-teal-500/25 active:scale-[0.98] press-touch"
          >
            {loading ? 'Creando tienda...' : 'Crear Tienda'}
          </button>
        </form>

        <p className="text-sm text-slate-500 text-center mt-4">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="text-blue-600 font-semibold hover:underline">Inicia Sesión</Link>
        </p>
      </div>
    </div>
    </>
  )
}
