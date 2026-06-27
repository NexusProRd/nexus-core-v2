'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  return Uint8Array.from(raw.split('').map((c) => c.charCodeAt(0)))
}

async function getSwRegistration(scopePath = '/dashboard/', timeoutMs = 5000): Promise<ServiceWorkerRegistration> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const reg = await navigator.serviceWorker.getRegistration(scopePath)
    if (reg?.active) return reg
    await new Promise(r => setTimeout(r, 300))
  }
  throw new Error('Service Worker not ready after ' + timeoutMs + 'ms')
}

export function usePushStatus(idTienda?: string, options?: { apiPrefix?: string; scopePath?: string }) {
  const apiPrefix = options?.apiPrefix ?? '/api/push/subscribe'
  const scopePath = options?.scopePath ?? '/dashboard/'
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
      const reg = await getSwRegistration(scopePath)
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
  }, [scopePath])

  useEffect(() => {
    checkStatus()
  }, [checkStatus])

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') checkStatus()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [checkStatus])

  const subscribe = useCallback(async () => {
    if (isLoading) return
    setError(null)

    try {
      setIsLoading(true)

      const perm = await Notification.requestPermission()
      if (mountedRef.current) setPermission(perm)
      if (perm !== 'granted') {
        if (mountedRef.current) setIsLoading(false)
        return
      }

      let publicKey = ''
      const res = await fetch('/api/push/vapid-key', { signal: AbortSignal.timeout(5000) })
      if (res.ok) {
        const data = await res.json()
        publicKey = data.publicKey
      }
      if (!publicKey) {
        if (mountedRef.current) setIsLoading(false)
        return
      }

      const reg = await getSwRegistration(scopePath)
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as any,
      })

      const subRes = await fetch(apiPrefix, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(idTienda ? { id_tienda: idTienda } : {}),
          subscription: sub.toJSON(),
          user_agent: navigator.userAgent,
        }),
        signal: AbortSignal.timeout(8000),
      })
      if (!subRes.ok) {
        const body = await subRes.json().catch(() => ({}))
        throw new Error(body.error || `HTTP ${subRes.status}`)
      }

      if (mountedRef.current) {
        setIsLoading(false)
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
  }, [idTienda, isLoading, apiPrefix, scopePath])

  const unsubscribe = useCallback(async () => {
    if (isLoading) return
    setError(null)

    try {
      setIsLoading(true)

      const reg = await getSwRegistration(scopePath)
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        const endpoint = sub.endpoint
        await sub.unsubscribe()

        const delRes = await fetch(apiPrefix, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint }),
          signal: AbortSignal.timeout(8000),
        })
        if (!delRes.ok) {
          const body = await delRes.json().catch(() => ({}))
          throw new Error(body.error || `HTTP ${delRes.status}`)
        }
      }

      if (mountedRef.current) {
        setIsLoading(false)
        setSubscription(null)
        setIsSubscribed(false)
        setPermission((typeof window !== 'undefined' ? Notification.permission : 'unset'))
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      console.error('[Push] unsubscribe error:', msg)
      if (mountedRef.current) setError(msg)
    } finally {
      if (mountedRef.current) setIsLoading(false)
    }
  }, [isLoading, apiPrefix, scopePath])

  return {
    isSupported,
    isLoading,
    permission,
    subscription,
    isSubscribed,
    error,
    subscribe,
    unsubscribe,
    checkStatus,
    isDenied: permission === 'denied',
  }
}
