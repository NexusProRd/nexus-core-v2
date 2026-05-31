'use client'

import { useEffect, useInsertionEffect } from 'react'

function resolveAppleTouchIcon(logoUrl?: string | null): string {
  if (logoUrl && !logoUrl.endsWith('.svg')) return logoUrl
  return '/pwa-icon-180.png'
}

export default function PwaRegister({ swUrl, manifestUrl, logoUrl }: { swUrl: string; manifestUrl?: string; logoUrl?: string | null }) {
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
      if (!existing) {
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
      navigator.serviceWorker.register(swUrl).catch(() => {})
    }
  }, [swUrl])

  return null
}
