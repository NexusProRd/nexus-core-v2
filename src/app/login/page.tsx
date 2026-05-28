'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const [whatsapp, setWhatsapp] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [whatsappSoporte, setWhatsappSoporte] = useState('18299999999')
  const router = useRouter()

  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotMsg, setForgotMsg] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.from('nexus_config').select('valor').eq('clave', 'whatsapp_soporte').maybeSingle().then(({ data }) => {
      if (data?.valor) setWhatsappSoporte(data.valor)
    })
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const digits = whatsapp.replace(/\D/g, '')
    if (digits.length < 10) {
      setError('Ingresa un número de WhatsApp válido.')
      setLoading(false)
      return
    }

    if (!password.trim()) {
      setError('Ingresa tu contraseña.')
      setLoading(false)
      return
    }

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ whatsapp: whatsapp.trim(), password }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Error al iniciar sesión.')
      setLoading(false)
      return
    }

    router.push(data.redirectTo || '/dashboard')
  }

  const handleForgotPassword = async () => {
    const digits = whatsapp.replace(/\D/g, '')
    if (digits.length < 10) {
      setError('Ingresa tu número de WhatsApp primero.')
      return
    }

    setForgotLoading(true)
    setError('')
    setForgotMsg('')

    const res = await fetch('/api/auth/solicitar-cambio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ whatsapp: whatsapp.trim() }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Error al solicitar cambio.')
      setForgotLoading(false)
      return
    }

    setForgotMsg(`Solicitud enviada. Contacta a soporte para continuar.`)
    setForgotLoading(false)

    const mensaje = encodeURIComponent(
      `Hola, soy ${data.nombre_tienda}. Solicito restablecer mi contraseña.`
    )
    window.open(`https://wa.me/${whatsappSoporte}?text=${mensaje}`, '_blank')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-blue-50 px-4">
      {/* MOBILE EXPERIENCE PASS: Touch-friendly form spacing and inputs */}
      <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 max-w-md w-full p-6 sm:p-8">
        <div className="text-center mb-6 sm:mb-8">
          <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-lg">N</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Iniciar Sesión</h1>
          <p className="text-sm text-slate-500 mt-1">Accede a tu panel de control</p>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl mb-4 text-sm">
            {error}
          </div>
        )}

        {forgotMsg && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-xl mb-4 text-sm">
            {forgotMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-slate-800 text-sm font-bold mb-1.5">Número de WhatsApp</label>
            <input
              type="tel"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              className="w-full px-4 py-3 text-[16px] text-slate-900 bg-white placeholder:text-slate-400 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
              placeholder="+1 809 123 4567"
              required
              autoComplete="tel"
              inputMode="tel"
            />
          </div>

          <div>
            <label className="block text-slate-800 text-sm font-bold mb-1.5">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 text-[16px] text-slate-900 bg-white placeholder:text-slate-400 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
              placeholder="Tu contraseña"
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-bold py-3.5 px-4 rounded-xl hover:brightness-110 disabled:opacity-50 transition-all shadow-lg shadow-teal-500/25 active:scale-[0.98]"
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>

        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={handleForgotPassword}
            disabled={forgotLoading}
            className="text-sm text-slate-500 hover:text-blue-600 underline transition-colors disabled:opacity-50 py-2 touch-target"
          >
            {forgotLoading ? 'Enviando...' : '¿Olvidaste tu contraseña? Contacta a soporte técnico'}
          </button>
        </div>

        <p className="text-sm text-slate-500 text-center mt-5">
          ¿No tienes cuenta?{' '}
          <Link href="/register" className="text-blue-600 font-semibold hover:underline py-2">Regístrate aquí</Link>
        </p>
      </div>
    </div>
  )
}
