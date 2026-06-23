'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

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

export function usePushStatus(idTienda?: string) {
  const [isSupported, setIsSupported] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission | 'unset'>(
    typeof window !== 'undefined' ? Notification.permission : 'unset'
  )
  const [subscription, setSubscription] = useState<PushSubscriptionJSON | null>(null)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    return () => { mountedRef.current = false }
  }, [])

  const checkStatus = useCallback(async () => {
    if (typeof window === 'undefined' || !('PushManager' in window) || !('serviceWorker' in navigator)) {
      return
    }
    setIsSupported(true)
    setPermission(Notification.permission)

    try {
      const reg = await getSwRegistration()
      const sub = await reg.pushManager.getSubscription()
      if (mountedRef.current) {
        setSubscription(sub?.toJSON() ?? null)
        setIsSubscribed(!!sub && Notification.permission === 'granted')
      }
    } catch (e) {
      if (mountedRef.current) {
        setError('Service Worker no disponible')
      }
    }
  }, [])

  useEffect(() => {
    checkStatus()
  }, [checkStatus])

  const subscribe = useCallback(async () => {
    if (!idTienda || isLoading) return
    setIsLoading(true)
    setError(null)

    try {
      const perm = await Notification.requestPermission()
      if (mountedRef.current) setPermission(perm)
      if (perm !== 'granted') {
        setIsLoading(false)
        return
      }

      let publicKey = ''
      const res = await fetch('/api/push/vapid-key')
      if (res.ok) {
        const data = await res.json()
        publicKey = data.publicKey
      }
      if (!publicKey) {
        if (mountedRef.current) setIsLoading(false)
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

      if (mountedRef.current) {
        setSubscription(sub.toJSON())
        setIsSubscribed(true)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      console.error('[Push] subscribe error:', msg)
      if (mountedRef.current) setError(msg)
    } finally {
      if (mountedRef.current) setIsLoading(false)
    }
  }, [idTienda, isLoading])

  return {
    isSupported,
    isLoading,
    permission,
    subscription,
    isSubscribed,
    error,
    subscribe,
    isDenied: permission === 'denied',
  }
}
