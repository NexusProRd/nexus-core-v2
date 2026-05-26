'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function PccLoginPage() {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim()) { setError('Ingresa la contraseña'); return }
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/pcc-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: password.trim() }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Error al iniciar sesión')
      setLoading(false)
      return
    }

    router.push('/pcc')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 px-4">
      <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl shadow-indigo-900/20 max-w-md w-full p-8 border border-white/10">
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <span className="text-white font-bold text-xl">N</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">PCC</h1>
          <p className="text-sm text-slate-500 mt-1">Panel de Control Central — Nexus</p>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl mb-4 text-sm">{error}</div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Contraseña</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="••••••••" autoFocus />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold rounded-xl hover:brightness-110 disabled:opacity-50 transition-all shadow-lg shadow-indigo-500/20">
            {loading ? 'Ingresando...' : 'Ingresar al PCC'}
          </button>
        </form>
      </div>
    </div>
  )
}
