import { verifySessionToken } from './session'

export type SessionResult = {
  valid: boolean
  tiendaId?: string
}

function parseCookie(cookieHeader: string, name: string): string | undefined {
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`))
  return match?.[1] || undefined
}

export async function getSessionFromCookieValue(
  session: string | undefined
): Promise<SessionResult> {
  if (!session) return { valid: false }

  const result = await verifySessionToken(session)
  if (result.valid && result.tiendaId) {
    return { valid: true, tiendaId: result.tiendaId }
  }

  return { valid: false }
}

export async function getSession(req: Request): Promise<SessionResult> {
  const cookieHeader = req.headers.get('cookie') || ''
  const rawValue = parseCookie(cookieHeader, 'nx_session')
  return getSessionFromCookieValue(rawValue)
}
