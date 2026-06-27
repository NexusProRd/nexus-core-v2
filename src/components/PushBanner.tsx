'use client'

import { useEffect, useState, useRef } from 'react'

const DISMISSED_KEY = 'push_banner_dismissed'

export default function PushBanner({ pushState }: { pushState: {
  isSupported: boolean
  isLoading: boolean
  permission: NotificationPermission | 'unset'
  isSubscribed: boolean
  isDenied: boolean
  subscribe: () => Promise<void>
  error: string | null
} }) {
  const [dismissed, setDismissed] = useState(true)
  const prevSubscribed = useRef(pushState.isSubscribed)

  useEffect(() => {
    const stored = typeof window !== 'undefined' && localStorage.getItem(DISMISSED_KEY)
    if (stored !== 'true') setDismissed(false)
  }, [])

  useEffect(() => {
    if (pushState.isSubscribed) {
      localStorage.removeItem(DISMISSED_KEY)
      setDismissed(true)
    } else if (prevSubscribed.current === true) {
      setDismissed(false)
    }
    prevSubscribed.current = pushState.isSubscribed
  }, [pushState.isSubscribed])

  useEffect(() => {
    if (pushState.permission === 'denied') setDismissed(false)
  }, [pushState.permission])

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, 'true')
    setDismissed(true)
  }

  if (!pushState.isSupported || dismissed || pushState.isSubscribed) return null

  return (
    <div className={`mx-4 mt-3 mb-1 px-4 py-3 rounded-xl text-sm flex items-start gap-3 animate-scale-in ${
      pushState.isDenied
        ? 'bg-amber-50 border border-amber-200 text-amber-900'
        : pushState.error
        ? 'bg-rose-50 border border-rose-200 text-rose-900'
        : 'bg-sky-50 border border-sky-200 text-sky-900'
    }`}>
      <span className="text-base mt-0.5 shrink-0">
        {pushState.isDenied ? '🔕' : pushState.error ? '⚠️' : '🔔'}
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold">
          {pushState.isDenied
            ? 'Notificaciones bloqueadas'
            : pushState.error
            ? 'Error al activar'
            : 'Activa las notificaciones'}
        </p>
        <p className="opacity-80 text-xs mt-0.5">
          {pushState.isDenied
            ? 'Cambia este permiso desde la configuración de tu navegador.'
            : pushState.error
            ? pushState.error
            : 'Recibe alertas de nuevos pedidos al instante, incluso con el panel cerrado.'}
        </p>
      </div>
      {!pushState.isDenied && (
        <button
          onClick={pushState.isLoading ? undefined : pushState.subscribe}
          disabled={pushState.isLoading}
          className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            pushState.error
              ? 'bg-rose-200 text-rose-800 hover:bg-rose-300'
              : 'bg-sky-200 text-sky-800 hover:bg-sky-300'
          } disabled:opacity-50`}
        >
          {pushState.isLoading ? 'Activando…' : 'Activar ahora'}
        </button>
      )}
      <button
        onClick={handleDismiss}
        className="shrink-0 p-1 rounded-lg hover:bg-black/10 transition-colors opacity-60 hover:opacity-100"
        aria-label="Descartar"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
