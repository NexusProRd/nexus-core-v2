'use client'

import { useState, useEffect, useCallback } from 'react'

interface Toast {
  name: string
  product: string
  id: number
}

const firstNames = ['Ana', 'Carlos', 'María', 'Luis', 'Sofía', 'Pedro', 'Valentina', 'Andrés', 'Camila', 'Diego']

export default function SocialToast({ productNames }: { productNames: string[] }) {
  const [toast, setToast] = useState<Toast | null>(null)
  const [visible, setVisible] = useState(false)

  const showRandom = useCallback(() => {
    if (productNames.length === 0) return
    const name = firstNames[Math.floor(Math.random() * firstNames.length)]
    const product = productNames[Math.floor(Math.random() * productNames.length)]
    setToast({ name, product, id: Date.now() })
    setVisible(true)
    setTimeout(() => setVisible(false), 4000)
  }, [productNames])

  useEffect(() => {
    const interval = setInterval(() => {
      if (!visible) showRandom()
    }, 15000 + Math.random() * 10000)
    return () => clearInterval(interval)
  }, [showRandom, visible])

  if (!toast) return null

  return (
    <div
      className={`fixed bottom-24 left-4 z-50 max-w-[280px] transition-all duration-500 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
    >
      <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-100 px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm">
          {toast.name[0]}
        </div>
        <p className="text-xs text-slate-700 leading-relaxed">
          <span className="font-semibold text-slate-900">{toast.name}</span> acaba de comprar{' '}
          <span className="font-medium text-[var(--primary)]">{toast.product}</span>
        </p>
      </div>
    </div>
  )
}
