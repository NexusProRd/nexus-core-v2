import { NextResponse, type NextRequest } from 'next/server'
import { getSessionFromCookieValue } from '@/lib/auth/get-session'
import { verifySessionToken } from '@/lib/auth/session'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── PCC routes ──────────────────────────────────────────────────
  if (pathname.startsWith('/pcc-login')) {
    const pccSession = request.cookies.get('nx_pcc_session')?.value
    if (pccSession) {
      const result = await verifySessionToken(pccSession)
      if (result.valid && result.tiendaId === 'pcc') {
        return NextResponse.redirect(new URL('/pcc', request.url))
      }
    }
    return NextResponse.next()
  }

  if (pathname.startsWith('/pcc') || pathname.startsWith('/api/pcc')) {
    const pccSession = request.cookies.get('nx_pcc_session')?.value
    if (!pccSession) {
      if (pathname.startsWith('/api/pcc')) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
      }
      return NextResponse.redirect(new URL('/pcc-login', request.url))
    }

    const result = await verifySessionToken(pccSession)
    if (!result.valid || result.tiendaId !== 'pcc') {
      if (pathname.startsWith('/api/pcc')) {
        return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })
      }
      return NextResponse.redirect(new URL('/pcc-login', request.url))
    }

    return NextResponse.next()
  }

  // ── Dashboard routes ────────────────────────────────────────────
  const rawSession = request.cookies.get('nx_session')?.value
  const session = await getSessionFromCookieValue(rawSession)

  if (!session.valid) {
    if (pathname.startsWith('/dashboard')) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    if (pathname === '/onboarding') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return NextResponse.next()
  }

  if (pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/dashboard', '/login', '/onboarding', '/pcc/:path*', '/pcc', '/pcc-login', '/api/pcc/:path*'],
}
