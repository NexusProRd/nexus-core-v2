export function getTiendaIdFromCookie(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(/(?:^|;\s*)nx_session=([^;]*)/)
  return match ? match[1] : null
}
