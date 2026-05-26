'use client'

import { useState } from 'react'

export default function CopiarEnlace({ url }: { url: string }) {
  const [copiado, setCopiado] = useState(false)

  const copiar = () => {
    navigator.clipboard.writeText(url)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  return (
    <button
      onClick={copiar}
      className="inline-flex items-center gap-1.5 bg-white text-slate-700 text-sm font-medium px-5 py-2.5 rounded-full border border-slate-200 hover:bg-slate-50 transition-all shadow-sm"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
      {copiado ? '¡Copiado!' : 'Copiar'}
    </button>
  )
}