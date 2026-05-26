'use client'

import { useEffect, useState, useCallback } from 'react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const STORAGE_KEY = 'nexus-pwa-dismissed'

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [show, setShow] = useState(false)
  const [installed, setInstalled] = useState(false)
  const isIOS = typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent || '') && !(window as any).MSStream

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mq = window.matchMedia('(display-mode: standalone)')
    if (mq.matches || (window.navigator as any).standalone) {
      setInstalled(true)
      return
    }

    const dismissed = localStorage.getItem(STORAGE_KEY)
    if (dismissed) {
      const time = parseInt(dismissed, 10)
      if (Date.now() - time < 7 * 24 * 60 * 60 * 1000) return
      localStorage.removeItem(STORAGE_KEY)
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShow(true)
    }
    window.addEventListener('beforeinstallprompt', handler)

    if (isIOS) {
      setShow(true)
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [isIOS])

  useEffect(() => {
    const handler = () => {
      setDeferredPrompt(null)
      setInstalled(true)
    }
    window.addEventListener('appinstalled', handler)
    return () => window.removeEventListener('appinstalled', handler)
  }, [])

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setShow(false)
    }
    setDeferredPrompt(null)
  }, [deferredPrompt])

  const handleDismiss = useCallback(() => {
    setShow(false)
    localStorage.setItem(STORAGE_KEY, String(Date.now()))
  }, [])

  if (installed || !show) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[60] max-w-md mx-auto animate-slide-up">
      <div className="rounded-2xl shadow-xl border p-4 flex items-center gap-3"
        style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-light)' }}>
        <div className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center text-lg"
          style={{ backgroundColor: `color-mix(in srgb, var(--primary) 15%, transparent)`, color: 'var(--primary)' }}>
          📲
        </div>
        <div className="flex-1 min-w-0">
          {isIOS && !deferredPrompt ? (
            <p className="text-sm font-medium leading-tight" style={{ color: 'var(--text-primary)' }}>
              Instala esta app en tu iPhone: toca <span className="inline-block px-1 rounded" style={{ backgroundColor: 'var(--bg-surface-hover)' }}>Compartir</span> → <span className="inline-block px-1 rounded" style={{ backgroundColor: 'var(--bg-surface-hover)' }}>Agregar a Inicio</span>
            </p>
          ) : (
            <p className="text-sm font-medium leading-tight" style={{ color: 'var(--text-primary)' }}>
              Instala esta app en tu dispositivo
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {!isIOS && deferredPrompt && (
            <button onClick={handleInstall}
              className="text-xs font-bold px-4 py-2 rounded-full transition-all"
              style={{ backgroundColor: 'var(--primary)', color: 'white' }}>
              Instalar
            </button>
          )}
          <button onClick={handleDismiss}
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)' }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}>
            ✕
          </button>
        </div>
      </div>
    </div>
  )
}
