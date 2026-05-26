let cached: string | null | undefined

export async function getTiendaIdFromCookie(): Promise<string | null> {
  if (typeof document === 'undefined') return null
  if (cached !== undefined) return cached
  try {
    const res = await fetch('/api/auth/session-id')
    if (res.ok) {
      const data = await res.json()
      cached = data.tiendaId ?? null
      return cached!
    }
  } catch {}
  cached = null
  return null
}
