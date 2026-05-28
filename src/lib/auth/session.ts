const TOKEN_EXPIRY_DAYS = 30
const TOKEN_EXPIRY_SECONDS = TOKEN_EXPIRY_DAYS * 24 * 60 * 60

const ALGORITHM = { name: 'HMAC', hash: 'SHA-256' }

function getSecret(): string {
  const secret = process.env.AUTH_SECRET
  if (!secret) throw new Error('AUTH_SECRET no está configurado')
  return secret
}

function base64UrlEncode(data: string): string {
  return btoa(data)
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

function base64UrlDecode(str: string): string {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (str.length % 4)) % 4)
  return atob(padded)
}

async function sign(payload: string): Promise<string> {
  const secret = getSecret()
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    ALGORITHM,
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign(ALGORITHM, key, new TextEncoder().encode(payload))
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

async function verify(payload: string, signature: string): Promise<boolean> {
  const secret = getSecret()
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    ALGORITHM,
    false,
    ['verify']
  )
  const signatureBytes = new Uint8Array(signature.match(/.{1,2}/g)!.map(b => parseInt(b, 16)))
  return crypto.subtle.verify(ALGORITHM, key, signatureBytes, new TextEncoder().encode(payload))
}

export async function createSessionToken(tiendaId: string): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + TOKEN_EXPIRY_SECONDS
  const payload = JSON.stringify({ tiendaId, exp })
  const encoded = base64UrlEncode(payload)
  const signature = await sign(encoded)
  return `${encoded}.${signature}`
}

export async function verifySessionToken(
  token: string
): Promise<{ valid: boolean; tiendaId?: string }> {
  try {
    const parts = token.split('.')
    if (parts.length !== 2) return { valid: false }

    const [encoded, signature] = parts
    const isValid = await verify(encoded, signature)
    if (!isValid) return { valid: false }

    const decoded = base64UrlDecode(encoded)
    const payload = JSON.parse(decoded) as { tiendaId: string; exp: number }

    if (typeof payload.tiendaId !== 'string' || typeof payload.exp !== 'number') {
      return { valid: false }
    }

    // LEGACY COMPATIBILITY: check expiration
    if (Date.now() / 1000 > payload.exp) return { valid: false }

    return { valid: true, tiendaId: payload.tiendaId }
  } catch {
    return { valid: false }
  }
}
