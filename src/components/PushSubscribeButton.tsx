'use client'

import { useState, useEffect, useCallback } from 'react'

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  return Uint8Array.from(raw.split('').map((c) => c.charCodeAt(0)))
}

export default function PushSubscribeButton({ idTienda }: { idTienda?: string }) {
  const [supported, setSupported] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !('PushManager' in window) || !('serviceWorker' in navigator)) {
      return
    }
    setSupported(true)

    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        setSubscribed(!!sub)
      })
    })
  }, [])

  const handleToggle = useCallback(async () => {
    if (!idTienda || loading) return
    setLoading(true)

    try {
      if (subscribed) {
        const reg = await navigator.serviceWorker.ready
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

        const permission = await Notification.requestPermission()
        if (permission !== 'granted') {
          setLoading(false)
          return
        }

        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey) as any,
        })

        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id_tienda: idTienda,
            subscription: sub.toJSON(),
            user_agent: navigator.userAgent,
          }),
        })
        setSubscribed(true)
      }
    } catch {
    } finally {
      setLoading(false)
    }
  }, [idTienda, subscribed, loading])

  if (!supported) return null

  return (
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
  )
}
