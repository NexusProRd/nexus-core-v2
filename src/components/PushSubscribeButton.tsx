'use client'

import { useState, useEffect, useCallback } from 'react'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

export default function PushSubscribeButton({ apiPrefix = '/api/push/subscribe', idTienda: _idTienda }: { apiPrefix?: string; idTienda?: string }) {
  const [swReg, setSwReg] = useState<ServiceWorkerRegistration | null>(null)
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      return
    }
    navigator.serviceWorker.ready.then((reg) => {
      setSwReg(reg)
      reg.pushManager.getSubscription().then((sub) => {
        setSubscribed(!!sub)
      })
    })
  }, [])

  const subscribe = useCallback(async () => {
    if (!swReg) return
    setLoading(true)
    try {
      const sub = await swReg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as string,
      })
      await fetch(apiPrefix, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: sub.toJSON(),
          user_agent: navigator.userAgent,
        }),
      })
      setSubscribed(true)
    } catch (err) {
      console.error('[PushSubscribe] subscribe error', err)
    }
    setLoading(false)
  }, [swReg, apiPrefix])

  const unsubscribe = useCallback(async () => {
    if (!swReg) return
    setLoading(true)
    try {
      const sub = await swReg.pushManager.getSubscription()
      if (sub) {
        const endpoint = sub.endpoint
        await sub.unsubscribe()
        await fetch(apiPrefix, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint }),
        })
      }
      setSubscribed(false)
    } catch (err) {
      console.error('[PushSubscribe] unsubscribe error', err)
    }
    setLoading(false)
  }, [swReg, apiPrefix])

  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return null
  }

  return (
    <button
      onClick={subscribed ? unsubscribe : subscribe}
      disabled={loading || !swReg}
      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 border border-transparent transition-all duration-200 disabled:opacity-50"
    >
      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      </div>
      {loading ? '...' : subscribed ? 'Notificaciones ON' : 'Notificaciones OFF'}
    </button>
  )
}
