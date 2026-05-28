import { verifySessionToken } from './session'

export type SessionResult = {
  valid: boolean
  tiendaId?: string
  legacy?: boolean
}

// LEGACY COMPATIBILITY: detect raw UUID format used before signed tokens
function isLegacySessionFormat(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

function parseCookie(cookieHeader: string, name: string): string | undefined {
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`))
  return match?.[1] || undefined
}

export async function getSessionFromCookieValue(
  session: string | undefined
): Promise<SessionResult> {
  if (!session) return { valid: false }

  // Try signed token (contains ".")
  if (session.includes('.')) {
    const result = await verifySessionToken(session)
    if (result.valid && result.tiendaId) {
      return { valid: true, tiendaId: result.tiendaId, legacy: false }
    }
  }

  // LEGACY COMPATIBILITY: fallback to raw UUID format
  if (isLegacySessionFormat(session)) {
    return { valid: true, tiendaId: session, legacy: true }
  }

  return { valid: false }
}

export async function getSession(req: Request): Promise<SessionResult> {
  const cookieHeader = req.headers.get('cookie') || ''
  const rawValue = parseCookie(cookieHeader, 'nx_session')
  return getSessionFromCookieValue(rawValue)
}
