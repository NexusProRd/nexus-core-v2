'use client'

import { useEffect, useInsertionEffect } from 'react'

export default function PwaRegister({ swUrl, manifestUrl }: { swUrl: string; manifestUrl?: string }) {
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
  }, [manifestUrl])

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register(swUrl).catch(() => {})
    }
  }, [swUrl])

  return null
}
