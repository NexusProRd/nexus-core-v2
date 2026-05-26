'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

function RecuperarForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''

  const [whatsappSoporte, setWhatsappSoporte] = useState('18299999999')
  const [paso, setPaso] = useState<'codigo' | 'password' | 'exito'>('codigo')

  useEffect(() => {
    const supabase = createClient()
    supabase.from('nexus_config').select('valor').eq('clave', 'whatsapp_soporte').maybeSingle().then(({ data }) => {
      if (data?.valor) setWhatsappSoporte(data.valor)
    })
  }, [])
  const [codigo, setCodigo] = useState('')
  const [nuevaPassword, setNuevaPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) setError('Enlace inválido. Solicita un nuevo enlace de recuperación.')
  }, [token])

  const handleVerificarCodigo = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/verificar-codigo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, codigo: codigo.trim().toUpperCase() }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Código incorrecto.')
      setLoading(false)
      return
    }

    setPaso('password')
    setLoading(false)
  }

  const handleCambiarPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (nuevaPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      setLoading(false)
      return
    }

    if (nuevaPassword !== confirmar) {
      setError('Las contraseñas no coinciden.')
      setLoading(false)
      return
    }

    const res = await fetch('/api/auth/verificar-codigo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, codigo: codigo.trim(), nueva_password: nuevaPassword }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Error al cambiar contraseña.')
      setLoading(false)
      return
    }

    setPaso('exito')
    setLoading(false)
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-blue-50 px-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-rose-50 flex items-center justify-center">
            <svg className="w-7 h-7 text-rose-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">Enlace inválido</h1>
          <p className="text-slate-500 text-sm">Este enlace no es válido o ya expiró. Contacta a soporte para recibir uno nuevo.</p>
        </div>
      </div>
    )
  }

  if (paso === 'exito') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-blue-50 px-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-emerald-50 flex items-center justify-center">
            <svg className="w-7 h-7 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">Contraseña restablecida</h1>
          <p className="text-slate-500 text-sm mb-6">Tu contraseña ha sido cambiada exitosamente.</p>
          <a href="/login" className="inline-block px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors">
            Iniciar Sesión
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-blue-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 max-w-md w-full p-8">
        <div className="text-center mb-6">
          <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-lg">N</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">
            {paso === 'codigo' ? 'Restablecer contraseña' : 'Nueva contraseña'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {paso === 'codigo' ? 'Ingresa tu código de verificación' : 'Escribe tu nueva contraseña'}
          </p>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl mb-4 text-sm">
            {error}
          </div>
        )}

        {paso === 'codigo' && (
          <form onSubmit={handleVerificarCodigo} className="space-y-4">
            <div>
              <label className="block text-slate-800 text-sm font-bold mb-1">Código de verificación</label>
              <input
                type="text"
                value={codigo}
                onChange={e => setCodigo(e.target.value)}
                className="w-full px-3 py-2.5 text-slate-900 bg-white placeholder:text-slate-400 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-2xl tracking-widest"
                placeholder="123456"
                required
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={loading || !codigo.trim()}
              className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-bold py-2.5 px-4 rounded-xl hover:brightness-110 disabled:opacity-50 transition-all shadow-lg shadow-teal-500/25"
            >
              {loading ? 'Verificando...' : 'Verificar código'}
            </button>

            <p className="text-xs text-slate-400 text-center mt-3">
              ¿Olvidaste tu código?{' '}
              <a href={`https://wa.me/${whatsappSoporte}?text=${encodeURIComponent('Hola, olvidé mi código de verificación. Necesito ayuda para recuperar mi cuenta.')}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 font-semibold hover:underline">
                Contacta a soporte
              </a>
            </p>
          </form>
        )}

        {paso === 'password' && (
          <form onSubmit={handleCambiarPassword} className="space-y-4">
            <div>
              <label className="block text-slate-800 text-sm font-bold mb-1">Nueva contraseña</label>
              <input
                type="password"
                value={nuevaPassword}
                onChange={e => setNuevaPassword(e.target.value)}
                className="w-full px-3 py-2.5 text-slate-900 bg-white placeholder:text-slate-400 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Mínimo 6 caracteres"
                required
                minLength={6}
                autoFocus
              />
            </div>

            <div>
              <label className="block text-slate-800 text-sm font-bold mb-1">Confirmar contraseña</label>
              <input
                type="password"
                value={confirmar}
                onChange={e => setConfirmar(e.target.value)}
                className="w-full px-3 py-2.5 text-slate-900 bg-white placeholder:text-slate-400 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Repite la contraseña"
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-bold py-2.5 px-4 rounded-xl hover:brightness-110 disabled:opacity-50 transition-all shadow-lg shadow-teal-500/25"
            >
              {loading ? 'Cambiando...' : 'Cambiar contraseña'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default function RecuperarPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-blue-50">
        <div className="animate-pulse text-slate-400">Cargando...</div>
      </div>
    }>
      <RecuperarForm />
    </Suspense>
  )
}
