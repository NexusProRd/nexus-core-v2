'use client'

import { useState, useEffect, useCallback } from 'react'

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  return Uint8Array.from(raw.split('').map((c) => c.charCodeAt(0)))
}

async function getSwRegistration(scopePath = '/dashboard/', timeoutMs = 15000): Promise<ServiceWorkerRegistration> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const reg = await navigator.serviceWorker.getRegistration(scopePath)
    if (reg?.active) return reg
    await new Promise(r => setTimeout(r, 300))
  }
  throw new Error('Service Worker not ready after ' + timeoutMs + 'ms')
}

export default function PushSubscribeButton({ idTienda }: { idTienda?: string }) {
  const [supported, setSupported] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !('PushManager' in window) || !('serviceWorker' in navigator)) {
      return
    }
    setSupported(true)

    getSwRegistration().then((reg) => {
      console.log('[Push] SW ready, checking subscription')
      return reg.pushManager.getSubscription()
    }).then((sub) => {
      setSubscribed(!!sub)
    }).catch((e) => {
      console.warn('[Push] SW not available:', e.message)
      setError('Service Worker no disponible. Las notificaciones no funcionarán.')
    })
  }, [])

  const handleToggle = useCallback(async () => {
    if (!idTienda || loading) return
    setLoading(true)
    setError(null)

    try {
      if (subscribed) {
        const reg = await getSwRegistration()
        const sub = await reg.pushManager.getSubscription()
        if (sub) {
          await sub.unsubscribe()
          await fetch('/api/push/subscribe', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          })
        }
        setSubscribed(false)
      } else {
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') {
          setLoading(false)
          return
        }

        let publicKey = ''
        const res = await fetch('/api/push/vapid-key')
        if (res.ok) {
          const data = await res.json()
          publicKey = data.publicKey
        }
        if (!publicKey) {
          setLoading(false)
          return
        }

        const reg = await getSwRegistration()

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey) as any,
        })

        const subRes = await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id_tienda: idTienda,
            subscription: sub.toJSON(),
            user_agent: navigator.userAgent,
          }),
        })
        if (!subRes.ok) {
          const body = await subRes.json().catch(() => ({}))
          throw new Error(body.error || `HTTP ${subRes.status}`)
        }
        setSubscribed(true)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      console.error('[Push] subscribe error:', msg)
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [idTienda, subscribed, loading])

  if (!supported) return null

  return (
    <div>
      <button
        onClick={handleToggle}
        disabled={loading}
        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
        style={{ color: subscribed ? 'var(--primary)' : 'var(--text-muted)' }}
        onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }}
        onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = subscribed ? 'var(--primary)' : 'var(--text-muted)' }}>
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        <span className="flex-1">{subscribed ? 'Notificaciones activadas' : 'Activar notificaciones'}</span>
        {loading && <span className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--text-muted)', borderTopColor: 'transparent' }} />}
      </button>
      {error && (
        <p className="text-xs mt-1 px-3" style={{ color: '#ef4444' }}>{error}</p>
      )}
    </div>
  )
}
