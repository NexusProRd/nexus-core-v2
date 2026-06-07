'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { slugify } from '@/lib/slug'

const WHATSAPP_FALLBACK = '18299999999'

export default function RegisterPage() {
  const [nombreSocio, setNombreSocio] = useState('')
  const [nombreTienda, setNombreTienda] = useState('')
  const [telefono, setTelefono] = useState('')
  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState(false)
  const [codigo, setCodigo] = useState('')
  const [slugGenerado, setSlugGenerado] = useState('')
  const [redirectTo, setRedirectTo] = useState('/onboarding')
  const [copiado, setCopiado] = useState(false)
  const [whatsappAdmin, setWhatsappAdmin] = useState(WHATSAPP_FALLBACK)
  const supabase = createClient()

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

  function formatearTelefono(tel: string): string {
    const digits = tel.replace(/\D/g, '')
    if (digits.length === 10) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
    }
    if (digits.length === 11) {
      return `${digits[0]}-${digits.slice(1, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`
    }
    if (digits.length > 11) {
      return `+${digits.slice(0, digits.length - 10)} ${digits.slice(-10, -7)}-${digits.slice(-7, -4)}-${digits.slice(-4)}`
    }
    return tel
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

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

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre_socio: nombreSocio.trim(),
        nombre_tienda: nombreTienda.trim(),
        whatsapp: telefono.trim(),
        password,
      }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Error al registrar.')
      setLoading(false)
      return
    }

    setCodigo(data.codigo_verificacion)
    setSlugGenerado(data.slug || '')
    setRedirectTo(data.redirectTo || '/onboarding')
    setExito(true)
    setLoading(false)
  }

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || 'https://nexusrd.do')

  if (exito) {
    const catalogoUrl = `${baseUrl}/c/${slugGenerado}`

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
            Tu tienda ya está lista. Continúa para configurar tu negocio.
            Tienes <strong className="text-slate-700">30 días de prueba gratuita</strong> con el plan Emprendedor.
          </p>

          <Link
            href={redirectTo}
            className="inline-flex items-center justify-center gap-2 w-full px-6 py-3.5 bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-bold text-base rounded-2xl transition-all shadow-lg shadow-teal-500/25 hover:brightness-110 mb-6"
          >
            Ir a mi tienda
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>

          <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-5 mb-6 text-left space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">⚠️</span>
              <p className="text-xs text-amber-600 font-bold uppercase tracking-wide">GUARDA ESTE CÓDIGO EN UN LUGAR SEGURO</p>
            </div>
            <p className="text-3xl font-bold text-amber-800 text-center tracking-widest py-2 select-all">{codigo}</p>
            <p className="text-sm text-amber-700 leading-relaxed">
              Este código es tu llave de recuperación. Lo necesitarás para recuperar tu cuenta en caso de perder acceso.
              <strong className="text-amber-800"> No compartas este código con nadie.</strong>
            </p>
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(codigo)
                  setCopiado(true)
                  setTimeout(() => setCopiado(false), 2500)
                } catch {}
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-100 hover:bg-amber-200 active:bg-amber-300 text-amber-800 font-bold text-sm rounded-xl transition-colors"
            >
              {copiado ? (
                <>✅ Código copiado</>
              ) : (
                <>📋 Copiar código</>
              )}
            </button>
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
          <p className="text-sm text-slate-500 mt-1">30 días gratis · 15 productos · Sin tarjeta</p>
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
            {nombreTienda.trim() && (
              <p className="text-xs text-slate-400 mt-1">
                URL sugerida: <span className="text-slate-600 font-mono">/c/{slugify(nombreTienda)}</span>
              </p>
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
            {telefono.trim() && (
              <p className="text-xs text-slate-500 mt-1">
                📱 Este será tu número de acceso y el número que verán tus clientes.
                <br />
                <span className="text-slate-700 font-semibold">{formatearTelefono(telefono)}</span>
              </p>
            )}
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
