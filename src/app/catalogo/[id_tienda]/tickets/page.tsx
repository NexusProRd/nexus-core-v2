'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { findGiftByCode } from './actions'

export default function TicketsPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const idTienda = params?.id_tienda as string
  const code = searchParams?.get('code') || ''

  const [state, setState] = useState<'loading' | 'invalid' | 'redirecting'>('loading')

  // Route legacy tickets link → /canje?gift=CODE&id=STORE
  useEffect(() => {
    if (!code) { setState('invalid'); return }
    if (!idTienda) { setState('invalid'); return }

    ;(async () => {
      const result = await findGiftByCode(code, idTienda)
      if (result.found) {
        setState('redirecting')
        window.location.href = `/canje?gift=${encodeURIComponent(code)}&id=${encodeURIComponent(idTienda)}`
      } else {
        setState('invalid')
      }
    })()
  }, [code, idTienda])

  if (state === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f3f1ee]">
        <div className="animate-pulse text-stone-400 text-sm tracking-wide">Abriendo tu regalo...</div>
      </div>
    )
  }

  if (state === 'redirecting') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f3f1ee]">
        <div className="animate-pulse text-stone-400 text-sm tracking-wide">Redirigiendo...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f3f1ee] p-4">
      <div className="max-w-md w-full text-center bg-white/90 backdrop-blur-xl rounded-[2.5rem] border border-stone-200 shadow-lg p-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-rose-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-stone-900 mb-2">Código inválido</h1>
        <p className="text-sm text-stone-500">El código ingresado no es válido o no pertenece a esta tienda.</p>
      </div>
    </div>
  )
}
