'use client'

import { useEffect, useInsertionEffect } from 'react'

function resolveAppleTouchIcon(logoUrl?: string | null): string {
  if (logoUrl && !logoUrl.endsWith('.svg')) return logoUrl
  return '/pwa-icon-180.png'
}

export default function PwaRegister({ swUrl, manifestUrl, logoUrl, scope }: { swUrl: string; manifestUrl?: string; logoUrl?: string | null; scope?: string }) {
  const appleTouchIcon = resolveAppleTouchIcon(logoUrl)

  useInsertionEffect(() => {
    if (manifestUrl) {
      const existing = document.querySelector('link[rel="manifest"]')
      if (!existing) {
        const link = document.createElement('link')
        link.rel = 'manifest'
        link.href = manifestUrl
        document.head.appendChild(link)
      }
    }
    if (appleTouchIcon) {
      const existing = document.querySelector('link[rel="apple-touch-icon"]')
      if (existing) {
        existing.setAttribute('href', appleTouchIcon)
      } else {
        const link = document.createElement('link')
        link.rel = 'apple-touch-icon'
        link.sizes = '180x180'
        link.href = appleTouchIcon
        document.head.appendChild(link)
      }
    }
  }, [manifestUrl, appleTouchIcon])

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const reg of registrations) {
          if (new URL(reg.scope).pathname === '/') {
            reg.unregister()
          }
        }
      })
      navigator.serviceWorker.register(swUrl, scope ? { scope } : undefined).catch(() => {})
    }
  }, [swUrl, scope])

  return null
}
