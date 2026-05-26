'use client'

import { useEffect } from 'react'

export default function PwaRegister({ swUrl, manifestUrl }: { swUrl: string; manifestUrl?: string }) {
  useEffect(() => {
    if (manifestUrl) {
      const existing = document.querySelector('link[rel="manifest"]')
      if (!existing) {
        const link = document.createElement('link')
        link.rel = 'manifest'
        link.href = manifestUrl
        document.head.appendChild(link)
      }
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register(swUrl).catch(() => {})
    }
  }, [swUrl, manifestUrl])

  return null
}
