'use client'

import { useEffect, useState, useCallback } from 'react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const STORAGE_KEY = 'nexus_install_cta_dismissed_at'
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000

export default function InstallAppButton({ variant = 'pill' }: { variant?: 'pill' | 'sidebar' }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [showModal, setShowModal] = useState(false)

  const isIOS = typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent || '') && !(window as any).MSStream

  useEffect(() => {
    if (typeof window === 'undefined') return

    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const time = parseInt(stored, 10)
      if (!isNaN(time) && Date.now() - time < COOLDOWN_MS) {
        setDismissed(true)
        return
      }
      localStorage.removeItem(STORAGE_KEY)
    }

    const check = () => {
      const mq = window.matchMedia('(display-mode: standalone)')
      if (mq.matches || (window.navigator as any).standalone) {
        setInstalled(true)
        localStorage.removeItem(STORAGE_KEY)
      }
    }

    check()

    window.addEventListener('focus', check)
    const onVisibility = () => { if (document.visibilityState === 'visible') check() }
    document.addEventListener('visibilitychange', onVisibility)

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)

    const installedHandler = () => {
      setInstalled(true)
      localStorage.removeItem(STORAGE_KEY)
    }
    window.addEventListener('appinstalled', installedHandler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', installedHandler)
      window.removeEventListener('focus', check)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const onDismiss = () => setDismissed(true)
    window.addEventListener('nexus-cta-dismiss', onDismiss)
    const onInstalled = () => {
      setInstalled(true)
      localStorage.removeItem(STORAGE_KEY)
    }
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      window.removeEventListener('nexus-cta-dismiss', onDismiss)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const handleClick = useCallback(async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setInstalled(true)
        localStorage.removeItem(STORAGE_KEY)
      }
      setDeferredPrompt(null)
    } else if (isIOS) {
      setShowModal(true)
    }
  }, [deferredPrompt, isIOS])

  if (installed || dismissed) return null

  const btnClass = variant === 'sidebar'
    ? 'flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200'
    : 'fixed bottom-20 left-4 right-4 z-50 max-w-md mx-auto flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold shadow-xl border transition-all active:scale-[0.98]'

  const style = variant === 'sidebar'
    ? { color: 'var(--text-muted)' }
    : { backgroundColor: 'var(--primary)', color: 'white', borderColor: 'color-mix(in srgb, var(--primary) 60%, transparent)' }

  return (
    <>
      <button onClick={handleClick} className={btnClass} style={style}
        onMouseEnter={e => { if (variant === 'sidebar') { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)' } }}
        onMouseLeave={e => { if (variant === 'sidebar') { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.backgroundColor = 'transparent' } }}>
        <svg className={variant === 'sidebar' ? 'w-4 h-4 shrink-0' : 'w-5 h-5 shrink-0'} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span className="flex-1">Instalar App</span>
        <span onClick={(e) => { e.stopPropagation(); setDismissed(true); localStorage.setItem(STORAGE_KEY, String(Date.now())); window.dispatchEvent(new CustomEvent('nexus-cta-dismiss')) }}
          className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-[10px] cursor-pointer transition-all"
          style={{ backgroundColor: variant === 'sidebar' ? 'transparent' : 'rgba(0,0,0,0.15)' }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.25)' }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = variant === 'sidebar' ? 'transparent' : 'rgba(0,0,0,0.15)' }}>
          ✕
        </span>
      </button>

      {showModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 animate-backdrop-in" onClick={() => setShowModal(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm rounded-2xl shadow-2xl border overflow-hidden animate-scale-in" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-light)' }} onClick={e => e.stopPropagation()}>
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Instalar Nexus App</h2>
                <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)' }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0" style={{ backgroundColor: 'var(--primary)', color: 'white' }}>1</div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Presiona <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: 'var(--bg-surface-hover)' }}><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>Compartir</span></p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>En la barra inferior de Safari</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0" style={{ backgroundColor: 'var(--primary)', color: 'white' }}>2</div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Desplázate y elige <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: 'var(--bg-surface-hover)' }}><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4h16v16H4z" /><path strokeLinecap="round" strokeLinejoin="round" d="M4 16h16" /></svg>Agregar a Inicio</span></p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Icono con el símbolo de más +</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0" style={{ backgroundColor: 'var(--primary)', color: 'white' }}>3</div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Toca <strong>Agregar</strong> en la esquina superior</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Confirma el nombre y la ubicación</p>
                  </div>
                </div>
              </div>

              <button onClick={() => setShowModal(false)}
                className="w-full mt-5 py-2.5 rounded-xl text-sm font-semibold transition-all" style={{ backgroundColor: 'var(--primary)', color: 'white' }}
                onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.1)' }}
                onMouseLeave={e => { e.currentTarget.style.filter = 'none' }}>
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
